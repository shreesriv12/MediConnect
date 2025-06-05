// controllers/videoCall.controller.js
import VideoCall from "../models/video.model.js";
import Doctor from "../models/doctor.models.js"; // Fixed import
import Client from "../models/client.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { v4 as uuidv4 } from 'uuid';

// Generate unique room ID
const generateRoomId = () => {
  return `room_${uuidv4().replace(/-/g, '')}`;
};

// Helper function to get current user info
const getCurrentUserInfo = (req) => {
  let currentUser, currentUserType, currentUserName, currentUserAvatar;
  
  if (req.doctor) {
    currentUser = req.doctor._id;
    currentUserType = 'Doctor';
    currentUserName = req.doctor.name;
    currentUserAvatar = req.doctor.avatar;
  } else if (req.client) {
    currentUser = req.client._id;
    currentUserType = 'Client';
    currentUserName = req.client.name;
    currentUserAvatar = req.client.avatar;
  } else if (req.user) {
    // Fallback if using generic req.user
    currentUser = req.user._id;
    currentUserType = req.user.userType || req.user.role || 'Client';
    currentUserName = req.user.name;
    currentUserAvatar = req.user.avatar;
  } else {
    throw new ApiError(401, "User not authenticated");
  }
  
  return { currentUser, currentUserType, currentUserName, currentUserAvatar };
};

// Initiate video call
const initiateCall = asyncHandler(async (req, res) => {
  const { participantId, participantType, callType = 'video', cameraEnabled = true, microphoneEnabled = true } = req.body;
  
  if (!participantId || !participantType) {
    throw new ApiError(400, "Participant ID and type are required");
  }

  // Validate participant exists
  const Model = participantType === 'Doctor' ? Doctor : Client;
  const participant = await Model.findById(participantId).select('name email avatar specialization');
  if (!participant) {
    throw new ApiError(404, `${participantType} not found`);
  }

  const { currentUser, currentUserType, currentUserName, currentUserAvatar } = getCurrentUserInfo(req);

  // Check if there's already an ongoing call between these participants
  const existingCall = await VideoCall.findOne({
    $and: [
      { 'participants.userId': currentUser },
      { 'participants.userId': participantId },
      { callStatus: { $in: ['initiated', 'ringing', 'ongoing'] } }
    ]
  });

  if (existingCall) {
    throw new ApiError(400, "There's already an ongoing call between you and this user");
  }

  const roomId = generateRoomId();

  const videoCall = await VideoCall.create({
    participants: [
      { 
        userId: currentUser, 
        userType: currentUserType,
        mediaState: {
          cameraEnabled,
          microphoneEnabled,
          screenSharing: false
        }
      },
      { 
        userId: participantId, 
        userType: participantType,
        mediaState: {
          cameraEnabled: true,
          microphoneEnabled: true,
          screenSharing: false
        }
      }
    ],
    initiator: { userId: currentUser, userType: currentUserType },
    callStatus: 'initiated',
    callType,
    roomId
  });

  // Populate participants
  await videoCall.populate('participants.userId', 'name email avatar specialization');
  await videoCall.populate('initiator.userId', 'name email avatar');

  // Emit socket event to notify the other participant
  if (req.io) {
    req.io.to(`user_${participantId}`).emit('incomingCall', {
      callId: videoCall._id,
      caller: {
        id: currentUser,
        name: currentUserName,
        type: currentUserType,
        avatar: currentUserAvatar
      },
      callType,
      roomId,
      participants: videoCall.participants
    });
  }

  // Update call status to ringing
  videoCall.callStatus = 'ringing';
  await videoCall.save();

  return res.status(201).json(new ApiResponse(201, videoCall, "Call initiated successfully"));
});

