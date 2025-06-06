import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Phone, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Users, 
  ArrowLeft, 
  PhoneOff,
  Monitor,
  MonitorOff,
  Settings,
  Star,
  Clock,
  Camera
} from 'lucide-react';
import useVideoStore from '../store/videoStore';
import useDoctorAuthStore from '../store/doctorAuthStore';
import useClientAuthStore from '../store/clientAuthStore';
import { Link } from 'react-router-dom';
import io from 'socket.io-client';

const VideoCallPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContact, setSelectedContact] = useState(null);
  const [showContactList, setShowContactList] = useState(true);
  const [contacts, setContacts] = useState([]);
  const [userType, setUserType] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [callQuality, setCallQuality] = useState({ video: 'high', audio: 'high' });
  const [connectionState, setConnectionState] = useState('disconnected');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Video refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  
  // Enhanced ICE handling refs
  const peerConnectionRef = useRef(null);
  const socketRef = useRef(null);
  const remoteDescriptionSetRef = useRef(false);
  const iceCandidateQueueRef = useRef([]);
  
  // Processing flags
  const isOfferProcessingRef = useRef(false);
  const isAnswerProcessingRef = useRef(false);

  // Video store
  const {
    currentCall,
    activeCalls,
    callHistory,
    mediaState,
    isInitiating,
    isAccepting,
    isRejecting,
    isEnding,
    isTogglingCamera,
    isTogglingMicrophone,
    isTogglingScreenShare,
    isFetchingHistory,
    error: storeError,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleCamera,
    toggleMicrophone,
    toggleScreenShare,
    getCallHistory,
    getActiveCalls,
    updateMediaQuality,
    rateCall,
    clearError
  } = useVideoStore();

  // Auth stores
  const {
    doctor,
    isAuthenticated: isDoctorAuthenticated,
    getAllDoctors,
    checkAuth: checkDoctorAuth
  } = useDoctorAuthStore();

  const {
    client,
    isAuthenticated: isClientAuthenticated,
    getAllClients,
    checkAuth: checkClientAuth
  } = useClientAuthStore();

  // Enhanced Socket.IO connection with debugging
  useEffect(() => {
    const initializeSocket = () => {
      console.log('[Socket] Initializing socket connection...');
      
      const token = userType === 'Doctor' 
        ? localStorage.getItem('doctorAccessToken')
        : localStorage.getItem('clientAccessToken');

      console.log('[Socket] Retrieved token:', token ? 'exists' : 'missing');
      console.log('[Socket] User Type:', userType);
      console.log('[Socket] Current User:', currentUser);

      if (!token) {
        console.error('[Socket] No authentication token found');
        return;
      }

      if (!currentUser || !currentUser._id) {
        console.error('[Socket] Invalid current user data:', currentUser);
        return;
      }

      try {
        const socket = io('http://localhost:5000', {
          auth: {
            token: token,
            userType: userType,
            userId: currentUser._id
          },
          transports: ['websocket', 'polling'],
          timeout: 20000,
          forceNew: true
        });

        socketRef.current = socket;

        socket.on('connect', () => {
          console.log('[Socket] Connected! Socket ID:', socket.id);
          setConnectionState('connected');
        });

        socket.on('authenticated', (data) => {
          console.log('[Socket] Authenticated:', data);
          socket.emit('identify', {
            userId: currentUser._id,
            userType: userType
          });
        });

        socket.on('incoming-call', async (data) => {
          console.log('[Socket] Incoming call:', data);
          await handleIncomingCall(data);
        });

        socket.on('offer', async (data) => {
          console.log('[Socket] Received call offer:', data);
          await handleReceiveOffer(data);
        });

        socket.on('answer', async (data) => {
          console.log('[Socket] Received call answer:', data);
          await handleReceiveAnswer(data);
        });

        // Enhanced ICE candidate handling
        socket.on('iceCandidate', async (data) => {
          console.log('[Socket] Received ICE candidate:', data);
          await handleReceiveIceCandidate(data);
        });

        socket.on('call-ended', () => {
          console.log('[Socket] Call ended by remote user');
          handleCallEnded();
        });

        socket.on('call-rejected', () => {
          console.log('[Socket] Call rejected by remote user');
          handleCallRejected();
        });

        socket.on('disconnect', (reason) => {
          console.warn('[Socket] Disconnected:', reason);
          setConnectionState('disconnected');
        });

        socket.on('connect_error', (error) => {
          console.error('[Socket] Connection error:', error);
          setConnectionState('error');
          
          if (error.message?.includes('Authentication')) {
            console.warn('[Socket] Authentication failed. Consider redirecting to login.');
          }
        });

        socket.on('error', (error) => {
          console.error('[Socket] General socket error:', error);
        });
      } catch (err) {
        console.error('[Socket] Exception during socket setup:', err);
      }
    };

    if (currentUser && userType) {
      console.log('[Socket] useEffect triggered - Initializing...');
      initializeSocket();
    }

    return () => {
      if (socketRef.current) {
        console.log('[Socket] Disconnecting socket...');
        socketRef.current.disconnect();
      }
    };
  }, [currentUser, userType]);

