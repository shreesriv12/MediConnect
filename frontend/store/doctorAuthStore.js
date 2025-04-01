// Add to useDoctorAuthStore.js
import { create } from 'zustand';
import axios from 'axios';


const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const useDoctorAuthStore = create((set) => ({
  doctor: null,
  isLoading: false,
  error: null,
  
  // Clear error state
  clearError: () => set({ error: null }),
  
  // Register doctorx
  register: async (formData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post(`${API_URL}/doctor/register`, formData);
      set({ 
        isLoading: false,
        doctor: response.data.data
      });
      return { success: true, doctorId: response.data.data._id };
    } catch (error) {
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Registration failed'
      });
      return { success: false, error: error.response?.data?.message || 'Registration failed' };
    }
  },
  
  // Verify OTP
  verifyOtp: async (doctorId, otp) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post(`${API_URL}/doctor/verify-otp`, { doctorId, otp });
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
  
  // Add the verifyEmail function
  verifyEmail: async (token) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(`${API_URL}/doctor/verify-email?token=${token}`);
      set({ isLoading: false });
      return { success: true, message: response.data.data.message };
    } catch (error) {
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Email verification failed'
      });
      return { success: false, error: error.response?.data?.message || 'Email verification failed' };
    }
  },
  
  // Login doctor
  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post(`${API_URL}/doctor/login`, credentials);
      set({ 
        isLoading: false,
        doctor: response.data.data.doctor
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
  
  // Logout doctor
  logout: async () => {
    set({ isLoading: true, error: null });
    try {
      await axios.post('/doctor/logout');
      set({ isLoading: false, doctor: null });
      return { success: true };
    } catch (error) {
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Logout failed'
      });
      return { success: false };
    }
  },
  
  // Get current doctor
  getCurrentDoctor: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get('/doctor/me');
      set({ 
        isLoading: false,
        doctor: response.data.data
      });
      return { success: true };
    } catch (error) {
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Failed to fetch doctor data'
      });
      return { success: false };
    }
  },
  
  // Update doctor profile
  updateProfile: async (formData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.patch('/doctor/update', formData);
      set({ 
        isLoading: false,
        doctor: response.data.data
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

export default useDoctorAuthStore;