import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../utils/axois";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const useClientAuthStore = create((set) => ({
  client: null,
  clients: [],
  currentClient: null,
  isLoading: false,
  error: null,
  isAuthenticated: false,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  isFetchingClients: false,
  isFetchingClient: false,
  
  clearError: () => set({ error: null }),
  
  register: async (formData) => {
    set({ isSigningUp: true, error: null });
    try {
      // Use withCredentials to ensure cookies are sent/received
      const response = await axiosInstance.post(`${API_URL}/client/register`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true
      });
      
      const clientData = response.data.data;
      
      // Store doctor ID in localStorage for UI persistence
      localStorage.setItem("clientId", clientData._id);
      
      set({ 
        isSigningUp: false, 
        client: clientData,
        isAuthenticated: true
      });
      
      toast.success("Account created successfully! Please verify your OTP.");
      
      
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
      
      const { accessToken, refreshToken } = response.data;
      
      // Store tokens in localStorage if returned after OTP verification
      if (accessToken) localStorage.setItem("clientAccessToken", accessToken);
      if (refreshToken) localStorage.setItem("clientRefreshToken", refreshToken);
      
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
      // Use withCredentials to ensure cookies are sent/received
      const response = await axiosInstance.post(
        `${API_URL}/client/verify-email`, 
        { email, otp },
        { withCredentials: true }
      );
      
      const { accessToken, refreshToken } = response.data;
      
      // Store tokens in localStorage if returned
      if (accessToken) localStorage.setItem("clientAccessToken", accessToken);
      if (refreshToken) localStorage.setItem("clientRefreshToken", refreshToken);
      
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
  
      const { client, accessToken, refreshToken } = response.data.data;
      
      // Store doctor info and tokens in localStorage
      localStorage.setItem("clientId", client._id);
      if (accessToken) localStorage.setItem("clientAccessToken", accessToken);
      if (refreshToken) localStorage.setItem("clientRefreshToken", refreshToken);
  
      set({
        isLoggingIn: false,
        client: client,
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
        `${API_URL}/client/logout`, 
        {}, 
        { withCredentials: true }
      );
      
      // Remove all client data and tokens from localStorage
      localStorage.removeItem("clientId");
      localStorage.removeItem("clientAccessToken");
      localStorage.removeItem("clientRefreshToken");
      
      set({ 
        isLoading: false, 
        client: null,
        isAuthenticated: false 
      });
      
      toast.success("Logged out successfully!");
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Logout failed";
      
      // Even if logout API fails, clear local state and tokens
      localStorage.removeItem("clientId");
      localStorage.removeItem("clientAccessToken");
      localStorage.removeItem("clientRefreshToken");
      
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
       // Use withCredentials to ensure cookies are sent/received
       const response = await axiosInstance.get(
         `${API_URL}/client/me`, 
         { withCredentials: true }
       );
       
       set({ 
         client: response.data.data,
         isAuthenticated: true
       });
       
       return { success: true };
     } catch (error) {
       console.log("Error in checkAuth:", error);
       
       // Clear any stored doctor data if authentication check fails
       localStorage.removeItem("clientId");
       localStorage.removeItem("clientAccessToken");
       localStorage.removeItem("clientRefreshToken");
       
       set({ 
         client: null,
         isAuthenticated: false
       });
       
       return { success: false };
     } finally {
       set({ isCheckingAuth: false });
     }
   },
  // Get current client details (for authenticated user)
  getCurrentClient: async () => {
    set({ isFetchingClient: true, error: null });
    try {
      const response = await axiosInstance.get(
        `${API_URL}/client/me`,
        { withCredentials: true }
      );
      
      set({
        currentClient: response.data.data,
        isFetchingClient: false
      });
      
      return { success: true, data: response.data.data };
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to fetch current client";
      set({
        isFetchingClient: false,
        error: errorMessage
      });
      return { success: false, error: errorMessage };
    }
  },

  // Get all clients with pagination and filters
  getAllClients: async (params = {}) => {
  set({ isFetchingClients: true, error: null });
  try {
const url = new URL(`${API_URL}/client`);
    
    // Append query params if any
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const response = await axiosInstance.get(url.toString(), {
      withCredentials: true,
    });

    set({
      clients: response.data.data.clients,
      isFetchingClients: false,
    });

    return {
      success: true,
      data: response.data.data.clients,
      pagination: response.data.data.pagination,
    };
  } catch (error) {
    const errorMessage = error.response?.data?.message || "Failed to fetch clients";
    set({
      isFetchingClients: false,
      error: errorMessage,
    });
    toast.error(errorMessage);
    return { success: false, error: errorMessage };
  }
},


  // Get client by ID
  getClientById: async (clientId) => {
    set({ isFetchingClient: true, error: null });
    try {
      const response = await axiosInstance.get(
        `${API_URL}/client/${clientId}`,
        { withCredentials: true }
      );
      
      set({ isFetchingClient: false });
      
      return { success: true, data: response.data.data };
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to fetch client";
      set({
        isFetchingClient: false,
        error: errorMessage
      });
      return { success: false, error: errorMessage };
    }
  },

  // Update client profile
updateProfile: async (formData) => {
  set({ isLoading: true, error: null });
  console.log("Updating profile with data:", formData);
  try {
    const response = await axiosInstance.patch(
      `${API_URL}/client/update`, 
      formData, 
      { withCredentials: true }
    );
    
    set({ isLoading: false, client: response.data.data });
    toast.success("Profile updated successfully!");
    return { success: true };
  } catch (error) {
    const errorMessage = error.response?.data?.message || "Profile update failed";
    set({ isLoading: false, error: errorMessage });
    toast.error(errorMessage);
    return { success: false, error: errorMessage };
  }
},


 
}));

export default useClientAuthStore;