const initializeMedia = async () => {
  console.log('[Media] Initializing media stream...');

  if (localStreamRef.current && localStreamRef.current.active) {
    console.log('[Media] Using existing active stream');
    
    if (localVideoRef.current && localVideoRef.current.srcObject !== localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
      // FIXED: Wait for video to be ready
      await new Promise(resolve => {
        localVideoRef.current.onloadedmetadata = resolve;
        setTimeout(resolve, 1000); // Fallback timeout
      });
    }
    return localStreamRef.current;
  }

  try {
    if (localStreamRef.current) {
      console.log('[Media] Stopping existing inactive stream...');
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log(`[Media] Stopped ${track.kind} track`);
      });
      localStreamRef.current = null;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Media devices not supported by this browser');
    }

    console.log('[Media] Requesting new media stream...');
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280, min: 640, max: 1920 },
        height: { ideal: 720, min: 480, max: 1080 },
        frameRate: { ideal: 30, min: 15, max: 60 },
        facingMode: 'user'
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: { ideal: 44100 }
      }
    });

    console.log('[Media] New media stream obtained:', {
      id: stream.id,
      videoTracks: stream.getVideoTracks().length,
      audioTracks: stream.getAudioTracks().length,
      active: stream.active
    });

    localStreamRef.current = stream;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      console.log('[Media] Stream attached to local video element');
      
      // FIXED: Better video handling
      try {
        await new Promise((resolve, reject) => {
          localVideoRef.current.onloadedmetadata = resolve;
          localVideoRef.current.onerror = reject;
          setTimeout(reject, 5000); // 5 second timeout
        });
        
        await localVideoRef.current.play();
        console.log('[Media] Local video playing');
      } catch (playError) {
        console.warn('[Media] Auto-play prevented or video load failed:', playError);
      }
    }

    return stream;

  } catch (error) {
    console.error('[Media] Error accessing media devices:', error);
    // Error handling remains the same...
    throw error;
  }
};

  // Fallback media initialization
  const initializeMediaFallback = async () => {
    console.log('[Media-Fallback] Attempting fallback media initialization...');

    try {
      const fallbackConstraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 15 }
        },
        audio: true
      };

      const stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      return stream;
    } catch (fallbackError) {
      console.error('[Media-Fallback] Failed to initialize fallback media stream:', fallbackError);
      setError('Unable to access camera and microphone. Please check your device settings.');
      throw fallbackError;
    }
  };

  // Enhanced peer connection initialization
  const initializePeerConnection = () => {
    console.log('[Peer] Initializing new RTCPeerConnection...');

    if (peerConnectionRef.current) {
      console.log('[Peer] Closing existing peer connection');
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Reset all state flags
    resetConnectionState();

    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
      ],
      iceCandidatePoolSize: 10
    });

    peerConnectionRef.current = peerConnection;

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        console.log('[Peer] Sending ICE candidate:', event.candidate);
        socketRef.current.emit('iceCandidate', {
          candidate: event.candidate,
          targetUserId: selectedContact?._id || getCurrentUserId(),
        });
      }
    };

    // Handle remote track
 peerConnection.ontrack = (event) => {
    console.log('[Peer] Received remote track event:', {
      streamsLength: event.streams.length,
      trackKind: event.track?.kind,
      trackId: event.track?.id,
      trackEnabled: event.track?.enabled,
      trackReadyState: event.track?.readyState
    });

    if (event.streams.length > 0) {
      const remoteStream = event.streams[0];
      remoteStreamRef.current = remoteStream;

      console.log('[Peer] Remote stream details:', {
        id: remoteStream.id,
        active: remoteStream.active,
        videoTracks: remoteStream.getVideoTracks().length,
        audioTracks: remoteStream.getAudioTracks().length
      });

      if (remoteVideoRef.current) {
        console.log('[Peer] Attaching remote stream to video element');
        remoteVideoRef.current.srcObject = remoteStream;

        // FIXED: Better video element handling
        remoteVideoRef.current.onloadedmetadata = () => {
          console.log('[Peer] Remote video metadata loaded');
          remoteVideoRef.current.play().catch(err => {
            console.warn('[Peer] Auto-play prevented:', err);
          });
        };

        remoteVideoRef.current.oncanplay = () => {
          console.log('[Peer] Remote video can play');
        };

        remoteVideoRef.current.onplaying = () => {
          console.log('[Peer] Remote video is playing');
          setConnectionState('connected');
        };

        remoteVideoRef.current.onerror = (error) => {
          console.error('[Peer] Remote video error:', error);
        };
      }
    } else {
      console.warn('[Peer] ontrack event received with no streams');
    }
  };


    // Connection state monitoring
    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;
      console.log('[Peer] Peer connection state changed:', state);
      setConnectionState(state);

      switch (state) {
        case 'connected':
          console.log('[Peer] Peer connection established successfully');
          break;
        case 'disconnected':
          console.warn('[Peer] Peer connection disconnected');
          handleConnectionFailure();
          break;
        case 'failed':
          console.error('[Peer] Peer connection failed');
          handleConnectionFailure();
          break;
        case 'closed':
          console.log('[Peer] Peer connection closed');
          break;
      }
    };

    // ICE connection state monitoring
    peerConnection.oniceconnectionstatechange = () => {
      const iceState = peerConnection.iceConnectionState;
      console.log('[Peer] ICE connection state changed:', iceState);
      if (iceState === 'failed') {
        console.warn('[Peer] ICE connection failed. Restarting ICE...');
        peerConnection.restartIce();
      }
    };

    return peerConnection;
  };

  // Reset connection state - utility function
  const resetConnectionState = () => {
    console.log('[State] Resetting connection state...');
    remoteDescriptionSetRef.current = false;
    iceCandidateQueueRef.current = [];
    isOfferProcessingRef.current = false;
    isAnswerProcessingRef.current = false;
  };

  // Helper function to safely add tracks to peer connection
  const addTracksToPC = (peerConnection, stream) => {
    if (!peerConnection || !stream) {
      console.warn('[Tracks] Cannot add tracks - missing peer connection or stream');
      return;
    }

    console.log('[Tracks] Adding tracks to peer connection...');
    
    const existingSenders = peerConnection.getSenders();
    const existingTrackIds = existingSenders
      .filter(sender => sender.track)
      .map(sender => sender.track.id);

    stream.getTracks().forEach(track => {
      if (!existingTrackIds.includes(track.id)) {
        try {
          peerConnection.addTrack(track, stream);
          console.log(`[Tracks] Successfully added ${track.kind} track (ID: ${track.id})`);
        } catch (error) {
          console.error(`[Tracks] Failed to add ${track.kind} track:`, error);
        }
      } else {
        console.log(`[Tracks] Track ${track.kind} (ID: ${track.id}) already exists, skipping`);
      }
    });
  };