// Accept video call
const acceptCall = asyncHandler(async (req, res) => {
  const { callId } = req.params;
  const { cameraEnabled = true, microphoneEnabled = true } = req.body;
  
  const videoCall = await VideoCall.findById(callId)
    .populate('participants.userId', 'name email avatar specialization')
    .populate('initiator.userId', 'name email avatar');
    
  if (!videoCall) {
    throw new ApiError(404, "Call not found");
  }

  const { currentUser, currentUserType, currentUserName } = getCurrentUserInfo(req);
  
  // Verify user is a participant
  const isParticipant = videoCall.participants.some(p => 
    p.userId._id.toString() === currentUser.toString()
  );
  
  if (!isParticipant) {
    throw new ApiError(403, "You are not a participant in this call");
  }

  // Check if call is in valid state to be accepted
  if (!['initiated', 'ringing'].includes(videoCall.callStatus)) {
    throw new ApiError(400, "Call cannot be accepted in current state");
  }

  // Update call status and timing
  videoCall.callStatus = 'ongoing';
  videoCall.startTime = new Date();
  
  // Mark participant as joined and update media state
  const participantIndex = videoCall.participants.findIndex(p => 
    p.userId._id.toString() === currentUser.toString()
  );
  videoCall.participants[participantIndex].joinedAt = new Date();
  videoCall.participants[participantIndex].mediaState = {
    cameraEnabled,
    microphoneEnabled,
    screenSharing: false
  };
  
  await videoCall.save();

  // Notify the initiator
  const otherParticipant = videoCall.participants.find(p => 
    p.userId._id.toString() !== currentUser.toString()
  );
  
  if (req.io) {
    req.io.to(`user_${otherParticipant.userId._id}`).emit('callAccepted', {
      callId: videoCall._id,
      roomId: videoCall.roomId,
      acceptedBy: {
        id: currentUser,
        name: currentUserName,
        type: currentUserType
      },
      call: videoCall
    });

    // Also emit to the accepting user for UI updates
    req.io.to(`user_${currentUser}`).emit('callAccepted', {
      callId: videoCall._id,
      roomId: videoCall.roomId,
      acceptedBy: {
        id: currentUser,
        name: currentUserName,
        type: currentUserType
      },
      call: videoCall
    });
  }

  return res.status(200).json(new ApiResponse(200, {
    callId: videoCall._id,
    roomId: videoCall.roomId,
    status: 'accepted',
    call: videoCall
  }, "Call accepted successfully"));
});

// Toggle camera
const toggleCamera = asyncHandler(async (req, res) => {
  const { callId } = req.params;
  const { enabled } = req.body;
  
  if (typeof enabled !== 'boolean') {
    throw new ApiError(400, "Camera enabled status must be a boolean");
  }

  const videoCall = await VideoCall.findById(callId)
    .populate('participants.userId', 'name email avatar');
    
  if (!videoCall) {
    throw new ApiError(404, "Call not found");
  }

  const { currentUser, currentUserName } = getCurrentUserInfo(req);
  
  // Verify user is a participant and call is ongoing
  const participantIndex = videoCall.participants.findIndex(p => 
    p.userId._id.toString() === currentUser.toString()
  );
  
  if (participantIndex === -1) {
    throw new ApiError(403, "You are not a participant in this call");
  }

  if (videoCall.callStatus !== 'ongoing') {
    throw new ApiError(400, "Can only toggle camera during ongoing call");
  }

  // Update camera state
  videoCall.participants[participantIndex].mediaState.cameraEnabled = enabled;
  await videoCall.save();

  // Notify other participants in the room
  if (req.io) {
    req.io.to(videoCall.roomId).emit('cameraToggled', {
      callId: videoCall._id,
      userId: currentUser,
      cameraEnabled: enabled,
      userName: currentUserName
    });
  }

  return res.status(200).json(new ApiResponse(200, {
    cameraEnabled: enabled
  }, `Camera ${enabled ? 'enabled' : 'disabled'} successfully`));
});

