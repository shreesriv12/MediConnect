import Chat from "../models/chats.model.js";

const chatController = {
  // Get conversation history between two users
  getChatHistory: async (req, res) => {
    try {
      const currentUserId = req.user.id;
      const otherUserId = req.params.userId;
      const currentUserType = req.user.role === 'doctor' ? 'Doctor' : 'Client';
      const otherUserType = currentUserType === 'Doctor' ? 'Client' : 'Doctor';

      // Find all messages between these two users
      const messages = await Chat.find({
        $or: [
          { senderId: currentUserId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: currentUserId }
        ]
      }).sort({ timestamp: 1 });

      return res.status(200).json(messages);
    } catch (error) {
      console.error('Error fetching chat history:', error);
      return res.status(500).json({ message: 'Failed to fetch chat history' });
    }
  },

  // Mark messages as seen
  markMessagesAsSeen: async (req, res) => {
    try {
      const receiverId = req.user.id;
      const senderId = req.params.senderId;

      // Update all unseen messages from the sender to the current user
      await Chat.updateMany(
        { 
          senderId: senderId,
          receiverId: receiverId,
          seen: false
        },
        { seen: true }
      );

      return res.status(200).json({ message: 'Messages marked as seen' });
    } catch (error) {
      console.error('Error marking messages as seen:', error);
      return res.status(500).json({ message: 'Failed to mark messages as seen' });
    }
  },

  // Get list of chat contacts with last message
  getChatContacts: async (req, res) => {
    try {
          const currentUser = req.doctor || req.client;
          
          if (!currentUser) {
            return res.status(401).json({ message: 'User not authenticated' });
          }
          
          const currentUserId = currentUser._id; // Use _id instead of id
          const currentUserType = req.doctor ? 'Doctor' : 'Client';
                // Find all unique users the current user has chatted with
      const sentMessages = await Chat.find({ senderId: currentUserId })
        .distinct('receiverId');
      
      const receivedMessages = await Chat.find({ receiverId: currentUserId })
        .distinct('senderId');
      
      // Combine unique user IDs
      const contactIds = [...new Set([...sentMessages, ...receivedMessages])];
      
      // For each contact, get the most recent message
      const contacts = await Promise.all(contactIds.map(async (contactId) => {
        const lastMessage = await Chat.findOne({
          $or: [
            { senderId: currentUserId, receiverId: contactId },
            { senderId: contactId, receiverId: currentUserId }
          ]
        }).sort({ timestamp: -1 });
        
        // Count unread messages
        const unreadCount = await Chat.countDocuments({
          senderId: contactId,
          receiverId: currentUserId,
          seen: false
        });
        
        return {
          userId: contactId,
          lastMessage: lastMessage.message,
          timestamp: lastMessage.timestamp,
          unreadCount
        };
      }));
      
      // Sort contacts by most recent message
      contacts.sort((a, b) => b.timestamp - a.timestamp);
      
      return res.status(200).json(contacts);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      return res.status(500).json({ message: 'Failed to fetch contacts' });
    }
  },

  // Save a new message
  saveMessage: async (req, res) => {
    try {
      const { receiverId, message, receiverModel } = req.body;
      const senderId = req.doctor.id || req.client.id;
          
          if (!senderId) {
            return res.status(401).json({ message: 'User not authenticated' });
          }
      const senderModel = req.user.role === 'doctor' ? 'Doctor' : 'Client';

      if (!receiverId || !message) {
        return res.status(400).json({ message: 'Receiver ID and message are required' });
      }

      const newMessage = new Chat({
        senderId,
        receiverId,
        senderModel,
        receiverModel,
        message
      });

      await newMessage.save();
      
      return res.status(201).json(newMessage);
    } catch (error) {
      console.error('Error saving message:', error);
      return res.status(500).json({ message: 'Failed to save message' });
    }
  },

  // Get unread messages count
  getUnreadCount: async (req, res) => {
    try {
      const userId = req.user.id;
      
      const unreadCount = await Chat.countDocuments({
        receiverId: userId,
        seen: false
      });
      
      return res.status(200).json({ unreadCount });
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return res.status(500).json({ message: 'Failed to fetch unread count' });
    }
  },

  // Delete chat message (optional, for admin purposes)
  deleteMessage: async (req, res) => {
    try {
      const messageId = req.params.messageId;
      const userId = req.user.id;
      
      // Find the message first to verify ownership
      const message = await Chat.findById(messageId);
      
      if (!message) {
        return res.status(404).json({ message: 'Message not found' });
      }
      
      // Only allow deletion if user is the sender or has admin privileges
      if (message.senderId.toString() !== userId && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized to delete this message' });
      }
      
      await Chat.findByIdAndDelete(messageId);
      
      return res.status(200).json({ message: 'Message deleted successfully' });
    } catch (error) {
      console.error('Error deleting message:', error);
      return res.status(500).json({ message: 'Failed to delete message' });
    }
  }
};

export default chatController;