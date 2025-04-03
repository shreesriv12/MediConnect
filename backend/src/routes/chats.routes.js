import express from 'express';
import { isAuthenticated } from '../middlewares/auth.middleware.js';
import chatController from '../controllers/chats.controllers.js';
const router = express.Router();

router.use(isAuthenticated);

// Get conversation history between two users
router.get('/history/:userId', chatController.getChatHistory);

// Mark messages as seen
router.put('/mark-seen/:senderId', chatController.markMessagesAsSeen);

// Get list of chat contacts with last message
router.get('/contacts', chatController.getChatContacts);

// Save a new message
router.post('/message', chatController.saveMessage);

// Get unread messages count
router.get('/unread-count', chatController.getUnreadCount);

// Delete chat message (optional, for admin purposes)
router.delete('/message/:messageId', chatController.deleteMessage);

export default router;