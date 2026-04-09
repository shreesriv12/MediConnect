// lib/socket.js
import { io } from 'socket.io-client';

const ENDPOINT = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// This creates the socket instance with proper authentication
const createSocket = (token, userType, userId) => {
  const socket = io(ENDPOINT, {
    withCredentials: true,
    auth: {
      token,
      userType,
      userId
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
    timeout: 20000
  });

  return socket;
};

export default createSocket;
