import { create } from "zustand";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import { axiosInstance } from "../utils/axois";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const useDoctorAuthStore = create((set, get) => ({
  doctor: null,
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
      const response = await axiosInstance.post(`${API_URL}/doctor/register`, formData, {
        withCredentials: true
      });
      
      const doctorData = response.data.data;
      
      // Store doctor ID in localStorage for UI persistence
      localStorage.setItem("doctorId", doctorData._id);
      
      set({ 
        isSigningUp: false, 
        doctor: doctorData,
        isAuthenticated: true
      });
      
      toast.success("Account created successfully! Please verify your OTP.");
      
      // Connect socket after registration if doctor is already verified
      if (doctorData.verified) {
        get().connectSocket();
      }
      
      return { success: true, doctorId: doctorData._id };
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
  
  verifyOtp: async (doctorId, otp) => {
    set({ isLoading: true, error: null });
    try {
      // Use withCredentials to ensure cookies are sent/received
      const response = await axiosInstance.post(
        `${API_URL}/doctor/verify-otp`, 
        { doctorId, otp },
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
        `${API_URL}/doctor/verify-email`, 
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
        `${API_URL}/doctor/login`, 
        credentials, 
        { withCredentials: true }
      );
  
      const { doctor } = response.data.data;
      
      // Store minimal doctor info in localStorage
      localStorage.setItem("doctorId", doctor._id);
  
      set({
        isLoggingIn: false,
        doctor: doctor,
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
        isAuthenticated: false 
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
        `${API_URL}/doctor/logout`, 
        {}, 
        { withCredentials: true }
      );
      
      // Remove any doctor data from localStorage
      localStorage.removeItem("doctorId");
      
      set({ 
        isLoading: false, 
        doctor: null,
        isAuthenticated: false 
      });
      
      get().disconnectSocket();
      toast.success("Logged out successfully!");
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Logout failed";
      
      // Even if logout API fails, clear local state
      localStorage.removeItem("doctorId");
      
      set({ 
        isLoading: false, 
        error: errorMessage,
        doctor: null,
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
        `${API_URL}/doctor/me`, 
        { withCredentials: true }
      );
      
      set({ 
        doctor: response.data.data,
        isAuthenticated: true
      });
      
      get().connectSocket();
      return { success: true };
    } catch (error) {
      console.log("Error in checkAuth:", error);
      
      // Clear any stored doctor data if authentication check fails
      localStorage.removeItem("doctorId");
      
      set({ 
        doctor: null,
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
      // Use withCredentials to ensure cookies are sent/received
      const response = await axiosInstance.patch(
        `${API_URL}/doctor/update`, 
        formData, 
        { withCredentials: true }
      );
      
      set({ isUpdatingProfile: false, doctor: response.data.data });
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
    const { doctor, socket } = get();
    if (!doctor || socket?.connected) return;
  
    const newSocket = io(API_URL, {
      transports: ["websocket", "polling"],
      withCredentials: true,
    });
  
    // Handle successful connection
    newSocket.on("connect", () => {
      console.log("Socket connected:", newSocket.id);
  
      // Emit user_online only after connected
      newSocket.emit("user_online", doctor._id);
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

export default useDoctorAuthStore;