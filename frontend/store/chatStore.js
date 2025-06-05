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

  // Chat operations
getChatMessages: async (chatId, page = 1, limit = 50) => {
    console.log("getChatMessages called");
  set({ isLoading: true, error: null });

  try {
    const doctorToken = localStorage.getItem("doctorAccessToken");
    const clientToken = localStorage.getItem("clientAccessToken");
    console.log(doctorToken, clientToken);
    const token = doctorToken || clientToken;

    if (!token) {
      console.error("[Chat] ❌ No auth token found.");
      throw new Error("No auth token found");
    }

    const userType = doctorToken ? "Doctor" : "Client";

    console.log("[Chat] ✅ Token found:", token);
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

    console.log("[Chat] ✅ Response received:", response);

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
    const response = await axios.get(`${API_BASE}/chats/user-chats`, {
      withCredentials: true,
    });
    const chats = response.data.data;
    set({ chats });

    const unreadCount = chats.reduce((count, chat) => {
      return count + (chat.unreadCount || 0);
    }, 0);
    set({ unreadCount });

    return chats;
  } catch (error) {
    const errorMessage = error.response?.data?.message || "Failed to fetch chats";
    set({ error: errorMessage });
    throw error;
  } finally {
    set({ isLoading: false });
  }
},

sendMessage: async (chatId, content, messageType = 'text', file = null) => {
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
        Authorization: `Bearer ${token}`   // Add this line to send token
      },
      withCredentials: true,
    });

    const message = response.data.data;

    // Add message to current messages if this is the active chat
    const { currentChat, messages } = get();
    if (currentChat && currentChat._id === chatId) {
      set({ messages: [...messages, message] });
    }

    return message;
  } catch (error) {
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

    const response = await axios.post(
      `${API_BASE}/chats/create-or-get`,
      { participantId, participantType },   // single values, NOT array
      {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      }
    );

    const chat = response.data.data;
    set({ currentChat: chat });

    return chat;
  } catch (error) {
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
    const { messages } = get();
    const updatedMessages = messages.map(msg => {
      if (messageIds.includes(msg._id)) {
        return { ...msg, isRead: true };
      }
      return msg;
    });
    set({ messages: updatedMessages });

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
    const { messages } = get();
    const filteredMessages = messages.filter(msg => msg._id !== messageId);
    set({ messages: filteredMessages });

  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Failed to delete message';
    set({ error: errorMessage });
    throw error;
  } finally {
    set({ isLoading: false });
  }
},


  setCurrentChat: (chat) => {
    set({ currentChat: chat, messages: [] });
    
    // Join the chat room
    const { socket } = get();
    if (socket && chat) {
      socket.emit('joinChat', chat._id);
    }
  },

  clearCurrentChat: () => {
    const { socket, currentChat } = get();
    if (socket && currentChat) {
      socket.emit('leaveChat', currentChat._id);
    }
    set({ currentChat: null, messages: [] });
  },

  clearError: () => set({ error: null }),

  // Utility functions
  getChatParticipant: (chat, currentUserId) => {
    return chat.participants.find(p => p.userId._id !== currentUserId);
  },

  isMessageFromCurrentUser: (message, currentUserId) => {
    return message.sender.userId._id === currentUserId;
  }
})));

export default useChatStore;