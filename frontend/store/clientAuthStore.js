import { create } from 'zustand';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const useClientAuthStore = create((set) => ({
  client: null,
  isLoading: false,
  error: null,
  
  // Clear error state
  clearError: () => set({ error: null }),
  
  // Register client
  register: async (formData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post(`${API_URL}/client/register`, formData);
      set({ 
        isLoading: false,
        client: response.data.data
      });
      return { success: true, clientId: response.data.data._id };
    } catch (error) {
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Registration failed'
      });
      return { success: false, error: error.response?.data?.message || 'Registration failed' };
    }
  },
  
  // Verify OTP
  verifyOtp: async (clientId, otp) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post(`${API_URL}/client/verify-otp`, { clientId, otp });
      set({ isLoading: false });
      return { success: true };
    } catch (error) {
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'OTP verification failed'
      });
      return { success: false, error: error.response?.data?.message || 'OTP verification failed' };
    }
  },
  
  // Verify email
  verifyEmail: async (email, otp) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post(`${API_URL}/client/verify-email`, { email, otp });
      set({ isLoading: false });
      return { success: true, message: response.data.data.message };
    } catch (error) {
      set({
        isLoading: false,
        error: error.response?.data?.message || "Email verification failed",
      });
      return { success: false, error: error.response?.data?.message || "Email verification failed" };
    }
  },
  
  
  // Login client
  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post(`${API_URL}/client/login`, credentials);
      set({ 
        isLoading: false,
        client: response.data.data.client
      });
      return { success: true };
    } catch (error) {
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Login failed'
      });
      return { success: false, error: error.response?.data?.message || 'Login failed' };
    }
  },
  
  // Logout client
  logout: async () => {
    set({ isLoading: true, error: null });
    try {
      await axios.post(`${API_URL}/client/logout`);
      set({ isLoading: false, client: null });
      return { success: true };
    } catch (error) {
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Logout failed'
      });
      return { success: false };
    }
  },
  
  // Get current client
  getCurrentClient: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(`${API_URL}/client/me`);
      set({ 
        isLoading: false,
        client: response.data.data
      });
      return { success: true };
    } catch (error) {
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Failed to fetch client data'
      });
      return { success: false };
    }
  },
  
  // Update client profile
  updateProfile: async (formData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.patch(`${API_URL}/client/update`, formData);
      set({ 
        isLoading: false,
        client: response.data.data
      });
      return { success: true };
    } catch (error) {
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Profile update failed'
      });
      return { success: false, error: error.response?.data?.message || 'Profile update failed' };
    }
  }
}));

export default useClientAuthStore;