// controllers/videoCall.controller.js
import VideoCall from "../models/video.model.js";
import Doctor from "../models/video.model.js";
import Client from "../models/client.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { v4 as uuidv4 } from 'uuid';

// Generate unique room ID
const generateRoomId = () => {
  return `room_${uuidv4().replace(/-/g, '')}`;
};

// Initiate video call
const initiateCall = asyncHandler(async (req, res) => {
  const { participantId, participantType, callType = 'video' } = req.body;
  
  if (!participantId || !participantType) {
    throw new ApiError(400, "Participant ID and type are required");
  }

  // Validate participant exists
  const Model = participantType === 'Doctor' ? Doctor : Client;
  const participant = await Model.findById(participantId).select('name email avatar');
  if (!participant) {
    throw new ApiError(404, `${participantType} not found`);
  }

  const currentUser = req.doctor ? req.doctor._id : req.client._id;
  const currentUserType = req.doctor ? 'Doctor' : 'Client';

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
      { userId: currentUser, userType: currentUserType },
      { userId: participantId, userType: participantType }
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
  req.io?.to(`user_${participantId}`).emit('incomingCall', {
    callId: videoCall._id,
    caller: {
      id: currentUser,
      name: req.doctor ? req.doctor.name : req.client.name,
      type: currentUserType,
      avatar: req.doctor ? req.doctor.avatar : req.client.avatar
    },
    callType,
    roomId
  });

  // Update call status to ringing
  videoCall.callStatus = 'ringing';
  await videoCall.save();

  return res.status(201).json(new ApiResponse(201, videoCall, "Call initiated successfully"));
});

// Accept video call
const acceptCall = asyncHandler(async (req, res) => {
  const { callId } = req.params;
  
  const videoCall = await VideoCall.findById(callId);
  if (!videoCall) {
    throw new ApiError(404, "Call not found");
  }

  const currentUser = req.doctor ? req.doctor._id : req.client._id;
  
  // Verify user is a participant
  const isParticipant = videoCall.participants.some(p => 
    p.userId.toString() === currentUser.toString()
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
  
  // Mark participant as joined
  const participantIndex = videoCall.participants.findIndex(p => 
    p.userId.toString() === currentUser.toString()
  );
  videoCall.participants[participantIndex].joinedAt = new Date();
  
  await videoCall.save();

  // Notify the initiator
  const otherParticipant = videoCall.participants.find(p => 
    p.userId.toString() !== currentUser.toString()
  );
  
  req.io?.to(`user_${otherParticipant.userId}`).emit('callAccepted', {
    callId: videoCall._id,
    roomId: videoCall.roomId,
    acceptedBy: currentUser
  });

  return res.status(200).json(new ApiResponse(200, {
    callId: videoCall._id,
    roomId: videoCall.roomId,
    status: 'accepted'
  }, "Call accepted successfully"));
});

// Reject video call
const rejectCall = asyncHandler(async (req, res) => {
  const { callId } = req.params;
  const { reason = 'rejected' } = req.body;
  
  const videoCall = await VideoCall.findById(callId);
  if (!videoCall) {
    throw new ApiError(404, "Call not found");
  }

  const currentUser = req.doctor ? req.doctor._id : req.client._id;
  
  // Verify user is a participant
  const isParticipant = videoCall.participants.some(p => 
    p.userId.toString() === currentUser.toString()
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
    p.userId.toString() !== currentUser.toString()
  );
  
  req.io?.to(`user_${otherParticipant.userId}`).emit('callRejected', {
    callId: videoCall._id,
    rejectedBy: currentUser,
    reason
  });

  return res.status(200).json(new ApiResponse(200, {}, "Call rejected successfully"));
});

// End video call
const endCall = asyncHandler(async (req, res) => {
  const { callId } = req.params;
  
  const videoCall = await VideoCall.findById(callId);
  if (!videoCall) {
    throw new ApiError(404, "Call not found");
  }

  const currentUser = req.doctor ? req.doctor._id : req.client._id;
  
  // Verify user is a participant
  const isParticipant = videoCall.participants.some(p => 
    p.userId.toString() === currentUser.toString()
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
    p.userId.toString() === currentUser.toString()
  );
  videoCall.participants[participantIndex].leftAt = new Date();
  
  await videoCall.save();

  // Notify other participants
  const otherParticipant = videoCall.participants.find(p => 
    p.userId.toString() !== currentUser.toString()
  );
  
  req.io?.to(`user_${otherParticipant.userId}`).emit('callEnded', {
    callId: videoCall._id,
    endedBy: currentUser,
    duration: videoCall.duration
  });

  return res.status(200).json(new ApiResponse(200, {
    duration: videoCall.duration,
    endTime: videoCall.endTime
  }, "Call ended successfully"));
});

// Get call history
const getCallHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const currentUser = req.doctor ? req.doctor._id : req.client._id;
  
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

  const currentUser = req.doctor ? req.doctor._id : req.client._id;
  const userType = req.doctor ? 'Doctor' : 'Client';
  
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
    raterType: userType
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

  const currentUser = req.doctor ? req.doctor._id : req.client._id;
  const userType = req.doctor ? 'Doctor' : 'Client';
  
  videoCall.technicalIssues.push({
    issue,
    reportedBy: currentUser,
    reporterType: userType,
    timestamp: new Date()
  });

  await videoCall.save();

  return res.status(200).json(new ApiResponse(200, {}, "Issue reported successfully"));
});

// Get active calls for user
const getActiveCalls = asyncHandler(async (req, res) => {
  const currentUser = req.doctor ? req.doctor._id : req.client._id;
  
  const activeCalls = await VideoCall.find({
    'participants.userId': currentUser,
    callStatus: { $in: ['initiated', 'ringing', 'ongoing'] }
  })
  .populate('participants.userId', 'name email avatar')
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
  getActiveCalls
};