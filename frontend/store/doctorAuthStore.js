import { create } from "zustand";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const useDoctorAuthStore = create((set) => ({
  doctor: null,
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  register: async (formData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post(`${API_URL}/doctor/register`, formData);
      set({ isLoading: false, doctor: response.data.data });
      return { success: true, doctorId: response.data.data._id };
    } catch (error) {
      set({ isLoading: false, error: error.response?.data?.message || "Registration failed" });
      return { success: false, error: error.response?.data?.message || "Registration failed" };
    }
  },

  verifyOtp: async (doctorId, otp) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post(`${API_URL}/doctor/verify-otp`, { doctorId, otp });
      set({ isLoading: false });
      return { success: true };
    } catch (error) {
      set({ isLoading: false, error: error.response?.data?.message || "OTP verification failed" });
      return { success: false, error: error.response?.data?.message || "OTP verification failed" };
    }
  },

  verifyEmail: async (token) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post(
        `${API_URL}/doctor/verify-email`,
        { token },
        { withCredentials: true }
      );
      set({ isLoading: false });
      return { success: true, message: response.data.data.message };
    } catch (error) {
      set({ isLoading: false, error: error.response?.data?.message || "Email verification failed" });
      return { success: false, error: error.response?.data?.message || "Email verification failed" };
    }
  },

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post(`${API_URL}/doctor/login`, credentials, {
        withCredentials: true,
      });
      set({ isLoading: false, doctor: response.data.data.doctor });
      return { success: true };
    } catch (error) {
      set({ isLoading: false, error: error.response?.data?.message || "Login failed" });
      return { success: false, error: error.response?.data?.message || "Login failed" };
    }
  },

  logout: async () => {
    set({ isLoading: true, error: null });
    try {
      await axios.post(`${API_URL}/doctor/logout`, {}, { withCredentials: true });
      set({ isLoading: false, doctor: null });
      return { success: true };
    } catch (error) {
      set({ isLoading: false, error: error.response?.data?.message || "Logout failed" });
      return { success: false };
    }
  },

  getCurrentDoctor: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(`${API_URL}/doctor/me`, { withCredentials: true });
      set({ isLoading: false, doctor: response.data.data });
      return { success: true };
    } catch (error) {
      set({ isLoading: false, error: error.response?.data?.message || "Failed to fetch doctor data" });
      return { success: false };
    }
  },

  updateProfile: async (formData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.patch(`${API_URL}/doctor/update`, formData, {
        withCredentials: true,
      });
      set({ isLoading: false, doctor: response.data.data });
      return { success: true };
    } catch (error) {
      set({ isLoading: false, error: error.response?.data?.message || "Profile update failed" });
      return { success: false, error: error.response?.data?.message || "Profile update failed" };
    }
  },
}));

export default useDoctorAuthStore;
