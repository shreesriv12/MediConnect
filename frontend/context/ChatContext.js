// contexts/ChatContext.js
import { createContext, useContext, useState, useEffect } from 'react';
import socket from '../utils/socket';
import axios from 'axios';

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children, currentUser }) => {
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (activeChat?._id) {
      socket.emit('joinRoom', activeChat._id);
    }

    return () => {
      if (activeChat?._id) {
        socket.emit('leaveRoom', activeChat._id);
      }
    };
  }, [activeChat]);

  useEffect(() => {
    socket.on('newMessage', ({ chatId, message }) => {
      if (activeChat?._id === chatId) {
        setMessages(prev => [...prev, message]);
      }
      // Optionally update chats lastMessage here
    });

    socket.on('messageDeleted', ({ chatId, messageId }) => {
      if (activeChat?._id === chatId) {
        setMessages(prev => prev.filter(msg => msg._id !== messageId));
      }
    });

    socket.on('messagesRead', ({ chatId, messageIds, readBy }) => {
      if (activeChat?._id === chatId) {
        setMessages(prev =>
          prev.map(msg =>
            messageIds.includes(msg._id)
              ? { ...msg, readBy: [...msg.readBy, readBy] }
              : msg
          )
        );
      }
    });

    return () => {
      socket.off('newMessage');
      socket.off('messageDeleted');
      socket.off('messagesRead');
    };
  }, [activeChat]);

  // Fetch all chats for user
  const loadChats = async () => {
    const res = await axios.get('/api/chats/user-chats');
    setChats(res.data.data);
  };

  // Fetch paginated messages for chat
  const loadMessages = async (chatId, page = 1, limit = 50) => {
    const res = await axios.get(`/api/chats/${chatId}/messages`, {
      params: { page, limit }
    });
    setMessages(res.data.data.messages);
  };

  // Send message, with optional file upload
  const sendMessage = async (chatId, content, messageType = 'text', file = null) => {
    const formData = new FormData();
    formData.append('chatId', chatId);
    formData.append('content', content);
    formData.append('messageType', messageType);
    if (file && messageType !== 'text') {
      formData.append('file', file);
    }

    const res = await axios.post('/api/chats/send-message', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return res.data.data;
  };

  return (
    <ChatContext.Provider
      value={{
        chats,
        activeChat,
        setActiveChat,
        loadChats,
        loadMessages,
        messages,
        sendMessage,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
