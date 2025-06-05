// routes/chat.routes.js
import { Router } from 'express';
import {
  createOrGetChat,
  getUserChats,
  sendMessage,
  getChatMessages,
  markMessagesAsRead,
  deleteMessage
} from '../controllers/chat.controller.js';
import { isAuthenticated } from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/multer.middleware.js';

const router = Router();

// Apply authentication middleware to all routes
router.use(isAuthenticated);

// Chat routes
router.post('/create-or-get',isAuthenticated,createOrGetChat);
router.get('/user-chats',isAuthenticated,getUserChats);
router.post('/send-message',isAuthenticated,upload.single('file'), sendMessage);
router.get('/:chatId/messages',isAuthenticated,getChatMessages);
router.patch('/:chatId/mark-read',isAuthenticated,markMessagesAsRead);
router.delete('/:chatId/messages/:messageId',isAuthenticated,deleteMessage);

export default router;