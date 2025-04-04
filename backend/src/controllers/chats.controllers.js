import { ChatMessage,ChatSession } from '../models/chats.model.js';
import Doctor from '../models/doctor.models.js';

// Handle chat request from client to doctor
export const handleChatRequest = async (io, socket, connectedUsers, { doctorId }) => {
  try {
    if (socket.user.userType !== 'Client') {
      socket.emit('error', { message: 'Only clients can request chats' });
      return;
    }

    // Check if doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      socket.emit('error', { message: 'Doctor not found' });
      return;
    }

    // Check if there's an active session already
    const existingSession = await ChatSession.findOne({
      clientId: socket.user._id,
      doctorId: doctorId,
      status: { $in: ['requested', 'active'] }
    });

    if (existingSession) {
      socket.emit('error', { message: 'You already have an active or pending chat request with this doctor' });
      return;
    }

    // Create new chat session
    const chatSession = await ChatSession.create({
      clientId: socket.user._id,
      doctorId: doctorId,
      status: 'requested'
    });

    // Notify the doctor if online
    const doctorConnection = connectedUsers.get(doctorId.toString());
    if (doctorConnection) {
      io.to(doctorConnection.socketId).emit('chat_request', {
        sessionId: chatSession._id,
        client: {
          _id: socket.user._id,
          name: socket.user.name,
          avatar: socket.user.avatar
        },
        timestamp: chatSession.createdAt
      });
    }

    socket.emit('request_sent', {
      sessionId: chatSession._id,
      doctorId: doctorId,
      status: 'requested'
    });

  } catch (error) {
    console.error('Chat request error:', error);
    socket.emit('error', { message: 'Failed to send chat request' });
  }
};

// Handle chat request response (accept/reject) from doctor
export const handleChatResponse = async (io, socket, connectedUsers, { sessionId, action }) => {
  try {
    if (socket.user.userType !== 'Doctor') {
      socket.emit('error', { message: 'Only doctors can respond to chat requests' });
      return;
    }

    // Find the chat session
    const chatSession = await ChatSession.findById(sessionId);
    if (!chatSession) {
      socket.emit('error', { message: 'Chat session not found' });
      return;
    }

    // Verify the doctor is the intended recipient
    if (chatSession.doctorId.toString() !== socket.user._id.toString()) {
      socket.emit('error', { message: 'You are not authorized to respond to this chat request' });
      return;
    }

    if (chatSession.status !== 'requested') {
      socket.emit('error', { message: 'This chat request has already been processed' });
      return;
    }

    // Update session based on action
    if (action === 'accept') {
      chatSession.status = 'active';
      chatSession.startTime = new Date();
    } else if (action === 'reject') {
      chatSession.status = 'rejected';
    } else {
      socket.emit('error', { message: 'Invalid action' });
      return;
    }

    await chatSession.save();

    // Notify the client about the doctor's response
    const clientConnection = connectedUsers.get(chatSession.clientId.toString());
    if (clientConnection) {
      io.to(clientConnection.socketId).emit('chat_request_response', {
        sessionId: chatSession._id,
        status: chatSession.status,
        doctorId: socket.user._id,
        doctorName: socket.user.name
      });
    }

    // If accepted, add both users to the same room
    if (action === 'accept') {
      if (clientConnection) {
        // Join both users to a chat room
        const roomId = `chat_${chatSession._id}`;
        socket.join(roomId);
        io.sockets.sockets.get(clientConnection.socketId)?.join(roomId);
        
        // Notify both users that the chat is ready
        io.to(roomId).emit('chat_started', {
          sessionId: chatSession._id,
          roomId: roomId
        });
      }
    }

    socket.emit('response_sent', {
      sessionId: chatSession._id,
      status: chatSession.status
    });

  } catch (error) {
    console.error('Chat response error:', error);
    socket.emit('error', { message: 'Failed to process chat request response' });
  }
};

// Handle sending messages
export const handleSendMessage = async (io, socket, { sessionId, message }) => {
  try {
    // Find chat session
    const chatSession = await ChatSession.findById(sessionId);
    if (!chatSession) {
      socket.emit('error', { message: 'Chat session not found' });
      return;
    }

    // Check if user is part of this chat
    const isClient = chatSession.clientId.toString() === socket.user._id.toString();
    const isDoctor = chatSession.doctorId.toString() === socket.user._id.toString();

    if (!isClient && !isDoctor) {
      socket.emit('error', { message: 'You are not authorized to send messages in this chat' });
      return;
    }

    // Check if chat is active
    if (chatSession.status !== 'active') {
      socket.emit('error', { message: 'This chat is not active' });
      return;
    }

    // Determine sender and receiver
    const senderId = socket.user._id;
    const senderType = socket.user.userType;
    const receiverId = isClient ? chatSession.doctorId : chatSession.clientId;
    const receiverType = isClient ? 'Doctor' : 'Client';

    // Create message
    const chatMessage = await ChatMessage.create({
      senderId,
      senderType,
      receiverId,
      receiverType,
      message
    });

    // Update last activity timestamp
    chatSession.lastActivity = new Date();
    await chatSession.save();

    // Send to chat room
    const roomId = `chat_${sessionId}`;
    io.to(roomId).emit('new_message', {
      _id: chatMessage._id,
      message: chatMessage.message,
      senderId: senderId,
      senderType: senderType,
      timestamp: chatMessage.timestamp
    });

  } catch (error) {
    console.error('Send message error:', error);
    socket.emit('error', { message: 'Failed to send message' });
  }
};

