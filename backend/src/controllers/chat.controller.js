// controllers/chat.controller.js
import Chat from "../models/chat.model.js";
import Doctor from "../models/doctor.models.js";
import Client from "../models/client.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadToCloud } from "../utils/cloudinary.js";

// Create or get existing chat between doctor and client
const createOrGetChat = asyncHandler(async (req, res) => {
  const { participantId, participantType } = req.body;
  
  if (!participantId || !participantType) {
    throw new ApiError(400, "Participant ID and type are required");
  }

  // Determine current user type
  const currentUser = req.doctor ? 
    { userId: req.doctor._id, userType: 'Doctor' } : 
    { userId: req.client._id, userType: 'Client' };

  // Validate participant exists
  const Model = participantType === 'Doctor' ? Doctor : Client;
  const participant = await Model.findById(participantId);
  if (!participant) {
    throw new ApiError(404, `${participantType} not found`);
  }

  // Check if chat already exists
  let chat = await Chat.findOne({
    $and: [
      { 'participants.userId': currentUser.userId },
      { 'participants.userId': participantId }
    ]
  }).populate('participants.userId', 'name email avatar');

  // Create new chat if doesn't exist
  if (!chat) {
    chat = await Chat.create({
      participants: [
        currentUser,
        { userId: participantId, userType: participantType }
      ],
      chatType: 'consultation'
    });

    chat = await Chat.findById(chat._id).populate('participants.userId', 'name email avatar');
  }

  return res.status(200).json(new ApiResponse(200, chat, "Chat retrieved successfully"));
});

// Get all chats for current user
const getUserChats = asyncHandler(async (req, res) => {
  const currentUser = req.doctor ? req.doctor._id : req.client._id;
  
  const chats = await Chat.find({
    'participants.userId': currentUser,
    isActive: true
  })
  .populate('participants.userId', 'name email avatar specialization')
  .sort({ lastMessage: -1 })
  .limit(50);

  return res.status(200).json(new ApiResponse(200, chats, "Chats retrieved successfully"));
});

// Send message
const sendMessage = asyncHandler(async (req, res) => {
  const { chatId, content, messageType = 'text' } = req.body;
  
  if (!chatId || !content) {
    throw new ApiError(400, "Chat ID and content are required");
  }

  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new ApiError(404, "Chat not found");
  }

  // Verify user is participant
  const currentUser = req.doctor ? req.doctor._id : req.client._id;
  const isParticipant = chat.participants.some(p => p.userId.toString() === currentUser.toString());
  
  if (!isParticipant) {
    throw new ApiError(403, "You are not a participant in this chat");
  }

  let fileUrl = null;
  if (req.file && messageType !== 'text') {
    const uploadResult = await uploadToCloud(req.file.path);
    if (!uploadResult) {
      throw new ApiError(500, "File upload failed");
    }
    fileUrl = uploadResult.url;
  }

  const newMessage = {
    content,
    messageType,
    fileUrl,
    sender: {
      userId: currentUser,
      userType: req.doctor ? 'Doctor' : 'Client'
    }
  };

  chat.messages.push(newMessage);
  chat.lastMessage = new Date();
  await chat.save();

  // Populate the new message for response
  await chat.populate('messages.sender.userId', 'name avatar');
  const savedMessage = chat.messages[chat.messages.length - 1];

  // Emit socket event for real-time delivery
  req.io?.to(chatId).emit('newMessage', {
    chatId,
    message: savedMessage,
    sender: req.doctor ? 'Doctor' : 'Client'
  });

  return res.status(201).json(new ApiResponse(201, savedMessage, "Message sent successfully"));
});

// Get chat messages with pagination
const getChatMessages = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { page = 1, limit = 50 } = req.query;
  
  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new ApiError(404, "Chat not found");
  }

  // Verify user is participant
  const currentUser = req.doctor ? req.doctor._id : req.client._id;
  const isParticipant = chat.participants.some(p => p.userId.toString() === currentUser.toString());
  
  if (!isParticipant) {
    throw new ApiError(403, "You are not a participant in this chat");
  }

  const skip = (page - 1) * limit;
  const totalMessages = chat.messages.length;
  
  // Get messages with pagination (reverse order for recent first)
  const messages = chat.messages
    .slice(Math.max(0, totalMessages - skip - limit), totalMessages - skip)
    .reverse();

  await Chat.populate(chat, { 
    path: 'messages.sender.userId', 
    select: 'name avatar'
  });

  return res.status(200).json(new ApiResponse(200, {
    messages: messages,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalMessages / limit),
      totalMessages,
      hasMore: skip + limit < totalMessages
    }
  }, "Messages retrieved successfully"));
});

// Mark messages as read
const markMessagesAsRead = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { messageIds } = req.body;
  
  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new ApiError(404, "Chat not found");
  }

  const currentUser = req.doctor ? req.doctor._id : req.client._id;
  const userType = req.doctor ? 'Doctor' : 'Client';

  // Mark specified messages as read
  messageIds.forEach(messageId => {
    const message = chat.messages.id(messageId);
    if (message && message.sender.userId.toString() !== currentUser.toString()) {
      const existingRead = message.readBy.find(
        r => r.userId.toString() === currentUser.toString()
      );
      
      if (!existingRead) {
        message.readBy.push({
          userId: currentUser,
          userType: userType,
          readAt: new Date()
        });
      }
    }
  });

  await chat.save();

  // Emit read receipt
  req.io?.to(chatId).emit('messagesRead', {
    chatId,
    readBy: { userId: currentUser, userType },
    messageIds
  });

  return res.status(200).json(new ApiResponse(200, {}, "Messages marked as read"));
});

// Delete message
const deleteMessage = asyncHandler(async (req, res) => {
  const { chatId, messageId } = req.params;
  
  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new ApiError(404, "Chat not found");
  }

  const message = chat.messages.id(messageId);
  if (!message) {
    throw new ApiError(404, "Message not found");
  }

  const currentUser = req.doctor ? req.doctor._id : req.client._id;
  if (message.sender.userId.toString() !== currentUser.toString()) {
    throw new ApiError(403, "You can only delete your own messages");
  }

  // Check if message is within 5 minutes of sending
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  if (message.timestamp < fiveMinutesAgo) {
    throw new ApiError(400, "Message can only be deleted within 5 minutes of sending");
  }

  message.deleteOne();
  await chat.save();

  // Emit socket event
  req.io?.to(chatId).emit('messageDeleted', {
    chatId,
    messageId,
    deletedBy: currentUser
  });

  return res.status(200).json(new ApiResponse(200, {}, "Message deleted successfully"));
});

export {
  createOrGetChat,
  getUserChats,
  sendMessage,
  getChatMessages,
  markMessagesAsRead,
  deleteMessage
};