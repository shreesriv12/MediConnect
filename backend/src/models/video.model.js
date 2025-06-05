import mongoose from 'mongoose';

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
    },
    mediaState: {
      cameraEnabled: {
        type: Boolean,
        default: false
      },
      microphoneEnabled: {
        type: Boolean,
        default: false
      },
      screenSharing: {
        type: Boolean,
        default: false
      },
      qualitySettings: {
        videoQuality: {
          type: String,
          enum: ['low', 'medium', 'high'],
          default: 'high'
        },
        audioQuality: {
          type: String,
          enum: ['low', 'medium', 'high'],
          default: 'high'
        },
        updatedAt: {
          type: Date,
          default: Date.now
        }
      }
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
    enum: ['initiated', 'ringing', 'ongoing', 'ended', 'rejected'],
    default: 'initiated'
  },
  
  callType: {
    type: String,
    enum: ['video', 'audio'],
    default: 'video'
  },
  
  roomId: {
    type: String,
    required: true,
    unique: true
  },
  
  startTime: {
    type: Date,
    default: null
  },
  
  endTime: {
    type: Date,
    default: null
  },
  
  duration: {
    type: Number, // Duration in seconds
    default: 0
  },
  
  callQuality: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: {
      type: String,
      default: ''
    },
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
    issue: {
      type: String,
      required: true
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'technicalIssues.reporterType',
      required: true
    },
    reporterType: {
      type: String,
      enum: ['Doctor', 'Client'],
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true // This adds createdAt and updatedAt automatically
});

// Index for efficient queries
videoCallSchema.index({ 'participants.userId': 1, callStatus: 1 });
videoCallSchema.index({ roomId: 1 });
videoCallSchema.index({ createdAt: -1 });
videoCallSchema.index({ 'participants.userId': 1, createdAt: -1 });

const VideoCall = mongoose.model('VideoCall', videoCallSchema);

export default VideoCall;