// Handle ending chat
export const handleEndChat = async (io, socket, connectedUsers, { sessionId }) => {
  try {
    // Find chat session
    const chatSession = await ChatSession.findById(sessionId);
    if (!chatSession) {
      socket.emit('error', { message: 'Chat session not found' });
      return;
    }

    // Check if user is part of this chat
    const isClient = chatSession.clientId.toString() === socket.user._id.toString();
    const isDoctor = chatSession.doctorId.toString() === socket.user._id.toString();

    if (!isClient && !isDoctor) {
      socket.emit('error', { message: 'You are not authorized to end this chat' });
      return;
    }

    // End the chat
    chatSession.status = 'ended';
    chatSession.endTime = new Date();
    await chatSession.save();

    // Notify users in the room
    const roomId = `chat_${sessionId}`;
    io.to(roomId).emit('chat_ended', {
      sessionId: chatSession._id,
      endedBy: {
        id: socket.user._id,
        type: socket.user.userType
      },
      timestamp: chatSession.endTime
    });

    // Leave the room
    socket.leave(roomId);
    
    // Make the other user leave the room too
    const otherId = isClient ? chatSession.doctorId.toString() : chatSession.clientId.toString();
    const otherConnection = connectedUsers.get(otherId);
    if (otherConnection) {
      io.sockets.sockets.get(otherConnection.socketId)?.leave(roomId);
    }

  } catch (error) {
    console.error('End chat error:', error);
    socket.emit('error', { message: 'Failed to end chat' });
  }
};

// Get chat history
export const handleGetChatHistory = async (socket, { sessionId }) => {
  try {
    // Find chat session
    const chatSession = await ChatSession.findById(sessionId);
    if (!chatSession) {
      socket.emit('error', { message: 'Chat session not found' });
      return;
    }

    // Check if user is part of this chat
    const isClient = chatSession.clientId.toString() === socket.user._id.toString();
    const isDoctor = chatSession.doctorId.toString() === socket.user._id.toString();

    if (!isClient && !isDoctor) {
      socket.emit('error', { message: 'You are not authorized to access this chat history' });
      return;
    }

    // Get messages for this session
    const messages = await ChatMessage.find({
      $or: [
        { senderId: chatSession.clientId, receiverId: chatSession.doctorId },
        { senderId: chatSession.doctorId, receiverId: chatSession.clientId }
      ]
    }).sort({ timestamp: 1 });

    // Mark messages as read
    if (messages.length > 0) {
      await ChatMessage.updateMany(
        { 
          receiverId: socket.user._id,
          read: false
        },
        { read: true }
      );
    }

    socket.emit('chat_history', {
      sessionId,
      messages: messages.map(msg => ({
        _id: msg._id,
        message: msg.message,
        senderId: msg.senderId,
        senderType: msg.senderType,
        read: msg.read,
        timestamp: msg.timestamp
      }))
    });

  } catch (error) {
    console.error('Get chat history error:', error);
    socket.emit('error', { message: 'Failed to get chat history' });
  }
};

// Get active chat sessions for user
export const handleGetActiveSessions = async (socket) => {
  try {
    let query = {};
    
    if (socket.user.userType === 'Client') {
      query = { clientId: socket.user._id, status: { $in: ['requested', 'active'] } };
    } else if (socket.user.userType === 'Doctor') {
      query = { doctorId: socket.user._id, status: { $in: ['requested', 'active'] } };
    }

    const sessions = await ChatSession.find(query)
      .populate(socket.user.userType === 'Client' ? 'doctorId' : 'clientId', 'name avatar')
      .sort({ lastActivity: -1 });

    socket.emit('active_sessions', {
      sessions: sessions.map(session => ({
        _id: session._id,
        status: session.status,
        startTime: session.startTime,
        lastActivity: session.lastActivity,
        user: socket.user.userType === 'Client' 
          ? {
              _id: session.doctorId._id,
              name: session.doctorId.name,
              avatar: session.doctorId.avatar,
              type: 'Doctor'
            }
          : {
              _id: session.clientId._id,
              name: session.clientId.name,
              avatar: session.clientId.avatar,
              type: 'Client'
            }
      }))
    });

  } catch (error) {
    console.error('Get active sessions error:', error);
    socket.emit('error', { message: 'Failed to get active chat sessions' });
  }
};