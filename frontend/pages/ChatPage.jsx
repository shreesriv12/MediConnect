import React, { useState, useEffect, useRef } from 'react';
import { Search, Send, Phone, Video, MoreVertical, ArrowLeft, Users, MessageCircle, Trash2, Eye, EyeOff } from 'lucide-react';
import useChatStore from '../store/chatStore';
import useDoctorAuthStore from '../store/doctorAuthStore';
import useClientAuthStore from '../store/clientAuthStore';
import { Link } from 'react-router-dom';

const ChatPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChat, setSelectedChat] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [showContactList, setShowContactList] = useState(true);
  const [contacts, setContacts] = useState([]);
  const [userType, setUserType] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Chat store - Added all missing functions
  const {
    chats,
    currentChat,
    messages,
    isLoading,
    error,
    isConnected,
    unreadCount,
    pagination,
    connectSocket,
    disconnectSocket,
    fetchUserChats,
    createOrGetChat,
    sendMessage,
    getChatMessages,
    setCurrentChat,
    clearCurrentChat,
    markMessagesAsRead,
    deleteMessage,
    clearError,
    setError,
    startTyping,
    stopTyping,
    getChatParticipant,
    isMessageFromCurrentUser,
    getFormattedChats,
    updateChatWithNewMessage
  } = useChatStore();

  // Auth stores
  const {
    doctor,
    isAuthenticated: isDoctorAuthenticated,
    getAllDoctors,
    checkAuth: checkDoctorAuth
  } = useDoctorAuthStore();

  const {
    client,
    isAuthenticated: isClientAuthenticated,
    getAllClients,
    checkAuth: checkClientAuth
  } = useClientAuthStore();

  // Get current user ID for message comparison - MOVED UP
  const getCurrentUserId = () => {
    if (userType === 'Doctor') {
      console.log("[ChatPage] Current user ID (Doctor):", doctor?._id);
      return doctor?._id;
    } else if (userType === 'Client') {
      console.log("[ChatPage] Current user ID (Client):", client?._id);
      return client?._id;
    }
    return null;
  };

  // Determine user type and setup
  useEffect(() => {
    const initializeUser = async () => {
      try {
        // Check localStorage first for quicker initialization
        const doctorToken = localStorage.getItem('doctorAccessToken');
        const clientToken = localStorage.getItem('clientAccessToken');

        // If we have stored userType and matching token, set immediately
        if (doctorToken && doctor) {
          setUserType('Doctor');
          setCurrentUser(doctor);
          return;
        }
        
        if (clientToken && client) {
          setUserType('Client');
          setCurrentUser(client);
          return;
        }

        // Fall back to auth checks
        if (doctor) {
          const doctorAuth = await checkDoctorAuth();
          if (doctorAuth.success) {
            setUserType('Doctor');
            setCurrentUser(doctor);
            return;
          }
        }

        if (client) {
          const clientAuth = await checkClientAuth();
          if (clientAuth.success) {
            setUserType('Client');
            setCurrentUser(client);
            return;
          }
        }

        console.warn("No valid user found");
      } catch (error) {
        console.error("Error initializing user:", error);
      }
    };

    // Run initialization when we have user data
    if (doctor || client) {
      initializeUser();
    }
  }, [doctor, client, checkDoctorAuth, checkClientAuth]);

  // Connect socket and fetch data
  useEffect(() => {
    if (userType) {
      connectSocket();
      fetchUserChats();
      fetchContacts();
    }

    return () => {
      disconnectSocket();
    };
  }, [userType, connectSocket, disconnectSocket, fetchUserChats]);

  // Mark messages as read when chat is opened
  useEffect(() => {
    if (currentChat && messages.length > 0) {
      const unreadMessages = messages.filter(msg => {
        const currentUserId = getCurrentUserId();
        return !isMessageFromCurrentUser(msg, currentUserId) && !msg.isRead;
      });

      if (unreadMessages.length > 0) {
        const messageIds = unreadMessages.map(msg => msg._id);
        markMessagesAsRead(currentChat._id, messageIds);
      }
    }
  }, [currentChat, messages, markMessagesAsRead, isMessageFromCurrentUser]);

  const [loading, setLoading] = useState(false);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      if (userType === 'Client') {
        const result = await getAllDoctors({ verified: 'true' });
        if (result.success) {
          setContacts(result.data);
        }
      } else if (userType === 'Doctor') {
        const result = await getAllClients();
        if (result.success) {
          setContacts(result.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
      setError('Failed to fetch contacts');
    } finally {
      setLoading(false);
    }
  };

  // Scroll to bottom of messages - Fixed with timeout
  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    };
    
    // Use timeout to ensure DOM is updated
    setTimeout(scrollToBottom, 100);
  }, [messages]);

  // Handle contact selection
  const handleContactSelect = async (contact) => {
    try {
      const participantType = userType === 'Client' ? 'Doctor' : 'Client';
      await createOrGetChat(contact._id, participantType);
      setSelectedChat(contact);
      setShowContactList(false);
    } catch (error) {
      console.error('Failed to create/get chat:', error);
      setError('Failed to create chat');
    }
  };

  // Handle chat selection from existing chats
  const handleChatSelect = async (chat) => {
    try {
      if (!chat || !chat._id) {
        console.error("[ChatPage] Invalid chat object:", chat);
        return;
      }

      // Add this guard at the beginning
      if (!userType) {
        console.warn("[ChatPage] UserType not set yet, waiting for initialization");
        return;
      }

      console.log("[ChatPage] Selecting chat:", chat._id);
      setCurrentChat(chat);

      await getChatMessages(chat._id);
      console.log("[ChatPage] Messages fetched for chat:", chat._id);

      const currentUserId = getCurrentUserId();

      if (!currentUserId) {
        console.error("[ChatPage] currentUserId is undefined! UserType:", userType, "Doctor:", doctor?._id, "Client:", client?._id);
        return;
      }

      console.log("[ChatPage] Current user id:", currentUserId);

      const otherParticipant = getChatParticipant(chat, currentUserId);

      if (!otherParticipant || !otherParticipant.userId) {
        console.error("[ChatPage] Could not find the other participant.");
        return;
      }

      console.log("[ChatPage] Other participant found:", otherParticipant.userId);

      setSelectedChat(otherParticipant.userId);
      setShowContactList(false);
    } catch (error) {
      console.error('[ChatPage] Failed to select chat:', error);
      setError('Failed to load chat');
    }
  };

  // Handle typing indicators
  const handleTypingStart = () => {
    if (currentChat && !isTyping) {
      setIsTyping(true);
      startTyping(currentChat._id);
    }
  };

  const handleTypingStop = () => {
    if (currentChat && isTyping) {
      setIsTyping(false);
      stopTyping(currentChat._id);
    }
  };

  // Handle send message with file support
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !currentChat) return;

    try {
      handleTypingStop();
      
      const messageType = selectedFile ? 
        (selectedFile.type.startsWith('image/') ? 'image' : 'file') : 'text';
      
      await sendMessage(currentChat._id, newMessage.trim(), messageType, selectedFile);
      setNewMessage('');
      setSelectedFile(null);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setError('Failed to send message');
    }
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (e.g., max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  // Handle message deletion
  const handleDeleteMessage = async (messageId) => {
    try {
      await deleteMessage(currentChat._id, messageId);
      setShowDeleteConfirm(false);
      setMessageToDelete(null);
    } catch (error) {
      console.error('Failed to delete message:', error);
      setError('Failed to delete message');
    }
  };

  // Handle typing in input
  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    
    // Handle typing indicators
    if (e.target.value.trim() && currentChat) {
      handleTypingStart();
      
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set new timeout to stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        handleTypingStop();
      }, 2000);
    } else {
      handleTypingStop();
    }
  };

  // Load more messages (pagination)
  const loadMoreMessages = async () => {
    if (currentChat && pagination.hasMore && !isLoading) {
      try {
        await getChatMessages(currentChat._id, pagination.currentPage + 1);
      } catch (error) {
        console.error('Failed to load more messages:', error);
        setError('Failed to load more messages');
      }
    }
  };

  // Filter contacts based on search
  const filteredContacts = contacts.filter(contact =>
    contact.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.specialization?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter chats based on search using store helper
  const currentUserId = getCurrentUserId();
  const formattedChats = getFormattedChats(currentUserId);
  
  const filteredChats = formattedChats.filter(chat =>
    chat.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Clear error after showing
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  if (!userType) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center bg-white/80 backdrop-blur-lg p-10 rounded-3xl shadow-2xl border border-white/20">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
          <p className="mt-6 text-gray-700 font-semibold text-lg">Loading your chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Sidebar */}
      <div className={`${showContactList ? 'w-full md:w-80' : 'hidden md:block md:w-80'} bg-white/90 backdrop-blur-xl border-r border-slate-200/60 shadow-2xl`}>
        {/* Header with Current User Info */}
        <div className="p-6 border-b border-slate-200/60 bg-gradient-to-r from-white/80 to-blue-50/50 backdrop-blur-sm">
          {/* Current User Avatar and Info */}
          {currentUser && (
            <div className="flex items-center mb-6 p-5 bg-gradient-to-r from-blue-50/90 to-indigo-50/90 rounded-2xl border border-blue-100/60 shadow-lg">
              <div className="relative">
                <img
                  src={currentUser.avatar || currentUser.profileImage || `https://ui-avatars.com/api/?name=${currentUser.name}&background=3b82f6&color=fff`}
                  alt={currentUser.name}
                  className="w-16 h-16 rounded-2xl object-cover ring-3 ring-blue-200/50 shadow-xl"
                />
                <div className={`absolute -bottom-1 -right-1 w-5 h-5 border-3 border-white rounded-full shadow-sm ${
                  isConnected ? 'bg-green-400' : 'bg-red-400'
                }`}></div>
              </div>
              <div className="ml-4 flex-1">
                <h2 className="text-lg font-bold text-slate-900">{currentUser.name}</h2>
                <div className="text-sm text-slate-600 space-y-1 mt-1">
                  <p className="flex items-center">
                    <Phone className="w-3.5 h-3.5 mr-2 text-slate-500" />
                    {currentUser.phone || 'No phone'}
                  </p>
                  <p className="flex items-center">
                    <span className="w-3.5 h-3.5 mr-2 text-slate-500 text-xs">@</span>
                    {currentUser.email || 'No email'}
                  </p>
                  <p className="text-slate-600 font-medium">
                    {currentUser.gender || 'Not specified'} • {userType}
                  </p>
                </div>
              </div>
              {unreadCount > 0 && (
                <div className="bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold rounded-full w-8 h-8 flex items-center justify-center shadow-lg">
                  {unreadCount}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {userType === 'Client' ? 'Find Doctors' : 'Your Patients'}
            </h1>
            <div className="flex space-x-2">
              <button 
                onClick={fetchUserChats}
                className="p-3 hover:bg-blue-50/80 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-md"
                title="Refresh chats"
              >
                <Users className="w-5 h-5 text-slate-600" />
              </button>
              <button className="p-3 hover:bg-blue-50/80 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-md">
                <MoreVertical className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder={`Search ${userType === 'Client' ? 'doctors' : 'patients'}...`}
              className="w-full pl-12 pr-4 py-3.5 bg-white/80 border border-slate-200/60 rounded-2xl focus:outline-none focus:ring-3 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-300 text-slate-700 placeholder-slate-500 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200/60 bg-white/60 backdrop-blur-sm">
          <button className="flex-1 px-6 py-4 text-sm font-semibold text-blue-600 border-b-3 border-blue-600 bg-blue-50/60">
            {userType === 'Client' ? 'All Doctors' : 'All Patients'}
          </button>
          <button className="flex-1 px-6 py-4 text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50/60 transition-all duration-300">
            Recent Chats ({filteredChats.length})
          </button>
        </div>

        {/* Contact/Chat List */}
        <div className="flex-1 overflow-y-auto">
          {/* Load More Messages Button */}
          {currentChat && pagination.hasMore && (
            <div className="p-4 border-b border-slate-200/60">
              <button
                onClick={loadMoreMessages}
                disabled={isLoading}
                className="w-full py-2 text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
              >
                {isLoading ? 'Loading...' : 'Load More Messages'}
              </button>
            </div>
          )}

          {/* Existing Chats */}
          {filteredChats.length > 0 && (
            <div className="border-b border-slate-200/60">
              <div className="px-6 py-3 bg-gradient-to-r from-blue-50/60 to-indigo-50/60">
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Recent Chats</h3>
              </div>
              {filteredChats.map((chat) => (
                <div
                  key={chat._id}
                  onClick={() => handleChatSelect(chat)}
                  className="flex items-center p-4 hover:bg-gradient-to-r hover:from-blue-50/80 hover:to-indigo-50/80 cursor-pointer border-b border-slate-100/60 transition-all duration-300 group hover:shadow-sm"
                >
                  <div className="relative">
                    <img
                      src={chat.displayAvatar || `https://ui-avatars.com/api/?name=${chat.displayName}&background=3b82f6&color=fff`}
                      alt={chat.displayName}
                      className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white shadow-lg"
                    />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full"></div>
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex justify-between items-start">
                      <h3 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors duration-300">{chat.displayName}</h3>
                      <span className="text-xs text-slate-500 bg-slate-100/80 px-2.5 py-1 rounded-full">
                        {new Date(chat.lastMessageTime).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1 truncate font-medium">
                      {chat.lastMessagePreview}
                    </p>
                    {chat.unreadCount > 0 && (
                      <span className="inline-block bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-bold rounded-full px-3 py-1 mt-2 shadow-lg">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* All Contacts */}
          <div>
            <div className="px-6 py-3 bg-gradient-to-r from-slate-50/60 to-blue-50/60">
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                {userType === 'Client' ? 'Available Doctors' : 'All Patients'}
              </h3>
            </div>
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-200 border-t-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm text-slate-600">Loading contacts...</p>
              </div>
            ) : (
              filteredContacts.map((contact) => (
                <div
                  key={contact._id}
                  onClick={() => handleContactSelect(contact)}
                  className="flex items-center p-4 hover:bg-gradient-to-r hover:from-blue-50/80 hover:to-indigo-50/80 cursor-pointer border-b border-slate-100/60 transition-all duration-300 group hover:shadow-sm"
                >
                  <div className="relative">
                    <img
                      src={contact.avatar || contact.profileImage || `https://ui-avatars.com/api/?name=${contact.name}&background=3b82f6&color=fff`}
                      alt={contact.name}
                      className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white shadow-lg"
                    />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full"></div>
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors duration-300">{contact.name}</h3>
                    <div className="text-xs text-slate-600 mt-1 font-medium">
                      <span>{contact.age} years • {contact.gender}</span>
                      {userType === 'Client' && contact.specialization && (
                        <span className="ml-2">• {contact.specialization}</span>
                      )}
                    </div>
                    {userType === 'Client' && contact.verified && (
                      <span className="inline-block bg-gradient-to-r from-green-400 to-green-500 text-white text-xs font-bold px-3 py-1 rounded-full mt-2 shadow-lg">
                        ✓ Verified
                      </span>
                    )}
                  </div>
                  <MessageCircle className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors duration-300" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className={`${showContactList ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-gradient-to-b from-white/40 to-slate-50/40 backdrop-blur-sm`}>
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="bg-white/90 backdrop-blur-xl border-b border-slate-200/60 px-6 py-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <button
                    onClick={() => {
                      setShowContactList(true);
                      clearCurrentChat();
                    }}
                    className="mr-5 p-2.5 hover:bg-blue-50/80 rounded-xl md:hidden transition-all duration-300 hover:shadow-md"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="relative">
                    <img
                      src={selectedChat.avatar || selectedChat.profileImage || `https://ui-avatars.com/api/?name=${selectedChat.name}&background=3b82f6&color=fff`}
                      alt={selectedChat.name}
                      className="w-12 h-12 rounded-2xl object-cover ring-2 ring-white shadow-lg"
                    />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full"></div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-bold text-slate-900">{selectedChat.name}</h3>
                    <div className="text-sm text-slate-600 font-medium space-y-1">
                      <p>{selectedChat.age} years • {selectedChat.gender}</p>
                      {selectedChat.phone && (
                        <p className="flex items-center">
                          <Phone className="w-3 h-3 mr-1" />
                          {selectedChat.phone}
                        </p>
                      )}
                      {selectedChat.email && (
                        <p className="flex items-center">
                          <span className="w-3 h-3 mr-1">@</span>
                          {selectedChat.email}
                        </p>
                      )}
                      {userType === 'Client' && selectedChat.specialization && (
                        <p>Specialization: {selectedChat.specialization}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button className="p-3 hover:bg-blue-50/80 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-md">
                    <Phone className="w-5 h-5 text-slate-600" />
                  </button>
                  <Link to="/video-call">
                    <button className="p-3 hover:bg-blue-50/80 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-md">
                      <Video className="w-5 h-5 text-slate-600" />
                    </button>
                  </Link>
                  <button className="p-3 hover:bg-blue-50/80 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-md">
                    <MoreVertical className="w-5 h-5 text-slate-600" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages - Fixed ordering to show new messages at bottom */}
            <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8">
              {[...messages]
                .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)) // Keep ascending order for bottom display
                .map((message) => {
                  
                  const currentUserId = getCurrentUserId();
                  const isOwnMessage = isMessageFromCurrentUser(message, currentUserId);

                  console.log('Message debug:', {
                    messageId: message._id,
                    senderId: message.sender?.userId || message.senderId,
                    currentUserId,
                    isOwnMessage,
                    content: message.content
                  });
                  
                  return (
                    <div
                      key={message._id}
                      className={`w-full flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex items-start max-w-2xl w-full ${
                        isOwnMessage 
                          ? 'flex-row-reverse space-x-reverse space-x-4' 
                          : 'flex-row space-x-4'
                      }`}>
                        {/* Profile Avatar */}
                        <div className="flex-shrink-0">
                          <img
                            src={
                              isOwnMessage 
                                ? (currentUser?.avatar || currentUser?.profileImage || `https://ui-avatars.com/api/?name=${currentUser?.name}&background=3b82f6&color=fff`)
                                : (selectedChat?.avatar || selectedChat?.profileImage || `https://ui-avatars.com/api/?name=${selectedChat?.name}&background=10b981&color=fff`)
                            }
                            alt={isOwnMessage ? currentUser?.name : selectedChat?.name}
                            className="w-12 h-12 rounded-2xl object-cover ring-3 ring-white shadow-xl"
                          />
                        </div>
                        {/* Message Content */}
                        <div className={`flex-1 ${isOwnMessage ? 'text-right' : 'text-left'}`}>
                          {/* Sender Name */}
                          <div className={`mb-2 ${isOwnMessage ? 'text-right' : 'text-left'}`}>
                            <span className="text-xs font-semibold text-slate-600">
                              {isOwnMessage ? 'You' : selectedChat?.name}
                            </span>
                            <span className="text-xs text-slate-500 ml-2">
                              {new Date(message.createdAt).toLocaleTimeString([], { 
                                hour12: true, 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                          </div>
                          
                          {/* Message Bubble */}
                          <div
                            className={`relative inline-block max-w-lg p-4 rounded-2xl shadow-lg ${
                              isOwnMessage
                                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                                : 'bg-white text-slate-900 border border-slate-200'
                            }`}
                          >
                            {/* Message Type Rendering */}
                            {message.messageType === 'image' && message.fileUrl ? (
                              <div className="mb-2">
                                <img
                                  src={message.fileUrl}
                                  alt="Shared image"
                                  className="max-w-xs rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => window.open(message.fileUrl, '_blank')}
                                />
                                {message.content && (
                                  <p className="mt-2 text-sm">{message.content}</p>
                                )}
                              </div>
                            ) : message.messageType === 'file' && message.fileUrl ? (
                              <div className="flex items-center space-x-3 p-3 bg-slate-100/20 rounded-xl">
                                <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center">
                                  <span className="text-xs font-bold text-slate-600">
                                    {message.fileName?.split('.').pop()?.toUpperCase() || 'FILE'}
                                  </span>
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium truncate">
                                    {message.fileName || 'File'}
                                  </p>
                                  <p className="text-xs opacity-70">
                                    {message.fileSize ? `${(message.fileSize / 1024).toFixed(1)} KB` : 'File'}
                                  </p>
                                </div>
                                <button
                                  onClick={() => window.open(message.fileUrl, '_blank')}
                                  className="p-2 hover:bg-slate-200/20 rounded-lg transition-colors"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                {message.content}
                              </p>
                            )}

                            {/* Message Status & Actions */}
                            <div className={`flex items-center justify-between mt-2 ${
                              isOwnMessage ? 'flex-row-reverse' : 'flex-row'
                            }`}>
                              {/* Message Status for own messages */}
                              {isOwnMessage && (
                                <div className="flex items-center space-x-1 text-xs">
                                  {message.status === 'sent' && (
                                    <span className="opacity-70">✓</span>
                                  )}
                                  {message.status === 'delivered' && (
                                    <span className="opacity-70">✓✓</span>
                                  )}
                                  {message.isRead && (
                                    <span className="text-green-300">✓✓</span>
                                  )}
                                </div>
                              )}

                              {/* Message Actions */}
                              <div className="flex items-center space-x-1">
                                {isOwnMessage && (
                                  <button
                                    onClick={() => {
                                      setMessageToDelete(message._id);
                                      setShowDeleteConfirm(true);
                                    }}
                                    className="p-1 hover:bg-red-100/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Message Bubble Arrow */}
                            <div className={`absolute top-4 ${
                              isOwnMessage 
                                ? 'right-0 transform translate-x-2' 
                                : 'left-0 transform -translate-x-2'
                            }`}>
                              <div className={`w-0 h-0 border-t-4 border-b-4 border-transparent ${
                                isOwnMessage 
                                  ? 'border-l-4 border-l-blue-500' 
                                  : 'border-r-4 border-r-white'
                              }`}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="w-full flex justify-start">
                  <div className="flex items-center space-x-4 max-w-xs">
                    <img
                      src={selectedChat?.avatar || selectedChat?.profileImage || `https://ui-avatars.com/api/?name=${selectedChat?.name}&background=10b981&color=fff`}
                      alt={selectedChat?.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div className="bg-white p-4 rounded-2xl shadow-lg border border-slate-200">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="bg-white/90 backdrop-blur-xl border-t border-slate-200/60 p-6 shadow-lg">
              {/* File Preview */}
              {selectedFile && (
                <div className="mb-4 p-4 bg-blue-50/80 rounded-2xl border border-blue-200/60">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        {selectedFile.type.startsWith('image/') ? (
                          <img
                            src={URL.createObjectURL(selectedFile)}
                            alt="Preview"
                            className="w-8 h-8 object-cover rounded-lg"
                          />
                        ) : (
                          <span className="text-xs font-bold text-blue-600">
                            {selectedFile.name.split('.').pop()?.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 truncate max-w-xs">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-slate-600">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                      className="p-2 hover:bg-red-100 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex items-end space-x-4">
                {/* File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  accept="image/*,.pdf,.doc,.docx,.txt"
                  className="hidden"
                />
                
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 hover:bg-blue-50/80 rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-md"
                >
                  <span className="text-2xl">📎</span>
                </button>

                <div className="flex-1">
                  <textarea
                    value={newMessage}
                    onChange={handleInputChange}
                    placeholder="Type your message..."
                    className="w-full p-4 bg-slate-50/80 border border-slate-200/60 rounded-2xl focus:outline-none focus:ring-3 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-300 resize-none text-slate-700 placeholder-slate-500 shadow-sm"
                    rows={newMessage.split('\n').length || 1}
                    style={{ maxHeight: '120px' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={!newMessage.trim() && !selectedFile}
                  className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>

              {/* Connection Status */}
              <div className="flex items-center justify-center mt-4 space-x-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span className="text-xs text-slate-600">
                  {isConnected ? 'Connected' : 'Connecting...'}
                </span>
              </div>
            </div>
          </>
        ) : (
          /* No Chat Selected */
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50/40 to-blue-50/40">
            <div className="text-center bg-white/80 backdrop-blur-lg p-12 rounded-3xl shadow-2xl border border-white/20 max-w-md">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <MessageCircle className="w-12 h-12 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">
                {userType === 'Client' ? 'Find a Doctor' : 'Connect with Patients'}
              </h3>
              <p className="text-slate-600 leading-relaxed mb-8">
                {userType === 'Client' 
                  ? 'Select a verified doctor from the list to start a consultation and get professional medical advice.'
                  : 'Choose a patient from your list to begin providing care and medical guidance.'
                }
              </p>
              <button
                onClick={() => setShowContactList(true)}
                className="px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-lg md:hidden"
              >
                {userType === 'Client' ? 'Browse Doctors' : 'View Patients'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/95 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/20 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">Delete Message?</h3>
              <p className="text-slate-600 mb-8">
                This action cannot be undone. The message will be permanently deleted.
              </p>
              <div className="flex space-x-4">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setMessageToDelete(null);
                  }}
                  className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-2xl transition-all duration-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteMessage(messageToDelete)}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-6 right-6 bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-4 rounded-2xl shadow-2xl border border-red-400/20 backdrop-blur-xl z-50 max-w-md">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold mb-1">Error</h4>
              <p className="text-sm opacity-90">{error}</p>
            </div>
            <button
              onClick={clearError}
              className="ml-4 p-1 hover:bg-red-400/20 rounded-lg transition-colors"
            >
              <EyeOff className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-40">
          <div className="bg-white/90 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/20">
            <div className="flex items-center space-x-4">
              <div className="animate-spin rounded-full h-8 w-8 border-3 border-blue-200 border-t-blue-600"></div>
              <span className="text-slate-700 font-semibold">Processing...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;