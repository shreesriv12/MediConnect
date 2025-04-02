import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useTheme } from '../context/ThemeContext'; // Adjust path as needed

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const { theme } = useTheme();
  
  // Generate a simple userId for the session
  const [userId] = useState(() => 'user_' + Math.random().toString(36).substring(2, 9));

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const handleInputChange = (e) => {
    setInputMessage(e.target.value);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!inputMessage.trim()) return;
    
    // Add user message to chat
    const userMessage = { role: 'user', content: inputMessage };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    
    try {
      const response = await axios.post('http://localhost:5000/chat', {
        userId,
        message: inputMessage
      }, {
        withCredentials: true
      });
      
      // Add bot response to chat
      if (response.data && response.data.response) {
        setMessages((prevMessages) => [
          ...prevMessages,
          { role: 'assistant', content: response.data.response }
        ]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prevMessages) => [
        ...prevMessages,
        { 
          role: 'assistant', 
          content: 'Sorry, I encountered an error. Please try again later.'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
      {/* Chat Icon Button */}
      <button 
        onClick={toggleChat}
        className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg ${
          isOpen ? 'bg-red-500' : 'bg-blue-500'
        } text-white hover:opacity-90 transition-all`}
      >
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </button>
      
      {/* Chat Window */}
      {isOpen && (
        <div className={`absolute bottom-16 right-0 w-80 sm:w-96 h-96 rounded-lg shadow-xl overflow-hidden flex flex-col ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
        } border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          {/* Chat Header */}
          <div className={`p-3 ${theme === 'dark' ? 'bg-gray-700' : 'bg-blue-500'} text-white flex items-center justify-between`}>
            <h3 className="font-medium">Chat Assistant</h3>
            <button onClick={toggleChat} className="hover:opacity-80">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Messages Container */}
          <div className={`flex-1 p-4 overflow-y-auto ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
            {messages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>How can I help you today?</p>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div 
                  key={index} 
                  className={`mb-3 max-w-3/4 ${
                    msg.role === 'user' 
                      ? 'ml-auto text-right' 
                      : 'mr-auto'
                  }`}
                >
                  <div className={`inline-block rounded-lg py-2 px-3 ${
                    msg.role === 'user'
                      ? theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                      : theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex items-center justify-center space-x-1 text-gray-500 my-2">
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.3s' }}></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input Form */}
          <form onSubmit={sendMessage} className={`p-3 border-t ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200'} flex`}>
            <input
              type="text"
              value={inputMessage}
              onChange={handleInputChange}
              placeholder="Type a message..."
              className={`flex-1 py-2 px-3 rounded-l-lg focus:outline-none ${
                theme === 'dark' 
                  ? 'bg-gray-700 text-white placeholder-gray-400 border-gray-600' 
                  : 'bg-gray-100 text-gray-800 placeholder-gray-500'
              } border`}
              disabled={isLoading}
            />
            <button 
              type="submit" 
              className={`px-4 py-2 rounded-r-lg ${
                theme === 'dark' ? 'bg-blue-600' : 'bg-blue-500'
              } text-white font-medium hover:opacity-90 focus:outline-none`}
              disabled={isLoading}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChatBot;