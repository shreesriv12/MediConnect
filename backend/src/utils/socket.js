import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import Client from '../models/client.model.js';
import Doctor from '../models/doctor.models.js';
import cookie from 'cookie';
import { handleChatRequest, handleChatResponse, handleSendMessage, 
         handleEndChat, handleGetChatHistory, handleGetActiveSessions } from '../controllers/chats.controllers.js'

// User connections map - could be moved to Redis for scalability
const connectedUsers = new Map();

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "*",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Middleware for authentication
  io.use(async (socket, next) => {
    try {
      // Read cookies
      const cookies = socket.handshake.headers.cookie;
      console.log("Cookies received lalalal:", socket.handshake.headers.cookie); // 👈 Add this

      if (!cookies) {
        return next(new Error("Token not found in cookies"));
      }
  
      // Parse cookies and extract token
      const parsedCookies = cookie.parse(cookies);
      const token = parsedCookies.accessToken;
  
      if (!token) {
        return next(new Error("Authentication error: Token not provided"));
      }
  

      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      
      // Find user based on type
      let user;
      if (decoded.userType === 'Client') {
        user = await Client.findById(decoded._id).select('-password');
      } else if (decoded.userType === 'Doctor') {
        user = await Doctor.findById(decoded._id).select('-password');
      } else {
        return next(new Error('Invalid user type'));
      }

      if (!user) {
        return next(new Error('User not found'));
      }

      // Attach user data to socket
      socket.user = {
        _id: user._id,
        name: user.name,
        email: user.email,
        userType: decoded.userType,
        avatar: user.avatar
      };

      next();
    } catch (error) {
      return next(new Error('Authentication error: ' + error.message));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.name} (${socket.user.userType})`);
    
    // Store connection in map
    connectedUsers.set(socket.user._id.toString(), {
      socketId: socket.id,
      userType: socket.user.userType
    });

    // Update user's online status
    io.emit('user_status_change', {
      userId: socket.user._id,
      userType: socket.user.userType,
      status: 'online'
    });

    // Handle chat request from client to doctor
    socket.on('request_chat', (data) => {
      handleChatRequest(io, socket, connectedUsers, data);
    });

    // Handle chat request response (accept/reject) from doctor
    socket.on('respond_to_chat_request', (data) => {
      handleChatResponse(io, socket, connectedUsers, data);
    });

    // Handle sending messages
    socket.on('send_message', (data) => {
      handleSendMessage(io, socket, data);
    });

    // Handle ending chat
    socket.on('end_chat', (data) => {
      handleEndChat(io, socket, connectedUsers, data);
    });

    // Get chat history
    socket.on('get_chat_history', (data) => {
      handleGetChatHistory(socket, data);
    });

    // Get active chat sessions for user
    socket.on('get_active_sessions', () => {
      handleGetActiveSessions(socket);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.name} (${socket.user.userType})`);
      
      // Remove from connected users map
      connectedUsers.delete(socket.user._id.toString());
      
      // Update user's status
      io.emit('user_status_change', {
        userId: socket.user._id,
        userType: socket.user.userType,
        status: 'offline'
      });
    });
  });

  return io;
};

export default initializeSocket;