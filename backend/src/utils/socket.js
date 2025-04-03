import { Server } from "socket.io";

// Store online users with both userId and userType (userId -> {socketId, userType})
const onlineUsers = new Map();

const socketController = {
  handleConnection: (socket, io) => {
    console.log(`User connected: ${socket.id}`);
    
    // Handle user login & track online users with type
    socket.on("user_online", ({ userId, userType }) => {
      // Store both socketId and userType
      onlineUsers.set(userId, { socketId: socket.id, userType });
      console.log(`User ${userId} (${userType}) is online with socket ID: ${socket.id}`);
      
      // Notify all users about the updated online users list with user types
      io.emit("update_online_users", Array.from(onlineUsers.entries()).map(([id, data]) => ({
        userId: id,
        userType: data.userType,
        isOnline: true
      })));
    });
    
    // Handle joining a chat room
    socket.on("join_room", (room) => {
      socket.join(room);
      console.log(`User ${socket.id} joined room: ${room}`);
    });
    
    // Handle sending messages
    socket.on("send_message", (data, callback) => {
      const { senderId, receiverId, message } = data;
      
      // Check if the receiver is online and emit message
      if (onlineUsers.has(receiverId)) {
        io.to(onlineUsers.get(receiverId).socketId).emit("receive_message", data);
        
        // Acknowledge message delivery
        if (callback) callback({ status: "delivered" });
      } else {
        if (callback) callback({ status: "offline" });
      }
    });
    
    // Handle appointment notifications
    socket.on("schedule_notification", (data) => {
      const { doctorId, message } = data;
      
      // Send notification only if doctor is online
      if (onlineUsers.has(doctorId)) {
        io.to(onlineUsers.get(doctorId).socketId).emit("new_notification", message);
      }
    });
    
    // Handle WebRTC signaling for video calls
    socketController.handleWebRTCSignaling(socket, io);
    
    // Handle user disconnection
    socket.on("disconnect", () => {
      // Find userId by socket ID
      let disconnectedUserId = null;
      
      for (const [userId, userData] of onlineUsers.entries()) {
        if (userData.socketId === socket.id) {
          disconnectedUserId = userId;
          break;
        }
      }
      
      if (disconnectedUserId) {
        onlineUsers.delete(disconnectedUserId);
        console.log(`User ${disconnectedUserId} disconnected`);
        
        // Notify all users about the updated online users list
        io.emit("update_online_users", Array.from(onlineUsers.entries()).map(([id, data]) => ({
          userId: id,
          userType: data.userType,
          isOnline: true
        })));
      }
    });
    
    // Error handling
    socket.on("error", (err) => {
      console.error(`Socket error: ${err.message}`);
    });
  },
  
  // Separate method for WebRTC signaling
  handleWebRTCSignaling: (socket, io) => {
    // Handle WebRTC offer
    socket.on("webrtc_offer", (data) => {
      const { targetUserId, offer } = data;
      if (onlineUsers.has(targetUserId)) {
        io.to(onlineUsers.get(targetUserId).socketId).emit("webrtc_offer", {
          senderId: socket.id,
          offer,
        });
      }
    });
    
    // Handle WebRTC answer
    socket.on("webrtc_answer", (data) => {
      const { targetUserId, answer } = data;
      if (onlineUsers.has(targetUserId)) {
        io.to(onlineUsers.get(targetUserId).socketId).emit("webrtc_answer", {
          senderId: socket.id,
          answer,
        });
      }
    });
    
    // Handle WebRTC ICE candidates
    socket.on("webrtc_ice_candidate", (data) => {
      const { targetUserId, candidate } = data;
      if (onlineUsers.has(targetUserId)) {
        io.to(onlineUsers.get(targetUserId).socketId).emit("webrtc_ice_candidate", {
          senderId: socket.id,
          candidate,
        });
      }
    });
  },
  
  // Helper method to check if a user is online
  isUserOnline: (userId) => {
    return onlineUsers.has(userId);
  },
  
  // Helper method to get online users with their types
  getOnlineUsers: () => {
    return Array.from(onlineUsers.entries()).map(([userId, data]) => ({
      userId,
      userType: data.userType,
      isOnline: true
    }));
  }
};

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173", // Update for production
      credentials: true,
    },
  });

  // Handle connection event
  io.on("connection", (socket) => {
    socketController.handleConnection(socket, io);
  });

  return io;
};

export default initializeSocket;