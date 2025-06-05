// utils/socketHandlers.js
import jwt from "jsonwebtoken";
import Doctor from "../models/doctor.models.js";
import Client from "../models/client.model.js";
import Chat from "../models/chat.model.js";
import VideoCall from "../models/video.model.js";

// Store connected users with enhanced tracking
const connectedUsers = new Map();
const userSocketMap = new Map(); // userId => socketId mapping
const activeCallRooms = new Map(); // roomId => { participants, callData }

// Authenticate socket connection
const authenticateSocket = async (socket, token) => {
  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    
    // Try to find in Doctor collection first
    let user = await Doctor.findById(decoded._id).select('name email avatar specialization');
    let userType = 'Doctor';
    
    // If not found in Doctor, try Client
    if (!user) {
      user = await Client.findById(decoded._id).select('name email avatar');
      userType = 'Client';
    }
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return { user, userType };
  } catch (error) {
    throw new Error('Authentication failed');
  }
};

// Initialize socket connection
const initializeSocket = (io) => {
  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      console.log("[Socket Auth] Token received:", token ? "exists" : "missing");
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const { user, userType } = await authenticateSocket(socket, token);
      socket.user = user;
      socket.userType = userType;
      console.log(`[Socket Auth] Authenticated: ${userType} ${user.name} (${user._id})`);
      next();
    } catch (error) {
      console.error("[Socket Auth] Authentication failed:", error.message);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    console.log(`[Socket] ${socket.userType} ${socket.user.name} connected: ${socket.id}`);
    
    // Store user connection with enhanced data
    connectedUsers.set(userId, {
      socketId: socket.id,
      user: socket.user,
      userType: socket.userType,
      status: 'online',
      lastSeen: new Date(),
      currentCall: null
    });

    // Store socket mapping
    userSocketMap.set(userId, socket.id);

    // Join user-specific room for notifications
    socket.join(`user_${userId}`);

    // Send authentication confirmation
    socket.emit('authenticated', {
      user: socket.user,
      userType: socket.userType,
      status: 'authenticated'
    });

    // Handle user identification (called after authentication)
    socket.on('identify', (data) => {
      console.log(`[Socket] User identified:`, data);
      socket.emit('identified', { status: 'success' });
    });

    // Emit online status to contacts
    socket.broadcast.emit('userOnline', {
      userId: socket.user._id,
      userType: socket.userType,
      status: 'online'
    });

    // ========== CHAT HANDLERS ==========
    socket.on('joinChat', async (chatId) => {
      try {
        const chat = await Chat.findById(chatId);
        if (chat && chat.participants.some(p => p.userId.toString() === userId)) {
          socket.join(chatId);
          socket.emit('joinedChat', { chatId, status: 'joined' });
          console.log(`[Chat] User ${socket.user.name} joined chat: ${chatId}`);
        } else {
          socket.emit('error', { message: 'Not authorized to join this chat' });
        }
      } catch (error) {
        console.error('[Chat] Failed to join chat:', error);
        socket.emit('error', { message: 'Failed to join chat' });
      }
    });

    socket.on('leaveChat', (chatId) => {
      socket.leave(chatId);
      socket.emit('leftChat', { chatId, status: 'left' });
      console.log(`[Chat] User ${socket.user.name} left chat: ${chatId}`);
    });

    socket.on('typing', ({ chatId, isTyping }) => {
      socket.to(chatId).emit('userTyping', {
        userId: socket.user._id,
        userName: socket.user.name,
        userType: socket.userType,
        isTyping
      });
    });

    // ========== VIDEO CALL HANDLERS ==========
    
    // Handle incoming call initiation
    socket.on('call-offer', async (data) => {
      console.log(`[Call] Offer received from ${userId} to ${data.targetUserId}`);
      console.log(`[Call] Offer data:`, { 
        hasOffer: !!data.offer, 
        callType: data.callType,
        targetUserId: data.targetUserId 
      });

      const targetUserId = data.targetUserId?.toString();
      const targetConnection = connectedUsers.get(targetUserId);

      if (targetConnection && targetConnection.socketId) {
        // Notify target user of incoming call
        io.to(targetConnection.socketId).emit('incoming-call', {
          fromUserId: userId,
          fromUserName: socket.user.name,
          fromUserType: socket.userType,
          callType: data.callType || 'video',
          timestamp: new Date()
        });

        // Send the offer for WebRTC negotiation
        io.to(targetConnection.socketId).emit('offer', {
          offer: data.offer,
          fromUserId: userId,
          fromUserName: socket.user.name,
          fromUserType: socket.userType,
          callType: data.callType || 'video'
        });

        console.log(`[Call] Offer forwarded to ${data.targetUserId}`);
        
        // Update caller's connection status
        const callerConnection = connectedUsers.get(userId);
        if (callerConnection) {
          callerConnection.currentCall = {
            targetUserId: targetUserId,
            status: 'calling',
            startTime: new Date()
          };
        }
      } else {
        console.warn(`[Call] Target user ${data.targetUserId} not found or offline`);
        socket.emit('call-failed', { 
          reason: 'User not available',
          targetUserId: data.targetUserId 
        });
      }
    });

    // Handle call answer
    socket.on('call-answer', (data) => {
      console.log(`[Call] Answer received from ${userId} for ${data.targetUserId}`);
      console.log(`[Call] Answer data:`, { hasAnswer: !!data.answer });

      const targetUserId = data.targetUserId?.toString();
      const targetConnection = connectedUsers.get(targetUserId);

      if (targetConnection && targetConnection.socketId) {
        io.to(targetConnection.socketId).emit('answer', {
          answer: data.answer,
          fromUserId: userId,
          fromUserName: socket.user.name,
          fromUserType: socket.userType
        });

        console.log(`[Call] Answer forwarded to ${data.targetUserId}`);
        
        // Update both users' connection status
        const answererConnection = connectedUsers.get(userId);
        if (answererConnection) {
          answererConnection.currentCall = {
            targetUserId: targetUserId,
            status: 'connected',
            startTime: new Date()
          };
        }
        
        if (targetConnection.currentCall) {
          targetConnection.currentCall.status = 'connected';
        }
      } else {
        console.warn(`[Call] Target user ${data.targetUserId} not found for answer`);
        socket.emit('call-failed', { 
          reason: 'User not available',
          targetUserId: data.targetUserId 
        });
      }
    });

    // Handle ICE candidates with enhanced logging
    socket.on('iceCandidate', (data) => {
      console.log(`[ICE] Candidate received from ${userId} for ${data.targetUserId}`);
      console.log(`[ICE] Candidate type:`, data.candidate?.candidate ? 'relay/srflx/host' : 'end-of-candidates');

      const targetUserId = data.targetUserId?.toString();
      const targetConnection = connectedUsers.get(targetUserId);

      if (targetConnection && targetConnection.socketId) {
        io.to(targetConnection.socketId).emit('iceCandidate', {
          candidate: data.candidate,
          fromUserId: userId,
          fromUserName: socket.user.name
        });
        console.log(`[ICE] Candidate forwarded to ${data.targetUserId}`);
      } else {
        console.warn(`[ICE] Target user ${data.targetUserId} not found for ICE candidate`);
      }
    });

    // Handle call rejection
    socket.on('call-rejected', (data) => {
      console.log(`[Call] Call rejected by ${userId}`);
      
      const targetUserId = data.targetUserId?.toString();
      const targetConnection = connectedUsers.get(targetUserId);

      if (targetConnection && targetConnection.socketId) {
        io.to(targetConnection.socketId).emit('call-rejected', {
          fromUserId: userId,
          fromUserName: socket.user.name,
          reason: data.reason || 'Call declined'
        });
        
        // Clear call status
        if (targetConnection.currentCall) {
          targetConnection.currentCall = null;
        }
      }

      // Clear current user's call status
      const userConnection = connectedUsers.get(userId);
      if (userConnection && userConnection.currentCall) {
        userConnection.currentCall = null;
      }
    });

    // Handle call end
    socket.on('call-ended', (data) => {
      console.log(`[Call] Call ended by ${userId}`);
      
      const targetUserId = data.targetUserId?.toString() || 
                          connectedUsers.get(userId)?.currentCall?.targetUserId;

      if (targetUserId) {
        const targetConnection = connectedUsers.get(targetUserId);
        if (targetConnection && targetConnection.socketId) {
          io.to(targetConnection.socketId).emit('call-ended', {
            fromUserId: userId,
            fromUserName: socket.user.name,
            reason: data.reason || 'Call ended'
          });
          
          // Clear target's call status
          if (targetConnection.currentCall) {
            targetConnection.currentCall = null;
          }
        }
      }

      // Clear current user's call status
      const userConnection = connectedUsers.get(userId);
      if (userConnection && userConnection.currentCall) {
        userConnection.currentCall = null;
      }
    });

    // ========== CALL ROOM MANAGEMENT ==========
    socket.on('joinCallRoom', async (roomId) => {
      try {
        const call = await VideoCall.findOne({ roomId });
        if (call && call.participants.some(p => p.userId.toString() === userId)) {
          socket.join(roomId);
          
          // Track room participation
          if (!activeCallRooms.has(roomId)) {
            activeCallRooms.set(roomId, { participants: [], callData: call });
          }
          
          const room = activeCallRooms.get(roomId);
          if (!room.participants.includes(userId)) {
            room.participants.push(userId);
          }

          socket.to(roomId).emit('userJoinedCall', {
            userId: socket.user._id,
            userName: socket.user.name,
            userType: socket.userType
          });

          console.log(`[CallRoom] User ${socket.user.name} joined room: ${roomId}`);
        } else {
          socket.emit('error', { message: 'Not authorized to join this call room' });
        }
      } catch (error) {
        console.error('[CallRoom] Failed to join call room:', error);
        socket.emit('error', { message: 'Failed to join call room' });
      }
    });

    // ========== MEDIA CONTROLS ==========
    socket.on('toggleVideo', ({ roomId, videoEnabled }) => {
      console.log(`[Media] ${socket.user.name} toggled video: ${videoEnabled} in room: ${roomId}`);
      socket.to(roomId).emit('userToggleVideo', {
        userId: socket.user._id,
        userName: socket.user.name,
        videoEnabled
      });
    });

    socket.on('toggleAudio', ({ roomId, audioEnabled }) => {
      console.log(`[Media] ${socket.user.name} toggled audio: ${audioEnabled} in room: ${roomId}`);
      socket.to(roomId).emit('userToggleAudio', {
        userId: socket.user._id,
        userName: socket.user.name,
        audioEnabled
      });
    });

    socket.on('shareScreen', ({ roomId, isSharing }) => {
      console.log(`[Media] ${socket.user.name} screen sharing: ${isSharing} in room: ${roomId}`);
      socket.to(roomId).emit('userShareScreen', {
        userId: socket.user._id,
        userName: socket.user.name,
        isSharing
      });
    });

    // Handle call quality issues
    socket.on('callQualityIssue', ({ roomId, issue }) => {
      console.log(`[Quality] Call quality issue in room ${roomId}:`, issue);
      socket.to(roomId).emit('callQualityIssue', {
        fromUserId: socket.user._id,
        fromUserName: socket.user.name,
        issue,
        timestamp: new Date()
      });
    });

    // ========== MESSAGE HANDLERS ==========
    socket.on('markAsRead', async ({ chatId, messageIds }) => {
      try {
        const chat = await Chat.findById(chatId);
        if (chat && chat.participants.some(p => p.userId.toString() === userId)) {
          messageIds.forEach(messageId => {
            const message = chat.messages.id(messageId);
            if (message && message.sender.userId.toString() !== userId) {
              const existingRead = message.readBy.find(
                r => r.userId.toString() === userId
              );
              
              if (!existingRead) {
                message.readBy.push({
                  userId: socket.user._id,
                  userType: socket.userType,
                  readAt: new Date()
                });
              }
            }
          });

          await chat.save();

          socket.to(chatId).emit('messagesRead', {
            chatId,
            readBy: { userId: socket.user._id, userType: socket.userType },
            messageIds
          });
        }
      } catch (error) {
        console.error('[Messages] Failed to mark as read:', error);
        socket.emit('error', { message: 'Failed to mark messages as read' });
      }
    });

    // ========== STATUS MANAGEMENT ==========
    socket.on('updateStatus', (status) => {
      if (['online', 'away', 'busy', 'offline'].includes(status)) {
        const userConnection = connectedUsers.get(userId);
        if (userConnection) {
          userConnection.status = status;
          userConnection.lastSeen = new Date();
        }

        socket.broadcast.emit('userStatusUpdate', {
          userId: socket.user._id,
          userType: socket.userType,
          status,
          lastSeen: new Date()
        });

        console.log(`[Status] ${socket.user.name} status updated to: ${status}`);
      }
    });

    socket.on('getOnlineUsers', () => {
      const onlineUsers = Array.from(connectedUsers.values())
        .filter(conn => conn.status === 'online')
        .map(conn => ({
          userId: conn.user._id,
          userName: conn.user.name,
          userType: conn.userType,
          status: conn.status,
          lastSeen: conn.lastSeen,
          inCall: !!conn.currentCall
        }));

      socket.emit('onlineUsers', onlineUsers);
    });

    // ========== DISCONNECT HANDLER ==========
    socket.on('disconnect', (reason) => {
      console.log(`[Socket] ${socket.userType} ${socket.user.name} disconnected: ${reason}`);
      
      // Handle ongoing call cleanup
      const userConnection = connectedUsers.get(userId);
      if (userConnection && userConnection.currentCall) {
        const targetUserId = userConnection.currentCall.targetUserId;
        const targetConnection = connectedUsers.get(targetUserId);
        
        if (targetConnection && targetConnection.socketId) {
          io.to(targetConnection.socketId).emit('call-ended', {
            fromUserId: userId,
            fromUserName: socket.user.name,
            reason: 'User disconnected'
          });
          
          if (targetConnection.currentCall) {
            targetConnection.currentCall = null;
          }
        }
      }

      // Clean up call rooms
      activeCallRooms.forEach((room, roomId) => {
        const index = room.participants.indexOf(userId);
        if (index !== -1) {
          room.participants.splice(index, 1);
          socket.to(roomId).emit('userLeftCall', {
            userId: socket.user._id,
            userName: socket.user.name,
            reason: 'disconnected'
          });
          
          // Remove empty rooms
          if (room.participants.length === 0) {
            activeCallRooms.delete(roomId);
          }
        }
      });

      // Update user status
      if (userConnection) {
        userConnection.status = 'offline';
        userConnection.lastSeen = new Date();
        userConnection.currentCall = null;
      }

      // Remove socket mapping
      userSocketMap.delete(userId);

      // Emit offline status
      socket.broadcast.emit('userOffline', {
        userId: socket.user._id,
        userType: socket.userType,
        status: 'offline',
        lastSeen: new Date()
      });

      // Clean up user connection after delay
      setTimeout(() => {
        const stillConnected = Array.from(io.sockets.sockets.values())
          .some(s => s.user && s.user._id.toString() === userId);
        
        if (!stillConnected) {
          connectedUsers.delete(userId);
          console.log(`[Cleanup] Removed user connection: ${socket.user.name}`);
        }
      }, 5000);
    });

    // ========== ERROR HANDLER ==========
    socket.on('error', (error) => {
      console.error('[Socket] Error from client:', error);
      socket.emit('error', { message: 'An error occurred' });
    });

    // Log successful connection
    console.log(`[Socket] Successfully set up handlers for ${socket.userType} ${socket.user.name}`);
  });

  return io;
};

// Helper functions
const getConnectedUsers = () => {
  return Array.from(connectedUsers.values());
};

const isUserOnline = (userId) => {
  const user = connectedUsers.get(userId.toString());
  return user && user.status === 'online';
};

const getUserSocket = (userId) => {
  const connection = connectedUsers.get(userId.toString());
  return connection ? connection.socketId : null;
};

const sendNotificationToUser = (io, userId, event, data) => {
  const socketId = getUserSocket(userId);
  if (socketId) {
    io.to(socketId).emit(event, data);
    return true;
  }
  return false;
};

const getActiveCallRooms = () => {
  return Array.from(activeCallRooms.entries()).map(([roomId, room]) => ({
    roomId,
    participants: room.participants.length,
    callData: room.callData
  }));
};

const isUserInCall = (userId) => {
  const user = connectedUsers.get(userId.toString());
  return user && user.currentCall;
};

export { 
  initializeSocket, 
  getConnectedUsers, 
  isUserOnline, 
  getUserSocket,
  sendNotificationToUser,
  getActiveCallRooms,
  isUserInCall
};