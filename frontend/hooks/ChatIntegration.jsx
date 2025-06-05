import { useEffect } from 'react';
import useClientAuthStore from '../store/useClientAuthStore';
import useChatStore from '../store/useChatStore';

// Custom hook to integrate chat functionality with authentication
export const useChatIntegration = () => {
  const { socket, isAuthenticated, client } = useClientAuthStore();
  const { 
    setupSocketListeners, 
    cleanupSocketListeners, 
    clearChatData,
    fetchConversations 
  } = useChatStore();

  useEffect(() => {
    if (isAuthenticated && socket && client) {
      // Setup chat socket listeners when authenticated
      setupSocketListeners(socket);
      
      // Fetch initial conversations
      fetchConversations();
      
      // Cleanup function
      return () => {
        cleanupSocketListeners(socket);
      };
    } else if (!isAuthenticated) {
      // Clear chat data when logged out
      clearChatData();
    }
  }, [isAuthenticated, socket, client]);

  return {
    isAuthenticated,
    client,
    socket
  };
};

// Helper function to start a conversation with a doctor
export const useStartConversation = () => {
  const { startConversation, setCurrentConversation } = useChatStore();
  
  const startChatWithDoctor = async (doctorId, doctorName) => {
    try {
      const result = await startConversation(doctorId, 'doctor');
      
      if (result.success) {
        // Set as current conversation to open chat immediately
        setCurrentConversation(result.conversation);
        return { success: true, conversation: result.conversation };
      }
      
      return { success: false, error: 'Failed to start conversation' };
    } catch (error) {
      console.error('Error starting conversation:', error);
      return { success: false, error: error.message };
    }
  };

  return { startChatWithDoctor };
};