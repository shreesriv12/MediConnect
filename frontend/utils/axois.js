// In utils/axois.js (Note: It's usually spelled axios.js)

import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
  withCredentials: true, // This ensures cookies are sent with every request
  headers: {
    "Content-Type": "application/json",
  },
});

// Add response interceptor to handle token expiration
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If the error is due to token expiration (status 401) and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh the token
        await axios.post(
          `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/client/refresh-token`,
          {},
          { withCredentials: true }
        );
        
        // If token refresh is successful, retry the original request
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // If token refresh fails, redirect to login or handle as needed
        console.error("Token refresh failed:", refreshError);
        
        // Clear local storage
        localStorage.removeItem("clientId");
        
        // Redirect to login (if you have access to router)
        // window.location.href = "/login";
        
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);