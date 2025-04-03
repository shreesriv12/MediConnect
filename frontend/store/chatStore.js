import create from 'zustand';
import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api/chats'; // Update with your API URL

const useChatStore = create((set) => ({
  chats: [],              // Stores chat messages
  contacts: [],           // Stores contact list
  unreadCount: 0,         // Count of unread messages
  loading: false,         // Loading state
  error: null,            // Error state

  // 📥 Fetch chat history (works for both doctor-client and client-doctor)
  fetchChatHistory: async (otherUserId, otherUserModel) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.get(`${BASE_URL}/history/${otherUserId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      set({ chats: response.data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  // 💬 Send a new message (dynamic sender/receiver)
  sendMessage: async (receiverId, message, receiverModel) => {
    set({ loading: true });
    try {
      const senderModel = localStorage.getItem('role'); // 'Doctor' or 'Client'
      const senderId = localStorage.getItem('userId');

      const response = await axios.post(`${BASE_URL}/messages`, {
        receiverId,
        message,
        senderModel,
        receiverModel
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      set((state) => ({
        chats: [...state.chats, response.data],
        loading: false
      }));
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  // 📇 Fetch contacts (shows both doctor and client contacts)
  fetchContacts: async () => {
    set({ loading: true });
    try {
      const response = await axios.get(`${BASE_URL}/contacts`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      set({ contacts: response.data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  // 👁️ Mark messages as seen
  markMessagesAsSeen: async (senderId) => {
    try {
      await axios.patch(`${BASE_URL}/seen/${senderId}`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      set((state) => ({
        chats: state.chats.map((chat) =>
          chat.senderId === senderId ? { ...chat, seen: true } : chat
        )
      }));
    } catch (error) {
      set({ error: error.message });
    }
  },

  // 🔔 Get unread message count
  getUnreadCount: async () => {
    try {
      const response = await axios.get(`${BASE_URL}/unread-count`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      set({ unreadCount: response.data.unreadCount });
    } catch (error) {
      set({ error: error.message });
    }
  },

  // 🗑️ Delete a message
  deleteMessage: async (messageId) => {
    try {
      await axios.delete(`${BASE_URL}/message/${messageId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      set((state) => ({
        chats: state.chats.filter((chat) => chat._id !== messageId)
      }));
    } catch (error) {
      set({ error: error.message });
    }
  }
}));

export default useChatStore;
