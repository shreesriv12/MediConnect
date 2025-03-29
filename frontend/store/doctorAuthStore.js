// src/store/doctorAuthStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const useDoctorAuthStore = create(
  persist(
    (set, get) => ({
      doctor: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      error: null,

      // Register a new doctor
      register: async (formData) => {
        try {
          set({ isLoading: true, error: null });
          const response = await axios.post(`${API_URL}/doctors/register`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
          
          const { doctor, accessToken, refreshToken } = response.data.data;
          set({ 
            doctor, 
            accessToken, 
            refreshToken, 
            isLoading: false 
          });
          
          return { success: true, doctorId: doctor._id };
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error.response?.data?.message || 'Registration failed' 
          });
          return { success: false, error: get().error };
        }
      },

      // Verify OTP
      verifyOtp: async (doctorId, otp) => {
        try {
          set({ isLoading: true, error: null });
          const response = await axios.post(`${API_URL}/doctors/verify-otp`, {
            doctorId,
            otp
          });
          
          // Update tokens received after OTP verification
          if (response.data.success) {
            const { accessToken, refreshToken } = response.data.data;
            set({ 
              accessToken, 
              refreshToken, 
              isLoading: false 
            });
          }
          
          return { success: true };
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error.response?.data?.message || 'OTP verification failed' 
          });
          return { success: false, error: get().error };
        }
      },

      // Login doctor
      login: async (email, password) => {
        try {
          set({ isLoading: true, error: null });
          const response = await axios.post(`${API_URL}/doctors/login`, {
            email,
            password
          });
          
          const { doctor, accessToken, refreshToken } = response.data.data;
          set({ 
            doctor, 
            accessToken, 
            refreshToken, 
            isLoading: false 
          });
          
          return { success: true };
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error.response?.data?.message || 'Login failed' 
          });
          return { success: false, error: get().error };
        }
      },

      // Get current doctor profile
      getCurrentDoctor: async () => {
        try {
          set({ isLoading: true, error: null });
          const response = await axios.get(`${API_URL}/doctors/me`, {
            headers: {
              Authorization: `Bearer ${get().accessToken}`
            }
          });
          
          set({ 
            doctor: response.data.data, 
            isLoading: false 
          });
          
          return { success: true };
        } catch (error) {
          if (error.response?.status === 401) {
            // Try to refresh token
            const refreshed = await get().refreshToken();
            if (refreshed.success) {
              return get().getCurrentDoctor();
            }
          }
          
          set({ 
            isLoading: false, 
            error: error.response?.data?.message || 'Failed to fetch doctor profile' 
          });
          return { success: false, error: get().error };
        }
      },

      // Refresh access token
      refreshTokens: async () => {
        try {
          const currentRefreshToken = get().refreshToken;
          if (!currentRefreshToken) {
            set({ doctor: null, accessToken: null, refreshToken: null });
            return { success: false, error: 'No refresh token available' };
          }
          
          const response = await axios.post(`${API_URL}/doctors/refresh-token`, {
            refreshToken: currentRefreshToken
          });
          
          const { accessToken, refreshToken } = response.data.data;
          set({ accessToken, refreshToken });
          
          return { success: true };
        } catch (error) {
          set({ 
            doctor: null, 
            accessToken: null, 
            refreshToken: null, 
            error: 'Session expired. Please login again.' 
          });
          return { success: false, error: get().error };
        }
      },

      // Logout doctor
      logout: async () => {
        try {
          await axios.post(`${API_URL}/doctors/logout`, {}, {
            headers: {
              Authorization: `Bearer ${get().accessToken}`
            }
          });
          
          set({ 
            doctor: null, 
            accessToken: null, 
            refreshToken: null, 
            error: null 
          });
          
          return { success: true };
        } catch (error) {
          // Still clear the state even if server-side logout fails
          set({ 
            doctor: null, 
            accessToken: null, 
            refreshToken: null, 
            error: null
          });
          
          return { success: true };
        }
      },

      // Update doctor profile
      updateProfile: async (formData) => {
        try {
          set({ isLoading: true, error: null });
          const response = await axios.patch(`${API_URL}/doctors/update`, formData, {
            headers: {
              Authorization: `Bearer ${get().accessToken}`,
              'Content-Type': 'multipart/form-data',
            }
          });
          
          set({ 
            doctor: response.data.data, 
            isLoading: false 
          });
          
          return { success: true };
        } catch (error) {
          if (error.response?.status === 401) {
            const refreshed = await get().refreshTokens();
            if (refreshed.success) {
              return get().updateProfile(formData);
            }
          }
          
          set({ 
            isLoading: false, 
            error: error.response?.data?.message || 'Failed to update profile' 
          });
          return { success: false, error: get().error };
        }
      },

      // Clear any errors
      clearError: () => set({ error: null })
    }),
    {
      name: 'doctor-auth-storage',
      partialize: (state) => ({
        doctor: state.doctor,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken
      })
    }
  )
);

export default useDoctorAuthStore;