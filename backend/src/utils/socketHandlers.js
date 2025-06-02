// utils/socketHandlers.js
import jwt from "jsonwebtoken";
import Doctor from "../models/doctor.models.js";
import Client from "../models/client.model.js";
import Chat from "../models/chat.model.js";
import VideoCall from "../models/video.model.js";

const connectedUsers = new Map();

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
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      if (!token) {
        return next(new Error('Authentication token required'));
      }
      
      const { user, userType } = await authenticateSocket(socket, token);
      socket.user = user;
      socket.userType = userType;
      
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`${socket.userType} ${socket.user.name} connected: ${socket.id}`);
    
    // Store user connection
    connectedUsers.set(socket.user._id.toString(), {
      socketId: socket.id,
      user: socket.user,
      userType: socket.userType,
      status: 'online',
      lastSeen: new Date()
    });

    // Join user-specific room for notifications
    socket.join(`user_${socket.user._id}`);

    // Emit online status to contacts
    socket.broadcast.emit('userOnline', {
      userId: socket.user._id,
      userType: socket.userType,
      status: 'online'
    });

    // Handle joining chat rooms
    socket.on('joinChat', async (chatId) => {
      try {
        const chat = await Chat.findById(chatId);
        if (chat && chat.participants.some(p => p.userId.toString() === socket.user._id.toString())) {
          socket.join(chatId);
          socket.emit('joinedChat', { chatId, status: 'joined' });
        } else {
          socket.emit('error', { message: 'Not authorized to join this chat' });
        }
      } catch (error) {
        socket.emit('error', { message: 'Failed to join chat' });
      }
    });

    // Handle leaving chat rooms
    socket.on('leaveChat', (chatId) => {
      socket.leave(chatId);
      socket.emit('leftChat', { chatId, status: 'left' });
    });

    // Handle typing indicators
    socket.on('typing', ({ chatId, isTyping }) => {
      socket.to(chatId).emit('userTyping', {
        userId: socket.user._id,
        userName: socket.user.name,
        userType: socket.userType,
        isTyping
      });
    });

    // Handle video call signaling
    socket.on('joinCallRoom', async (roomId) => {
      try {
        const call = await VideoCall.findOne({ roomId });
        if (call && call.participants.some(p => p.userId.toString() === socket.user._id.toString())) {
          socket.join(roomId);
          socket.to(roomId).emit('userJoinedCall', {
            userId: socket.user._id,
            userName: socket.user.name,
            userType: socket.userType
          });
        }
      } catch (error) {
        socket.emit('error', { message: 'Failed to join call room' });
      }
    });

    // WebRTC signaling events
    socket.on('offer', ({ roomId, offer, targetUserId }) => {
      socket.to(roomId).emit('offer', {
        offer,
        fromUserId: socket.user._id,
        fromUserName: socket.user.name
      });
    });

    socket.on('answer', ({ roomId, answer, targetUserId }) => {
      socket.to(roomId).emit('answer', {
        answer,
        fromUserId: socket.user._id,
        fromUserName: socket.user.name
      });
    });

    socket.on('iceCandidate', ({ roomId, candidate, targetUserId }) => {
      socket.to(roomId).emit('iceCandidate', {
        candidate,
        fromUserId: socket.user._id
      });
    });

    // Handle call events
    socket.on('toggleVideo', ({ roomId, videoEnabled }) => {
      socket.to(roomId).emit('userToggleVideo', {
        userId: socket.user._id,
        videoEnabled
      });
    });

    socket.on('toggleAudio', ({ roomId, audioEnabled }) => {
      socket.to(roomId).emit('userToggleAudio', {
        userId: socket.user._id,
        audioEnabled
      });
    });

    socket.on('shareScreen', ({ roomId, isSharing }) => {
      socket.to(roomId).emit('userShareScreen', {
        userId: socket.user._id,
        isSharing
      });
    });

    // Handle call quality issues
    socket.on('callQualityIssue', ({ roomId, issue }) => {
      socket.to(roomId).emit('callQualityIssue', {
        fromUserId: socket.user._id,
        issue,
        timestamp: new Date()
      });
    });

    // Handle messages read receipts
    socket.on('markAsRead', async ({ chatId, messageIds }) => {
      try {
        const chat = await Chat.findById(chatId);
        if (chat && chat.participants.some(p => p.userId.toString() === socket.user._id.toString())) {
          messageIds.forEach(messageId => {
            const message = chat.messages.id(messageId);
            if (message && message.sender.userId.toString() !== socket.user._id.toString()) {
              const existingRead = message.readBy.find(
                r => r.userId.toString() === socket.user._id.toString()
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
        socket.emit('error', { message: 'Failed to mark messages as read' });
      }
    });

    // Handle user status updates
    socket.on('updateStatus', (status) => {
      if (['online', 'away', 'busy', 'offline'].includes(status)) {
        const userConnection = connectedUsers.get(socket.user._id.toString());
        if (userConnection) {
          userConnection.status = status;
          userConnection.lastSeen = new Date();
        }

        socket.broadcast.emit('userStatusUpdate', {
          userId: socket.user._id,
          status,
          lastSeen: new Date()
        });
      }
    });

    // Handle getting online users
    socket.on('getOnlineUsers', () => {
      const onlineUsers = Array.from(connectedUsers.values())
        .filter(conn => conn.status === 'online')
        .map(conn => ({
          userId: conn.user._id,
          userName: conn.user.name,
          userType: conn.userType,
          status: conn.status,
          lastSeen: conn.lastSeen
        }));

      socket.emit('onlineUsers', onlineUsers);
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log(`${socket.userType} ${socket.user.name} disconnected: ${reason}`);
      
      // Update user status
      const userConnection = connectedUsers.get(socket.user._id.toString());
      if (userConnection) {
        userConnection.status = 'offline';
        userConnection.lastSeen = new Date();
      }

      // Emit offline status
      socket.broadcast.emit('userOffline', {
        userId: socket.user._id,
        userType: socket.userType,
        status: 'offline',
        lastSeen: new Date()
      });

      // Clean up if no other connections for this user
      setTimeout(() => {
        const stillConnected = Array.from(io.sockets.sockets.values())
          .some(s => s.user && s.user._id.toString() === socket.user._id.toString());
        
        if (!stillConnected) {
          connectedUsers.delete(socket.user._id.toString());
        }
      }, 5000);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
      socket.emit('error', { message: 'An error occurred' });
    });
  });

  return io;
};

// Helper function to get connected users
const getConnectedUsers = () => {
  return Array.from(connectedUsers.values());
};

// Helper function to check if user is online
const isUserOnline = (userId) => {
  const user = connectedUsers.get(userId.toString());
  return user && user.status === 'online';
};

// Helper function to send notification to specific user
const sendNotificationToUser = (io, userId, event, data) => {
  io.to(`user_${userId}`).emit(event, data);
};

export { 
  initializeSocket, 
  getConnectedUsers, 
  isUserOnline, 
  sendNotificationToUser 
};