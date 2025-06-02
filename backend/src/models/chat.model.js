// models/chat.model.js
import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    trim: true
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'voice'],
    default: 'text'
  },
  fileUrl: {
    type: String,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  readBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'readBy.userType'
    },
    userType: {
      type: String,
      enum: ['Doctor', 'Client']
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  sender: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'sender.userType',
      required: true
    },
    userType: {
      type: String,
      enum: ['Doctor', 'Client'],
      required: true
    }
  }
});

const chatSchema = new mongoose.Schema({
  participants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'participants.userType',
      required: true
    },
    userType: {
      type: String,
      enum: ['Doctor', 'Client'],
      required: true
    }
  }],
  messages: [messageSchema],
  lastMessage: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  chatType: {
    type: String,
    enum: ['consultation', 'followup', 'general'],
    default: 'consultation'
  }
}, {
  timestamps: true
});

// Indexes for better performance
chatSchema.index({ 'participants.userId': 1 });
chatSchema.index({ lastMessage: -1 });
chatSchema.index({ createdAt: -1 });

export default mongoose.model("Chat", chatSchema);