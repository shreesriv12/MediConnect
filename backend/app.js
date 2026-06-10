import express from "express";
import "dotenv/config";  // Load environment variables
import cookieParser from "cookie-parser";
import cors from "cors";
import http from "http";   
import axios from "axios";
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
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL,
  ...(process.env.ALLOWED_ORIGINS || "").split(","),
  ...(process.env.CORS_ORIGIN || "").split(","),
  "http://localhost:5173",
  "http://localhost:3000",
]
  .filter(Boolean)
  .map(normalizeOrigin);

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

app.use(cors(corsOptions));

// These must come BEFORE routes
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

// === Dashboard Chatbot Endpoint ===
const chatHistory = {};
const MAX_CHATBOT_HISTORY = 80;
const GROQ_CHAT_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const GROQ_CHAT_BASE_URL =
  process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1";
const DASHBOARD_CHAT_TIMEOUT_MS =
  Number(process.env.DASHBOARD_CHAT_TIMEOUT_MS) || 15000;

const createChatbotMessage = (role, content) => ({
  id: `${role}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  role,
  content,
  createdAt: new Date().toISOString(),
});

const getChatbotHistory = (userId) => chatHistory[userId] || [];

const appendChatbotMessages = (userId, messages) => {
  chatHistory[userId] = [...getChatbotHistory(userId), ...messages].slice(
    -MAX_CHATBOT_HISTORY
  );
  return chatHistory[userId];
};

app.post('/chat', async (req, res) => {
  try {
    const { userId, message } = req.body;
    const trimmedMessage = String(message || "").trim();

    if (!userId || !trimmedMessage) {
      return res.status(400).json({ error: 'Missing userId or message' });
    }

    const userMessage = createChatbotMessage('user', trimmedMessage);
    const botResponse = await getDashboardAssistantResponse(
      trimmedMessage,
      getChatbotHistory(userId)
    );
    const assistantMessage = createChatbotMessage('assistant', botResponse);
    const history = appendChatbotMessages(userId, [userMessage, assistantMessage]);

    res.json({
      response: botResponse,
      message: assistantMessage,
      history,
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

app.get('/chat/:userId/history', (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  res.json({
    messages: getChatbotHistory(userId),
  });
});

async function getDashboardAssistantResponse(message, history = []) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return getSimpleResponse(message);
    }
    
    const recentHistory = history
      .slice(-12)
      .filter((item) => item?.content)
      .map((item) => ({
        role: item.role === "user" ? "user" : "assistant",
        content: item.content,
      }));

    const response = await axios.post(
      `${GROQ_CHAT_BASE_URL.replace(/\/+$/, "")}/chat/completions`,
      {
        model: GROQ_CHAT_MODEL,
        temperature: 0.2,
        max_tokens: Number(process.env.DASHBOARD_CHAT_MAX_TOKENS) || 500,
        messages: [
          {
            role: "system",
            content:
              "You are MediConnect Assistant inside a healthcare dashboard. Help users navigate real app actions: booking appointments, viewing schedules, opening Messages, starting video calls, finding doctors, nearby clinics, medicine search, and profile/payment pages. Keep replies concise, friendly, and plain text with no Markdown. Do not invent buttons or pages. Do not diagnose; for urgent symptoms, advise contacting a doctor or emergency services.",
          },
          ...recentHistory,
          {
            role: "user",
            content: message,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: DASHBOARD_CHAT_TIMEOUT_MS,
      }
    );

    const content = response.data?.choices?.[0]?.message?.content?.trim();
    if (content) {
      return content;
    }

    return getSimpleResponse(message);
  } catch (error) {
    console.error("Groq dashboard chat error:", {
      message: error.response?.data?.error?.message || error.message,
    });
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
