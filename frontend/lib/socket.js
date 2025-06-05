// utils/socket.js
import { io } from 'socket.io-client';

const ENDPOINT = 'http://localhost:5000'; // Replace with your backend URL
const socket = io(ENDPOINT, {
  withCredentials: true,
  transports: ['websocket'],
});

export default socket;