const drainIceCandidateQueue = async () => {
  console.log('[ICE] drainIceCandidateQueue called');
  console.log(`[ICE] Queue length: ${iceCandidateQueueRef.current.length}`);
  console.log(`[ICE] remoteDescriptionSetRef: ${remoteDescriptionSetRef.current}`);
  console.log(`[ICE] peerConnectionRef exists:`, !!peerConnectionRef.current);

  const pc = peerConnectionRef.current;

  if (!pc || !remoteDescriptionSetRef.current) {
    console.log('[ICE] Not ready: peerConnection or remoteDescription flag not set');
    return;
  }

  // ✅ Wait until remoteDescription is really set (not null)
  let retries = 0;
  while (!pc.remoteDescription && retries < 5) {
    console.log('[ICE] Waiting for remoteDescription to be actually set...');
    await new Promise(resolve => setTimeout(resolve, 100));
    retries++;
  }

  if (!pc.remoteDescription) {
    console.warn('[ICE] remoteDescription still null after waiting, skipping drain');
    return;
  }

  if (iceCandidateQueueRef.current.length === 0) {
    console.log('[ICE] No ICE candidates to drain');
    return;
  }

  console.log(`[ICE] Draining ${iceCandidateQueueRef.current.length} queued ICE candidates`);

  const candidates = [...iceCandidateQueueRef.current];
  iceCandidateQueueRef.current = [];

  for (const candidate of candidates) {
    try {
      if (candidate && (candidate.candidate || candidate.sdpMid || candidate.sdpMLineIndex !== undefined)) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        console.log('[ICE] Successfully added queued ICE candidate');
      } else {
        console.warn('[ICE] Invalid candidate data, skipping:', candidate);
      }
    } catch (error) {
      console.error('[ICE] Failed to add queued candidate:', error);
    }
  }
};

 // Handle received ICE candidate
const handleReceiveIceCandidate = async (data) => {
  console.log('[ICE] Received ICE candidate data:', data);

  try {
    if (!data || !data.candidate) {
      console.warn('[ICE] No ICE candidate in received data');
      return;
    }

    const candidateData = data.candidate;

    // FIXED: Better validation of candidate data
    if (!candidateData.candidate && !candidateData.sdpMid && candidateData.sdpMLineIndex === undefined) {
      console.warn('[ICE] Invalid candidate data received:', candidateData);
      return;
    }

    if (peerConnectionRef.current && 
        remoteDescriptionSetRef.current && 
        peerConnectionRef.current.remoteDescription) { // ADDED: Check remote description exists
      
      console.log('[ICE] Adding ICE candidate immediately to peer connection...');
      
      try {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidateData));
        console.log('[ICE] ICE candidate added successfully');
      } catch (addError) {
        console.error('[ICE] Failed to add ICE candidate immediately:', addError);
        // If immediate add fails, queue it
        iceCandidateQueueRef.current.push(candidateData);
      }
    } else {
      console.log('[ICE] Peer connection not ready, queueing ICE candidate');
      iceCandidateQueueRef.current.push(candidateData);
      console.log(`[ICE] Queued candidates count: ${iceCandidateQueueRef.current.length}`);
    }
  } catch (error) {
    console.error('[ICE] Error handling ICE candidate:', error);
  }
};

 // 3. FIXED: Enhanced offer handling with proper sequencing
const handleReceiveOffer = async (data) => {
  if (isOfferProcessingRef.current) {
    console.warn('[Offer] Already processing an offer, ignoring duplicate');
    return;
  }

  isOfferProcessingRef.current = true;
  console.log('[Offer] Received offer from:', data.fromUserId);

  try {
    // Reset connection state
    resetConnectionState();

    // Step 1: Ensure local media is available
    if (!localStreamRef.current || !localStreamRef.current.active) {
      console.log('[Offer] No active local stream, initializing media...');
      await initializeMedia();
      // FIXED: Add longer wait for media to be ready
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    if (!localStreamRef.current || !localStreamRef.current.active) {
      throw new Error('Failed to obtain active media stream for answering');
    }

    // Step 2: Initialize peer connection
    console.log('[Offer] Initializing peer connection...');
    const pc = initializePeerConnection();

    // Step 3: Add local tracks BEFORE setting remote description
    console.log('[Offer] Adding local tracks to peer connection...');
    addTracksToPC(pc, localStreamRef.current);
    
    // FIXED: Wait a bit for tracks to be properly added
    await new Promise(resolve => setTimeout(resolve, 500));

    // Step 4: Set remote description
    console.log('[Offer] Setting remote description...');
    console.log('[Offer] Offer SDP:', data.offer);
    
    await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
    remoteDescriptionSetRef.current = true;
    
    console.log('[SDP] Remote description set successfully');
    console.log('[SDP] Remote description type:', pc.remoteDescription?.type);
    console.log('[SDP] Remote description exists:', !!pc.remoteDescription);

    // Step 5: Immediately drain any queued ICE candidates
    console.log('[SDP] Draining ICE candidates after setting remote description...');
    await drainIceCandidateQueue();

    // Step 6: Create and set answer
    console.log('[Offer] Creating SDP answer...');
    const answer = await pc.createAnswer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true
    });

    console.log('[Offer] Setting local description...');
    await pc.setLocalDescription(answer);
    
    console.log('[Offer] Local description set, type:', pc.localDescription?.type);

    // Step 7: Send answer
    if (socketRef.current && socketRef.current.connected) {
      console.log('[Offer] Sending SDP answer back to offerer...');
      socketRef.current.emit('call-answer', {
        answer: answer,
        targetUserId: data.fromUserId
      });
    } else {
      throw new Error('Socket not connected - cannot send answer');
    }

    setConnectionState('connecting');
    console.log('[Offer] Offer handling completed successfully');

  } catch (error) {
    console.error('[Offer] Error while handling incoming offer:', error);
    setError(`Failed to accept incoming call: ${error.message}`);
    
    // Clean up on error
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    resetConnectionState();
  } finally {
    isOfferProcessingRef.current = false;
  }
};




