import React, { useState, useEffect, useRef } from 'react';
import { Search, Send, Phone, Video, MoreVertical, ArrowLeft, Users, MessageCircle } from 'lucide-react';
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
  const messagesEndRef = useRef(null);

  // Chat store
  const {
    chats,
    currentChat,
    messages,
    isLoading,
    error,
    connectSocket,
    disconnectSocket,
    fetchUserChats,
    createOrGetChat,
    sendMessage,
    getChatMessages,
    setCurrentChat,
    clearCurrentChat
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
  }, [userType]);

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

      console.log("[ChatPage] client:", client);
      console.log("[ChatPage] doctor:", doctor);
      console.log("[ChatPage] userType:", userType);

      const currentUserId =
        userType === 'Doctor' ? doctor?._id :
        userType === 'Client' ? client?._id :
        null;

      if (!currentUserId) {
        console.error("[ChatPage] currentUserId is undefined! UserType:", userType, "Doctor:", doctor?._id, "Client:", client?._id);
        return;
      }

      console.log("[ChatPage] Current user id:", currentUserId);

      const otherParticipant = chat.participants?.find(
        (p) => p?.userId?._id && p.userId._id !== currentUserId
      );

      if (!otherParticipant || !otherParticipant.userId) {
        console.error("[ChatPage] Could not find the other participant.");
        return;
      }

      console.log("[ChatPage] Other participant found:", otherParticipant.userId);

      setSelectedChat(otherParticipant.userId);
      setShowContactList(false);
    } catch (error) {
      console.error('[ChatPage] Failed to select chat:', error);
    }
  };

  // Handle send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentChat) return;

    try {
      await sendMessage(currentChat._id, newMessage.trim());
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // Filter contacts based on search
  const filteredContacts = contacts.filter(contact =>
    contact.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.specialization?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter chats based on search
  const currentUserId = getCurrentUserId();

  const filteredChats = chats.filter(chat => {
    // Defensive check: chat and participants must exist
    if (!chat?.participants?.length || !currentUserId) return false;

    // Find other participant whose userId._id is not current user
    const otherParticipant = chat.participants.find(p =>
      p?.userId?._id && p.userId._id.toString() !== currentUserId.toString()
    );

    // Check if other participant's name includes search term
    return otherParticipant?.userId?.name
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());
  });

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
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 border-3 border-white rounded-full shadow-sm"></div>
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
            </div>
          )}

          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {userType === 'Client' ? 'Find Doctors' : 'Your Patients'}
            </h1>
            <div className="flex space-x-2">
              <button className="p-3 hover:bg-blue-50/80 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-md">
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
            Recent Chats
          </button>
        </div>

        {/* Contact/Chat List */}
        <div className="flex-1 overflow-y-auto">
          {/* Existing Chats */}
          {filteredChats.length > 0 && (
            <div className="border-b border-slate-200/60">
              <div className="px-6 py-3 bg-gradient-to-r from-blue-50/60 to-indigo-50/60">
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Recent Chats</h3>
              </div>
              {filteredChats.map((chat) => {
                const currentUserId = userType === 'Doctor' ? doctor?._id : client?._id;

                const otherParticipant = chat.participants.find(
                  p => p?.userId?._id?.toString() !== currentUserId?.toString()
                );

                const participant = otherParticipant?.userId;

                if (!participant) {
                  console.warn("Other participant not found in chat:", chat._id);
                  return null;
                }

                return (
                  <div
                    key={chat._id}
                    onClick={() => handleChatSelect(chat)}
                    className="flex items-center p-4 hover:bg-gradient-to-r hover:from-blue-50/80 hover:to-indigo-50/80 cursor-pointer border-b border-slate-100/60 transition-all duration-300 group hover:shadow-sm"
                  >
                    <div className="relative">
                      <img
                        src={participant?.avatar || participant?.profileImage || `https://ui-avatars.com/api/?name=${participant?.name}&background=3b82f6&color=fff`}
                        alt={participant?.name}
                        className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white shadow-lg"
                      />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full"></div>
                    </div>
                    <div className="ml-4 flex-1">
                      <div className="flex justify-between items-start">
                        <h3 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors duration-300">{participant?.name}</h3>
                        <span className="text-xs text-slate-500 bg-slate-100/80 px-2.5 py-1 rounded-full">
                          {new Date(chat.lastMessage?.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mt-1 truncate font-medium">
                        {chat.lastMessage?.content || 'No messages yet'}
                      </p>
                      {chat.unreadCount > 0 && (
                        <span className="inline-block bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-bold rounded-full px-3 py-1 mt-2 shadow-lg">
                          {chat.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* All Contacts */}
          <div>
            <div className="px-6 py-3 bg-gradient-to-r from-slate-50/60 to-blue-50/60">
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                {userType === 'Client' ? 'Available Doctors' : 'All Patients'}
              </h3>
            </div>
            {filteredContacts.map((contact) => (
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
            ))}
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
                    onClick={() => setShowContactList(true)}
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

            {/* Messages - Enhanced Full Width Design */}
            <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8">
              {[...messages]
                .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
                .map((message) => {
                  
                  const currentUserId = getCurrentUserId();
                  const senderId = message.sender?.userId;
                  const isOwnMessage = senderId?.toString() === currentUserId?.toString();

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
                            <span className="text-sm font-semibold text-slate-600">
                              {isOwnMessage ? 'You' : selectedChat?.name}
                            </span>
                            <span className="text-xs text-slate-500 ml-2">
                              {new Date(message.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          
                          {/* Message Bubble */}
                          <div className={`inline-block max-w-full px-6 py-4 rounded-3xl shadow-lg ${
                            isOwnMessage 
                              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-blue-200/50' 
                              : 'bg-white text-slate-800 border border-slate-200/60 shadow-slate-200/50'
                          } ${isOwnMessage ? 'rounded-br-lg' : 'rounded-bl-lg'}`}>
                            <p className="text-base leading-relaxed font-medium break-words">
                              {message.content}
                            </p>
                          </div>
                          
                          {/* Message Status for own messages */}
                          {isOwnMessage && (
                            <div className="mt-2 text-right">
                              <span className="text-xs text-slate-400">
                                ✓ Delivered
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input - Enhanced */}
            <div className="bg-white/90 backdrop-blur-xl border-t border-slate-200/60 px-6 py-5 shadow-2xl">
              <form onSubmit={handleSendMessage} className="flex space-x-4 items-end">
                <div className="flex-1 relative">
                  <textarea
                    placeholder="Type your message..."
                    className="w-full bg-white/90 border border-slate-300/60 rounded-2xl px-6 py-4 focus:outline-none focus:ring-3 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-300 text-slate-800 placeholder-slate-500 font-medium shadow-sm resize-none min-h-[56px] max-h-32"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                    rows={1}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!newMessage.trim() || isLoading}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-2xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 disabled:hover:scale-100"
                >
                  <Send className="w-6 h-6" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center bg-white/70 backdrop-blur-xl p-16 rounded-3xl shadow-2xl border border-white/40 max-w-md">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-500 w-28 h-28 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
                <MessageCircle className="w-14 h-14 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-slate-900 mb-4">
                Select a {userType === 'Client' ? 'Doctor' : 'Client'}
              </h3>
              <p className="text-slate-600 font-medium text-lg leading-relaxed">
                Choose from the list to begin your conversation and start chatting
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="fixed bottom-6 right-6 bg-gradient-to-r from-red-500 to-red-600 text-white px-8 py-5 rounded-2xl shadow-2xl z-50 backdrop-blur-sm border border-red-400/20">
          <p className="font-semibold text-lg">{error}</p>
          </div>
      )}
    </div>
  );
};

export default ChatPage;