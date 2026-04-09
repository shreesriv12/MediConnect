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

  // ─── NEW: expose the access token directly in Zustand state ───────────────
  // This lets VideoPage / chatStore read it from the store instead of relying
  // on localStorage being populated (which fails after a cookie-only refresh).
  accessToken: localStorage.getItem("clientAccessToken") || null,
  // ──────────────────────────────────────────────────────────────────────────

  clearError: () => set({ error: null }),

  register: async (formData) => {
    set({ isSigningUp: true, error: null });
    try {
      const response = await axiosInstance.post(`${API_URL}/client/register`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });

      const clientData = response.data.data;
      localStorage.setItem("clientId", clientData._id);

      set({
        isSigningUp: false,
        client: clientData,
        isAuthenticated: true,
      });

      toast.success("Account created successfully! Please verify your OTP.");
      return { success: true, clientId: clientData._id };
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Registration failed";
      set({ isSigningUp: false, error: errorMessage });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  verifyOtp: async (clientId, otp) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.post(
        `${API_URL}/client/verify-otp`,
        { clientId, otp },
        { withCredentials: true }
      );

      const { accessToken, refreshToken } = response.data;

      if (accessToken) {
        localStorage.setItem("clientAccessToken", accessToken);
        set({ accessToken }); // ← sync to store
      }
      if (refreshToken) localStorage.setItem("clientRefreshToken", refreshToken);

      set({ isLoading: false, isAuthenticated: true });
      toast.success("OTP verified successfully!");
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || "OTP verification failed";
      set({ isLoading: false, error: errorMessage });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  verifyEmail: async (email, otp) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.post(
        `${API_URL}/client/verify-email`,
        { email, otp },
        { withCredentials: true }
      );

      const { accessToken, refreshToken } = response.data;
      if (accessToken) {
        localStorage.setItem("clientAccessToken", accessToken);
        set({ accessToken }); // ← sync to store
      }
      if (refreshToken) localStorage.setItem("clientRefreshToken", refreshToken);

      set({ isLoading: false });
      toast.success("Email verified successfully!");
      return { success: true, message: response.data.data.message };
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Email verification failed";
      set({ isLoading: false, error: errorMessage });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  login: async (credentials) => {
    set({ isLoggingIn: true, error: null });
    try {
      const response = await axiosInstance.post(
        `${API_URL}/client/login`,
        credentials,
        { withCredentials: true }
      );

      const { client, accessToken, refreshToken } = response.data.data;

      localStorage.setItem("clientId", client._id);
      if (accessToken) {
        localStorage.setItem("clientAccessToken", accessToken);
        set({ accessToken }); // ← sync to store
      }
      if (refreshToken) localStorage.setItem("clientRefreshToken", refreshToken);

      set({ isLoggingIn: false, client, isAuthenticated: true });
      toast.success("Logged in successfully!");
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Login failed";
      set({ isLoggingIn: false, error: errorMessage, isAuthenticated: false });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  logout: async () => {
    set({ isLoading: true, error: null });
    try {
      await axiosInstance.post(`${API_URL}/client/logout`, {}, { withCredentials: true });
    } catch (_) {
      // swallow – we always clear local state below
    } finally {
      localStorage.removeItem("clientId");
      localStorage.removeItem("clientAccessToken");
      localStorage.removeItem("clientRefreshToken");
      set({
        isLoading: false,
        client: null,
        isAuthenticated: false,
        accessToken: null, // ← clear from store
      });
      toast.success("Logged out successfully!");
    }
    return { success: true };
  },

  checkAuth: async () => {
    set({ isCheckingAuth: true });
    try {
      const response = await axiosInstance.get(`${API_URL}/client/me`, {
        withCredentials: true,
      });

      // ── KEY FIX ────────────────────────────────────────────────────────────
      // After a page refresh the HTTP-only cookie is still valid, so /me
      // succeeds – but localStorage may be empty (e.g. user cleared storage or
      // it was never written on first load).  We can't recover the raw JWT from
      // an HTTP-only cookie, so we ask the backend for a fresh access token via
      // the refresh-token endpoint, then store it.
      let storedToken = localStorage.getItem("clientAccessToken");
      if (!storedToken) {
        try {
          const refreshResp = await axiosInstance.post(
            `${API_URL}/client/refresh-token`,
            {},
            { withCredentials: true }
          );
          const newToken = refreshResp.data?.data?.accessToken;
          if (newToken) {
            localStorage.setItem("clientAccessToken", newToken);
            storedToken = newToken;
          }
        } catch (_) {
          // refresh failed – socket will try anyway with whatever is available
        }
      }
      // ──────────────────────────────────────────────────────────────────────

      set({
        client: response.data.data,
        isAuthenticated: true,
        accessToken: storedToken || null, // ← always in sync
      });

      return { success: true };
    } catch (error) {
      console.log("Error in checkAuth:", error);
      localStorage.removeItem("clientId");
      localStorage.removeItem("clientAccessToken");
      localStorage.removeItem("clientRefreshToken");
      set({ client: null, isAuthenticated: false, accessToken: null });
      return { success: false };
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  getCurrentClient: async () => {
    set({ isFetchingClient: true, error: null });
    try {
      const response = await axiosInstance.get(`${API_URL}/client/me`, {
        withCredentials: true,
      });
      set({ currentClient: response.data.data, isFetchingClient: false });
      return { success: true, data: response.data.data };
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to fetch current client";
      set({ isFetchingClient: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  getAllClients: async (params = {}) => {
    set({ isFetchingClients: true, error: null });
    try {
      const url = new URL(`${API_URL}/client`);
      Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));

      const response = await axiosInstance.get(url.toString(), { withCredentials: true });

      set({ clients: response.data.data.clients, isFetchingClients: false });
      return {
        success: true,
        data: response.data.data.clients,
        pagination: response.data.data.pagination,
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to fetch clients";
      set({ isFetchingClients: false, error: errorMessage });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  getClientById: async (clientId) => {
    set({ isFetchingClient: true, error: null });
    try {
      const response = await axiosInstance.get(`${API_URL}/client/${clientId}`, {
        withCredentials: true,
      });
      set({ isFetchingClient: false });
      return { success: true, data: response.data.data };
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to fetch client";
      set({ isFetchingClient: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  updateProfile: async (formData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.patch(`${API_URL}/client/update`, formData, {
        withCredentials: true,
      });
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