// 4. FIXED: Handle received answer with proper validation
const handleReceiveAnswer = async (data) => {
  if (isAnswerProcessingRef.current) {
    console.warn('[Answer] Already processing an answer, ignoring duplicate');
    return;
  }

  isAnswerProcessingRef.current = true;
  console.log('[Answer] Received answer data:', data);

  try {
    if (!peerConnectionRef.current) {
      throw new Error('No peer connection available to set answer');
    }

    if (!data.answer) {
      throw new Error('No answer data received');
    }

    console.log('[Answer] Before setting remote description');
    console.log('[Answer] Current signaling state:', peerConnectionRef.current.signalingState);
    console.log('[Answer] Answer SDP:', data.answer);

    // FIXED: Check signaling state before setting remote description
    if (peerConnectionRef.current.signalingState !== 'have-local-offer') {
      console.warn('[Answer] Unexpected signaling state for answer:', peerConnectionRef.current.signalingState);
    }

    console.log('[Answer] Setting remote description with received answer...');
    await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
    remoteDescriptionSetRef.current = true;
    
    console.log('[Answer] Remote description set successfully');
    console.log('[Answer] New signaling state:', peerConnectionRef.current.signalingState);
    console.log('[Answer] Remote description exists:', !!peerConnectionRef.current.remoteDescription);

    // FIXED: Immediately drain ICE candidates after setting remote description
    console.log('[SDP] Draining ICE candidates after setting answer...');
    await drainIceCandidateQueue();
    
    console.log('[Answer] Answer processing completed successfully');

  } catch (error) {
    console.error('[Answer] Error handling received answer:', error);
    setError(`Failed to process call answer: ${error.message}`);
    
    // Clean up on error
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    resetConnectionState();
  } finally {
    isAnswerProcessingRef.current = false;
  }
};



  // Handle call ended
  const handleCallEnded = () => {
    console.log('[Call] Ending call...');

    if (peerConnectionRef.current) {
      console.log('[Call] Closing peer connection');
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (remoteVideoRef.current) {
      console.log('[Call] Clearing remote video stream');
      remoteVideoRef.current.srcObject = null;
    }

    remoteStreamRef.current = null;
    resetConnectionState(); // Reset all flags
    setConnectionState('disconnected');
    setSelectedContact(null);
    setShowContactList(true);
  };

  // Handle call rejected
  const handleCallRejected = () => {
    handleCallEnded();
  };

  // Handle incoming call
  const handleIncomingCall = async (data) => {
    console.log('Incoming call from:', data);
  };

  // Connection failure handler
  const handleConnectionFailure = () => {
    console.log('Connection failed, attempting to reconnect...');
    setConnectionState('reconnecting');
    
    setTimeout(() => {
      if (socketRef.current && !socketRef.current.connected) {
        socketRef.current.connect();
      }
    }, 3000);
  };

  // Get current user ID
  const getCurrentUserId = () => {
    if (userType === 'Doctor') {
      return doctor?._id;
    } else if (userType === 'Client') {
      return client?._id;
    }
    return null;
  };

  // Initialize user type and setup
  useEffect(() => {
    const initializeUser = async () => {
      try {
        const doctorToken = localStorage.getItem('doctorAccessToken');
        const clientToken = localStorage.getItem('clientAccessToken');

        if (doctorToken && doctor) {
          setUserType('Doctor');
          setCurrentUser(doctor);
          return;
        }
        
        if (clientToken && client) {
          setUserType('Client');
          setCurrentUser(client);
          return;
        }

        if (doctor) {
          const doctorAuth = await checkDoctorAuth();
          if (doctorAuth.success) {
            setUserType('Doctor');
            setCurrentUser(doctor);
            return;
          }
        }

        if (client) {
          const clientAuth = await checkClientAuth();
          if (clientAuth.success) {
            setUserType('Client');
            setCurrentUser(client);
            return;
          }
        }

        console.warn("No valid user found");
      } catch (error) {
        console.error("Error initializing user:", error);
      }
    };

    if (doctor || client) {
      initializeUser();
    }
  }, [doctor, client, checkDoctorAuth, checkClientAuth]);

  // Fetch data when user type is set
  useEffect(() => {
    if (userType) {
      fetchContacts();
      getActiveCalls();
      getCallHistory();
    }
  }, [userType]);

  // Initialize local media stream
  useEffect(() => {
    if (currentCall || selectedContact) {
      initializeMedia();
    }

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [currentCall, selectedContact]);

  // Enhanced cleanup function for component unmount
  useEffect(() => {
    return () => {
      console.log('[Cleanup] Component unmounting...');
      
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      
      // Reset all state on cleanup
      resetConnectionState();
    };
  }, []);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      if (userType === 'Client') {
        const result = await getAllDoctors({ verified: 'true' });
        if (result.success) {
          setContacts(result.data);
        }
      } else if (userType === 'Doctor') {
        const result = await getAllClients();
        if (result.success) {
          setContacts(result.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle contact selection for video call
  const handleContactSelect = (contact) => {
    setSelectedContact(contact);
    setShowContactList(false);
  };

// 6. FIXED: Enhanced call initiation with better error handling
const handleInitiateCall = async () => {
  
  if (!selectedContact || !socketRef.current || !socketRef.current.connected) {
    console.error('Cannot initiate call: missing contact or socket connection');
    setError('Cannot start call - no connection to server');
    return;
  }

  try {
    setConnectionState('connecting');
    console.log('[Call] Starting call initiation process...');
    
    // Reset connection state
    resetConnectionState();
    
    // Step 1: Ensure media stream
    if (!localStreamRef.current || !localStreamRef.current.active) {
      console.log('[Call] No active local stream, initializing media...');
      await initializeMedia();
      await new Promise(resolve => setTimeout(resolve, 2000)); // FIXED: Longer wait
    }

    if (!localStreamRef.current || !localStreamRef.current.active) {
      throw new Error('Failed to obtain active media stream');
    }

    // Step 2: Initialize peer connection
    console.log('[Call] Initializing peer connection...');
    const pc = initializePeerConnection();
    
    // Step 3: Add local tracks
    console.log('[Call] Adding local tracks to peer connection...');
    addTracksToPC(pc, localStreamRef.current);
    
    // FIXED: Wait for tracks to be added
    await new Promise(resolve => setTimeout(resolve, 500));

    // Step 4: Create offer
    console.log('[Call] Creating offer...');
    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
      iceRestart: false
    });
    
    console.log('[Call] Offer created:', offer);
    console.log('[Call] Setting local description...');
    await pc.setLocalDescription(offer);
    
    console.log('[Call] Local description set, signaling state:', pc.signalingState);

    // Step 5: Send offer
    console.log('[Call] Sending offer to:', selectedContact._id);
    socketRef.current.emit('call-offer', {
      offer: offer,
      targetUserId: selectedContact._id,
      callType: 'video',
      fromUserId: getCurrentUserId()
    });

    // Step 6: Call API
    const participantType = userType === 'Client' ? 'Doctor' : 'Client';
    const result = await initiateCall(
      selectedContact._id, 
      participantType, 
      'video',
      mediaState.cameraEnabled,
      mediaState.microphoneEnabled
    );

    if (result.success) {
      console.log('[Call] API call successful:', result.data);
    } else {
      throw new Error(result.message || 'Failed to initiate call');
    }

    console.log('[Call] Call initiation completed successfully');

  } catch (error) {
    console.error('[Call] Error initiating call:', error);
    setError(`Failed to start call: ${error.message}`);
    setConnectionState('disconnected');
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    resetConnectionState();
  }
};

  // Handle accepting incoming call
  const handleAcceptCall = async (callId) => {
    const result = await acceptCall(callId, true, true);
    if (result.success) {
      setSelectedContact(null);
      setShowContactList(false);
    }
  };

  // Handle rejecting call
  const handleRejectCall = async (callId) => {
    await rejectCall(callId, 'User declined');
    if (socketRef.current) {
      socketRef.current.emit('call-rejected', {
        callId: callId
      });
    }
  };

  // Handle ending call
  const handleEndCall = async () => {
    if (currentCall) {
      await endCall(currentCall._id);
      
      if (socketRef.current) {
        socketRef.current.emit('call-ended', {
          callId: currentCall._id
        });
      }
      
      handleCallEnded();
    }
  };
  // Media control handlers
  const handleToggleCamera = async () => {
    if (currentCall) {
      await toggleCamera(currentCall._id, !mediaState.cameraEnabled);
      
      if (localStreamRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = !mediaState.cameraEnabled;
        }
      }
    }
  };

  const handleToggleMicrophone = async () => {
    if (currentCall) {
      await toggleMicrophone(currentCall._id, !mediaState.microphoneEnabled);
      
      if (localStreamRef.current) {
        const audioTrack = localStreamRef.current.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = !mediaState.microphoneEnabled;
        }
      }
    }
  };

 
  const handleToggleScreenShare = async () => {
    if (currentCall) {
      try {
        if (!mediaState.screenSharing) {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true
          });
          
          if (peerConnectionRef.current) {
            const sender = peerConnectionRef.current.getSenders().find(s => 
              s.track && s.track.kind === 'video'
            );
            if (sender) {
              await sender.replaceTrack(screenStream.getVideoTracks()[0]);
            }
          }
          
          screenStream.getVideoTracks()[0].onended = () => {
            handleToggleScreenShare();
          };
          
        } else {
          if (localStreamRef.current && peerConnectionRef.current) {
            const sender = peerConnectionRef.current.getSenders().find(s => 
              s.track && s.track.kind === 'video'
            );
            if (sender) {
              await sender.replaceTrack(localStreamRef.current.getVideoTracks()[0]);
            }
          }
        }
        
        await toggleScreenShare(currentCall._id, !mediaState.screenSharing);
      } catch (error) {
        console.error('Error toggling screen share:', error);
      }
    }
  };

  const handleQualityChange = async (type, value) => {
    if (currentCall) {
      const newQuality = { ...callQuality, [type]: value };
      setCallQuality(newQuality);
      await updateMediaQuality(currentCall._id, newQuality.video, newQuality.audio);
    }
  };

  // Handle call rating
  const handleRateCall = async (callId, rating, feedback) => {
    await rateCall(callId, rating, feedback);
  };

  // Filter contacts based on search
  const filteredContacts = contacts.filter(contact =>
    contact.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.specialization?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter active calls
  const filteredActiveCalls = activeCalls.filter(call => {
    const currentUserId = getCurrentUserId();
    const otherParticipant = call.participants?.find(p =>
      p?.userId?._id && p.userId._id.toString() !== currentUserId?.toString()
    );
    return otherParticipant?.userId?.name
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());
  });

