import React, { useEffect, useState } from 'react';
import useChatStore from '../store/chatStore';
const ChatPage = ({ otherUserId, otherUserModel }) => {
  const {
    chats,
    contacts,
    fetchChatHistory,
    sendMessage,
    fetchContacts,
    markMessagesAsSeen,
    getUnreadCount,
    unreadCount,
    error,
    loading
  } = useDoctorChatStore();

  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchChatHistory(otherUserId, otherUserModel);
    fetchContacts();
    getUnreadCount();
  }, [otherUserId, otherUserModel]);

  const handleSendMessage = () => {
    if (message.trim() === '') return;

    sendMessage(otherUserId, message, otherUserModel);
    setMessage('');
  };

  return (
    <div>
      <h2>Chat with {otherUserModel}: {otherUserId}</h2>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div>
        {chats.map((chat) => (
          <div key={chat._id} style={{ padding: '8px', borderBottom: '1px solid #ccc' }}>
            <strong>{chat.senderModel}:</strong> {chat.message}
            {!chat.seen && <span style={{ color: 'red' }}> (Unread)</span>}
          </div>
        ))}
      </div>

      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type a message..."
      />
      <button onClick={handleSendMessage}>Send</button>

      <h3>Contacts (Unread: {unreadCount})</h3>
      <ul>
        {contacts.map((contact) => (
          <li key={contact.userId}>
            {contact.lastMessage} - {contact.unreadCount} unread
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ChatPage;
