import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const ChatContactList = ({ onSelectContact, selectedUserId }) => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  
  // Fetch contacts on component mount
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const response = await axios.get('/api/chat/contacts', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        
        // Fetch user details for each contact
        const contactsWithDetails = await Promise.all(response.data.map(async (contact) => {
          try {
            // Determine if we're fetching doctor or client
            const endpoint = user.role === 'doctor' 
              ? `/api/clients/${contact.userId}`
              : `/api/doctors/${contact.userId}`;
              
            const userResponse = await axios.get(endpoint, {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            
            return {
              ...contact,
              name: userResponse.data.name || `${userResponse.data.firstName} ${userResponse.data.lastName}`,
              avatar: userResponse.data.profileImage || '/default-avatar.png',
              role: user.role === 'doctor' ? 'client' : 'doctor'
            };
          } catch (error) {
            console.error(`Error fetching user ${contact.userId}:`, error);
            return {
              ...contact,
              name: 'Unknown User',
              avatar: '/default-avatar.png',
              role: user.role === 'doctor' ? 'client' : 'doctor'
            };
          }
        }));
        
        setContacts(contactsWithDetails);
      } catch (error) {
        console.error("Error fetching contacts:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchContacts();
    
    // Connect to socket for real-time updates
    const newSocket = io("http://localhost:5000"); // Update for production
    setSocket(newSocket);
    
    return () => {
      if (newSocket) newSocket.disconnect();
    };
  }, [user.role, user._id]);
  
  // Listen for new messages to update contact list
  useEffect(() => {
    if (!socket) return;
    
    const handleNewMessage = async (data) => {
      // If message is from/to a contact already in the list, update their last message
      setContacts(prev => {
        const contactExists = prev.some(contact => 
          contact.userId === data.senderId || contact.userId === data.receiverId
        );
        
        if (contactExists) {
          return prev.map(contact => {
            if (contact.userId === data.senderId || contact.userId === data.receiverId) {
              return {
                ...contact,
                lastMessage: data.message,
                timestamp: data.timestamp,
                unreadCount: contact.userId === data.senderId && data.receiverId === user._id
                  ? contact.unreadCount + 1
                  : contact.unreadCount
              };
            }
            return contact;
          }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        }
        
        // If it's a new contact, fetch their info and add to list
        // This would require additional code to fetch user info
        // For now, we'll just reload all contacts
        fetchContacts();
        return prev;
      });
    };
    
    socket.on("receive_message", handleNewMessage);
    
    return () => {
      socket.off("receive_message", handleNewMessage);
    };
  }, [socket, user._id]);
  
  // Format timestamp
  const formatTimestamp = (timestamp) => {
    const messageDate = new Date(timestamp);
    const today = new Date();
    
    // If message is from today, show time
    if (messageDate.toDateString() === today.toDateString()) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // If message is from this week, show day name
    const diffDays = (today - messageDate) / (1000 * 60 * 60 * 24);
    if (diffDays < 7) {
      return messageDate.toLocaleDateString([], { weekday: 'short' });
    }
    
    // Otherwise show date
    return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };
  
  if (loading) {
    return <div className="flex justify-center items-center h-full">Loading contacts...</div>;
  }
  
  return (
    <div className="overflow-y-auto h-full">
      {contacts.length === 0 ? (
        <div className="text-center p-4 text-gray-500">
          No conversations yet
        </div>
      ) : (
        <ul className="divide-y">
          {contacts.map((contact) => (
            <li 
              key={contact.userId}
              className={`cursor-pointer hover:bg-gray-100 transition p-3 ${
                selectedUserId === contact.userId ? 'bg-blue-50' : ''
              }`}
              onClick={() => onSelectContact(contact)}
            >
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <img 
                    src={contact.avatar} 
                    alt={contact.name} 
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  {contact.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {contact.unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between">
                    <h3 className="font-medium truncate">{contact.name}</h3>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(contact.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 truncate">
                    {contact.lastMessage}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ChatContactList;