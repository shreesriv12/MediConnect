import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { IoMdChatboxes } from "react-icons/io";
import useChatStore from "../stores/useChatStore";
import useClientAuthStore from "../stores/clientAuthStore";
import useDoctorAuthStore from "../stores/doctorAuthStore";

const ChatIndicator = () => {
  const { unreadCount, fetchUnreadCount } = useChatStore();
  const clientAuth = useClientAuthStore();
  const doctorAuth = useDoctorAuthStore();
  const isAuthenticated = clientAuth.isAuthenticated || doctorAuth.isAuthenticated;
  const socket = clientAuth.socket || doctorAuth.socket;

  // Fetch unread count when component mounts and when socket receives a message
  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCount();
      
      // Check for unread messages every minute
      const interval = setInterval(() => {
        fetchUnreadCount();
      }, 60000);
      
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, fetchUnreadCount]);
  
  // Setup socket listener for receiving messages
  useEffect(() => {
    if (socket) {
      socket.on("receive_message", () => {
        fetchUnreadCount();
      });
      
      return () => {
        socket.off("receive_message");
      };
    }
  }, [socket, fetchUnreadCount]);

  if (!isAuthenticated) return null;

  return (
    <Link to="/chat" className="relative">
      <IoMdChatboxes className="text-2xl text-blue-500" />
      {unreadCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
};

export default ChatIndicator;