// Toggle microphone
const toggleMicrophone = asyncHandler(async (req, res) => {
  const { callId } = req.params;
  const { enabled } = req.body;
  
  if (typeof enabled !== 'boolean') {
    throw new ApiError(400, "Microphone enabled status must be a boolean");
  }

  const videoCall = await VideoCall.findById(callId)
    .populate('participants.userId', 'name email avatar');
    
  if (!videoCall) {
    throw new ApiError(404, "Call not found");
  }

  const { currentUser, currentUserName } = getCurrentUserInfo(req);
  
  // Verify user is a participant and call is ongoing
  const participantIndex = videoCall.participants.findIndex(p => 
    p.userId._id.toString() === currentUser.toString()
  );
  
  if (participantIndex === -1) {
    throw new ApiError(403, "You are not a participant in this call");
  }

  if (videoCall.callStatus !== 'ongoing') {
    throw new ApiError(400, "Can only toggle microphone during ongoing call");
  }

  // Update microphone state
  videoCall.participants[participantIndex].mediaState.microphoneEnabled = enabled;
  await videoCall.save();

  // Notify other participants in the room
  if (req.io) {
    req.io.to(videoCall.roomId).emit('microphoneToggled', {
      callId: videoCall._id,
      userId: currentUser,
      microphoneEnabled: enabled,
      userName: currentUserName
    });
  }

  return res.status(200).json(new ApiResponse(200, {
    microphoneEnabled: enabled
  }, `Microphone ${enabled ? 'enabled' : 'disabled'} successfully`));
});

// Toggle screen sharing
const toggleScreenShare = asyncHandler(async (req, res) => {
  const { callId } = req.params;
  const { enabled } = req.body;
  
  if (typeof enabled !== 'boolean') {
    throw new ApiError(400, "Screen sharing enabled status must be a boolean");
  }

  const videoCall = await VideoCall.findById(callId)
    .populate('participants.userId', 'name email avatar');
    
  if (!videoCall) {
    throw new ApiError(404, "Call not found");
  }

  const { currentUser, currentUserName } = getCurrentUserInfo(req);
  
  // Verify user is a participant and call is ongoing
  const participantIndex = videoCall.participants.findIndex(p => 
    p.userId._id.toString() === currentUser.toString()
  );
  
  if (participantIndex === -1) {
    throw new ApiError(403, "You are not a participant in this call");
  }

  if (videoCall.callStatus !== 'ongoing') {
    throw new ApiError(400, "Can only toggle screen sharing during ongoing call");
  }

  // If enabling screen share, disable camera
  if (enabled) {
    videoCall.participants[participantIndex].mediaState.cameraEnabled = false;
  }

  // Update screen sharing state
  videoCall.participants[participantIndex].mediaState.screenSharing = enabled;
  await videoCall.save();

  // Notify other participants in the room
  if (req.io) {
    req.io.to(videoCall.roomId).emit('screenShareToggled', {
      callId: videoCall._id,
      userId: currentUser,
      screenSharing: enabled,
      cameraEnabled: videoCall.participants[participantIndex].mediaState.cameraEnabled,
      userName: currentUserName
    });
  }

  return res.status(200).json(new ApiResponse(200, {
    screenSharing: enabled,
    cameraEnabled: videoCall.participants[participantIndex].mediaState.cameraEnabled
  }, `Screen sharing ${enabled ? 'started' : 'stopped'} successfully`));
});

// Get media permissions status
const getMediaPermissions = asyncHandler(async (req, res) => {
  const { callId } = req.params;
  
  const videoCall = await VideoCall.findById(callId)
    .populate('participants.userId', 'name email avatar');
    
  if (!videoCall) {
    throw new ApiError(404, "Call not found");
  }

  const { currentUser } = getCurrentUserInfo(req);
  
  // Verify user is a participant
  const participant = videoCall.participants.find(p => 
    p.userId._id.toString() === currentUser.toString()
  );
  
  if (!participant) {
    throw new ApiError(403, "You are not a participant in this call");
  }

  return res.status(200).json(new ApiResponse(200, {
    mediaState: participant.mediaState,
    callStatus: videoCall.callStatus
  }, "Media permissions retrieved successfully"));
});

