import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useClientAuthStore from '../stores/clientAuthStore';
import useDoctorAuthStore from '../stores/doctorAuthStore';
import { BsMicFill, BsMicMuteFill } from 'react-icons/bs';
import { FaVideo, FaVideoSlash } from 'react-icons/fa';
import { IoMdCall, IoMdCallEnd } from 'react-icons/io';

const VideoCallPage = () => {
  const { roomId, userId } = useParams();
  const navigate = useNavigate();
  
  // Get auth state from the appropriate store
  const clientStore = useClientAuthStore();
  const doctorStore = useDoctorAuthStore();
  
  // Determine if user is a doctor or client
  const isDoctor = !!doctorStore.doctor;
  const currentUser = isDoctor ? doctorStore.doctor : clientStore.client;
  const authStore = isDoctor ? doctorStore : clientStore;
  
  // Video call state
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isCallConnected, setIsCallConnected] = useState(false);
  const [isCallEnding, setIsCallEnding] = useState(false);
  
  // Refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  
  // Initialize WebRTC connection
  useEffect(() => {
    if (!currentUser || !roomId || !userId) {
      navigate('/chats');
      return;
    }
    
    // Listen for WebRTC related socket events
    const socket = authStore.socket;
    if (socket) {
      socket.on('webrtc_offer', handleOffer);
      socket.on('webrtc_answer', handleAnswer);
      socket.on('webrtc_ice_candidate', handleICECandidate);
      socket.on('call_ended', handleCallEnded);
    }
    
    // Initialize local stream
    initLocalStream();
    
    return () => {
      // Clean up
      if (socket) {
        socket.off('webrtc_offer');
        socket.off('webrtc_answer');
        socket.off('webrtc_ice_candidate');
        socket.off('call_ended');
      }
      
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, [currentUser, roomId, userId]);
  
  // Update video elements when streams change
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
    
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [localStream, remoteStream]);
  
  // Initialize local media stream
  const initLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      // Create RTCPeerConnection
      createPeerConnection();
      
      // If we're the caller, create and send offer
      if (authStore.initiateVideoCall) {
        createAndSendOffer();
      }
    } catch (error) {
      console.error('Error accessing media devices:', error);
      alert('Could not access camera or microphone. Please check permissions.');
      navigate('/chats');
    }
  };
  
  // Create WebRTC peer connection
  const createPeerConnection = () => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
    
    const peerConnection = new RTCPeerConnection(configuration);
    
    // Add local stream tracks to connection
    if (localStream) {
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });
    }
    
    // Handle remote stream
    peerConnection.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
      setIsCallConnected(true);
    };
    
    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        authStore.sendICECandidate(userId, event.candidate);
      }
    };
    
    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === 'disconnected' || 
          peerConnection.connectionState === 'failed') {
        handleCallEnded();
      }
    };
    
    peerConnectionRef.current = peerConnection;
  };
  
  // Create and send offer to remote peer
  const createAndSendOffer = async () => {
    try {
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);
      
      authStore.sendWebRTCOffer(userId, offer);
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  };
  
  // Handle incoming WebRTC offer
  const handleOffer = async ({ targetUserId, offer }) => {
    if (currentUser._id !== targetUserId || !peerConnectionRef.current) return;
    
    try {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));
      
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);
      
      authStore.sendWebRTCAnswer(userId, answer);
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  };
  
  // Handle WebRTC answer
  const handleAnswer = async ({ targetUserId, answer }) => {
    if (currentUser._id !== targetUserId || !peerConnectionRef.current) return;
    
    try {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  };
  
  // Handle ICE candidate
  const handleICECandidate = async ({ targetUserId, candidate }) => {
    if (currentUser._id !== targetUserId || !peerConnectionRef.current) return;
    
    try {
      await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  };
  
  // Handle remote peer ending call
  const handleCallEnded = () => {
    navigate('/chats');
  };
  
  // Toggle audio mute
  const toggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };
  
  // Toggle video
  const toggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };
  
  // End call
  const endCall = () => {
    setIsCallEnding(true);
    
    // Notify other user
    if (authStore.socket) {
      authStore.socket.emit('end_call', { roomId, targetUserId: userId });
    }
    
    // Clean up and navigate back to chat
    setTimeout(() => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      
      navigate('/chats');
    }, 500);
  };
  
  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Video streams */}
      <div className="flex-1 flex items-center justify-center relative">
        {/* Remote video (full screen) */}
        {remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-white text-xl">Connecting...</div>
          </div>
        )}
        
        {/* Local video (picture-in-picture) */}
        <div className="absolute bottom-5 right-5 w-1/4 max-w-xs border-2 border-white rounded-lg overflow-hidden">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted // Always mute local video to prevent feedback
            className="w-full h-full object-cover"
          />
        </div>
      </div>
      
      {/* Controls */}
      <div className="bg-gray-800 p-4 flex justify-center items-center space-x-4">
        <button
          onClick={toggleMute}
          className={`p-3 rounded-full ${isMuted ? 'bg-red-500' : 'bg-gray-600'}`}
        >
          {isMuted ? <BsMicMuteFill size={24} color="white" /> : <BsMicFill size={24} color="white" />}
        </button>
        
        <button
          onClick={endCall}
          className="p-4 rounded-full bg-red-600 mx-4"
          disabled={isCallEnding}
        >
          <IoMdCallEnd size={28} color="white" />
        </button>
        
        <button
          onClick={toggleVideo}
          className={`p-3 rounded-full ${isVideoOff ? 'bg-red-500' : 'bg-gray-600'}`}
        >
          {isVideoOff ? <FaVideoSlash size={24} color="white" /> : <FaVideo size={24} color="white" />}
        </button>
      </div>
    </div>
  );
};

export default VideoCallPage;