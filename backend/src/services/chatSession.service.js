import Chat from "../models/chat.model.js";
import { ApiError } from "../utils/ApiError.js";

const emptySources = () => ({
  documents: [],
  web: [],
});

export const getRequestUser = (req) => {
  if (req.doctor) {
    return {
      userId: req.doctor._id,
      userType: "Doctor",
      user: req.doctor,
    };
  }

  if (req.client) {
    return {
      userId: req.client._id,
      userType: "Client",
      user: req.client,
    };
  }

  throw new ApiError(401, "User not authenticated");
};

export const getSocketUser = (socket) => ({
  userId: socket.user._id,
  userType: socket.userType,
  user: socket.user,
});

export const findChatForParticipant = async (sessionId, userId) => {
  const chat = await Chat.findById(sessionId);
  if (!chat) throw new ApiError(404, "Chat session not found");

  const isParticipant = chat.participants.some(
    (participant) => participant.userId.toString() === userId.toString()
  );

  if (!isParticipant) {
    throw new ApiError(403, "You are not a participant in this chat session");
  }

  return chat;
};

const truncateReplyPreview = (value, maxLength = 240) => {
  const text = String(value || "").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
};

export const parseReplyTo = (replyTo) => {
  if (!replyTo) return null;

  if (typeof replyTo === "string") {
    const trimmed = replyTo.trim();
    if (!trimmed) return null;

    try {
      return JSON.parse(trimmed);
    } catch {
      throw new ApiError(400, "Invalid reply metadata");
    }
  }

  if (typeof replyTo !== "object") {
    throw new ApiError(400, "Invalid reply metadata");
  }

  return replyTo;
};

export const buildReplyToSnapshot = (chat, replyTo) => {
  const parsedReply = parseReplyTo(replyTo);
  if (!parsedReply) return null;

  const messageId = parsedReply.messageId || parsedReply._id;
  if (!messageId) {
    throw new ApiError(400, "replyTo.messageId is required");
  }

  const originalMessage = chat.messages.id(messageId);
  if (!originalMessage) {
    throw new ApiError(404, "Replied message was not found in this chat");
  }

  const previewContent =
    originalMessage.fileName ||
    originalMessage.content ||
    parsedReply.fileName ||
    parsedReply.content ||
    "Message";

  return {
    messageId: originalMessage._id.toString(),
    content: truncateReplyPreview(previewContent),
    messageType: originalMessage.messageType || "text",
    fileId: originalMessage.fileId || parsedReply.fileId || null,
    fileName: originalMessage.fileName || parsedReply.fileName || null,
    senderType: originalMessage.sender?.userType || parsedReply.senderType || null,
  };
};

export const assertDoctorInSession = async (sessionId, doctorId) => {
  const chat = await findChatForParticipant(sessionId, doctorId);
  const isDoctor = chat.participants.some(
    (participant) =>
      participant.userId.toString() === doctorId.toString() &&
      participant.userType === "Doctor"
  );

  if (!isDoctor) {
    throw new ApiError(403, "Only the doctor in this session can upload documents");
  }

  return chat;
};

export const appendChatMessage = async (
  sessionId,
  {
    content,
    messageType = "text",
    sender,
    fileUrl = null,
    fileId = null,
    fileName = null,
    fileSize = null,
    fileType = null,
    sources = emptySources(),
    metadata = {},
    replyTo = null,
  }
) => {
  const chat = await Chat.findById(sessionId);
  if (!chat) throw new ApiError(404, "Chat session not found");

  const newMessage = {
    content,
    messageType,
    fileUrl,
    fileId,
    fileName,
    fileSize,
    fileType,
    sources,
    metadata,
    replyTo,
    createdAt: new Date(),
    sender: {
      userId: sender.userId,
      userType: sender.userType,
    },
  };

  chat.messages.push(newMessage);
  chat.lastMessage = new Date();
  await chat.save();
  await chat.populate("messages.sender.userId", "name avatar");

  return chat.messages[chat.messages.length - 1];
};

export const toMessageReceivePayload = (sessionId, message) => ({
  messageId: message._id?.toString(),
  sessionId: sessionId.toString(),
  senderId: message.sender?.userId?._id?.toString() || message.sender?.userId?.toString(),
  message: message.content,
  type: message.messageType,
  fileId: message.fileId,
  fileName: message.fileName,
  fileUrl: message.fileUrl,
  fileSize: message.fileSize,
  fileType: message.fileType,
  sources: message.sources || [],
  replyTo: message.replyTo || null,
  createdAt: message.createdAt,
});

export const emitChatMessage = (io, sessionId, message, senderType) => {
  io?.to(sessionId.toString()).emit("message:receive", toMessageReceivePayload(sessionId, message));
  io?.to(sessionId.toString()).emit("newMessage", {
    chatId: sessionId.toString(),
    message,
    sender: senderType,
  });
};

export const emitFileReceive = (io, uploadedFile) => {
  io?.to(uploadedFile.sessionId.toString()).emit("file:receive", {
    fileId: uploadedFile.fileId,
    sessionId: uploadedFile.sessionId.toString(),
    fileName: uploadedFile.fileName,
    fileUrl: uploadedFile.fileUrl,
    fileType: uploadedFile.fileType,
    uploadedAt: uploadedFile.uploadedAt,
  });
};
