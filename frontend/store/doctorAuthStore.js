import { create } from "zustand";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import { axiosInstance } from "../utils/axois";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const useDoctorAuthStore = create((set, get) => ({
  doctor: null,
  doctors: [],
  currentDoctor: null,
  isLoading: false,
  error: null,
  isAuthenticated: false,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  isFetchingDoctors: false,
  isFetchingDoctor: false,
  
  clearError: () => set({ error: null }),
  
  register: async (formData) => {
    set({ isSigningUp: true, error: null });
    try {
      // Use withCredentials to ensure cookies are sent/received
      const response = await axiosInstance.post(`${API_URL}/doctor/register`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
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
    const response = await axiosInstance.post(
      `${API_URL}/doctor/verify-email`,
      { email, otp },
      {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true,
      }
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
  
      const { doctor, accessToken, refreshToken } = response.data.data;
      
      // Store doctor info and tokens in localStorage
      localStorage.setItem("doctorId", doctor._id);
      if (accessToken) localStorage.setItem("doctorAccessToken", accessToken);
      if (refreshToken) localStorage.setItem("doctorRefreshToken", refreshToken);
  
      set({
        isLoggingIn: false,
        doctor: doctor,
        isAuthenticated: true,
      });
  
      toast.success("Logged in successfully!");
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
        `${API_URL}/doctor/logout`, 
        {}, 
        { withCredentials: true }
      );
      
      // Remove any doctor data from localStorage
      localStorage.removeItem("doctorId");
      localStorage.removeItem("doctorAccessToken");
      localStorage.removeItem("doctorRefreshToken");
      
      set({ 
        isLoading: false, 
        doctor: null,
        isAuthenticated: false 
      });
      toast.success("Logged out successfully!");
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Logout failed";
      
      // Even if logout API fails, clear local state
      localStorage.removeItem("doctorId");
      localStorage.removeItem("doctorAccessToken");
      localStorage.removeItem("doctorRefreshToken");
      
      set({ 
        isLoading: false, 
        error: errorMessage,
        doctor: null,
        isAuthenticated: false
      });

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
      
      return { success: true };
    } catch (error) {
      console.log("Error in checkAuth:", error);
      
      // Clear any stored doctor data if authentication check fails
      localStorage.removeItem("doctorId");
      localStorage.removeItem("doctorAccessToken");
      localStorage.removeItem("doctorRefreshToken");
      
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

  // Get current doctor details (for authenticated user)
  getCurrentDoctor: async () => {
    set({ isFetchingDoctor: true, error: null });
    try {
      const response = await axiosInstance.get(
        `${API_URL}/doctor/me`,
        { withCredentials: true }
      );
      
      set({
        currentDoctor: response.data.data,
        isFetchingDoctor: false
      });
      
      return { success: true, data: response.data.data };
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to fetch current doctor";
      set({
        isFetchingDoctor: false,
        error: errorMessage
      });
      return { success: false, error: errorMessage };
    }
  },

  // Get all doctors with pagination and filters
  getAllDoctors: async (params = {}) => {
    set({ isFetchingDoctors: true, error: null });
    try {
      const url = `${API_URL}/doctor`;
      
      const response = await axiosInstance.get(url, {
        withCredentials: true
      });
      
      set({
        doctors: response.data.data.doctors,
        isFetchingDoctors: false
      });
      
      return { 
        success: true, 
        data: response.data.data.doctors,
        pagination: response.data.data.pagination
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to fetch doctors";
      set({
        isFetchingDoctors: false,
        error: errorMessage
      });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  // Get doctor by ID
  getDoctorById: async (doctorId) => {
    set({ isFetchingDoctor: true, error: null });
    try {
      const response = await axiosInstance.get(
        `${API_URL}/doctor/doctors/${doctorId}`,
        { withCredentials: true }
      );
      
      set({ isFetchingDoctor: false });
      
      return { success: true, data: response.data.data };
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to fetch doctor";
      set({
        isFetchingDoctor: false,
        error: errorMessage
      });
      return { success: false, error: errorMessage };
    }
  },

  // Search doctors (helper function that uses getAllDoctors with search params)
  searchDoctors: async (searchParams) => {
    return await get().getAllDoctors(searchParams);
  },

  // Filter doctors by specialization
  getDoctorsBySpecialization: async (specialization, otherParams = {}) => {
    return await get().getAllDoctors({ specialization, ...otherParams });
  },

  // Get verified doctors only
  getVerifiedDoctors: async (otherParams = {}) => {
    return await get().getAllDoctors({ verified: 'true', ...otherParams });
  },
  
}));

export default useDoctorAuthStore;