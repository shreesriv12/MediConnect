import { create } from "zustand";
import { axiosInstance } from "../utils/axois";
import toast from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const useChatStore = create((set, get) => ({
  activeSessions: [],
  doctorsList: [],
  activeSession: null,
  messages: [],
  isLoading: false,
  isLoadingDoctors: false,
  isLoadingMessages: false,
  error: null,
  unreadCount: 0,
  
  // Clear any errors
  clearError: () => set({ error: null }),
  
  // Fetch available doctors
  fetchDoctors: async () => {
    set({ isLoadingDoctors: true, error: null });
    try {
      const response = await axiosInstance.get(`${API_URL}/client/doctors`, {
        withCredentials: true
      });
      
      set({ 
        doctorsList: response.data.data || [],
        isLoadingDoctors: false
      });
      
      return { success: true, doctors: response.data.data };
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to fetch doctors";
      set({ 
        isLoadingDoctors: false, 
        error: errorMessage 
      });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  },
  
  // Fetch active chat sessions
  fetchActiveSessions: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.get(
        `${API_URL}/chat/sessions?status=active,requested`, 
        { withCredentials: true }
      );
      
      set({ 
        activeSessions: response.data || [],
        isLoading: false 
      });
      
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to fetch chat sessions";
      set({ 
        isLoading: false, 
        error: errorMessage 
      });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  },
  
  // Get chat history for a specific session
  fetchChatHistory: async (sessionId) => {
    set({ isLoadingMessages: true, error: null });
    try {
      const response = await axiosInstance.get(
        `${API_URL}/chat/sessions/${sessionId}/messages`, 
        { withCredentials: true }
      );
      
      set({ 
        messages: response.data || [],
        isLoadingMessages: false,
        activeSession: sessionId
      });
      
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to fetch chat messages";
      set({ 
        isLoadingMessages: false, 
        error: errorMessage 
      });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  },
  
  // Get unread message count
  fetchUnreadCount: async () => {
    try {
      const response = await axiosInstance.get(
        `${API_URL}/chat/unread`,
        { withCredentials: true }
      );
      
      set({ unreadCount: response.data.unreadCount || 0 });
      return { success: true };
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
      return { success: false };
    }
  },
  
  // Socket event handlers
  handleNewMessage: (message) => {
    const { messages, activeSession } = get();
    
    // Only update messages if we're in the correct session
    if (activeSession === message.sessionId) {
      set({ messages: [...messages, message] });
    }
    
    // Update unread count if the message is not from the current user
    get().fetchUnreadCount();
  },
  
  handleChatRequest: (request) => {
    const { activeSessions } = get();
    
    // Add to active sessions if not already there
    if (!activeSessions.find(session => session._id === request.sessionId)) {
      set({ 
        activeSessions: [
          {
            _id: request.sessionId,
            status: 'requested',
            user: request.client,
            lastActivity: request.timestamp
          },
          ...activeSessions
        ]
      });
    }
    
    toast.success(`New chat request from ${request.client.name}`);
  },
  
  handleChatResponse: (response) => {
    const { activeSessions } = get();
    
    // Update session status
    const updatedSessions = activeSessions.map(session => {
      if (session._id === response.sessionId) {
        return { ...session, status: response.status };
      }
      return session;
    });
    
    set({ activeSessions: updatedSessions });
    
    if (response.status === 'active') {
      toast.success(`Chat request accepted by ${response.doctorName}`);
    } else if (response.status === 'rejected') {
      toast.error(`Chat request rejected by ${response.doctorName}`);
    }
  },
  
  handleChatStarted: (data) => {
    set({ activeSession: data.sessionId });
    toast.success('Chat session started');
  },
  
  handleChatEnded: (data) => {
    const { activeSessions, activeSession } = get();
    
    // Update session status
    const updatedSessions = activeSessions.map(session => {
      if (session._id === data.sessionId) {
        return { ...session, status: 'ended' };
      }
      return session;
    });
    
    set({ activeSessions: updatedSessions });
    
    // Clear active session if it was ended
    if (activeSession === data.sessionId) {
      set({ activeSession: null });
    }
    
    toast.info('Chat session ended');
  },
  
  // Socket actions - to be connected to socket events
  requestChat: (socket, doctorId) => {
    if (!socket) {
      toast.error('Not connected to chat server');
      return;
    }
    
    socket.emit('request_chat', { doctorId });
    toast.success('Chat request sent');
  },
  
  respondToChat: (socket, sessionId, action) => {
    if (!socket) {
      toast.error('Not connected to chat server');
      return;
    }
    
    socket.emit('respond_to_chat_request', { sessionId, action });
  },
  
  sendMessage: (socket, sessionId, message) => {
    if (!socket || !sessionId) {
      toast.error('Not connected to chat server');
      return;
    }
    
    socket.emit('send_message', { sessionId, message });
  },
  
  endChat: (socket, sessionId) => {
    if (!socket) {
      toast.error('Not connected to chat server');
      return;
    }
    
    socket.emit('end_chat', { sessionId });
  },
  
  // Request active sessions via socket
  requestActiveSessions: (socket) => {
    if (!socket) return;
    
    socket.emit('get_active_sessions');
  },
  
  // Request chat history via socket
  requestChatHistory: (socket, sessionId) => {
    if (!socket) return;
    
    socket.emit('get_chat_history', { sessionId });
    set({ activeSession: sessionId });
  },
  
  // Handle socket.io response for active sessions
  handleActiveSessions: (data) => {
    set({ activeSessions: data.sessions || [] });
  },
  
  // Handle socket.io response for chat history
  handleChatHistory: (data) => {
    set({ 
      messages: data.messages || [],
      activeSession: data.sessionId
    });
  },
  
  // Clean up when changing users
  resetStore: () => {
    set({
      activeSessions: [],
      activeSession: null,
      messages: [],
      unreadCount: 0
    });
  }
}));

export default useChatStore;