// Update media quality settings
const updateMediaQuality = asyncHandler(async (req, res) => {
  const { callId } = req.params;
  const { videoQuality = 'high', audioQuality = 'high' } = req.body;
  
  const validQualities = ['low', 'medium', 'high'];
  if (!validQualities.includes(videoQuality) || !validQualities.includes(audioQuality)) {
    throw new ApiError(400, "Quality must be 'low', 'medium', or 'high'");
  }

  const videoCall = await VideoCall.findById(callId);
  if (!videoCall) {
    throw new ApiError(404, "Call not found");
  }

  const { currentUser, currentUserName } = getCurrentUserInfo(req);
  
  // Verify user is a participant
  const participantIndex = videoCall.participants.findIndex(p => 
    p.userId._id.toString() === currentUser.toString()
  );
  
  if (participantIndex === -1) {
    throw new ApiError(403, "You are not a participant in this call");
  }

  // Update quality settings
  if (!videoCall.participants[participantIndex].mediaState.qualitySettings) {
    videoCall.participants[participantIndex].mediaState.qualitySettings = {};
  }
  
  videoCall.participants[participantIndex].mediaState.qualitySettings = {
    videoQuality,
    audioQuality,
    updatedAt: new Date()
  };
  
  await videoCall.save();

  // Notify other participants about quality change
  if (req.io) {
    req.io.to(videoCall.roomId).emit('mediaQualityUpdated', {
      callId: videoCall._id,
      userId: currentUser,
      qualitySettings: { videoQuality, audioQuality },
      userName: currentUserName
    });
  }

  return res.status(200).json(new ApiResponse(200, {
    videoQuality,
    audioQuality
  }, "Media quality updated successfully"));
});

// Reject video call
const rejectCall = asyncHandler(async (req, res) => {
  const { callId } = req.params;
  const { reason = 'rejected' } = req.body;
  
  const videoCall = await VideoCall.findById(callId)
    .populate('participants.userId', 'name email avatar');
    
  if (!videoCall) {
    throw new ApiError(404, "Call not found");
  }

  const { currentUser, currentUserType, currentUserName } = getCurrentUserInfo(req);
  
  // Verify user is a participant
  const isParticipant = videoCall.participants.some(p => 
    p.userId._id.toString() === currentUser.toString()
  );
  
  if (!isParticipant) {
    throw new ApiError(403, "You are not a participant in this call");
  }

  // Update call status
  videoCall.callStatus = reason === 'busy' ? 'rejected' : 'rejected';
  videoCall.endTime = new Date();
  await videoCall.save();

  // Notify the other participant
  const otherParticipant = videoCall.participants.find(p => 
    p.userId._id.toString() !== currentUser.toString()
  );
  
  if (req.io) {
    req.io.to(`user_${otherParticipant.userId._id}`).emit('callRejected', {
      callId: videoCall._id,
      rejectedBy: {
        id: currentUser,
        name: currentUserName,
        type: currentUserType
      },
      reason
    });
  }

  return res.status(200).json(new ApiResponse(200, {}, "Call rejected successfully"));
});

// End video call
const endCall = asyncHandler(async (req, res) => {
  const { callId } = req.params;
  
  const videoCall = await VideoCall.findById(callId)
    .populate('participants.userId', 'name email avatar');
    
  if (!videoCall) {
    throw new ApiError(404, "Call not found");
  }

  const { currentUser, currentUserType, currentUserName } = getCurrentUserInfo(req);
  
  // Verify user is a participant
  const isParticipant = videoCall.participants.some(p => 
    p.userId._id.toString() === currentUser.toString()
  );
  
  if (!isParticipant) {
    throw new ApiError(403, "You are not a participant in this call");
  }

  // Calculate duration if call was ongoing
  if (videoCall.callStatus === 'ongoing' && videoCall.startTime) {
    videoCall.duration = Math.floor((new Date() - videoCall.startTime) / 1000);
  }

  // Update call status and end time
  videoCall.callStatus = 'ended';
  videoCall.endTime = new Date();
  
  // Mark participant as left
  const participantIndex = videoCall.participants.findIndex(p => 
    p.userId._id.toString() === currentUser.toString()
  );
  videoCall.participants[participantIndex].leftAt = new Date();
  
  await videoCall.save();

  // Notify other participants
  const otherParticipant = videoCall.participants.find(p => 
    p.userId._id.toString() !== currentUser.toString()
  );
  
  if (req.io) {
    req.io.to(`user_${otherParticipant.userId._id}`).emit('callEnded', {
      callId: videoCall._id,
      endedBy: {
        id: currentUser,
        name: currentUserName,
        type: currentUserType
      },
      duration: videoCall.duration
    });

    // Notify the room as well
    req.io.to(videoCall.roomId).emit('callEnded', {
      callId: videoCall._id,
      endedBy: {
        id: currentUser,
        name: currentUserName,
        type: currentUserType
      },
      duration: videoCall.duration
    });
  }

  return res.status(200).json(new ApiResponse(200, {
    duration: videoCall.duration,
    endTime: videoCall.endTime
  }, "Call ended successfully"));
});

