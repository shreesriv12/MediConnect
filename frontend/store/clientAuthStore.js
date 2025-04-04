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
      // Use withCredentials to ensure cookies are sent/received
      const response = await axiosInstance.post(`${API_URL}/client/register`, formData, {
        withCredentials: true
      });
      
      // Store client data - cookies are automatically handled by the browser
      const clientData = response.data.data;
      
      // Only store non-sensitive user info in localStorage if needed for UI
      localStorage.setItem("clientId", clientData._id);
      
      set({ 
        isSigningUp: false, 
        client: clientData,
        isAuthenticated: true 
      });
      
      toast.success("Account created successfully! Please verify your OTP.");
      
      // Connect socket after registration if user is already verified
      if (clientData.verified) {
        get().connectSocket();
      }
      
      return { success: true, clientId: clientData._id };
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
      // Use withCredentials to ensure cookies are sent/received
      const response = await axiosInstance.post(
        `${API_URL}/client/verify-otp`, 
        { clientId, otp },
        { withCredentials: true }
      );
      
      // After OTP verification, tokens are set as HTTP-only cookies by the backend
      set({ 
        isLoading: false,
        isAuthenticated: true 
      });
      
      // Connect socket after verification
      get().connectSocket();
      
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
      // Use withCredentials to ensure cookies are sent/received
      const response = await axiosInstance.post(
        `${API_URL}/client/verify-email`, 
        { email, otp },
        { withCredentials: true }
      );
      
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
      // Always use withCredentials to ensure cookies are sent/received
      const response = await axiosInstance.post(
        `${API_URL}/client/login`, 
        credentials, 
        { withCredentials: true }
      );
  
      const { client } = response.data.data;
      
      // Store minimal user info in localStorage
      localStorage.setItem("clientId", client._id);
  
      set({
        isLoggingIn: false,
        client: client,
        isAuthenticated: true,
      });
  
      toast.success("Logged in successfully!");
      get().connectSocket();
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Login failed";
      set({
        isLoggingIn: false,
        error: errorMessage,
        isAuthenticated: false,
      });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  },
  
  logout: async () => {
    set({ isLoading: true, error: null });
    try {
      // Use withCredentials to ensure cookies are sent/received
      await axiosInstance.post(
        `${API_URL}/client/logout`, 
        {}, 
        { withCredentials: true }
      );
      
      // Remove any client data from localStorage
      localStorage.removeItem("clientId");
      
      set({ 
        isLoading: false, 
        client: null,
        isAuthenticated: false 
      });
      
      get().disconnectSocket();
      toast.success("Logged out successfully!");
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Logout failed";
      
      // Even if logout API fails, clear local state
      localStorage.removeItem("clientId");
      
      set({ 
        isLoading: false, 
        error: errorMessage,
        client: null,
        isAuthenticated: false
      });
      
      get().disconnectSocket();
      toast.error(errorMessage);
      return { success: false };
    }
  },
  
  checkAuth: async () => {
    set({ isCheckingAuth: true });
    try {
      // Use withCredentials to ensure cookies are sent/received
      const response = await axiosInstance.get(
        `${API_URL}/client/me`, 
        { withCredentials: true }
      );
      
      set({ 
        client: response.data.data,
        isAuthenticated: true
      });
      
      get().connectSocket();
      return { success: true };
    } catch (error) {
      console.log("Error in checkAuth:", error);
      
      // Clear any stored client data if authentication check fails
      localStorage.removeItem("clientId");
      
      set({ 
        client: null,
        isAuthenticated: false
      });
      
      return { success: false };
    } finally {
      set({ isCheckingAuth: false });
    }
  },
  
  connectSocket: () => {
    const { client, socket } = get();
    if (!client || socket?.connected) return;
  
    const newSocket = io(API_URL, {
      transports: ["websocket", "polling"],
      withCredentials: true,
    });
  
    // Handle successful connection
    newSocket.on("connect", () => {
      console.log("Socket connected:", newSocket.id);
  
      // Emit user_online only after connected
      newSocket.emit("user_online", client._id);
    });
  
    // Store socket instance
    set({ socket: newSocket });
  
    // Event listeners
    newSocket.on("getOnlineUsers", (ids) => set({ onlineUsers: ids }));
    newSocket.on("update_online_users", (users) => set({ onlineUsers: users }));
    newSocket.on("new_notification", (message) => {
      toast.success(message);
    });
    newSocket.on("connect_error", (err) => {
      console.error("Socket connection error:", err);
      toast.error("Connection issue. Will try again soon.");
    });
  
    return () => {
      newSocket.off("getOnlineUsers");
      newSocket.off("update_online_users");
      newSocket.off("new_notification");
      newSocket.off("connect_error");
      newSocket.off("connect");
    };
  },
  
  
  disconnectSocket: () => {
    const { socket } = get();
    if (socket?.connected) {
      socket.disconnect();
      set({ socket: null });
    }
  },
  
  // WebRTC call functions remain the same
  initiateVideoCall: (doctorId) => {
    const { client, socket } = get();
    if (!client || !socket) return null;
    
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