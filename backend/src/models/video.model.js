// models/videoCall.model.js
import mongoose from "mongoose";

const videoCallSchema = new mongoose.Schema({
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
    },
    joinedAt: {
      type: Date,
      default: null
    },
    leftAt: {
      type: Date,
      default: null
    }
  }],
  initiator: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'initiator.userType',
      required: true
    },
    userType: {
      type: String,
      enum: ['Doctor', 'Client'],
      required: true
    }
  },
  callStatus: {
    type: String,
    enum: ['initiated', 'ringing', 'ongoing', 'ended', 'rejected', 'missed'],
    default: 'initiated'
  },
  callType: {
    type: String,
    enum: ['video', 'audio'],
    default: 'video'
  },
  duration: {
    type: Number, // in seconds
    default: 0
  },
  startTime: {
    type: Date,
    default: null
  },
  endTime: {
    type: Date,
    default: null
  },
  roomId: {
    type: String,
    required: true,
    unique: true
  },
  callQuality: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: String,
    ratedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'callQuality.raterType'
    },
    raterType: {
      type: String,
      enum: ['Doctor', 'Client']
    }
  },
  technicalIssues: [{
    issue: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'technicalIssues.reporterType'
    },
    reporterType: {
      type: String,
      enum: ['Doctor', 'Client']
    }
  }]
}, {
  timestamps: true
});

// Indexes
videoCallSchema.index({ 'participants.userId': 1 });
videoCallSchema.index({ roomId: 1 });
videoCallSchema.index({ callStatus: 1 });
videoCallSchema.index({ createdAt: -1 });

export default mongoose.model("VideoCall", videoCallSchema);