import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../utils/axois";
import useDoctorAuthStore from "./doctorAuthStore";
import useClientAuthStore from "./clientAuthStore";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const useVideoStore = create((set, get) => ({
  // State
  calls: [],
  activeCalls: [],
  currentCall: null,
  callHistory: [],
  isLoading: false,
  isInitiating: false,
  isAccepting: false,
  isRejecting: false,
  isEnding: false,
  isFetchingHistory: false,
  isFetchingActive: false,
  isRating: false,
  isReporting: false,
  error: null,
  
  // Media control states
  isTogglingCamera: false,
  isTogglingMicrophone: false,
  isTogglingScreenShare: false,
  isFetchingMediaPermissions: false,
  isUpdatingQuality: false,
  
  // Current media states
  mediaState: {
    cameraEnabled: true,
    microphoneEnabled: true,
    screenSharing: false,
    qualitySettings: {
      videoQuality: 'high',
      audioQuality: 'high'
    }
  },
  
  // Pagination for call history
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalCalls: 0,
    hasMore: false
  },

  // Helper functions
  clearError: () => set({ error: null }),
  
  getUserType: () => {
    const doctorStore = useDoctorAuthStore.getState();
    const clientStore = useClientAuthStore.getState();
    
    if (doctorStore.isAuthenticated && doctorStore.doctor) {
      return { userType: 'Doctor', user: doctorStore.doctor };
    } else if (clientStore.isAuthenticated && clientStore.client) {
      return { userType: 'Client', user: clientStore.client };
    }
    return null;
  },

  getAuthToken: () => {
    const doctorStore = useDoctorAuthStore.getState();
    const clientStore = useClientAuthStore.getState();
    
    if (doctorStore.isAuthenticated) {
      return localStorage.getItem("doctorAccessToken");
    } else if (clientStore.isAuthenticated) {
      return localStorage.getItem("clientAccessToken");
    }
    return null;
  },

  // Initiate video call
  initiateCall: async (participantId, participantType, callType = 'video', cameraEnabled = true, microphoneEnabled = true) => {
    set({ isInitiating: true, error: null });
    
    try {
      const userInfo = get().getUserType();
      if (!userInfo) {
        throw new Error("User not authenticated");
      }

      const response = await axiosInstance.post(
        `${API_URL}/video-call/initiate`,
        {
          participantId,
          participantType,
          callType,
          cameraEnabled,
          microphoneEnabled
        },
        { withCredentials: true }
      );

      const callData = response.data.data;
      
      set(state => ({
        isInitiating: false,
        currentCall: callData,
        activeCalls: [...state.activeCalls, callData],
        mediaState: {
          ...state.mediaState,
          cameraEnabled,
          microphoneEnabled
        }
      }));

      toast.success("Call initiated successfully!");
      return { success: true, data: callData };

    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to initiate call";
      set({
        isInitiating: false,
        error: errorMessage
      });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  // Accept video call
  acceptCall: async (callId, cameraEnabled = true, microphoneEnabled = true) => {
    set({ isAccepting: true, error: null });
    
    try {
      const response = await axiosInstance.patch(
        `${API_URL}/video-call/${callId}/accept`,
        { cameraEnabled, microphoneEnabled },
        { withCredentials: true }
      );

      const callData = response.data.data;
      
      set(state => ({
        isAccepting: false,
        currentCall: callData.call,
        activeCalls: state.activeCalls.map(call => 
          call._id === callId ? callData.call : call
        ),
        mediaState: {
          ...state.mediaState,
          cameraEnabled,
          microphoneEnabled
        }
      }));

      toast.success("Call accepted successfully!");
      return { success: true, data: callData };

    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to accept call";
      set({
        isAccepting: false,
        error: errorMessage
      });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  // Toggle camera
  toggleCamera: async (callId, enabled) => {
    set({ isTogglingCamera: true, error: null });
    
    try {
      const response = await axiosInstance.patch(
        `${API_URL}/video-call/${callId}/camera`,
        { enabled },
        { withCredentials: true }
      );

      const { cameraEnabled } = response.data.data;
      
      set(state => ({
        isTogglingCamera: false,
        mediaState: {
          ...state.mediaState,
          cameraEnabled
        }
      }));

      toast.success(`Camera ${cameraEnabled ? 'enabled' : 'disabled'}`);
      return { success: true, data: { cameraEnabled } };

    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to toggle camera";
      set({
        isTogglingCamera: false,
        error: errorMessage
      });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  // Toggle microphone
  toggleMicrophone: async (callId, enabled) => {
    set({ isTogglingMicrophone: true, error: null });
    
    try {
      const response = await axiosInstance.patch(
        `${API_URL}/video-call/${callId}/microphone`,
        { enabled },
        { withCredentials: true }
      );

      const { microphoneEnabled } = response.data.data;
      
      set(state => ({
        isTogglingMicrophone: false,
        mediaState: {
          ...state.mediaState,
          microphoneEnabled
        }
      }));

      toast.success(`Microphone ${microphoneEnabled ? 'enabled' : 'disabled'}`);
      return { success: true, data: { microphoneEnabled } };

    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to toggle microphone";
      set({
        isTogglingMicrophone: false,
        error: errorMessage
      });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  // Toggle screen share
  toggleScreenShare: async (callId, enabled) => {
    set({ isTogglingScreenShare: true, error: null });
    
    try {
      const response = await axiosInstance.patch(
        `${API_URL}/video-call/${callId}/screen-share`,
        { enabled },
        { withCredentials: true }
      );

      const { screenSharing, cameraEnabled } = response.data.data;
      
      set(state => ({
        isTogglingScreenShare: false,
        mediaState: {
          ...state.mediaState,
          screenSharing,
          cameraEnabled // Camera gets disabled when screen sharing starts
        }
      }));

      toast.success(`Screen sharing ${screenSharing ? 'started' : 'stopped'}`);
      return { success: true, data: { screenSharing, cameraEnabled } };

    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to toggle screen share";
      set({
        isTogglingScreenShare: false,
        error: errorMessage
      });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  // Get media permissions
  getMediaPermissions: async (callId) => {
    set({ isFetchingMediaPermissions: true, error: null });
    
    try {
      const response = await axiosInstance.get(
        `${API_URL}/video-call/${callId}/media-permissions`,
        { withCredentials: true }
      );

      const { mediaState, callStatus } = response.data.data;
      
      set(state => ({
        isFetchingMediaPermissions: false,
        mediaState: {
          ...state.mediaState,
          ...mediaState
        }
      }));

      return { success: true, data: { mediaState, callStatus } };

    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to fetch media permissions";
      set({
        isFetchingMediaPermissions: false,
        error: errorMessage
      });
      return { success: false, error: errorMessage };
    }
  },

  // Update media quality
  updateMediaQuality: async (callId, videoQuality = 'high', audioQuality = 'high') => {
    const validQualities = ['low', 'medium', 'high'];
    if (!validQualities.includes(videoQuality) || !validQualities.includes(audioQuality)) {
      toast.error("Quality must be 'low', 'medium', or 'high'");
      return { success: false, error: "Invalid quality settings" };
    }

    set({ isUpdatingQuality: true, error: null });
    
    try {
      const response = await axiosInstance.patch(
        `${API_URL}/video-call/${callId}/quality`,
        { videoQuality, audioQuality },
        { withCredentials: true }
      );

      const qualityData = response.data.data;
      
      set(state => ({
        isUpdatingQuality: false,
        mediaState: {
          ...state.mediaState,
          qualitySettings: {
            videoQuality: qualityData.videoQuality,
            audioQuality: qualityData.audioQuality
          }
        }
      }));

      toast.success("Media quality updated successfully!");
      return { success: true, data: qualityData };

    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to update media quality";
      set({
        isUpdatingQuality: false,
        error: errorMessage
      });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  // Reject video call
  rejectCall: async (callId, reason = 'rejected') => {
    set({ isRejecting: true, error: null });
    
    try {
      await axiosInstance.patch(
        `${API_URL}/video-call/${callId}/reject`,
        { reason },
        { withCredentials: true }
      );

      set(state => ({
        isRejecting: false,
        currentCall: state.currentCall?._id === callId ? null : state.currentCall,
        activeCalls: state.activeCalls.filter(call => call._id !== callId)
      }));

      toast.success("Call rejected successfully!");
      return { success: true };

    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to reject call";
      set({
        isRejecting: false,
        error: errorMessage
      });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  // End video call
  endCall: async (callId) => {
    set({ isEnding: true, error: null });
    
    try {
      const response = await axiosInstance.patch(
        `${API_URL}/video-call/${callId}/end`,
        {},
        { withCredentials: true }
      );

      const endData = response.data.data;
      
      set(state => ({
        isEnding: false,
        currentCall: state.currentCall?._id === callId ? null : state.currentCall,
        activeCalls: state.activeCalls.filter(call => call._id !== callId),
        // Reset media state when call ends
        mediaState: {
          cameraEnabled: true,
          microphoneEnabled: true,
          screenSharing: false,
          qualitySettings: {
            videoQuality: 'high',
            audioQuality: 'high'
          }
        }
      }));

      toast.success(`Call ended successfully! Duration: ${Math.floor(endData.duration / 60)}:${endData.duration % 60}`);
      return { success: true, data: endData };

    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to end call";
      set({
        isEnding: false,
        error: errorMessage
      });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  // Get call history with pagination
  getCallHistory: async (page = 1, limit = 20, status = null) => {
    set({ isFetchingHistory: true, error: null });
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      
      if (status) {
        params.append('status', status);
      }

      const response = await axiosInstance.get(
        `${API_URL}/video-call/history?${params.toString()}`,
        { withCredentials: true }
      );

      const { calls, pagination } = response.data.data;
      
      set(state => ({
        isFetchingHistory: false,
        callHistory: page === 1 ? calls : [...state.callHistory, ...calls],
        pagination: pagination
      }));

      return { success: true, data: { calls, pagination } };

    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to fetch call history";
      set({
        isFetchingHistory: false,
        error: errorMessage
      });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  // Get active calls
  getActiveCalls: async () => {
    set({ isFetchingActive: true, error: null });
    
    try {
      const response = await axiosInstance.get(
        `${API_URL}/video-call/active`,
        { withCredentials: true }
      );

      const activeCalls = response.data.data;
      
      set({
        isFetchingActive: false,
        activeCalls: activeCalls
      });

      return { success: true, data: activeCalls };

    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to fetch active calls";
      set({
        isFetchingActive: false,
        error: errorMessage
      });
      return { success: false, error: errorMessage };
    }
  },

  // Rate call quality
  rateCall: async (callId, rating, feedback = '') => {
    if (!rating || rating < 1 || rating > 5) {
      toast.error("Rating must be between 1 and 5");
      return { success: false, error: "Invalid rating" };
    }

    set({ isRating: true, error: null });
    
    try {
      await axiosInstance.post(
        `${API_URL}/video-call/${callId}/rate`,
        { rating, feedback },
        { withCredentials: true }
      );

      set(state => ({
        isRating: false,
        callHistory: state.callHistory.map(call => 
          call._id === callId 
            ? { ...call, callQuality: { rating, feedback } }
            : call
        )
      }));

      toast.success("Call rated successfully!");
      return { success: true };

    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to rate call";
      set({
        isRating: false,
        error: errorMessage
      });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  // Report technical issue
  reportIssue: async (callId, issue) => {
    if (!issue || issue.trim() === '') {
      toast.error("Issue description is required");
      return { success: false, error: "Issue description required" };
    }

    set({ isReporting: true, error: null });
    
    try {
      await axiosInstance.post(
        `${API_URL}/video-call/${callId}/report-issue`,
        { issue },
        { withCredentials: true }
      );

      set({ isReporting: false });
      toast.success("Issue reported successfully!");
      return { success: true };

    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to report issue";
      set({
        isReporting: false,
        error: errorMessage
      });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  // Utility functions for UI state management
  setCurrentCall: (call) => set({ currentCall: call }),
  
  clearCurrentCall: () => set({ currentCall: null }),
  
  updateCallStatus: (callId, status) => set(state => ({
    activeCalls: state.activeCalls.map(call => 
      call._id === callId ? { ...call, callStatus: status } : call
    ),
    currentCall: state.currentCall?._id === callId 
      ? { ...state.currentCall, callStatus: status }
      : state.currentCall
  })),

  // Media state utilities
  setMediaState: (newMediaState) => set(state => ({
    mediaState: { ...state.mediaState, ...newMediaState }
  })),

  resetMediaState: () => set({
    mediaState: {
      cameraEnabled: true,
      microphoneEnabled: true,
      screenSharing: false,
      qualitySettings: {
        videoQuality: 'high',
        audioQuality: 'high'
      }
    }
  }),

  // Socket event handlers (to be called from socket listeners)
  handleIncomingCall: (callData) => {
    set(state => ({
      activeCalls: [...state.activeCalls, callData]
    }));
  },

  handleCallAccepted: (callData) => {
    set(state => ({
      activeCalls: state.activeCalls.map(call => 
        call._id === callData.callId ? callData.call : call
      ),
      currentCall: state.currentCall?._id === callData.callId 
        ? callData.call 
        : state.currentCall
    }));
  },

  handleCallRejected: (callData) => {
    set(state => ({
      activeCalls: state.activeCalls.filter(call => call._id !== callData.callId),
      currentCall: state.currentCall?._id === callData.callId 
        ? null 
        : state.currentCall
    }));
  },

  handleCallEnded: (callData) => {
    set(state => ({
      activeCalls: state.activeCalls.filter(call => call._id !== callData.callId),
      currentCall: state.currentCall?._id === callData.callId 
        ? null 
        : state.currentCall
    }));
    
    // Reset media state when call ends
    get().resetMediaState();
  },

  // New socket event handlers for media controls
handleCameraToggled: (eventData) => {
  const { userId, cameraEnabled } = eventData;
  console.log('Camera toggled:', userId, cameraEnabled);
  set(state => {
    if (state.currentCall) {
      const updatedParticipants = state.currentCall.participants.map(participant => {
        if (participant.userId?._id === userId) {
          return {
            ...participant,
            mediaState: {
              ...participant.mediaState,
              cameraEnabled,
            }
          };
        }
        return participant;
      });
      return {
        currentCall: { ...state.currentCall, participants: updatedParticipants }
      };
    }
    return state;
  });
},

handleMicrophoneToggled: (eventData) => {
  const { userId, microphoneEnabled } = eventData;
  console.log('Microphone toggled:', userId, microphoneEnabled);
  set(state => {
    if (state.currentCall) {
      const updatedParticipants = state.currentCall.participants.map(participant => {
        if (participant.userId?._id === userId) {
          return {
            ...participant,
            mediaState: {
              ...participant.mediaState,
              microphoneEnabled,
            }
          };
        }
        return participant;
      });
      return {
        currentCall: { ...state.currentCall, participants: updatedParticipants }
      };
    }
    return state;
  });
},

handleScreenShareToggled: (eventData) => {
  const { userId, screenSharing, cameraEnabled } = eventData;
  console.log('Screen share toggled:', userId, screenSharing, cameraEnabled);
  set(state => {
    if (state.currentCall) {
      const updatedParticipants = state.currentCall.participants.map(participant => {
        if (participant.userId?._id === userId) {
          return {
            ...participant,
            mediaState: {
              ...participant.mediaState,
              screenSharing,
              cameraEnabled,
            }
          };
        }
        return participant;
      });
      return {
        currentCall: { ...state.currentCall, participants: updatedParticipants }
      };
    }
    return state;
  });
},

handleMediaQualityUpdated: (eventData) => {
  const { userId, qualitySettings } = eventData;
  console.log('Media quality updated:', userId, qualitySettings);
  set(state => {
    if (state.currentCall) {
      const updatedParticipants = state.currentCall.participants.map(participant => {
        if (participant.userId?._id === userId) {
          return {
            ...participant,
            mediaState: {
              ...participant.mediaState,
              qualitySettings,
            }
          };
        }
        return participant;
      });
      return {
        currentCall: { ...state.currentCall, participants: updatedParticipants }
      };
    }
    return state;
  });
},

  // Reset store
  resetStore: () => set({
    calls: [],
    activeCalls: [],
    currentCall: null,
    callHistory: [],
    isLoading: false,
    isInitiating: false,
    isAccepting: false,
    isRejecting: false,
    isEnding: false,
    isFetchingHistory: false,
    isFetchingActive: false,
    isRating: false,
    isReporting: false,
    isTogglingCamera: false,
    isTogglingMicrophone: false,
    isTogglingScreenShare: false,
    isFetchingMediaPermissions: false,
    isUpdatingQuality: false,
    error: null,
    mediaState: {
      cameraEnabled: true,
      microphoneEnabled: true,
      screenSharing: false,
      qualitySettings: {
        videoQuality: 'high',
        audioQuality: 'high'
      }
    },
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalCalls: 0,
      hasMore: false
    }
  })
}));

export default useVideoStore;