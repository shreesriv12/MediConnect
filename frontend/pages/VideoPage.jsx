import React, { useState, useEffect, useRef } from "react";
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
  Camera,
} from "lucide-react";
import useVideoStore from "../store/videoStore";
import useDoctorAuthStore from "../store/doctorAuthStore";
import useClientAuthStore from "../store/clientAuthStore";
import { Link } from "react-router-dom";
import io from "socket.io-client";

const VideoCallPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContact, setSelectedContact] = useState(null);
  const [showContactList, setShowContactList] = useState(true);
  const [contacts, setContacts] = useState([]);
  const [userType, setUserType] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [callQuality, setCallQuality] = useState({ video: "high", audio: "high" });
  const [connectionState, setConnectionState] = useState("disconnected");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Video refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const remoteUserIdRef = useRef(null); // ← Track remote user for call lookup

  // WebRTC / socket refs
  const peerConnectionRef = useRef(null);
  const socketRef = useRef(null);
  const remoteDescriptionSetRef = useRef(false);
  const iceCandidateQueueRef = useRef([]);
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
    clearError,
    setCurrentCall,
  } = useVideoStore();

  // Auth stores
  const {
    doctor,
    isAuthenticated: isDoctorAuthenticated,
    getAllDoctors,
    checkAuth: checkDoctorAuth,
  } = useDoctorAuthStore();

  // ── FIX: also read the accessToken directly from the client store ──────────
  const {
    client,
    isAuthenticated: isClientAuthenticated,
    getAllClients,
    checkAuth: checkClientAuth,
    accessToken: clientAccessToken, // ← new field added in clientAuthStore
  } = useClientAuthStore();
  // ──────────────────────────────────────────────────────────────────────────

  // ── Resolve token for socket auth ─────────────────────────────────────────
  // Priority: Zustand store value → localStorage fallback
  const getAuthToken = (resolvedUserType) => {
    if (resolvedUserType === "Doctor") {
      return (
        localStorage.getItem("doctorAccessToken") || null
      );
    }
    // Client – prefer in-memory store value (survives cookie-only sessions)
    return clientAccessToken || localStorage.getItem("clientAccessToken") || null;
  };
  // ──────────────────────────────────────────────────────────────────────────

  // ── Socket initialisation ─────────────────────────────────────────────────
  // FIX 1: Use currentUser?._id (primitive string) as the dependency instead
  //        of the currentUser object reference – prevents infinite re-runs.
  // FIX 2: Guard against missing token / userId before connecting.
  useEffect(() => {
    if (!currentUser?._id || !userType) return; // not ready yet

    const initializeSocket = () => {
      console.log("[Socket] Initializing for", userType, currentUser.name);

      const token = getAuthToken(userType);

      if (!token) {
        console.error(
          "[Socket] No auth token available – socket not started. " +
            "Make sure login/checkAuth has run before reaching this page."
        );
        setError("Authentication token missing. Please log in again.");
        return;
      }

      // Disconnect any existing socket before creating a new one
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      try {
        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
        const socket = io(API_URL, {
          auth: { token, userType, userId: currentUser._id },
          transports: ["websocket", "polling"],
          timeout: 20000,
          forceNew: true,
        });

        socketRef.current = socket;

        socket.on("connect", () => {
          console.log("[Socket] Connected:", socket.id);
          setConnectionState("connected");
        });

        socket.on("authenticated", (data) => {
          console.log("[Socket] Authenticated:", data);
          socket.emit("identify", { userId: currentUser._id, userType });
        });


        socket.on("offer", async (data) => {
          console.log("[Socket] Offer received", { fromUser: data.fromUserName, isIncoming: data.isIncomingCall });
          if (data.isIncomingCall) {
            console.log("[Socket] Incoming call from:", data.fromUserName);
          }
          await handleReceiveOffer(data);
        });

        socket.on("answer", async (data) => {
          console.log("[Socket] Answer received");
          await handleReceiveAnswer(data);
        });

        socket.on("iceCandidate", async (data) => {
          await handleReceiveIceCandidate(data);
        });

        socket.on("callAccepted", () => setConnectionState("connecting"));

        socket.on("callEnded", () => {
          console.log("[Socket] Remote ended call");
          handleCallEnded();
        });

        socket.on("callRejected", () => handleCallRejected());

        socket.on("disconnect", (reason) => {
          console.warn("[Socket] Disconnected:", reason);
          setConnectionState("disconnected");
        });

        socket.on("connect_error", (err) => {
          console.error("[Socket] Connection error:", err.message);
          setConnectionState("error");
        });
      } catch (err) {
        console.error("[Socket] Setup error:", err);
      }
    };

    initializeSocket();

    return () => {
      if (socketRef.current) {
        console.log("[Socket] Cleaning up socket");
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
    // ── FIX: depend on the primitive _id string, not the object ────────────
  }, [currentUser?._id, userType, clientAccessToken]);
  // ──────────────────────────────────────────────────────────────────────────

  // ── Media helpers ──────────────────────────────────────────────────────────
  const initializeMedia = async () => {
    console.log("[Media] Initializing...");

    if (localStreamRef.current?.active) {
      if (
        localVideoRef.current &&
        localVideoRef.current.srcObject !== localStreamRef.current
      ) {
        localVideoRef.current.srcObject = localStreamRef.current;
        await new Promise((resolve) => {
          localVideoRef.current.onloadedmetadata = resolve;
          setTimeout(resolve, 1000);
        });
      }
      return localStreamRef.current;
    }

    // Stop any stale tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Media devices not supported by this browser");
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          frameRate: { ideal: 30, min: 15 },
          facingMode: "user",
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        try {
          await new Promise((resolve, reject) => {
            localVideoRef.current.onloadedmetadata = resolve;
            localVideoRef.current.onerror = reject;
            setTimeout(reject, 5000);
          });
          await localVideoRef.current.play();
        } catch (playErr) {
          console.warn("[Media] Autoplay prevented:", playErr);
        }
      }

      return stream;
    } catch (err) {
      console.error("[Media] Error accessing devices:", err);
      // Fallback
      try {
        const fallback = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 } },
          audio: true,
        });
        localStreamRef.current = fallback;
        if (localVideoRef.current) localVideoRef.current.srcObject = fallback;
        return fallback;
      } catch (fallbackErr) {
        setError("Unable to access camera and microphone.");
        throw fallbackErr;
      }
    }
  };

  // ── Peer connection ────────────────────────────────────────────────────────
  const resetConnectionState = () => {
    remoteDescriptionSetRef.current = false;
    iceCandidateQueueRef.current = [];
    isOfferProcessingRef.current = false;
    isAnswerProcessingRef.current = false;
  };

  const initializePeerConnection = () => {
    console.log("[Peer] Initializing RTCPeerConnection");

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    resetConnectionState();

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
        { urls: "stun:stun4.l.google.com:19302" },
      ],
      iceCandidatePoolSize: 10,
    });

    peerConnectionRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current?.connected) {
        socketRef.current.emit("iceCandidate", {
          candidate: event.candidate,
          targetUserId: selectedContact?._id || getCurrentUserId(),
        });
      }
    };

    pc.ontrack = (event) => {
      console.log("[Peer] Remote track received:", event.track?.kind);
      if (event.streams?.length > 0) {
        const remoteStream = event.streams[0];
        remoteStreamRef.current = remoteStream;

        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.onloadedmetadata = () => {
            console.log("[Peer] Remote video metadata loaded, attempting play");
            remoteVideoRef.current.play().catch((e) =>
              console.warn("[Peer] Remote autoplay prevented:", e)
            );
          };
          remoteVideoRef.current.onplaying = () => {
            console.log("[Peer] Remote video playing - setting connected");
            setConnectionState("connected");
          };
          
          // Set connected immediately upon receiving first track as backup
          console.log("[Peer] First remote track received - setting connected state");
          setConnectionState("connected");
        }
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log("[Peer] Connection state:", state);
      setConnectionState(state);
      if (state === "disconnected" || state === "failed") {
        handleConnectionFailure();
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "failed") {
        console.warn("[Peer] ICE failed – restarting");
        pc.restartIce();
      }
    };

    return pc;
  };

  const addTracksToPC = (pc, stream) => {
    if (!pc || !stream) return;
    const existing = pc.getSenders().filter((s) => s.track).map((s) => s.track.id);
    stream.getTracks().forEach((track) => {
      if (!existing.includes(track.id)) {
        try {
          pc.addTrack(track, stream);
          console.log(`[Peer] Added ${track.kind} track`);
        } catch (e) {
          console.error(`[Peer] Failed to add ${track.kind}:`, e);
        }
      }
    });
  };

  const drainIceCandidateQueue = async () => {
    const pc = peerConnectionRef.current;
    if (!pc || !remoteDescriptionSetRef.current) return;

    // ── FIX: Stop draining if connection already established
    // Candidates arriving after connected are stale and belong to old session
    if (pc.connectionState === 'connected' || pc.connectionState === 'completed') {
      console.log("[ICE] PC already connected, discarding queued candidates");
      iceCandidateQueueRef.current = [];
      return;
    }

    // Wait until the remoteDescription object is actually present
    let retries = 0;
    while (!pc.remoteDescription && retries < 5) {
      await new Promise((r) => setTimeout(r, 100));
      retries++;
    }
    if (!pc.remoteDescription) return;

    const candidates = [...iceCandidateQueueRef.current];
    iceCandidateQueueRef.current = [];
    console.log(`[ICE] Draining ${candidates.length} queued candidates`);

    for (const candidate of candidates) {
      try {
        if (candidate?.candidate || candidate?.sdpMid) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (e) {
        // Only log, don't re-queue — these are stale
        console.warn("[ICE] Skipping stale candidate:", e.message);
      }
    }
  };

  // ── Signal handlers ────────────────────────────────────────────────────────
  const handleReceiveIceCandidate = async (data) => {
    if (!data?.candidate) return;
    const candidateData = data.candidate;

    const pc = peerConnectionRef.current;
    
    // ── Don't add candidates if PC is already connected or closed
    // This prevents "Unknown ufrag" errors from stale sessions
    if (!pc || pc.connectionState === 'connected' || pc.connectionState === 'closed') {
      return;
    }

    if (remoteDescriptionSetRef.current && pc.remoteDescription) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidateData));
      } catch (e) {
        // Don't re-queue — if it fails now it genuinely doesn't belong
        console.warn("[ICE] Candidate rejected (stale session):", e.message);
      }
    } else {
      // Queue for later — remote description not set yet
      iceCandidateQueueRef.current.push(candidateData);
    }
  };

  const handleReceiveOffer = async (data) => {
    if (isOfferProcessingRef.current) {
      console.warn("[Offer] Already processing an offer, ignoring duplicate");
      return;
    }
    isOfferProcessingRef.current = true;

    try {
      remoteUserIdRef.current = data.fromUserId; // ← Track remote user
      console.log("[Offer] Remote user ID:", remoteUserIdRef.current);

      resetConnectionState();

      if (!localStreamRef.current?.active) {
        await initializeMedia();
        await new Promise((r) => setTimeout(r, 500)); // reduced from 2000ms
      }
      if (!localStreamRef.current?.active) throw new Error("No media stream");

      const pc = initializePeerConnection();
      addTracksToPC(pc, localStreamRef.current);

      // Set remote description immediately (removed 500ms delay)
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      remoteDescriptionSetRef.current = true;
      await drainIceCandidateQueue();

      const answer = await pc.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(answer);

      if (socketRef.current?.connected) {
        socketRef.current.emit("call-answer", {
          answer,
          targetUserId: data.fromUserId,
        });
      } else {
        throw new Error("Socket not connected – cannot send answer");
      }

      // ── NEW: Set currentCall on callee side so media toggles work
      try {
        await getActiveCalls();
        const { activeCalls: freshCalls } = useVideoStore.getState();
        if (freshCalls?.length > 0) {
          // Find our call involving the caller
          const myCall = freshCalls.find(c =>
            c.participants?.some(p =>
              p.userId?._id?.toString() === data.fromUserId?.toString()
            )
          );
          if (myCall) {
            setCurrentCall(myCall);
            console.log("[Offer] Set currentCall for callee:", myCall._id);
          }
        }
      } catch (e) {
        console.warn("[Offer] Could not fetch active call:", e?.message || e);
      }

      setConnectionState("connecting");
    } catch (e) {
      console.error("[Offer] Error:", e);
      setError(`Failed to accept call: ${e.message}`);
      peerConnectionRef.current?.close();
      peerConnectionRef.current = null;
      resetConnectionState();
    } finally {
      isOfferProcessingRef.current = false;
    }
  };

  const handleReceiveAnswer = async (data) => {
    if (isAnswerProcessingRef.current) return;
    isAnswerProcessingRef.current = true;

    try {
      const pc = peerConnectionRef.current;
      if (!pc) throw new Error("No peer connection");
      if (!data.answer) throw new Error("No answer data");

      // ── KEY FIX: only accept the answer if PC is in have-local-offer state
      // If it's in 'stable', the offer was never sent (stale answer from old session)
      if (pc.signalingState !== "have-local-offer") {
        console.warn(
          `[Answer] Ignoring answer in wrong state: ${pc.signalingState}`
        );
        return; // don't throw — just discard the stale answer
      }

      await pc.setRemoteDescription(
        new RTCSessionDescription(data.answer)
      );
      remoteDescriptionSetRef.current = true;
      await drainIceCandidateQueue();
    } catch (e) {
      console.error("[Answer] Error:", e);
      setError(`Failed to process answer: ${e.message}`);
      peerConnectionRef.current?.close();
      peerConnectionRef.current = null;
      resetConnectionState();
    } finally {
      isAnswerProcessingRef.current = false;
    }
  };

  const handleCallEnded = () => {
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    remoteStreamRef.current = null;
    resetConnectionState();
    setConnectionState("disconnected");
    setSelectedContact(null);
    setShowContactList(true);
  };

  const handleCallRejected = () => handleCallEnded();
  
  // Note: handleIncomingCall removed — offer handler now does all setup

  const handleConnectionFailure = () => {
    setConnectionState("reconnecting");
    setTimeout(() => {
      if (socketRef.current && !socketRef.current.connected) {
        socketRef.current.connect();
      }
    }, 3000);
  };

  // ── Utilities ──────────────────────────────────────────────────────────────
  const getCurrentUserId = () =>
    userType === "Doctor" ? doctor?._id : client?._id;

  // ── User initialisation ────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const doctorToken = localStorage.getItem("doctorAccessToken");
      const clientToken =
        clientAccessToken || localStorage.getItem("clientAccessToken");

      if (doctorToken && doctor) {
        setUserType("Doctor");
        setCurrentUser(doctor);
        return;
      }
      if (clientToken && client) {
        setUserType("Client");
        setCurrentUser(client);
        return;
      }

      if (doctor) {
        const r = await checkDoctorAuth();
        if (r.success) { setUserType("Doctor"); setCurrentUser(doctor); return; }
      }
      if (client) {
        const r = await checkClientAuth();
        if (r.success) { setUserType("Client"); setCurrentUser(client); return; }
      }
    };

    if (doctor || client) init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctor?._id, client?._id]);

  // ── Fetch data once user type is known ────────────────────────────────────
  useEffect(() => {
    if (!userType) return;
    fetchContacts();
    getActiveCalls();
    getCallHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userType]);

  // ── Media stream lifecycle ────────────────────────────────────────────────
  useEffect(() => {
    if (currentCall || selectedContact) {
      initializeMedia();
    }
    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!currentCall, !!selectedContact]);

  // ── Full cleanup on unmount ───────────────────────────────────────────────
  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      peerConnectionRef.current?.close();
      socketRef.current?.disconnect();
      resetConnectionState();
    };
  }, []);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      if (userType === "Client") {
        const result = await getAllDoctors({ verified: "true" });
        if (result.success) setContacts(result.data);
      } else if (userType === "Doctor") {
        const result = await getAllClients();
        if (result.success) setContacts(result.data);
      }
    } catch (e) {
      console.error("Failed to fetch contacts:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleContactSelect = (contact) => {
    setSelectedContact(contact);
    setShowContactList(false);
  };

  // ── Call initiation ────────────────────────────────────────────────────────
  const handleInitiateCall = async () => {
    if (!selectedContact) return;
    if (!socketRef.current?.connected) {
      setError("Not connected to server. Please wait a moment and try again.");
      return;
    }

    try {
      remoteUserIdRef.current = selectedContact._id; // ← Track remote user
      setConnectionState("connecting");
      resetConnectionState();

      if (!localStreamRef.current?.active) {
        await initializeMedia();
        await new Promise((r) => setTimeout(r, 500));
      }
      if (!localStreamRef.current?.active) throw new Error("No media stream");

      const pc = initializePeerConnection();
      addTracksToPC(pc, localStreamRef.current);
      await new Promise((r) => setTimeout(r, 200));

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);

      // ── Emit the WebRTC offer first (this is what actually matters)
      socketRef.current.emit("call-offer", {
        offer,
        targetUserId: selectedContact._id,
        callType: "video",
        fromUserId: getCurrentUserId(),
      });

      // ── Then record in DB — but don't let a 400 kill the WebRTC flow
      try {
        const participantType = userType === "Client" ? "Doctor" : "Client";
        const result = await initiateCall(
          selectedContact._id,
          participantType,
          "video",
          mediaState.cameraEnabled,
          mediaState.microphoneEnabled
        );
        if (result.success && result.data) {
          console.log("[Call] Call recorded in DB:", result.data._id);
        }
      } catch (apiErr) {
        // 400 "already ongoing call" is OK — the WebRTC offer is already sent
        console.warn("[Call] DB record failed (non-fatal):", apiErr.message);
        // Fetch and set currentCall anyway so media toggles work
        try {
          await getActiveCalls();
          const { activeCalls: freshCalls } = useVideoStore.getState();
          if (freshCalls?.length > 0) {
            const myCall = freshCalls.find(c =>
              c.participants?.some(p =>
                p.userId?._id?.toString() === selectedContact._id?.toString()
              )
            );
            if (myCall) {
              setCurrentCall(myCall);
              console.log("[Call] Set currentCall from active calls (after 400):", myCall._id);
            }
          }
        } catch (fetchErr) {
          console.warn("[Call] Could not fetch active calls:", fetchErr?.message);
        }
      }

    } catch (e) {
      console.error("[Call] Initiation error:", e);
      setError(`Failed to start call: ${e.message}`);
      setConnectionState("disconnected");
      peerConnectionRef.current?.close();
      peerConnectionRef.current = null;
      resetConnectionState();
    }
  };

  const handleAcceptCall = async (callId) => {
    const result = await acceptCall(callId, true, true);
    if (result.success) { setSelectedContact(null); setShowContactList(false); }
  };

  const handleRejectCall = async (callId) => {
    await rejectCall(callId, "User declined");
    socketRef.current?.emit("call-rejected", { callId });
  };

  const handleEndCall = async () => {
    if (!currentCall) return;
    await endCall(currentCall._id);
    socketRef.current?.emit("call-ended", { callId: currentCall._id });
    handleCallEnded();
  };

  // ── Media controls ────────────────────────────────────────────────────────
  // Helper to ensure currentCall is populated
  const ensureCurrentCall = async () => {
    if (currentCall?._id) {
      console.log("[Toggle] Using existing currentCall:", currentCall._id);
      return currentCall;
    }
    
    // If not set, fetch active calls and find the one with selectedContact
    console.log("[Toggle] currentCall is missing, fetching active calls...");
    try {
      const result = await getActiveCalls();
      console.log("[Toggle] Active calls fetched:", result?.data?.length || 0);
      
      if (result?.data?.length > 0) {
        const callWithContact = result.data.find(c =>
          c.participants?.some(p =>
            p.userId?._id?.toString() === selectedContact?._id?.toString() ||
            p.userId?._id?.toString() === remoteUserIdRef.current?.toString()
          )
        );
        if (callWithContact) {
          console.log("[Toggle] Found active call:", callWithContact._id, "Status:", callWithContact.callStatus);
          setCurrentCall(callWithContact);
          return callWithContact;
        }
      }
      console.warn("[Toggle] No matching call found in active calls");
    } catch (e) {
      console.error("[Toggle] Failed to fetch active calls:", e?.message || e);
    }
    
    console.warn("[Toggle] Could not find or fetch currentCall");
    return null;
  };

  const handleToggleCamera = async () => {
    const call = await ensureCurrentCall();
    if (!call?._id) {
      console.warn("[Toggle] No active call found for camera toggle");
      setError("Call not active");
      return;
    }
    try {
      console.log("[Toggle] Toggling camera for call:", call._id, "Current state:", mediaState.cameraEnabled);
      await toggleCamera(call._id, !mediaState.cameraEnabled);
      const vt = localStreamRef.current?.getVideoTracks()[0];
      if (vt) vt.enabled = !mediaState.cameraEnabled;
    } catch (e) {
      console.error("[Toggle] Camera toggle error:", e?.message || e);
      setError(`Failed to toggle camera: ${e?.message || e}`);
    }
  };

  const handleToggleMicrophone = async () => {
    const call = await ensureCurrentCall();
    if (!call?._id) {
      console.warn("[Toggle] No active call found for mic toggle");
      setError("Call not active");
      return;
    }
    try {
      console.log("[Toggle] Toggling microphone for call:", call._id, "Current state:", mediaState.microphoneEnabled);
      await toggleMicrophone(call._id, !mediaState.microphoneEnabled);
      const at = localStreamRef.current?.getAudioTracks()[0];
      if (at) at.enabled = !mediaState.microphoneEnabled;
    } catch (e) {
      console.error("[Toggle] Microphone toggle error:", e?.message || e);
      setError(`Failed to toggle microphone: ${e?.message || e}`);
    }
  };

  const handleToggleScreenShare = async () => {
    const call = await ensureCurrentCall();
    if (!call?._id) {
      console.warn("[Toggle] No active call found for screen share toggle");
      setError("Call not active");
      return;
    }
    try {
      console.log("[Toggle] Toggling screen share for call:", call._id, "Current state:", mediaState.screenSharing);
      if (!mediaState.screenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true, audio: true,
        });
        const sender = peerConnectionRef.current?.getSenders().find(
          (s) => s.track?.kind === "video"
        );
        if (sender) await sender.replaceTrack(screenStream.getVideoTracks()[0]);
        screenStream.getVideoTracks()[0].onended = () => handleToggleScreenShare();
      } else {
        const sender = peerConnectionRef.current?.getSenders().find(
          (s) => s.track?.kind === "video"
        );
        if (sender && localStreamRef.current) {
          await sender.replaceTrack(localStreamRef.current.getVideoTracks()[0]);
        }
      }
      await toggleScreenShare(call._id, !mediaState.screenSharing);
    } catch (e) {
      console.error("[ScreenShare] Error:", e?.message || e);
      setError(`Failed to toggle screen share: ${e?.message || e}`);
    }
  };

  const handleQualityChange = async (type, value) => {
    if (!currentCall) return;
    const q = { ...callQuality, [type]: value };
    setCallQuality(q);
    await updateMediaQuality(currentCall._id, q.video, q.audio);
  };

  // ── Filter helpers ────────────────────────────────────────────────────────
  const filteredContacts = contacts.filter(
    (c) =>
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.specialization?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredActiveCalls = activeCalls.filter((call) => {
    const uid = getCurrentUserId();
    const other = call.participants?.find(
      (p) => p?.userId?._id?.toString() !== uid?.toString()
    );
    return other?.userId?.name?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // ── Loading guard ─────────────────────────────────────────────────────────
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col sm:flex-row h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Sidebar */}
      <div
        className={`${
          showContactList ? "w-full sm:w-80" : "hidden sm:block sm:w-80"
        } bg-white/90 backdrop-blur-xl border-b sm:border-r border-slate-200/60 shadow-2xl overflow-hidden flex flex-col`}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200/60 bg-gradient-to-r from-white/80 to-blue-50/50">
          {currentUser && (
            <div className="flex items-center mb-4 sm:mb-6 p-3 sm:p-5 bg-gradient-to-r from-blue-50/90 to-indigo-50/90 rounded-2xl border border-blue-100/60 shadow-lg">
              <div className="relative">
                <img
                  src={
                    currentUser.avatar ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      currentUser.name || "User"
                    )}&background=3b82f6&color=fff`
                  }
                  alt={currentUser.name}
                  className="w-12 sm:w-16 h-12 sm:h-16 rounded-2xl object-cover ring-3 ring-blue-200/50 shadow-xl"
                  onError={(e) => {
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      currentUser.name || "User"
                    )}&background=3b82f6&color=fff`;
                  }}
                />
                <div
                  className={`absolute -bottom-1 -right-1 w-4 sm:w-5 h-4 sm:h-5 border-3 border-white rounded-full shadow-sm ${
                    connectionState === "connected"
                      ? "bg-green-400"
                      : connectionState === "connecting"
                      ? "bg-yellow-400 animate-pulse"
                      : "bg-gray-400"
                  }`}
                ></div>
              </div>
              <div className="ml-4 flex-1">
                <h2 className="text-lg font-bold text-slate-900">{currentUser.name}</h2>
                <p className="text-sm text-slate-600 mt-1">
                  {currentUser.gender || "Not specified"} • {userType}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {connectionState === "connected"
                    ? "🟢 Connected"
                    : connectionState === "connecting"
                    ? "🟡 Connecting…"
                    : "⚪ Offline"}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent truncate">
              Video Calls
            </h1>
            <button className="p-2 sm:p-3 hover:bg-blue-50/80 rounded-xl transition-all duration-300 flex-shrink-0">
              <Users className="w-4 sm:w-5 h-4 sm:h-5 text-slate-600" />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 sm:w-5 h-4 sm:h-5" />
            <input
              type="text"
              placeholder={`Search ${userType === "Client" ? "doctors" : "patients"}…`}
              className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3.5 bg-white/80 border border-slate-200/60 rounded-2xl focus:outline-none focus:ring-3 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-300 text-sm sm:text-base text-slate-700 placeholder-slate-500 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200/60 bg-white/60 sticky top-0 z-10">
          <button
            onClick={() => setShowHistory(false)}
            className={`flex-1 px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold transition-all duration-300 ${
              !showHistory
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/60"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Available
          </button>
          <button
            onClick={() => setShowHistory(true)}
            className={`flex-1 px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold transition-all duration-300 ${
              showHistory
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/60"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            History
          </button>
        </div>

        {/* Contact / History list */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center p-6 sm:p-8">
              <div className="animate-spin rounded-full h-6 sm:h-8 w-6 sm:w-8 border-2 border-blue-200 border-t-blue-600"></div>
              <span className="ml-2 sm:ml-3 text-sm sm:text-base text-slate-600">Loading…</span>
            </div>
          )}

          {!loading && !showHistory && (
            <>
              {/* Active calls */}
              {filteredActiveCalls?.length > 0 && (
                <div className="border-b border-slate-200/60">
                  <div className="px-6 py-3 bg-green-50/60">
                    <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Active Calls
                    </h3>
                  </div>
                  {filteredActiveCalls.map((call) => {
                    const uid = getCurrentUserId();
                    const other = call.participants?.find(
                      (p) => p?.userId?._id?.toString() !== uid?.toString()
                    );
                    const participant = other?.userId;
                    if (!participant) return null;

                    return (
                      <div
                        key={call._id}
                        className="flex items-center p-4 bg-green-50/80 border-b border-slate-100/60"
                      >
                        <img
                          src={
                            participant.avatar ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              participant.name || "User"
                            )}&background=10b981&color=fff`
                          }
                          alt={participant.name}
                          className="w-14 h-14 rounded-2xl object-cover ring-2 ring-green-200 shadow-lg"
                          onError={(e) => {
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              participant.name || "User"
                            )}&background=10b981&color=fff`;
                          }}
                        />
                        <div className="ml-4 flex-1">
                          <h3 className="text-sm font-semibold text-slate-900">
                            {participant.name}
                          </h3>
                          <p className="text-sm text-green-600 font-medium">
                            {call.callStatus === "ringing" ? "Incoming call…" : "In call"}
                          </p>
                        </div>
                        {call.callStatus === "ringing" && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleAcceptCall(call._id)}
                              disabled={isAccepting}
                              className="p-3 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-xl transition-all hover:scale-105 shadow-lg"
                            >
                              <Phone className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRejectCall(call._id)}
                              disabled={isRejecting}
                              className="p-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-xl transition-all hover:scale-105 shadow-lg"
                            >
                              <PhoneOff className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Available contacts */}
              <div>
                <div className="px-6 py-3 bg-slate-50/60">
                  <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    {userType === "Client" ? "Available Doctors" : "Available Patients"}
                  </h3>
                </div>
                {filteredContacts.length > 0 ? (
                  filteredContacts.map((contact) => (
                    <div
                      key={contact._id}
                      onClick={() => handleContactSelect(contact)}
                      className="flex items-center p-4 hover:bg-blue-50/80 cursor-pointer border-b border-slate-100/60 transition-all group"
                    >
                      <img
                        src={
                          contact.avatar ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            contact.name || "User"
                          )}&background=3b82f6&color=fff`
                        }
                        alt={contact.name}
                        className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white shadow-lg"
                        onError={(e) => {
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            contact.name || "User"
                          )}&background=3b82f6&color=fff`;
                        }}
                      />
                      <div className="ml-4 flex-1">
                        <h3 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {contact.name}
                        </h3>
                        <div className="text-xs text-slate-600 mt-1">
                          {contact.age ? `${contact.age} yrs` : "Age N/A"} •{" "}
                          {contact.gender || "N/A"}
                          {userType === "Client" && contact.specialization
                            ? ` • ${contact.specialization}`
                            : ""}
                        </div>
                        {userType === "Client" && contact.verified && (
                          <span className="inline-block bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full mt-1">
                            ✓ Verified
                          </span>
                        )}
                      </div>
                      <Video className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-500">
                    <Users className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <p className="text-sm">
                      {searchTerm
                        ? `No ${userType === "Client" ? "doctors" : "patients"} matching "${searchTerm}"`
                        : `No ${userType === "Client" ? "doctors" : "patients"} available`}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {!loading && showHistory && (
            <div>
              <div className="px-6 py-3 bg-slate-50/60">
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Recent Calls
                </h3>
              </div>
              {callHistory?.length > 0 ? (
                callHistory.map((call) => {
                  const uid = getCurrentUserId();
                  const other = call.participants?.find(
                    (p) => p?.userId?._id?.toString() !== uid?.toString()
                  );
                  const participant = other?.userId;
                  if (!participant) return null;
                  const callDate = new Date(call.createdAt);

                  return (
                    <div
                      key={call._id}
                      className="flex items-center p-4 hover:bg-slate-50/80 cursor-pointer border-b border-slate-100/60 transition-all"
                    >
                      <img
                        src={
                          participant.avatar ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            participant.name || "User"
                          )}&background=6b7280&color=fff`
                        }
                        alt={participant.name}
                        className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white shadow-lg"
                        onError={(e) => {
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            participant.name || "User"
                          )}&background=6b7280&color=fff`;
                        }}
                      />
                      <div className="ml-4 flex-1">
                        <h3 className="text-sm font-semibold text-slate-900">
                          {participant.name}
                        </h3>
                        <div className="text-xs text-slate-600 mt-1 space-y-0.5">
                          <div className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {callDate.toLocaleDateString()} at{" "}
                            {callDate.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                          <div
                            className={`font-medium ${
                              call.callStatus === "completed"
                                ? "text-green-600"
                                : call.callStatus === "missed"
                                ? "text-red-600"
                                : "text-gray-600"
                            }`}
                          >
                            {call.callStatus === "completed"
                              ? `${call.duration || 0} min`
                              : call.callStatus === "missed"
                              ? "Missed call"
                              : call.callStatus || "Unknown"}
                          </div>
                        </div>
                      </div>
                      {call.callQuality?.rating && (
                        <div className="flex items-center text-yellow-500">
                          <Star className="w-4 h-4 fill-current" />
                          <span className="text-xs ml-1 text-slate-600">
                            {call.callQuality.rating}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-slate-500">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p className="text-sm">No call history</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Main Video Area ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col">
        {!selectedContact && !currentCall ? (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
            <div className="text-center max-w-md p-10 bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl">
                <Video className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Start a Video Call</h2>
              <p className="text-slate-600 mb-8 leading-relaxed">
                {userType === "Client"
                  ? "Select a doctor from the sidebar to start a video consultation."
                  : "Select a patient from the sidebar to start a video call."}
              </p>
              <button
                onClick={() => setShowContactList(true)}
                className="md:hidden bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-8 py-4 rounded-2xl font-semibold hover:shadow-lg transition-all hover:scale-105"
              >
                View Contacts
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 relative bg-black overflow-hidden">
            {/* Remote video - Ensure proper setup */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              muted={false}
              controls={false}
              className="w-full h-full object-cover bg-black"
              onError={(e) => console.error("[Video] Remote video error:", e)}
              onLoadedMetadata={(e) => console.log("[Video] Remote video metadata:", e)}
            />

            {/* Placeholder when no remote stream - Only show if not connected */}
            {connectionState !== "connected" && remoteStreamRef.current === null && (
              <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center z-10">
                <div className="text-center text-white">
                  <div className="w-32 h-32 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Camera className="w-16 h-16 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    {selectedContact?.name || "Unknown"}
                  </h3>
                  <p className="text-gray-300">
                    {connectionState === "connecting"
                      ? "Connecting…"
                      : "Waiting to connect…"}
                  </p>
                </div>
              </div>
            )}

            {/* Local PiP */}
            <div className="absolute top-4 right-4 sm:top-6 sm:right-6 w-32 sm:w-48 h-24 sm:h-36 bg-gray-900 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {!mediaState.cameraEnabled && (
                <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                  <Camera className="w-6 sm:w-8 h-6 sm:h-8 text-gray-400" />
                </div>
              )}
            </div>

            {/* Connection badge */}
            {connectionState !== "connected" && (
              <div className="absolute top-4 left-4 sm:top-6 sm:left-6 bg-black/60 backdrop-blur-sm text-white px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl flex items-center space-x-2 text-xs sm:text-sm">
                <div
                  className={`w-2 h-2 rounded-full ${
                    connectionState === "connecting"
                      ? "bg-yellow-400 animate-pulse"
                      : "bg-red-400"
                  }`}
                ></div>
                <span>
                  {connectionState === "connecting" ? "Connecting…" : connectionState}
                </span>
              </div>
            )}

            {/* Call info bar */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 sm:top-6 bg-black/60 backdrop-blur-sm text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-2xl text-center text-xs sm:text-base">
              <h3 className="font-semibold">{selectedContact?.name || "Unknown"}</h3>
              <p className="text-xs sm:text-sm text-gray-300">
                {currentCall
                  ? "In call"
                  : connectionState === "connecting"
                  ? "Calling…"
                  : "Ready to call"}
              </p>
            </div>

            {/* Controls */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 sm:bottom-8 flex items-center gap-2 sm:gap-4 bg-black/60 backdrop-blur-sm px-3 sm:px-8 py-3 sm:py-4 rounded-2xl sm:rounded-3xl flex-wrap justify-center">
              <button
                onClick={handleToggleMicrophone}
                disabled={isTogglingMicrophone}
                className={`p-2 sm:p-4 rounded-xl sm:rounded-2xl transition-all hover:scale-105 shadow-lg disabled:opacity-50 ${
                  mediaState.microphoneEnabled
                    ? "bg-gray-700/80 text-white hover:bg-gray-600/80"
                    : "bg-red-500 text-white hover:bg-red-600"
                }`}
              >
                {mediaState.microphoneEnabled ? (
                  <Mic className="w-6 h-6" />
                ) : (
                  <MicOff className="w-6 h-6" />
                )}
              </button>

              <button
                onClick={handleToggleCamera}
                disabled={isTogglingCamera}
                className={`p-4 rounded-2xl transition-all hover:scale-105 shadow-lg disabled:opacity-50 ${
                  mediaState.cameraEnabled
                    ? "bg-gray-700/80 text-white hover:bg-gray-600/80"
                    : "bg-red-500 text-white hover:bg-red-600"
                }`}
              >
                {mediaState.cameraEnabled ? (
                  <Video className="w-6 h-6" />
                ) : (
                  <VideoOff className="w-6 h-6" />
                )}
              </button>

              <button
                onClick={handleToggleScreenShare}
                disabled={isTogglingScreenShare}
                className={`p-4 rounded-2xl transition-all hover:scale-105 shadow-lg disabled:opacity-50 ${
                  mediaState.screenSharing
                    ? "bg-blue-500 text-white hover:bg-blue-600"
                    : "bg-gray-700/80 text-white hover:bg-gray-600/80"
                }`}
              >
                {mediaState.screenSharing ? (
                  <MonitorOff className="w-6 h-6" />
                ) : (
                  <Monitor className="w-6 h-6" />
                )}
              </button>

              {currentCall ? (
                <button
                  onClick={handleEndCall}
                  disabled={isEnding}
                  className="p-4 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-2xl transition-all hover:scale-105 shadow-lg"
                >
                  <PhoneOff className="w-6 h-6" />
                </button>
              ) : (
                <button
                  onClick={handleInitiateCall}
                  disabled={isInitiating || connectionState === "connecting"}
                  className="p-4 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-2xl transition-all hover:scale-105 shadow-lg"
                >
                  <Phone className="w-6 h-6" />
                </button>
              )}

              <button className="p-4 bg-gray-700/80 hover:bg-gray-600/80 text-white rounded-2xl transition-all hover:scale-105 shadow-lg">
                <Settings className="w-6 h-6" />
              </button>
            </div>

            {/* Back (mobile) */}
            <button
              onClick={() => {
                if (currentCall) handleEndCall();
                else { setSelectedContact(null); setShowContactList(true); }
              }}
              className="md:hidden absolute top-6 left-6 p-3 bg-black/60 text-white rounded-xl hover:bg-black/80 transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* ── Error toast ───────────────────────────────────────────────────────── */}
      {(error || storeError) && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-6 py-4 rounded-2xl shadow-lg z-50 max-w-md">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-semibold mb-1">Error</h4>
              <p className="text-sm opacity-90">{error || storeError}</p>
            </div>
            <button
              onClick={() => { setError(""); clearError(); }}
              className="ml-4 text-white hover:text-red-200 text-xl font-bold"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* ── Loading overlay ───────────────────────────────────────────────────── */}
      {(isInitiating || isAccepting || isRejecting || isEnding) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 flex items-center space-x-4 shadow-2xl">
            <div className="w-6 h-6 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <span className="font-medium text-slate-900">
              {isInitiating && "Starting call…"}
              {isAccepting && "Accepting call…"}
              {isRejecting && "Declining call…"}
              {isEnding && "Ending call…"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoCallPage;