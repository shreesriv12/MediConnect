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
router.route('/create-or-get').post(createOrGetChat);
router.route('/user-chats').get(getUserChats);
router.route('/send-message').post(upload.single('file'), sendMessage);
router.route('/:chatId/messages').get(getChatMessages);
router.route('/:chatId/mark-read').patch(markMessagesAsRead);
router.route('/:chatId/messages/:messageId').delete(deleteMessage);

export default router;