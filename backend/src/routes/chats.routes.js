import express from 'express';
import {ChatMessage,ChatSession} from '../models/chats.model.js'
import { isAuthenticated } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Get all chat sessions for the authenticated user
router.get('/sessions', isAuthenticated, async (req, res) => {
  try {
    const userType = req.user.userType;
    const userId = req.user._id;
    
    let query = {};
    
    if (userType === 'Client') {
      query = { clientId: userId };
    } else if (userType === 'Doctor') {
      query = { doctorId: userId };
    } else {
      return res.status(400).json({ message: 'Invalid user type' });
    }
    
    // Add filters from query parameters
    const { status } = req.query;
    if (status) {
      query.status = status;
    }
    
    const sessions = await ChatSession.find(query)
      .populate(userType === 'Client' ? 'doctorId' : 'clientId', 'name avatar')
      .sort({ lastActivity: -1 });
      
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    res.status(500).json({ message: 'Failed to fetch chat sessions' });
  }
});

// Get a specific chat session by ID
router.get('/sessions/:sessionId', isAuthenticated, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userType = req.user.userType;
    const userId = req.user._id;
    
    // Find the session
    const session = await ChatSession.findById(sessionId)
      .populate('clientId', 'name avatar')
      .populate('doctorId', 'name avatar');
      
    if (!session) {
      return res.status(404).json({ message: 'Chat session not found' });
    }
    
    // Check if user is part of this chat
    const isAuthorized = (userType === 'Client' && session.clientId._id.toString() === userId.toString()) ||
                         (userType === 'Doctor' && session.doctorId._id.toString() === userId.toString());
                         
    if (!isAuthorized) {
      return res.status(403).json({ message: 'You are not authorized to access this chat session' });
    }
    
    res.json(session);
  } catch (error) {
    console.error('Error fetching chat session:', error);
    res.status(500).json({ message: 'Failed to fetch chat session' });
  }
});

// Get messages for a specific chat session
router.get('/sessions/:sessionId/messages', isAuthenticated, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userType = req.user.userType;
    const userId = req.user._id;
    
    // Find the session
    const session = await ChatSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Chat session not found' });
    }
    
    // Check if user is part of this chat
    const isAuthorized = (userType === 'Client' && session.clientId.toString() === userId.toString()) ||
                         (userType === 'Doctor' && session.doctorId.toString() === userId.toString());
                         
    if (!isAuthorized) {
      return res.status(403).json({ message: 'You are not authorized to access messages for this chat session' });
    }
    
    // Get messages for this session
    const messages = await ChatMessage.find({
      $or: [
        { senderId: session.clientId, receiverId: session.doctorId },
        { senderId: session.doctorId, receiverId: session.clientId }
      ]
    }).sort({ timestamp: 1 });
    
    // Mark messages as read
    if (messages.length > 0) {
      await ChatMessage.updateMany(
        { 
          receiverId: userId,
          read: false
        },
        { read: true }
      );
    }
    
    res.json(messages);
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    res.status(500).json({ message: 'Failed to fetch chat messages' });
  }
});

// Get unread message count for the user
router.get('/unread', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const count = await ChatMessage.countDocuments({ 
      receiverId: userId,
      read: false
    });
    
    res.json({ unreadCount: count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ message: 'Failed to fetch unread message count' });
  }
});

export default router;