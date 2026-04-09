// controllers/chat.controller.js
import Chat from "../models/chat.model.js";
import Doctor from "../models/doctor.models.js";
import Client from "../models/client.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadToCloud } from "../utils/cloudinary.js";

// ─── Create or get existing chat between doctor and client ──────────────────
const createOrGetChat = asyncHandler(async (req, res) => {
  const { participantId, participantType } = req.body;

  if (!participantId || !participantType) {
    throw new ApiError(400, "Participant ID and type are required");
  }

  const currentUser = req.doctor
    ? { userId: req.doctor._id, userType: "Doctor" }
    : { userId: req.client._id, userType: "Client" };

  const Model = participantType === "Doctor" ? Doctor : Client;
  const participant = await Model.findById(participantId);
  if (!participant) {
    throw new ApiError(404, `${participantType} not found`);
  }

  let chat = await Chat.findOne({
    $and: [
      { "participants.userId": currentUser.userId },
      { "participants.userId": participantId },
    ],
  }).populate("participants.userId", "name email avatar");

  if (!chat) {
    chat = await Chat.create({
      participants: [
        currentUser,
        { userId: participantId, userType: participantType },
      ],
      chatType: "consultation",
    });
    chat = await Chat.findById(chat._id).populate(
      "participants.userId",
      "name email avatar"
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, chat, "Chat retrieved successfully"));
});

// ─── Get all chats for current user ─────────────────────────────────────────
const getUserChats = asyncHandler(async (req, res) => {
  const currentUser = req.doctor ? req.doctor._id : req.client._id;

  const chats = await Chat.find({
    "participants.userId": currentUser,
    isActive: true,
  })
    .populate("participants.userId", "name email avatar specialization")
    .sort({ lastMessage: -1 })
    .limit(50);

  return res
    .status(200)
    .json(new ApiResponse(200, chats, "Chats retrieved successfully"));
});

// ─── Send message ────────────────────────────────────────────────────────────
const sendMessage = asyncHandler(async (req, res) => {
  const { chatId, content, messageType = "text" } = req.body;

  if (!chatId || !content) {
    throw new ApiError(400, "Chat ID and content are required");
  }

  const chat = await Chat.findById(chatId);
  if (!chat) throw new ApiError(404, "Chat not found");

  const currentUser = req.doctor ? req.doctor._id : req.client._id;
  const isParticipant = chat.participants.some(
    (p) => p.userId.toString() === currentUser.toString()
  );
  if (!isParticipant) {
    throw new ApiError(403, "You are not a participant in this chat");
  }

  let fileUrl = null;
  if (req.file && messageType !== "text") {
    try {
      const uploadResult = await uploadToCloud(req.file.path);
      if (!uploadResult) throw new ApiError(500, "File upload failed");
      fileUrl = uploadResult.url;
    } catch (uploadError) {
      console.error("File upload error:", uploadError);
      throw new ApiError(500, "Failed to upload file: " + uploadError.message);
    }
  }

  const newMessage = {
    content,
    messageType,
    fileUrl,
    // ── FIX: explicitly set createdAt so the socket-emitted copy also has it ─
    createdAt: new Date(),
    sender: {
      userId: currentUser,
      userType: req.doctor ? "Doctor" : "Client",
    },
  };

  chat.messages.push(newMessage);
  chat.lastMessage = new Date();
  await chat.save();

  await chat.populate("messages.sender.userId", "name avatar");
  const savedMessage = chat.messages[chat.messages.length - 1];

  req.io?.to(chatId).emit("newMessage", {
    chatId,
    message: savedMessage,
    sender: req.doctor ? "Doctor" : "Client",
  });

  return res
    .status(201)
    .json(new ApiResponse(201, savedMessage, "Message sent successfully"));
});

// ─── Get chat messages with pagination ──────────────────────────────────────
const getChatMessages = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { page = 1, limit = 50 } = req.query;

  const chat = await Chat.findById(chatId);
  if (!chat) throw new ApiError(404, "Chat not found");

  const currentUser = req.doctor ? req.doctor._id : req.client._id;
  const isParticipant = chat.participants.some(
    (p) => p.userId.toString() === currentUser.toString()
  );
  if (!isParticipant) {
    throw new ApiError(403, "You are not a participant in this chat");
  }

  // ── FIX: removed the .reverse() that was here previously ─────────────────
  // The old code sliced oldest→newest then reversed to "newest first".
  // But the UI ChatPage.jsx already sorts messages ascending (oldest→newest)
  // before rendering, so the double-reverse scrambled display order.
  // Now we simply return the slice in natural (oldest→newest) order and let
  // the UI sort handle presentation.
  const skip = (page - 1) * limit;
  const totalMessages = chat.messages.length;

  // Populate sender info first
  await Chat.populate(chat, {
    path: "messages.sender.userId",
    select: "name avatar",
  });

  // Return oldest→newest slice for the requested page window
  const messages = chat.messages.slice(
    Math.max(0, totalMessages - skip - limit),
    totalMessages - skip
  );
  // ─────────────────────────────────────────────────────────────────────────

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        messages,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalMessages / limit),
          totalMessages,
          hasMore: skip + limit < totalMessages,
        },
      },
      "Messages retrieved successfully"
    )
  );
});

// ─── Mark messages as read ───────────────────────────────────────────────────
const markMessagesAsRead = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { messageIds } = req.body;

  const chat = await Chat.findById(chatId);
  if (!chat) throw new ApiError(404, "Chat not found");

  const currentUser = req.doctor ? req.doctor._id : req.client._id;
  const userType = req.doctor ? "Doctor" : "Client";

  messageIds.forEach((messageId) => {
    const message = chat.messages.id(messageId);
    if (
      message &&
      message.sender.userId.toString() !== currentUser.toString()
    ) {
      const existingRead = message.readBy.find(
        (r) => r.userId.toString() === currentUser.toString()
      );
      if (!existingRead) {
        message.readBy.push({
          userId: currentUser,
          userType,
          readAt: new Date(),
        });
      }
    }
  });

  await chat.save();

  req.io?.to(chatId).emit("messagesRead", {
    chatId,
    readBy: { userId: currentUser, userType },
    messageIds,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Messages marked as read"));
});

// ─── Delete message ──────────────────────────────────────────────────────────
const deleteMessage = asyncHandler(async (req, res) => {
  const { chatId, messageId } = req.params;

  const chat = await Chat.findById(chatId);
  if (!chat) throw new ApiError(404, "Chat not found");

  const message = chat.messages.id(messageId);
  if (!message) throw new ApiError(404, "Message not found");

  const currentUser = req.doctor ? req.doctor._id : req.client._id;
  if (message.sender.userId.toString() !== currentUser.toString()) {
    throw new ApiError(403, "You can only delete your own messages");
  }

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  if (message.createdAt && message.createdAt < fiveMinutesAgo) {
    throw new ApiError(
      400,
      "Message can only be deleted within 5 minutes of sending"
    );
  }

  message.deleteOne();
  await chat.save();

  req.io?.to(chatId).emit("messageDeleted", {
    chatId,
    messageId,
    deletedBy: currentUser,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Message deleted successfully"));
});

export {
  createOrGetChat,
  getUserChats,
  sendMessage,
  getChatMessages,
  markMessagesAsRead,
  deleteMessage,
};