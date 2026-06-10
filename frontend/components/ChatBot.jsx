import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import {
  AlertCircle,
  Bot,
  Loader2,
  MessageCircle,
  RotateCcw,
  Send,
  X,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const USER_ID_KEY = 'mediconnect_dashboard_chatbot_user_id';
const MESSAGES_KEY = 'mediconnect_dashboard_chatbot_messages';

const createId = (prefix = 'msg') => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

const getStoredUserId = () => {
  const existing = localStorage.getItem(USER_ID_KEY);
  if (existing) return existing;

  const userId = createId('dashboard_user');
  localStorage.setItem(USER_ID_KEY, userId);
  return userId;
};

const safeParseMessages = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(MESSAGES_KEY) || '[]');
    return Array.isArray(stored) ? stored.map(normaliseMessage) : [];
  } catch {
    return [];
  }
};

const normaliseMessage = (message) => ({
  id: message?.id || createId(message?.role || 'msg'),
  role: message?.role === 'user' ? 'user' : 'assistant',
  content: String(message?.content || '').trim(),
  createdAt: message?.createdAt || new Date().toISOString(),
  status: message?.status || 'sent',
});

const mergeMessages = (localMessages, remoteMessages) => {
  const byId = new Map();

  [...remoteMessages, ...localMessages]
    .map(normaliseMessage)
    .filter((message) => message.content)
    .forEach((message) => {
      byId.set(message.id, message);
    });

  return [...byId.values()].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
};

const formatTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Now';

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(safeParseMessages);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [error, setError] = useState('');
  const [userId] = useState(getStoredUserId);
  const abortControllerRef = useRef(null);
  const historyLoadedRef = useRef(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages.slice(-80)));
  }, [messages]);

  useEffect(() => {
    if (!isOpen || historyLoadedRef.current) return;

    const controller = new AbortController();
    historyLoadedRef.current = true;
    setIsHistoryLoading(true);

    axios
      .get(`${API_URL}/chat/${encodeURIComponent(userId)}/history`, {
        withCredentials: true,
        signal: controller.signal,
      })
      .then((response) => {
        const remoteMessages = Array.isArray(response.data?.messages)
          ? response.data.messages
          : [];

        if (remoteMessages.length) {
          setMessages((current) => mergeMessages(current, remoteMessages));
        }
      })
      .catch((requestError) => {
        if (requestError.name === 'CanceledError') return;
        setError('Could not load previous assistant messages.');
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsHistoryLoading(false);
        }
      });

    return () => controller.abort();
  }, [isOpen, userId]);

  useEffect(() => {
    if (!isOpen) return;

    const animationFrame = requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [isOpen, messages, isLoading]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(
    () => () => {
      abortControllerRef.current?.abort();
    },
    []
  );

  const sendText = async (text, retryMessageId = null) => {
    const trimmedMessage = text.trim();
    if (!trimmedMessage || isLoading) return;

    setError('');
    setInputMessage('');
    setIsLoading(true);

    const userMessage =
      retryMessageId ||
      normaliseMessage({
        id: createId('user'),
        role: 'user',
        content: trimmedMessage,
        createdAt: new Date().toISOString(),
        status: 'sending',
      });

    setMessages((current) => {
      if (retryMessageId) {
        return current.map((message) =>
          message.id === retryMessageId
            ? { ...message, status: 'sending', createdAt: new Date().toISOString() }
            : message
        );
      }

      return [...current, userMessage];
    });

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await axios.post(
        `${API_URL}/chat`,
        {
          userId,
          message: trimmedMessage,
        },
        {
          withCredentials: true,
          signal: controller.signal,
        }
      );

      const assistantMessage = normaliseMessage(
        response.data?.message || {
          role: 'assistant',
          content: response.data?.response || 'I could not generate a response.',
        }
      );

      setMessages((current) => [
        ...current.map((message) =>
          message.id === (retryMessageId || userMessage.id)
            ? { ...message, status: 'sent' }
            : message
        ),
        assistantMessage,
      ]);
    } catch (requestError) {
      if (requestError.name === 'CanceledError') return;

      setError('Message was not sent. Check your connection and try again.');
      setMessages((current) =>
        current.map((message) =>
          message.id === (retryMessageId || userMessage.id)
            ? { ...message, status: 'error' }
            : message
        )
      );
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    }
  };

  const sendMessage = (event) => {
    event.preventDefault();
    sendText(inputMessage);
  };

  const retryMessage = (message) => {
    sendText(message.content, message.id);
  };

  const toggleChat = () => {
    setIsOpen((current) => !current);
    setError('');
  };

  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-3 z-[60] flex flex-col items-end sm:inset-x-auto sm:right-5 sm:bottom-5">
      {isOpen && (
        <section
          className={`pointer-events-auto mb-3 flex h-[min(70vh,32rem)] max-h-[calc(100vh-7rem)] w-full max-w-[24rem] flex-col overflow-hidden rounded-2xl border shadow-2xl ${
            isDark
              ? 'border-gray-700 bg-gray-900 text-white'
              : 'border-slate-200 bg-white text-slate-900'
          }`}
          aria-label="Chat assistant panel"
        >
          <header
            className={`flex items-center justify-between gap-3 px-4 py-3 ${
              isDark ? 'bg-gray-800' : 'bg-blue-600'
            } text-white`}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/15">
                <Bot className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold">MediConnect Assistant</h3>
                <p className="text-xs text-white/75">
                  {isLoading ? 'Typing...' : 'Online'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleChat}
              className="rounded-full p-2 transition-colors hover:bg-white/15"
              aria-label="Close chat assistant"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          {error && (
            <div
              className={`mx-3 mt-3 flex items-start gap-2 rounded-xl px-3 py-2 text-sm ${
                isDark
                  ? 'bg-red-950/60 text-red-100'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div
            className={`flex-1 overflow-y-auto px-3 py-4 ${
              isDark ? 'bg-gray-950' : 'bg-slate-50'
            }`}
          >
            {isHistoryLoading && messages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading conversation
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-4 text-center">
                <div
                  className={`mb-3 flex h-12 w-12 items-center justify-center rounded-full ${
                    isDark ? 'bg-gray-800 text-blue-300' : 'bg-blue-100 text-blue-600'
                  }`}
                >
                  <MessageCircle className="h-6 w-6" />
                </div>
                <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  How can I help today?
                </p>
                <p className={`mt-1 max-w-xs text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                  Ask a quick question about appointments, navigation, or using MediConnect.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((message) => {
                  const isUser = message.role === 'user';

                  return (
                    <div
                      key={message.id}
                      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[85%] ${isUser ? 'text-right' : 'text-left'}`}>
                        <div
                          className={`inline-block rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm ${
                            isUser
                              ? 'rounded-br-md bg-blue-600 text-white'
                              : isDark
                              ? 'rounded-bl-md bg-gray-800 text-gray-100'
                              : 'rounded-bl-md bg-white text-slate-800'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{message.content}</p>
                        </div>
                        <div
                          className={`mt-1 flex items-center gap-2 text-[11px] ${
                            isUser ? 'justify-end' : 'justify-start'
                          } ${isDark ? 'text-gray-500' : 'text-slate-400'}`}
                        >
                          <span>{formatTime(message.createdAt)}</span>
                          {message.status === 'sending' && <span>Sending</span>}
                          {message.status === 'error' && (
                            <button
                              type="button"
                              onClick={() => retryMessage(message)}
                              className="inline-flex items-center gap-1 font-medium text-red-500 hover:text-red-600"
                            >
                              <RotateCcw className="h-3 w-3" />
                              Retry
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {isLoading && (
                  <div className="flex justify-start">
                    <div
                      className={`inline-flex items-center gap-1 rounded-2xl rounded-bl-md px-3 py-2 ${
                        isDark ? 'bg-gray-800' : 'bg-white'
                      } shadow-sm`}
                    >
                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:120ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:240ms]" />
                    </div>
                  </div>
                )}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form
            onSubmit={sendMessage}
            className={`border-t p-3 ${
              isDark ? 'border-gray-800 bg-gray-900' : 'border-slate-200 bg-white'
            }`}
          >
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(event) => setInputMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    sendText(inputMessage);
                  }
                }}
                placeholder="Type a message..."
                rows={1}
                disabled={isLoading}
                className={`max-h-28 min-h-11 flex-1 resize-none rounded-xl border px-3 py-3 text-sm outline-none transition focus:ring-2 ${
                  isDark
                    ? 'border-gray-700 bg-gray-800 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500/30'
                    : 'border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-500 focus:border-blue-500 focus:ring-blue-500/20'
                }`}
              />
              <button
                type="submit"
                disabled={isLoading || !inputMessage.trim()}
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Send message"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </div>
          </form>
        </section>
      )}

      <button
        type="button"
        onClick={toggleChat}
        className={`pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full text-white shadow-xl transition hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-500/30 ${
          isOpen ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'
        }`}
        aria-label={isOpen ? 'Close chat assistant' : 'Open chat assistant'}
        aria-expanded={isOpen}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
};

export default ChatBot;
