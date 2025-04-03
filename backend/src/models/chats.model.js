import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'senderModel',
    required: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'receiverModel',
    required: true
  },
  senderModel: {
    type: String,
    required: true,
    enum: ['Doctor', 'Client']
  },
  receiverModel: {
    type: String,
    required: true,
    enum: ['Doctor', 'Client']
  },
  message: {
    type: String,
    required: true
  },
  seen: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const Chat = mongoose.model('Chat', chatSchema);
export default Chat;