// Get call history
const getCallHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const { currentUser } = getCurrentUserInfo(req);
  
  const query = {
    'participants.userId': currentUser
  };
  
  if (status) {
    query.callStatus = status;
  }

  const calls = await VideoCall.find(query)
    .populate('participants.userId', 'name email avatar specialization')
    .populate('initiator.userId', 'name email avatar')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const totalCalls = await VideoCall.countDocuments(query);

  return res.status(200).json(new ApiResponse(200, {
    calls,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalCalls / limit),
      totalCalls,
      hasMore: page * limit < totalCalls
    }
  }, "Call history retrieved successfully"));
});

// Rate call quality
const rateCall = asyncHandler(async (req, res) => {
  const { callId } = req.params;
  const { rating, feedback } = req.body;
  
  if (!rating || rating < 1 || rating > 5) {
    throw new ApiError(400, "Rating must be between 1 and 5");
  }

  const videoCall = await VideoCall.findById(callId);
  if (!videoCall) {
    throw new ApiError(404, "Call not found");
  }

  const { currentUser, currentUserType } = getCurrentUserInfo(req);
  
  // Verify user participated in the call
  const isParticipant = videoCall.participants.some(p => 
    p.userId.toString() === currentUser.toString()
  );
  
  if (!isParticipant) {
    throw new ApiError(403, "You didn't participate in this call");
  }

  // Check if call is ended
  if (videoCall.callStatus !== 'ended') {
    throw new ApiError(400, "Can only rate completed calls");
  }

  // Check if already rated by this user
  if (videoCall.callQuality?.ratedBy?.toString() === currentUser.toString()) {
    throw new ApiError(400, "You have already rated this call");
  }

  videoCall.callQuality = {
    rating,
    feedback: feedback || '',
    ratedBy: currentUser,
    raterType: currentUserType
  };

  await videoCall.save();

  return res.status(200).json(new ApiResponse(200, {}, "Call rated successfully"));
});

// Report technical issue
const reportIssue = asyncHandler(async (req, res) => {
  const { callId } = req.params;
  const { issue } = req.body;
  
  if (!issue) {
    throw new ApiError(400, "Issue description is required");
  }

  const videoCall = await VideoCall.findById(callId);
  if (!videoCall) {
    throw new ApiError(404, "Call not found");
  }

  const { currentUser, currentUserType } = getCurrentUserInfo(req);
  
  videoCall.technicalIssues.push({
    issue,
    reportedBy: currentUser,
    reporterType: currentUserType,
    timestamp: new Date()
  });

  await videoCall.save();

  return res.status(200).json(new ApiResponse(200, {}, "Issue reported successfully"));
});

// Get active calls for user
const getActiveCalls = asyncHandler(async (req, res) => {
  const { currentUser } = getCurrentUserInfo(req);
  
  const activeCalls = await VideoCall.find({
    'participants.userId': currentUser,
    callStatus: { $in: ['initiated', 'ringing', 'ongoing'] }
  })
  .populate('participants.userId', 'name email avatar specialization')
  .populate('initiator.userId', 'name email avatar')
  .sort({ createdAt: -1 });

  return res.status(200).json(new ApiResponse(200, activeCalls, "Active calls retrieved successfully"));
});

export {
  initiateCall,
  acceptCall,
  rejectCall,
  endCall,
  getCallHistory,
  rateCall,
  reportIssue,
  getActiveCalls,
  toggleCamera,
  toggleMicrophone,
  toggleScreenShare,
  getMediaPermissions,
  updateMediaQuality
};