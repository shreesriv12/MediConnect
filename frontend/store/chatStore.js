// stores/chatStore.js
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import axios from 'axios';
import { io } from 'socket.io-client';

const API_BASE = 'http://localhost:5000'; // Replace with your actual API base URL

const useChatStore = create(devtools((set, get) => ({
  // State
  socket: null,
  chats: [],
  currentChat: null,
  messages: [],
  isLoading: false,
  error: null,
  isConnected: false,
  unreadCount: 0,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalMessages: 0,
    hasMore: false
  },

  // Socket connection
  connectSocket: () => {
    const { socket, isConnected } = get();
    if (isConnected && socket) return;

    const token = localStorage.getItem("doctorAccessToken") || localStorage.getItem("clientAccessToken");
    const userId = localStorage.getItem("doctorId") || localStorage.getItem("clientId");
    const userType = localStorage.getItem("doctorAccessToken") ? "Doctor" : "Client";

    if (!token || !userId) {
      console.warn("Missing token or userId for socket auth");
      return;
    }

    const newSocket = io(API_BASE, {
      withCredentials: true,
      auth: { token, userType, userId },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    newSocket.on("connect", () => {
      console.log("Socket connected:", newSocket.id);
      set({ isConnected: true, socket: newSocket });

      const { currentChat } = get();
      if (currentChat) newSocket.emit("joinChat", currentChat._id);
    });

    newSocket.on("disconnect", () => {
      console.log("Socket disconnected");
      set({ isConnected: false, socket: null });
    });

    newSocket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
      set({ error: `Connection error: ${err.message}` });
    });

    // Handle incoming messages
    newSocket.on("newMessage", (message) => {
      console.log("New message received via socket:", message);
      const { currentChat, messages } = get();
      
      // Only add message if it belongs to the current chat
      if (currentChat && message.chatId === currentChat._id) {
        const messageExists = messages.some(msg => msg._id === message._id);
        if (!messageExists) {
          set({ messages: [...messages, message] });
        }
      }
      
      // Update chat list with new message
      get().updateChatWithNewMessage(message);
    });

    // Handle message status updates
    newSocket.on("messageDelivered", (data) => {
      console.log("Message delivered:", data);
      const { messages } = get();
      const updatedMessages = messages.map(msg => 
        msg._id === data.messageId 
          ? { ...msg, status: 'delivered' }
          : msg
      );
      set({ messages: updatedMessages });
    });

    newSocket.on("messageRead", (data) => {
      console.log("Message read:", data);
      const { messages } = get();
      const updatedMessages = messages.map(msg => 
        data.messageIds.includes(msg._id)
          ? { ...msg, isRead: true }
          : msg
      );
      set({ messages: updatedMessages });
    });

    // Handle typing indicators
    newSocket.on("userTyping", (data) => {
      console.log("User typing:", data);
      // You can implement typing indicators here
    });

    newSocket.on("userStoppedTyping", (data) => {
      console.log("User stopped typing:", data);
      // You can implement typing indicators here
    });

    set({ socket: newSocket });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },

  // Helper function to update chat list with new message
  updateChatWithNewMessage: (message) => {
    const { chats } = get();
    const updatedChats = chats.map(chat => {
      if (chat._id === message.chatId) {
        return {
          ...chat,
          lastMessage: {
            content: message.content,
            createdAt: message.createdAt,
            sender: message.sender
          },
          updatedAt: message.createdAt
        };
      }
      return chat;
    });
    
    // Sort chats by last message time
    updatedChats.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
    set({ chats: updatedChats });
  },

  // Chat operations
  getChatMessages: async (chatId, page = 1, limit = 50) => {
    console.log("getChatMessages called for chat:", chatId);
    set({ isLoading: true, error: null });

    try {
      const doctorToken = localStorage.getItem("doctorAccessToken");
      const clientToken = localStorage.getItem("clientAccessToken");
      const token = doctorToken || clientToken;

      if (!token) {
        console.error("[Chat] ❌ No auth token found.");
        throw new Error("No auth token found");
      }

      const userType = doctorToken ? "Doctor" : "Client";

      console.log("[Chat] ✅ Token found");
      console.log("[Chat] UserType:", userType);
      console.log("[Chat] Chat ID:", chatId);
      console.log("[Chat] Fetching page:", page, "Limit:", limit);

      const response = await axios.get(`${API_BASE}/chats/${chatId}/messages`, {
        params: { page, limit },
        headers: {
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
      });

      console.log("[Chat] ✅ Messages response received:", response.data);

      const { messages, pagination } = response.data.data;

      if (page === 1) {
        set({ messages, pagination });
      } else {
        const { messages: currentMessages } = get();
        set({
          messages: [...messages, ...currentMessages],
          pagination,
        });
      }

      return { messages, pagination };
    } catch (error) {
      console.error("[Chat] ❌ Error fetching messages:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to fetch messages";
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchUserChats: async () => {
    set({ isLoading: true, error: null });
    try {
      const doctorToken = localStorage.getItem("doctorAccessToken");
      const clientToken = localStorage.getItem("clientAccessToken");
      const token = doctorToken || clientToken;

      if (!token) {
        throw new Error("No auth token found");
      }

      const response = await axios.get(`${API_BASE}/chats/user-chats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
      });
      
      const chats = response.data.data;
      
      // Sort chats by last message time (most recent first)
      const sortedChats = chats.sort((a, b) => {
        const aTime = new Date(a.lastMessage?.createdAt || a.updatedAt || a.createdAt);
        const bTime = new Date(b.lastMessage?.createdAt || b.updatedAt || b.createdAt);
        return bTime - aTime;
      });
      
      set({ chats: sortedChats });

      const unreadCount = chats.reduce((count, chat) => {
        return count + (chat.unreadCount || 0);
      }, 0);
      set({ unreadCount });

      return sortedChats;
    } catch (error) {
      console.error("Error fetching user chats:", error);
      const errorMessage = error.response?.data?.message || "Failed to fetch chats";
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  sendMessage: async (chatId, content, messageType = 'text', file = null) => {
    if (!content.trim() && !file) {
      console.warn("Cannot send empty message");
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const doctorToken = localStorage.getItem("doctorAccessToken");
      const clientToken = localStorage.getItem("clientAccessToken");
      const token = doctorToken || clientToken;

      if (!token) {
        throw new Error("No auth token found");
      }

      const formData = new FormData();
      formData.append('chatId', chatId);
      formData.append('content', content);
      formData.append('messageType', messageType);

      if (file) {
        formData.append('file', file);
      }

      const response = await axios.post(`${API_BASE}/chats/send-message`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        },
        withCredentials: true,
      });

      const message = response.data.data;
      console.log("Message sent successfully:", message);

      // Add message to current messages if this is the active chat
      const { currentChat, messages, socket } = get();
      if (currentChat && currentChat._id === chatId) {
        const messageExists = messages.some(msg => msg._id === message._id);
        if (!messageExists) {
          set({ messages: [...messages, message] });
        }
      }

      // Emit socket event for real-time updates
      if (socket && socket.connected) {
        socket.emit('messageSent', {
          chatId,
          message
        });
      }

      // Update chat list
      get().updateChatWithNewMessage(message);

      return message;
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage = error.response?.data?.message || 'Failed to send message';
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  createOrGetChat: async (participantId, participantType) => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem("doctorAccessToken") || localStorage.getItem("clientAccessToken");
      if (!token) throw new Error("No auth token");

      console.log("Creating/getting chat with:", { participantId, participantType });

      const response = await axios.post(
        `${API_BASE}/chats/create-or-get`,
        { participantId, participantType },
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );

      const chat = response.data.data;
      console.log("Chat created/retrieved:", chat);
      
      set({ currentChat: chat });

      // Join the chat room via socket
      const { socket } = get();
      if (socket && socket.connected) {
        socket.emit('joinChat', chat._id);
      }

      // Fetch messages for this chat
      await get().getChatMessages(chat._id);

      return chat;
    } catch (error) {
      console.error("Error creating/getting chat:", error);
      const errorMessage = error.response?.data?.message || "Failed to create/get chat";
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  markMessagesAsRead: async (chatId, messageIds) => {
    try {
      const doctorToken = localStorage.getItem("doctorAccessToken");
      const clientToken = localStorage.getItem("clientAccessToken");
      const token = doctorToken || clientToken;

      if (!token) {
        throw new Error("No auth token found");
      }

      await axios.patch(`${API_BASE}/chats/${chatId}/mark-read`, {
        messageIds
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        withCredentials: true,
      });

      // Update local state
      const { messages, socket } = get();
      const updatedMessages = messages.map(msg => {
        if (messageIds.includes(msg._id)) {
          return { ...msg, isRead: true };
        }
        return msg;
      });
      set({ messages: updatedMessages });

      // Emit socket event
      if (socket && socket.connected) {
        socket.emit('messagesRead', {
          chatId,
          messageIds
        });
      }

    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  },

  deleteMessage: async (chatId, messageId) => {
    set({ isLoading: true, error: null });
    try {
      const doctorToken = localStorage.getItem("doctorAccessToken");
      const clientToken = localStorage.getItem("clientAccessToken");
      const token = doctorToken || clientToken;

      if (!token) {
        throw new Error("No auth token found");
      }

      await axios.delete(`${API_BASE}/chats/${chatId}/messages/${messageId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        withCredentials: true,
      });

      // Remove message from local state
      const { messages, socket } = get();
      const filteredMessages = messages.filter(msg => msg._id !== messageId);
      set({ messages: filteredMessages });

      // Emit socket event
      if (socket && socket.connected) {
        socket.emit('messageDeleted', {
          chatId,
          messageId
        });
      }

    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to delete message';
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  setCurrentChat: (chat) => {
    const { socket, currentChat } = get();
    
    // Leave previous chat room
    if (socket && socket.connected && currentChat) {
      socket.emit('leaveChat', currentChat._id);
    }
    
    set({ currentChat: chat, messages: [], error: null });
    
    // Join the new chat room
    if (socket && socket.connected && chat) {
      socket.emit('joinChat', chat._id);
    }
  },

  clearCurrentChat: () => {
    const { socket, currentChat } = get();
    if (socket && socket.connected && currentChat) {
      socket.emit('leaveChat', currentChat._id);
    }
    set({ currentChat: null, messages: [] });
  },

  clearError: () => set({ error: null }),

  // Auto-clear errors after 5 seconds
  setError: (error) => {
    set({ error });
    setTimeout(() => {
      const { error: currentError } = get();
      if (currentError === error) {
        set({ error: null });
      }
    }, 5000);
  },

  // Typing indicators
  startTyping: (chatId) => {
    const { socket } = get();
    if (socket && socket.connected) {
      socket.emit('startTyping', { chatId });
    }
  },

  stopTyping: (chatId) => {
    const { socket } = get();
    if (socket && socket.connected) {
      socket.emit('stopTyping', { chatId });
    }
  },

  // Utility functions
  getChatParticipant: (chat, currentUserId) => {
    if (!chat?.participants || !currentUserId) return null;
    return chat.participants.find(p => p?.userId?._id !== currentUserId);
  },

  isMessageFromCurrentUser: (message, currentUserId) => {
    if (!message?.sender || !currentUserId) return false;
    return message.sender.userId?._id === currentUserId || message.sender?.userId === currentUserId;
  },

  // Get formatted chat list for display
  getFormattedChats: (currentUserId) => {
    const { chats } = get();
    return chats.map(chat => {
      const otherParticipant = get().getChatParticipant(chat, currentUserId);
      return {
        ...chat,
        displayName: otherParticipant?.userId?.name || 'Unknown User',
        displayAvatar: otherParticipant?.userId?.avatar || otherParticipant?.userId?.profileImage,
        lastMessagePreview: chat.lastMessage?.content || 'No messages yet',
        lastMessageTime: chat.lastMessage?.createdAt || chat.createdAt
      };
    });
  }
})));

export default useChatStore;