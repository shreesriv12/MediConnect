  import { create } from "zustand";
  import { io } from "socket.io-client";
  import toast from "react-hot-toast";
import { axiosInstance } from "../utils/axois";
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const useClientAuthStore = create((set, get) => ({
    client: null,
    isLoading: false,
    error: null,
    isAuthenticated: false,
    isSigningUp: false,
    isLoggingIn: false,
    isUpdatingProfile: false,
    isCheckingAuth: true,
    onlineUsers: [],
    socket: null,
    
    clearError: () => set({ error: null }),
    
    register: async (formData) => {
      set({ isSigningUp: true, error: null });
      try {
        const response = await axiosInstance.post(`${API_URL}/client/register`, formData);
        set({ 
          isSigningUp: false, 
          client: response.data.data 
        });
        toast.success("Account created successfully! Please verify your OTP.");
        return { success: true, clientId: response.data.data._id };
      } catch (error) {
        const errorMessage = error.response?.data?.message || "Registration failed";
        set({ 
          isSigningUp: false, 
          error: errorMessage
        });
        toast.error(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    
    verifyOtp: async (clientId, otp) => {
      set({ isLoading: true, error: null });
      try {
        const response = await axiosInstance.post(`${API_URL}/client/verify-otp`, { clientId, otp });
        set({ isLoading: false });
        toast.success("OTP verified successfully!");
        return { success: true };
      } catch (error) {
        const errorMessage = error.response?.data?.message || "OTP verification failed";
        set({ 
          isLoading: false, 
          error: errorMessage
        });
        toast.error(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    
    verifyEmail: async (email, otp) => {
      set({ isLoading: true, error: null });
      try {
        const response = await axiosInstance.post(`${API_URL}/client/verify-email`, { email, otp });
        set({ isLoading: false });
        toast.success("Email verified successfully!");
        return { success: true, message: response.data.data.message };
      } catch (error) {
        const errorMessage = error.response?.data?.message || "Email verification failed";
        set({
          isLoading: false,
          error: errorMessage,
        });
        toast.error(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    
    login: async (credentials) => {
      set({ isLoggingIn: true, error: null });
      try {
        const response = await axiosInstance.post(`${API_URL}/client/login`, credentials, {
          withCredentials: true,
        });
        set({ 
          isLoggingIn: false, 
          client: response.data.data.client,
          isAuthenticated: true 
        });
        toast.success("Logged in successfully!");
        get().connectSocket();
        return { success: true };
      } catch (error) {
        const errorMessage = error.response?.data?.message || "Login failed";
        set({ 
          isLoggingIn: false, 
          error: errorMessage,
          isAuthenticated: false 
        });
        toast.error(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    
    logout: async () => {
      set({ isLoading: true, error: null });
      try {
        await axiosInstance.post(`${API_URL}/client/logout`, {}, { withCredentials: true });
        set({ 
          isLoading: false, 
          client: null,
          isAuthenticated: false 
        });
        toast.success("Logged out successfully!");
        get().disconnectSocket();
        return { success: true };
      } catch (error) {
        const errorMessage = error.response?.data?.message || "Logout failed";
        set({ 
          isLoading: false, 
          error: errorMessage,
          client: null,
          isAuthenticated: false
        });
        toast.error(errorMessage);
        return { success: false };
      }
    },
    
    checkAuth: async () => {
      set({ isCheckingAuth: true });
      try {
        const response = await axiosInstance.get(`${API_URL}/client/me`, { withCredentials: true });
        set({ 
          client: response.data.data,
          isAuthenticated: true
        });
        get().connectSocket();
        return { success: true };
      } catch (error) {
        console.log("Error in checkAuth:", error);
        set({ 
          client: null,
          isAuthenticated: false
        });
        return { success: false };
      } finally {
        set({ isCheckingAuth: false });
      }
    },
    
    updateProfile: async (formData) => {
      set({ isUpdatingProfile: true, error: null });
      try {
        const response = await axiosInstance.patch(`${API_URL}/client/update`, formData, {
          withCredentials: true,
        });
        set({ isUpdatingProfile: false, client: response.data.data });
        toast.success("Profile updated successfully!");
        return { success: true };
      } catch (error) {
        const errorMessage = error.response?.data?.message || "Profile update failed";
        set({ isUpdatingProfile: false, error: errorMessage });
        toast.error(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    
    connectSocket: () => {
      const { client, socket } = get();
      if (!client || socket?.connected) return;
      
      const newSocket = io(API_URL, {
        query: { clientId: client._id },
      });
      
      // Connect to socket
      newSocket.connect();
      
      // Set user as online
      newSocket.emit('user_online', client._id);
      
      // Store socket instance
      set({ socket: newSocket });
      
      // Set up event listeners
      newSocket.on("getOnlineUsers", (ids) => set({ onlineUsers: ids }));
      
      // Listen for online users updates
      newSocket.on('update_online_users', (users) => {
        set({ onlineUsers: users });
      });
      
      // Handle notifications
      newSocket.on('new_notification', (message) => {
        toast.success(message);
      });
      
      // Handle connection errors
      newSocket.on('connect_error', (err) => {
        console.error('Socket connection error:', err);
        toast.error('Connection issue. Will try again soon.');
      });
      
      return () => {
        newSocket.off("getOnlineUsers");
        newSocket.off("update_online_users");
        newSocket.off("new_notification");
        newSocket.off("connect_error");
      };
    },
    
    disconnectSocket: () => {
      const { socket } = get();
      if (socket?.connected) {
        socket.disconnect();
        set({ socket: null });
      }
    },
    
    // WebRTC call functions similar to chatStore
    initiateVideoCall: (doctorId) => {
      const { client, socket } = get();
      if (!client || !socket) return null;
      
      // Create a room ID (combination of both user IDs to ensure uniqueness)
      const roomId = [client._id, doctorId].sort().join('-');
      socket.emit('join_room', roomId);
      
      return roomId;
    },
    
    sendWebRTCOffer: (targetUserId, offer) => {
      const { socket } = get();
      if (!socket) return;
      
      socket.emit('webrtc_offer', { targetUserId, offer });
    },
    
    sendWebRTCAnswer: (targetUserId, answer) => {
      const { socket } = get();
      if (!socket) return;
      
      socket.emit('webrtc_answer', { targetUserId, answer });
    },
    
    sendICECandidate: (targetUserId, candidate) => {
      const { socket } = get();
      if (!socket) return;
      
      socket.emit('webrtc_ice_candidate', { targetUserId, candidate });
    },
    
    // Helper functions
    isUserOnline: (userId) => {
      return get().onlineUsers.includes(userId);
    }
  }));

  export default useClientAuthStore;