// stores/chatStore.js
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { axiosInstance } from "../utils/axois";
import { io } from "socket.io-client";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const normaliseSources = (sources) => {
  if (Array.isArray(sources)) {
    return {
      documents: sources.filter(Boolean),
      web: [],
    };
  }

  return {
    documents: Array.isArray(sources?.documents)
      ? sources.documents.filter(Boolean)
      : [],
    web: Array.isArray(sources?.web)
      ? sources.web.filter(Boolean)
      : [],
  };
};

// ── Helper: ensure every message object has a valid ISO createdAt string ──────
// Socket-emitted messages sometimes arrive without createdAt (or with an
// invalid value).  Normalise once here so the UI sort never gets NaN.
const normaliseMessage = (msg) => {
  if (!msg) return msg;
  const nextMessage = {
    ...msg,
    sources: normaliseSources(msg.sources),
  };

  if (!msg.createdAt || isNaN(new Date(msg.createdAt).getTime())) {
    return { ...nextMessage, createdAt: new Date().toISOString() };
  }
  return nextMessage;
};

const messageFromReceivePayload = (payload) =>
  normaliseMessage({
    _id: payload.messageId,
    content: payload.message,
    messageType: payload.type || "text",
    fileId: payload.fileId || null,
    fileName: payload.fileName || null,
    fileUrl: payload.fileUrl || null,
    fileSize: payload.fileSize || null,
    fileType: payload.fileType || null,
    sources: payload.sources || [],
    replyTo: payload.replyTo || null,
    sender: {
      userId: payload.senderId,
    },
    createdAt: payload.createdAt,
  });
// ─────────────────────────────────────────────────────────────────────────────

const useChatStore = create(
  devtools((set, get) => ({
    // ── State ────────────────────────────────────────────────────────────────
    socket: null,
    chats: [],
    currentChat: null,
    messages: [],
    isLoading: false,
    error: null,
    isConnected: false,
    unreadCount: 0,
    uploadedFiles: [],
    isUploading: false,
    uploadProgress: 0,
    isAskingQuestion: false,
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalMessages: 0,
      hasMore: false,
    },

    // ── Socket connection ────────────────────────────────────────────────────
    connectSocket: () => {
      const { socket, isConnected } = get();
      if (isConnected && socket) return;

      // ── FIX: read token from localStorage (written by auth stores on login /
      //   checkAuth).  We no longer rely on "clientAccessToken" only – we check
      //   both keys so doctors also work.
      const token =
        localStorage.getItem("doctorAccessToken") ||
        localStorage.getItem("clientAccessToken");
      const userId =
        localStorage.getItem("doctorId") || localStorage.getItem("clientId");
      const userType = localStorage.getItem("doctorAccessToken")
        ? "Doctor"
        : "Client";

      if (!token) {
        console.warn("[ChatStore] connectSocket: no token in localStorage – socket not started");
        return;
      }
      if (!userId) {
        console.warn("[ChatStore] connectSocket: no userId in localStorage – socket not started");
        return;
      }

      const newSocket = io(API_BASE, {
        withCredentials: true,
        auth: { token, userType, userId },
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      });

      newSocket.on("connect", () => {
        console.log("[ChatStore] Socket connected:", newSocket.id);
        set({ isConnected: true, socket: newSocket });

        const { currentChat } = get();
        if (currentChat) newSocket.emit("joinChat", currentChat._id);
      });

      newSocket.on("disconnect", () => {
        console.log("[ChatStore] Socket disconnected");
        set({ isConnected: false, socket: null });
      });

      newSocket.on("connect_error", (err) => {
        console.error("[ChatStore] Socket connection error:", err.message);
        set({ error: `Connection error: ${err.message}` });
      });

      // ── Handle incoming messages ──────────────────────────────────────────
      newSocket.on("newMessage", (data) => {
        console.log("[ChatStore] newMessage received via socket:", data);

        // ── FIX: the server wraps the payload as { chatId, message, sender }
        //   but older code expected the raw message at data.message || data.
        //   Always prefer data.message, fall back to data itself.
        const rawMessage = data?.message ?? data;
        const chatId = data?.chatId ?? rawMessage?.chatId;

        if (!rawMessage || !rawMessage._id) {
          console.warn("[ChatStore] Invalid message structure:", data);
          return;
        }

        // ── FIX: normalise createdAt so the UI sort never gets Invalid Date ─
        const message = normaliseMessage(rawMessage);

        const { currentChat, messages } = get();

        if (currentChat && chatId === currentChat._id) {
          const alreadyExists = messages.some((m) => m._id === message._id);
          if (!alreadyExists) {
            console.log("[ChatStore] Adding socket message to state:", message._id);
            set({ messages: [...messages, message] });
          }
        }

        // Always refresh the chat-list preview
        get().updateChatWithNewMessage({ ...message, chatId });
      });

      newSocket.on("message:receive", (payload) => {
        const chatId = payload?.sessionId;
        const message = messageFromReceivePayload(payload || {});
        if (!chatId || !message?._id) return;

        const { currentChat, messages } = get();
        if (currentChat && chatId === currentChat._id) {
          const alreadyExists = messages.some((m) => m._id === message._id);
          if (!alreadyExists) {
            set({ messages: [...messages, message] });
          }
        }

        get().updateChatWithNewMessage({ ...message, chatId });
      });

      newSocket.on("file:receive", (file) => {
        const { currentChat, uploadedFiles } = get();
        if (!file?.fileId || file.sessionId !== currentChat?._id) return;

        const alreadyExists = uploadedFiles.some((item) => item.fileId === file.fileId);
        if (!alreadyExists) {
          set({ uploadedFiles: [file, ...uploadedFiles] });
        }
      });

      newSocket.on("query:answer", (payload) => {
        const chatId = payload?.sessionId;
        const payloadMessages = [payload?.questionMessage, payload?.message]
          .map(normaliseMessage)
          .filter((message) => message?._id);
        if (!chatId || !payloadMessages.length) return;

        const { currentChat, messages } = get();
        if (currentChat && chatId === currentChat._id) {
          const nextMessages = [...messages];
          for (const message of payloadMessages) {
            if (!nextMessages.some((m) => m._id === message._id)) {
              nextMessages.push(message);
            }
          }

          if (nextMessages.length !== messages.length) {
            set({ messages: nextMessages });
          }
        }

        const latestMessage = payloadMessages[payloadMessages.length - 1];
        get().updateChatWithNewMessage({ ...latestMessage, chatId });
      });

      newSocket.on("messageDelivered", (data) => {
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg._id === data.messageId ? { ...msg, status: "delivered" } : msg
          ),
        }));
      });

      newSocket.on("messageRead", (data) => {
        set((state) => ({
          messages: state.messages.map((msg) =>
            data.messageIds?.includes(msg._id) ? { ...msg, isRead: true } : msg
          ),
        }));
      });

      newSocket.on("userTyping", (data) => {
        console.log("[ChatStore] User typing:", data);
      });

      newSocket.on("userStoppedTyping", (data) => {
        console.log("[ChatStore] User stopped typing:", data);
      });

      set({ socket: newSocket });
    },

    disconnectSocket: () => {
      const { socket } = get();
      if (socket) {
        socket.disconnect();
        set({ socket: null, isConnected: false });
      }
    },

    // ── Helper: update the chat-list sidebar with the latest message preview ─
    updateChatWithNewMessage: (message) => {
      const { chats } = get();
      const updatedChats = chats.map((chat) => {
        if (chat._id === message.chatId) {
          return {
            ...chat,
            lastMessage: {
              content: message.content,
              createdAt: message.createdAt,
              sender: message.sender,
            },
            updatedAt: message.createdAt,
          };
        }
        return chat;
      });

      updatedChats.sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt) -
          new Date(a.updatedAt || a.createdAt)
      );
      set({ chats: updatedChats });
    },

    // ── Chat operations ──────────────────────────────────────────────────────
    getChatMessages: async (chatId, page = 1, limit = 50) => {
      console.log("[ChatStore] getChatMessages – chatId:", chatId, "page:", page);
      set({ isLoading: true, error: null });

      try {
        const response = await axiosInstance.get(
          `${API_BASE}/chats/${chatId}/messages`,
          { params: { page, limit } }
        );

        const { messages: rawMessages, pagination } = response.data.data;

        // ── FIX: normalise every fetched message ──────────────────────────
        const messages = (rawMessages || []).map(normaliseMessage);

        if (page === 1) {
          set({ messages, pagination });
        } else {
          const { messages: current } = get();
          // Prepend older messages (they come back for earlier pages)
          set({ messages: [...messages, ...current], pagination });
        }

        return { messages, pagination };
      } catch (error) {
        const msg =
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch messages";
        set({ error: msg });
        throw error;
      } finally {
        set({ isLoading: false });
      }
    },

    fetchUserChats: async () => {
      set({ isLoading: true, error: null });
      try {
        const response = await axiosInstance.get(`${API_BASE}/chats/user-chats`);
        const chats = response.data.data;

        const sortedChats = [...chats].sort((a, b) => {
          const aTime = new Date(a.lastMessage?.createdAt || a.updatedAt || a.createdAt);
          const bTime = new Date(b.lastMessage?.createdAt || b.updatedAt || b.createdAt);
          return bTime - aTime;
        });

        set({ chats: sortedChats });

        const unreadCount = chats.reduce(
          (count, chat) => count + (chat.unreadCount || 0),
          0
        );
        set({ unreadCount });

        return sortedChats;
      } catch (error) {
        const msg = error.response?.data?.message || "Failed to fetch chats";
        set({ error: msg });
        throw error;
      } finally {
        set({ isLoading: false });
      }
    },

    sendMessage: async (chatId, content, messageType = "text", file = null, replyTo = null) => {
      if (!content.trim() && !file) {
        console.warn("[ChatStore] Cannot send empty message");
        return;
      }

      set({ isLoading: true, error: null });
      try {
        const formData = new FormData();
        formData.append("chatId", chatId);
        formData.append("content", content);
        formData.append("messageType", messageType);
        if (file) formData.append("file", file);
        if (replyTo) formData.append("replyTo", JSON.stringify(replyTo));

        const response = await axiosInstance.post(
          `${API_BASE}/chats/send-message`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );

        // ── FIX: normalise createdAt on the saved message too ────────────
        const message = normaliseMessage(response.data.data);
        console.log("[ChatStore] Message sent:", message._id);

        // Add to local state only if we're in this chat (prevents duplicate
        // when the socket newMessage event also fires for our own message)
        const { currentChat, messages } = get();
        if (currentChat && currentChat._id === chatId) {
          const alreadyExists = messages.some((m) => m._id === message._id);
          if (!alreadyExists) {
            set({ messages: [...messages, message] });
          }
        }

        // NOTE: Don't emit 'sendMessage' here — the REST API already saved and 
        // broadcast via socket, so emitting again would cause duplicate saves
        // in the backend sendMessage handler

        get().updateChatWithNewMessage({ ...message, chatId });

        return message;
      } catch (error) {
        const msg =
          error.response?.data?.message ||
          error.message ||
          "Failed to send message";
        set({ error: msg });
        throw error;
      } finally {
        set({ isLoading: false });
      }
    },

    uploadFile: async (sessionId, file) => {
      if (!sessionId || !file) return null;

      const doctorId = localStorage.getItem("doctorId");
      if (!doctorId) {
        const message = "Only authenticated doctors can upload documents for Q&A";
        set({ error: message });
        throw new Error(message);
      }

      set({ isUploading: true, uploadProgress: 0, error: null });

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("sessionId", sessionId);
        formData.append("doctorId", doctorId);

        const response = await axiosInstance.post(`${API_BASE}/api/upload`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (event) => {
            if (!event.total) return;
            set({ uploadProgress: Math.round((event.loaded * 100) / event.total) });
          },
        });

        const { file: uploadedFile, message: rawMessage } = response.data.data;
        const message = normaliseMessage(rawMessage);

        set((state) => ({
          uploadedFiles: state.uploadedFiles.some((item) => item.fileId === uploadedFile.fileId)
            ? state.uploadedFiles
            : [uploadedFile, ...state.uploadedFiles],
          messages:
            state.currentChat?._id === sessionId &&
            message?._id &&
            !state.messages.some((item) => item._id === message._id)
              ? [...state.messages, message]
              : state.messages,
        }));

        if (message?._id) {
          get().updateChatWithNewMessage({ ...message, chatId: sessionId });
        }

        return { uploadedFile, message };
      } catch (error) {
        const msg =
          error.response?.data?.message ||
          error.message ||
          "Failed to upload file";
        set({ error: msg });
        throw error;
      } finally {
        set({ isUploading: false, uploadProgress: 0 });
      }
    },

    fetchUploadedFiles: async (sessionId) => {
      if (!sessionId) return [];

      try {
        const response = await axiosInstance.get(`${API_BASE}/api/chats/${sessionId}/files`);
        const files = response.data.data || [];
        set({ uploadedFiles: files });
        return files;
      } catch (error) {
        console.error("[ChatStore] Failed to fetch uploaded files:", error);
        set({ uploadedFiles: [] });
        return [];
      }
    },

    askQuestion: async (sessionId, question, replyTo = null) => {
      const trimmedQuestion = question?.trim();
      if (!sessionId || !trimmedQuestion) return null;

      set({ isAskingQuestion: true, error: null });

      const savePayloadMessages = (payload) => {
        const payloadMessages = [payload?.questionMessage, payload?.message]
          .map(normaliseMessage)
          .filter((message) => message?._id);

        if (!payloadMessages.length) return;

        set((state) => {
          if (state.currentChat?._id !== sessionId) return {};

          const nextMessages = [...state.messages];
          for (const message of payloadMessages) {
            if (!nextMessages.some((item) => item._id === message._id)) {
              nextMessages.push(message);
            }
          }

          return { messages: nextMessages };
        });

        const latestMessage = payloadMessages[payloadMessages.length - 1];
        get().updateChatWithNewMessage({ ...latestMessage, chatId: sessionId });
      };

      try {
        const { socket } = get();

        if (socket?.connected) {
          const payload = await new Promise((resolve, reject) => {
            const timeoutId = setTimeout(
              () => reject(new Error("Document Q&A timed out")),
              45000
            );

            socket.emit(
              "query:ask",
              { sessionId, question: trimmedQuestion, replyTo },
              (response) => {
                clearTimeout(timeoutId);
                if (!response?.success) {
                  reject(new Error(response?.message || "Failed to answer question"));
                  return;
                }
                resolve(response.data);
              }
            );
          });

          savePayloadMessages(payload);
          return payload;
        }

        const response = await axiosInstance.post(`${API_BASE}/chats/${sessionId}/query`, {
          question: trimmedQuestion,
          replyTo,
        });
        const payload = response.data.data;
        savePayloadMessages(payload);
        return payload;
      } catch (error) {
        const msg =
          error.response?.data?.message ||
          error.message ||
          "Failed to answer question";
        set({ error: msg });
        throw error;
      } finally {
        set({ isAskingQuestion: false });
      }
    },

    createOrGetChat: async (participantId, participantType) => {
      set({ isLoading: true, error: null });
      try {
        const response = await axiosInstance.post(
          `${API_BASE}/chats/create-or-get`,
          { participantId, participantType }
        );

        const chat = response.data.data;
        set({ currentChat: chat });

        const { socket } = get();
        if (socket && socket.connected) {
          socket.emit("joinChat", chat._id);
        }

        await get().getChatMessages(chat._id);
        return chat;
      } catch (error) {
        const msg =
          error.response?.data?.message ||
          error.message ||
          "Failed to create/get chat";
        set({ error: msg });
        throw error;
      } finally {
        set({ isLoading: false });
      }
    },

    markMessagesAsRead: async (chatId, messageIds) => {
      try {
        await axiosInstance.patch(`${API_BASE}/chats/${chatId}/mark-read`, {
          messageIds,
        });

        set((state) => ({
          messages: state.messages.map((msg) =>
            messageIds.includes(msg._id) ? { ...msg, isRead: true } : msg
          ),
        }));

        const { socket } = get();
        if (socket && socket.connected) {
          socket.emit("messagesRead", { chatId, messageIds });
        }
      } catch (error) {
        console.error("[ChatStore] Failed to mark messages as read:", error);
      }
    },

    deleteMessage: async (chatId, messageId) => {
      set({ isLoading: true, error: null });
      try {
        await axiosInstance.delete(
          `${API_BASE}/chats/${chatId}/messages/${messageId}`
        );

        set((state) => ({
          messages: state.messages.filter((msg) => msg._id !== messageId),
        }));

        const { socket } = get();
        if (socket && socket.connected) {
          socket.emit("messageDeleted", { chatId, messageId });
        }
      } catch (error) {
        const msg =
          error.response?.data?.message ||
          error.message ||
          "Failed to delete message";
        set({ error: msg });
        throw error;
      } finally {
        set({ isLoading: false });
      }
    },

    setCurrentChat: (chat) => {
      const { socket, currentChat } = get();
      if (socket && socket.connected && currentChat) {
        socket.emit("leaveChat", currentChat._id);
      }
      set({ currentChat: chat, messages: [], uploadedFiles: [], error: null });
      if (socket && socket.connected && chat) {
        socket.emit("joinChat", chat._id);
      }
    },

    clearCurrentChat: () => {
      const { socket, currentChat } = get();
      if (socket && socket.connected && currentChat) {
        socket.emit("leaveChat", currentChat._id);
      }
      set({ currentChat: null, messages: [], uploadedFiles: [] });
    },

    clearError: () => set({ error: null }),

    setError: (error) => {
      set({ error });
      setTimeout(() => {
        const { error: current } = get();
        if (current === error) set({ error: null });
      }, 5000);
    },

    startTyping: (chatId) => {
      const { socket } = get();
      if (socket && socket.connected) socket.emit("startTyping", { chatId });
    },

    stopTyping: (chatId) => {
      const { socket } = get();
      if (socket && socket.connected) socket.emit("stopTyping", { chatId });
    },

    // ── Utility ──────────────────────────────────────────────────────────────
    getChatParticipant: (chat, currentUserId) => {
      if (!chat?.participants || !currentUserId) return null;
      return chat.participants.find(
        (p) => p?.userId?._id !== currentUserId
      );
    },

    isMessageFromCurrentUser: (message, currentUserId) => {
      if (!message?.sender || !currentUserId) return false;
      const senderId =
        message.sender.userId?._id ?? message.sender?.userId ?? "";
      return String(senderId) === String(currentUserId);
    },

    getFormattedChats: (currentUserId) => {
      const { chats } = get();
      return chats.map((chat) => {
        const otherParticipant = get().getChatParticipant(chat, currentUserId);
        return {
          ...chat,
          displayName: otherParticipant?.userId?.name || "Unknown User",
          displayAvatar:
            otherParticipant?.userId?.avatar ||
            otherParticipant?.userId?.profileImage,
          lastMessagePreview: chat.lastMessage?.content || "No messages yet",
          lastMessageTime: chat.lastMessage?.createdAt || chat.createdAt,
        };
      });
    },
  }))
);

export default useChatStore;
