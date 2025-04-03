import express from "express";
import "dotenv/config";  // Load environment variables
import cookieParser from "cookie-parser";
import cors from "cors";
import initializeSocket from "./src/utils/socket.js"; 
import http from "http";   
import axios from "axios";  // Import axios for API calls
import nodemailer from "nodemailer";
import connectDB from "./src/config/db.js";
const app = express();
const server = http.createServer(app); 

// Middleware
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));


const HUGGING_FACE_TOKEN = process.env.HUGGING_FACE_TOKEN;
// Changed to a conversational model that accepts plain text input
const MODEL_URL = 'https://api-inference.huggingface.co/models/facebook/blenderbot-400M-distill';

// Simple memory-based chat history
const chatHistory = {};

// Route to handle chat messages
app.post('/chat', async (req, res) => {
  try {
    const { userId, message } = req.body;
    
    if (!userId || !message) {
      return res.status(400).json({ error: 'Missing userId or message' });
    }
    
    // Initialize history for new users
    if (!chatHistory[userId]) {
      chatHistory[userId] = [];
    }
    
    // Add user message to history
    chatHistory[userId].push({ role: 'user', content: message });
    
    // Get response from Hugging Face
    const botResponse = await getHuggingFaceResponse(message);
    
    // Add bot response to history
    chatHistory[userId].push({ role: 'assistant', content: botResponse });
    
    // Send response back to client
    res.json({ response: botResponse });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

// Fixed function to get response from Hugging Face
async function getHuggingFaceResponse(message) {
  try {
    if (!HUGGING_FACE_TOKEN) {
      console.warn('No Hugging Face token provided, using fallback responses');
      return getSimpleResponse(message);
    }
    
    // FIXED: Sending the payload in the correct format for the model
    const response = await axios({
      method: 'post',
      url: MODEL_URL,
      headers: { 
        'Authorization': `Bearer ${HUGGING_FACE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      data: { 
        // Just send the raw text input - different models expect different inputs
        inputs: message
      },
      timeout: 10000
    });
    
    // Handle the response based on the model's output format
    if (response.data && typeof response.data === 'object') {
      // For models that return generated_text directly
      if (response.data.generated_text) {
        return response.data.generated_text;
      }
      // For models that return an array of responses
      else if (Array.isArray(response.data) && response.data[0]) {
        if (response.data[0].generated_text) {
          return response.data[0].generated_text;
        }
        // Some models return this format
        else if (response.data[0].text) {
          return response.data[0].text;
        }
      }
      // For conversation models like BlenderBot
      else if (response.data.conversation && response.data.conversation.generated_responses) {
        const responses = response.data.conversation.generated_responses;
        return responses[responses.length - 1];
      }
    }
    
    // If response format is unexpected, log it and use fallback
    console.warn('Unexpected response format:', response.data);
    return getSimpleResponse(message);
    
  } catch (error) {
    console.error('Hugging Face API error:', error.message);
    // If response contains error details, log them
    if (error.response && error.response.data) {
      console.error('API response data:', error.response.data);
    }
    return getSimpleResponse(message);
  }
}

// Simple rule-based fallback responses
function getSimpleResponse(message) {
  const lowercaseMessage = message.toLowerCase();
  
  if (lowercaseMessage.includes('hello') || lowercaseMessage.includes('hi')) {
    return 'Hello there! How can I help you today?';
  } else if (lowercaseMessage.includes('help')) {
    return 'I\'m here to help! What do you need assistance with?';
  } else if (lowercaseMessage.includes('bye') || lowercaseMessage.includes('goodbye')) {
    return 'Goodbye! Have a great day!';
  } else {
    return 'I\'m not sure I understand. Could you please rephrase that?';
  }
}

// Initialize WebSockets
const io = initializeSocket(server);

// Nodemailer Config
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Import Routes
import doctorRouter from './src/routes/doctor.routes.js';
import clientRouter from './src/routes/client.routes.js';
import paymentRouter from './src/routes/payment.routes.js';
import chatrouter from './src/routes/chats.routes.js'
// Use Routes
app.use("/doctor", doctorRouter);
app.use('/client', clientRouter);
app.use('/payments', paymentRouter);
app.use('/chat', chatrouter);


// Database Connection & Server Start
const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err);
  });
