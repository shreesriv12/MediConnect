import { Server } from "socket.io";

const onlineUsers = new Map(); // Stores online users (socketId -> userId)

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:5173", // Update for production
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Handle user login & track online users
    socket.on("user_online", (userId) => {
      onlineUsers.set(userId, socket.id);
      console.log(`User ${userId} is online with socket ID: ${socket.id}`);
    });

    // Handle joining a chat room
    socket.on("join_room", (room) => {
      socket.join(room);
      console.log(`User ${socket.id} joined room: ${room}`);
    });

    // Handle sending messages
    socket.on("send_message", (data) => {
      const { senderId, receiverId, message } = data;

      // Check if the receiver is online
      if (onlineUsers.has(receiverId)) {
        io.to(onlineUsers.get(receiverId)).emit("receive_message", data);
      }
    });

    // Handle appointment notifications
    socket.on("schedule_notification", (data) => {
      const { doctorId, message } = data;

      // Send notification only if doctor is online
      if (onlineUsers.has(doctorId)) {
        io.to(onlineUsers.get(doctorId)).emit("new_notification", message);
      }
    });

    // Handle user disconnection
    socket.on("disconnect", () => {
      const userId = [...onlineUsers.entries()].find(([_, id]) => id === socket.id)?.[0];

      if (userId) {
        onlineUsers.delete(userId);
        console.log(`User ${userId} disconnected`);
      }
    });
  });

  return io;
};

export default initializeSocket;
