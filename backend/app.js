import express from "express";
import "dotenv/config";  // Load environment variables
import cookieParser from "cookie-parser";
import cors from "cors";
import http from "http";   
import axios from "axios";  // For Hugging Face
import nodemailer from "nodemailer";
import connectDB from "./src/config/db.js";
import { Server } from "socket.io";
import { initializeSocket } from "./src/utils/socketHandlers.js";
import { initiateCall } from "./src/controllers/video.controller.js";
import  clinicRoutes from './src/routes/clinic.routes.js';
import { startAppointmentReminderCron } from "./src/jobs/appointmentReminder.cron.js";
// Express and HTTP server setup
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

const normalizeOrigin = (origin) => origin?.trim().replace(/\/+$/, "");

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(normalizeOrigin(origin))) {
      return callback(null, true);
    }

    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// === Middleware Setup ===

// Parse cookies early
app.use(cookieParser());

// Serve static files (e.g. uploaded avatars)
app.use(express.static("public"));

// Enable CORS - Allow multiple origins for dev and production
const allowedOrigins = [
  "http://localhost:5173",           // Local dev - Vite
  "http://localhost:3000",           // Alternative local port
  "http://localhost:5000",           // Backend local
  "https://mediconnect-bay.vercel.app", // Production frontend
  process.env.CORS_ORIGIN            // Environment variable (if set)
].filter(Boolean); // Remove undefined values

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
}));

// These must come BEFORE routes
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

// === Hugging Face Chat Endpoint ===
const HUGGING_FACE_TOKEN = process.env.HUGGING_FACE_TOKEN;
const MODEL_URL = 'https://api-inference.huggingface.co/models/facebook/blenderbot-400M-distill';
const chatHistory = {};

app.post('/chat', async (req, res) => {
  try {
    const { userId, message } = req.body;
    if (!userId || !message) {
      return res.status(400).json({ error: 'Missing userId or message' });
    }

    if (!chatHistory[userId]) chatHistory[userId] = [];
    chatHistory[userId].push({ role: 'user', content: message });

    const botResponse = await getHuggingFaceResponse(message);
    chatHistory[userId].push({ role: 'assistant', content: botResponse });

    res.json({ response: botResponse });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

async function getHuggingFaceResponse(message) {
  try {
    if (!HUGGING_FACE_TOKEN) return getSimpleResponse(message);
    
    const response = await axios({
      method: 'post',
      url: MODEL_URL,
      headers: { 
        'Authorization': `Bearer ${HUGGING_FACE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      data: { inputs: message },
      timeout: 10000
    });

    if (response.data?.generated_text) return response.data.generated_text;
    if (Array.isArray(response.data) && response.data[0]?.generated_text) return response.data[0].generated_text;
    if (Array.isArray(response.data) && response.data[0]?.text) return response.data[0].text;
    if (response.data?.conversation?.generated_responses) {
      const responses = response.data.conversation.generated_responses;
      return responses[responses.length - 1];
    }

    return getSimpleResponse(message);
  } catch (error) {
    console.error('Hugging Face API error:', error.message);
    return getSimpleResponse(message);
  }
}

function getSimpleResponse(message) {
  const msg = message.toLowerCase();
  if (msg.includes('hello') || msg.includes('hi')) return 'Hello there! How can I help you today?';
  if (msg.includes('help')) return 'I\'m here to help! What do you need assistance with?';
  if (msg.includes('bye')) return 'Goodbye! Have a great day!';
  return 'I\'m not sure I understand. Could you please rephrase that?';
}

// === Nodemailer Config ===
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});


// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"]
  },
  transports: ['websocket', 'polling']
});

// Initialize socket handlers
initializeSocket(io);

// Make io available in request object
app.use((req, res, next) => {
  req.io = io;
  next();
});



// === Route Imports ===
import doctorRouter from './src/routes/doctor.routes.js';
import clientRouter from './src/routes/client.routes.js';
import chatRouter from './src/routes/chat.routes.js';
import videoCallRouter from './src/routes/video.routes.js'; 
import medicineRoutes from './src/routes/medicine.routes.js';
import scheduleRoutes from './src/routes/schedule.routes.js';
import slotRequestRoutes from './src/routes/slotRequest.routes.js'
import paymentRoutes from './src/routes/payment.routes.js'
import uploadRouter from './src/routes/upload.routes.js';
import agentRouter from './src/routes/agent.routes.js';
import notificationRouter from './src/routes/notification.routes.js';

// === Route Usage ===
app.use("/doctor", doctorRouter);
app.use("/client", clientRouter);
app.use("/schedule", scheduleRoutes);
app.use("/chats", chatRouter);
app.use("/api/chats", chatRouter);
app.use("/video-call", videoCallRouter);
app.use("/clinics", clinicRoutes); 
app.use("/medicines", medicineRoutes);
app.use('/slots', slotRequestRoutes);
app.use('/payments', paymentRoutes);
app.use('/agent', agentRouter);
app.use('/notifications', notificationRouter);
app.use('/api', uploadRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});


// Error handling middleware
app.use((err, req, res, next) => {
  const statusCode = err.code === "LIMIT_FILE_SIZE" ? 413 : err.statusCode || 500;
  const message =
    err.code === "LIMIT_FILE_SIZE"
      ? "File is too large for upload"
      : err.message || "Internal Server Error";
  
  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});



// === Start Server ===
connectDB()
  .then(() => {
    startAppointmentReminderCron();
    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err);
  });