if (!userType) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center bg-white/80 backdrop-blur-lg p-10 rounded-3xl shadow-2xl border border-white/20">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
          <p className="mt-6 text-gray-700 font-semibold text-lg">Loading video call...</p>
        </div>
      </div>
    );
  }

 return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Sidebar */}
      <div className={`${showContactList ? 'w-full md:w-80' : 'hidden md:block md:w-80'} bg-white/90 backdrop-blur-xl border-r border-slate-200/60 shadow-2xl`}>
        {/* Header with Current User Info */}
        <div className="p-6 border-b border-slate-200/60 bg-gradient-to-r from-white/80 to-blue-50/50 backdrop-blur-sm">
          {currentUser && (
            <div className="flex items-center mb-6 p-5 bg-gradient-to-r from-blue-50/90 to-indigo-50/90 rounded-2xl border border-blue-100/60 shadow-lg">
              <div className="relative">
                <img
                  src={currentUser.avatar || currentUser.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name || 'User')}&background=3b82f6&color=fff`}
                  alt={currentUser.name || 'User'}
                  className="w-16 h-16 rounded-2xl object-cover ring-3 ring-blue-200/50 shadow-xl"
                  onError={(e) => {
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name || 'User')}&background=3b82f6&color=fff`;
                  }}
                />
                <div className={`absolute -bottom-1 -right-1 w-5 h-5 border-3 border-white rounded-full shadow-sm ${
                  connectionState === 'connected' ? 'bg-green-400' : 
                  connectionState === 'connecting' ? 'bg-yellow-400 animate-pulse' : 'bg-gray-400'
                }`}></div>
              </div>
              <div className="ml-4 flex-1">
                <h2 className="text-lg font-bold text-slate-900">{currentUser.name || 'Unknown User'}</h2>
                <div className="text-sm text-slate-600 space-y-1 mt-1">
                  <p className="flex items-center">
                    <Phone className="w-3.5 h-3.5 mr-2 text-slate-500" />
                    {currentUser.phone || 'No phone'}
                  </p>
                  <p className="text-slate-600 font-medium">
                    {currentUser.gender || 'Not specified'} • {userType}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Video Calls
            </h1>
            <div className="flex space-x-2">
              <button 
                className="p-3 hover:bg-blue-50/80 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-md"
                title="View all contacts"
              >
                <Users className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder={`Search ${userType === 'Client' ? 'doctors' : 'patients'}...`}
              className="w-full pl-12 pr-4 py-3.5 bg-white/80 border border-slate-200/60 rounded-2xl focus:outline-none focus:ring-3 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-300 text-slate-700 placeholder-slate-500 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200/60 bg-white/60 backdrop-blur-sm">
          <button 
            onClick={() => setShowHistory(false)}
            className={`flex-1 px-6 py-4 text-sm font-semibold transition-all duration-300 ${
              !showHistory 
                ? 'text-blue-600 border-b-3 border-blue-600 bg-blue-50/60' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50/60'
            }`}
          >
            Available
          </button>
          <button 
            onClick={() => setShowHistory(true)}
            className={`flex-1 px-6 py-4 text-sm font-semibold transition-all duration-300 ${
              showHistory 
                ? 'text-blue-600 border-b-3 border-blue-600 bg-blue-50/60' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50/60'
            }`}
          >
            Call History
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-200 border-t-blue-600"></div>
              <span className="ml-3 text-slate-600">Loading...</span>
            </div>
          )}

          {!loading && !showHistory ? (
            <>
              {/* Active Calls */}
              {filteredActiveCalls && filteredActiveCalls.length > 0 && (
                <div className="border-b border-slate-200/60">
                  <div className="px-6 py-3 bg-gradient-to-r from-green-50/60 to-emerald-50/60">
                    <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Active Calls</h3>
                  </div>
                  {filteredActiveCalls.map((call) => {
                    const currentUserId = getCurrentUserId();
                    const otherParticipant = call.participants?.find(
                      p => p?.userId?._id?.toString() !== currentUserId?.toString()
                    );
                    const participant = otherParticipant?.userId;

                    if (!participant) return null;

                    const isRinging = call.callStatus === 'ringing';

                    return (
                      <div
                        key={call._id}
                        className="flex items-center p-4 bg-gradient-to-r from-green-50/80 to-emerald-50/80 border-b border-slate-100/60"
                      >
                        <div className="relative">
                          <img
                            src={participant.avatar || participant.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(participant.name || 'User')}&background=10b981&color=fff`}
                            alt={participant.name || 'User'}
                            className="w-14 h-14 rounded-2xl object-cover ring-2 ring-green-200 shadow-lg"
                            onError={(e) => {
                              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(participant.name || 'User')}&background=10b981&color=fff`;
                            }}
                          />
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full animate-pulse"></div>
                        </div>
                        <div className="ml-4 flex-1">
                          <h3 className="text-sm font-semibold text-slate-900">{participant.name || 'Unknown User'}</h3>
                          <p className="text-sm text-green-600 font-medium">
                            {isRinging ? 'Incoming call...' : 'In call'}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          {isRinging && (
                            <>
                              <button
                                onClick={() => handleAcceptCall(call._id)}
                                disabled={isAccepting}
                                className="p-3 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-all duration-300 hover:scale-105 shadow-lg"
                                title="Accept call"
                              >
                                <Phone className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleRejectCall(call._id)}
                                disabled={isRejecting}
                                className="p-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-all duration-300 hover:scale-105 shadow-lg"
                                title="Reject call"
                              >
                                <PhoneOff className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Available Contacts */}
              <div className="mt-4">
                <div className="px-6 py-3 bg-gradient-to-r from-slate-50/60 to-blue-50/60">
                  <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    {userType === 'Client' ? 'Available Doctors' : 'Available Patients'}
                  </h3>
                </div>
                
                {filteredContacts && filteredContacts.length > 0 ? (
                  filteredContacts.map((contact) => (
                    <div
                      key={contact._id}
                      onClick={() => handleContactSelect(contact)}
                      className="flex items-center p-4 hover:bg-gradient-to-r hover:from-blue-50/80 hover:to-indigo-50/80 cursor-pointer border-b border-slate-100/60 transition-all duration-300 group hover:shadow-sm"
                    >
                      <div className="relative">
                        <img
                          src={contact.avatar || contact.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name || 'User')}&background=3b82f6&color=fff`}
                          alt={contact.name || 'User'}
                          className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white shadow-lg"
                          onError={(e) => {
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name || 'User')}&background=3b82f6&color=fff`;
                          }}
                        />
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full"></div>
                      </div>
                      <div className="ml-4 flex-1">
                        <h3 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors duration-300">
                          {contact.name || 'Unknown User'}
                        </h3>
                        <div className="text-xs text-slate-600 mt-1 font-medium">
                          <span>{contact.age ? `${contact.age} years` : 'Age unknown'} • {contact.gender || 'Gender not specified'}</span>
                          {userType === 'Client' && contact.specialization && (
                            <span className="ml-2">• {contact.specialization}</span>
                          )}
                        </div>
                        {userType === 'Client' && contact.verified && (
                          <span className="inline-block bg-gradient-to-r from-green-400 to-green-500 text-white text-xs font-bold px-3 py-1 rounded-full mt-2 shadow-lg">
                            ✓ Verified
                          </span>
                        )}
                      </div>
                      <Video className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors duration-300" />
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-500">
                    <Users className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <p className="text-sm">
                      {searchTerm 
                        ? `No ${userType === 'Client' ? 'doctors' : 'patients'} found matching "${searchTerm}"`
                        : `No ${userType === 'Client' ? 'doctors' : 'patients'} available`
                      }
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : !loading && showHistory ? (
            /* Call History */
            <div>
              <div className="px-6 py-3 bg-gradient-to-r from-slate-50/60 to-blue-50/60">
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Recent Calls</h3>
              </div>
              
              {callHistory && callHistory.length > 0 ? (
                callHistory.map((call) => {
                  const currentUserId = getCurrentUserId();
                  const otherParticipant = call.participants?.find(
                    p => p?.userId?._id?.toString() !== currentUserId?.toString()
                  );
                  const participant = otherParticipant?.userId;

                  if (!participant) return null;

                  const callDate = new Date(call.createdAt);

                  return (
                    <div
                      key={call._id}
                      className="flex items-center p-4 hover:bg-gradient-to-r hover:from-slate-50/80 hover:to-blue-50/80 cursor-pointer border-b border-slate-100/60 transition-all duration-300"
                    >
                      <div className="relative">
                        <img
                          src={participant.avatar || participant.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(participant.name || 'User')}&background=6b7280&color=fff`}
                          alt={participant.name || 'User'}
                          className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white shadow-lg"
                          onError={(e) => {
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(participant.name || 'User')}&background=6b7280&color=fff`;
                          }}
                        />
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 border-2 border-white rounded-full ${
                          call.callStatus === 'completed' ? 'bg-green-400' : 
                          call.callStatus === 'missed' ? 'bg-red-400' : 'bg-gray-400'
                        }`}></div>
                      </div>
                      <div className="ml-4 flex-1">
                        <h3 className="text-sm font-semibold text-slate-900">{participant.name || 'Unknown User'}</h3>
                        <div className="text-xs text-slate-600 mt-1 space-y-1">
                          <div className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {call.createdAt ? (
                              <>
                                {callDate.toLocaleDateString()} at {callDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </>
                            ) : (
                              'Date unknown'
                            )}
                          </div>
                          <div className={`font-medium ${
                            call.callStatus === 'completed' ? 'text-green-600' : 
                            call.callStatus === 'missed' ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {call.callStatus === 'completed' ? `${call.duration || '0'}min` : 
                             call.callStatus === 'missed' ? 'Missed call' : (call.callStatus || 'Unknown status')}
                          </div>
                        </div>
                      </div>
                      {call.callQuality?.rating && (
                        <div className="flex items-center text-yellow-500">
                          <Star className="w-4 h-4 fill-current" />
                          <span className="text-xs ml-1 text-slate-600">{call.callQuality.rating}</span>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-slate-500">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p className="text-sm">No call history available</p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Main Video Area */}
      <div className="flex-1 flex flex-col">
        {!selectedContact && !currentCall ? (
          /* No call selected */
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
            <div className="text-center max-w-md mx-auto p-10 bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl">
                <Video className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Start a Video Call</h2>
              <p className="text-slate-600 mb-8 leading-relaxed">
                {userType === 'Client' 
                  ? 'Select a doctor from the sidebar to start a video consultation.'
                  : 'Select a patient from the sidebar to start a video call.'
                }
              </p>
              <button
                onClick={() => setShowContactList(true)}
                className="md:hidden bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-8 py-4 rounded-2xl font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105"
              >
                View Contacts
              </button>
            </div>
          </div>
        ) : (
          /* Video call interface */
          <div className="flex-1 relative bg-black">
            {/* Remote video */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
              onLoadedMetadata={() => console.log('Remote video loaded')}
              onError={(e) => console.error('Remote video error:', e)}
            />
            
            {/* No remote video placeholder - FIXED VERSION */}
            {(!remoteStreamRef.current || !remoteStreamRef.current.active || connectionState !== 'connected') && (
              <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="w-32 h-32 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                    <img
                      src={selectedContact?.avatar || selectedContact?.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedContact?.name || 'User')}&background=6b7280&color=fff`}
                      alt={selectedContact?.name || 'User'}
                      className="w-24 h-24 rounded-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextElementSibling.style.display = 'block';
                      }}
                    />
                    <Camera className="w-16 h-16 text-gray-400 hidden" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    {selectedContact?.name || 'Unknown User'}
                  </h3>
                  <p className="text-gray-300">
                    {connectionState === 'connecting' ? 'Connecting...' : 
                     connectionState === 'connected' ? 'Waiting for video...' : 
                     'Waiting to connect...'}
                  </p>
                </div>
              </div>
            )}
            
            {/* Local video (Picture-in-Picture) */}
            <div className="absolute top-6 right-6 w-48 h-36 bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border-3 border-white/20">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                onLoadedMetadata={() => console.log('Local video loaded')}
                onError={(e) => console.error('Local video error:', e)}
              />
              {!mediaState.cameraEnabled && (
                <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                  <Camera className="w-8 h-8 text-gray-400" />
                </div>
              )}
            </div>

            {/* Connection status */}
            {connectionState !== 'connected' && (
              <div className="absolute top-6 left-6 bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-xl flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  connectionState === 'connecting' ? 'bg-yellow-400 animate-pulse' :
                  connectionState === 'disconnected' ? 'bg-red-400' :
                  connectionState === 'error' ? 'bg-red-500' : 'bg-gray-400'
                }`}></div>
                <span className="text-sm font-medium">
                  {connectionState === 'connecting' ? 'Connecting...' : 
                   connectionState === 'disconnected' ? 'Disconnected' : 
                   connectionState === 'error' ? 'Connection Error' :
                   connectionState}
                </span>
              </div>
            )}

            {/* Call info */}
            <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white px-6 py-3 rounded-2xl">
              <div className="text-center">
                <h3 className="font-semibold text-lg">
                  {selectedContact?.name || 
                   currentCall?.participants?.find(p => {
                     const id = typeof p.userId === 'string' ? p.userId : p.userId?._id;
                     return String(id) !== String(getCurrentUserId());
                   })?.userId?.name ||
                   'Unknown User'}
                </h3>
                <p className="text-sm text-gray-300">
                  {currentCall ? 'In call' : 
                   connectionState === 'connecting' ? 'Calling...' : 
                   connectionState === 'connected' ? 'Connected' : 'Ready to call'}
                </p>
              </div>
            </div>

            {/* Control buttons */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center space-x-4 bg-black/60 backdrop-blur-sm px-8 py-4 rounded-3xl">
              <button
                onClick={handleToggleMicrophone}
                disabled={isTogglingMicrophone}
                className={`p-4 rounded-2xl transition-all duration-300 hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                  mediaState.microphoneEnabled
                    ? 'bg-gray-700/80 text-white hover:bg-gray-600/80'
                    : 'bg-red-500 text-white hover:bg-red-600'
                }`}
                title={mediaState.microphoneEnabled ? 'Mute microphone' : 'Unmute microphone'}
              >
                {mediaState.microphoneEnabled ? 
                  <Mic className="w-6 h-6" /> : 
                  <MicOff className="w-6 h-6" />
                }
              </button>

              <button
                onClick={handleToggleCamera}
                disabled={isTogglingCamera}
                className={`p-4 rounded-2xl transition-all duration-300 hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                  mediaState.cameraEnabled
                    ? 'bg-gray-700/80 text-white hover:bg-gray-600/80'
                    : 'bg-red-500 text-white hover:bg-red-600'
                }`}
                title={mediaState.cameraEnabled ? 'Turn off camera' : 'Turn on camera'}
              >
                {mediaState.cameraEnabled ? 
                  <Video className="w-6 h-6" /> : 
                  <VideoOff className="w-6 h-6" />
                }
              </button>

              <button
                onClick={handleToggleScreenShare}
                disabled={isTogglingScreenShare}
                className={`p-4 rounded-2xl transition-all duration-300 hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                  mediaState.screenSharing
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-700/80 text-white hover:bg-gray-600/80'
                }`}
                title={mediaState.screenSharing ? 'Stop screen sharing' : 'Start screen sharing'}
              >
                {mediaState.screenSharing ? 
                  <MonitorOff className="w-6 h-6" /> : 
                  <Monitor className="w-6 h-6" />
                }
              </button>

              {currentCall ? (
                <button
                  onClick={handleEndCall}
                  disabled={isEnding}
                  className="p-4 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl transition-all duration-300 hover:scale-105 shadow-lg"
                  title="End call"
                >
                  <PhoneOff className="w-6 h-6" />
                </button>
              ) : (
                <button
                  onClick={handleInitiateCall}
                  disabled={isInitiating || connectionState === 'connecting'}
                  className="p-4 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl transition-all duration-300 hover:scale-105 shadow-lg"
                  title="Start call"
                >
                  <Phone className="w-6 h-6" />
                </button>
              )}

              <button 
                className="p-4 bg-gray-700/80 hover:bg-gray-600/80 text-white rounded-2xl transition-all duration-300 hover:scale-105 shadow-lg"
                title="Settings"
              >
                <Settings className="w-6 h-6" />
              </button>
            </div>

            {/* Back button for mobile */}
            <button
              onClick={() => {
                if (currentCall) {
                  handleEndCall();
                } else {
                  setSelectedContact(null);
                  setShowContactList(true);
                }
              }}
              className="md:hidden absolute top-6 left-6 p-3 bg-black/60 backdrop-blur-sm text-white rounded-xl hover:bg-black/80 transition-all duration-300"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Error handling */}
      {(error || storeError) && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-6 py-4 rounded-2xl shadow-lg z-50 max-w-md">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-semibold mb-1">Error</h4>
              <p className="text-sm opacity-90">{error || storeError}</p>
            </div>
            <button
              onClick={() => {
                setError('');
                clearError();
              }}
              className="ml-4 text-white hover:text-red-200 transition-colors duration-300 text-xl font-bold"
              title="Close error"
            >
              ×
            </button>
          </div>
        </div>
      )}

    {/* Loading states */}
      {(isInitiating || isAccepting || isRejecting || isEnding) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 flex items-center space-x-4 shadow-2xl">
            <div className="w-6 h-6 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <span className="font-medium text-slate-900">
              {isInitiating && 'Starting call...'}
              {isAccepting && 'Accepting call...'}
              {isRejecting && 'Declining call...'}
              {isEnding && 'Ending call...'}
            </span>
          </div>
        </div>
      )}
    </div>
  );

};

export default VideoCallPage;