import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import Navbar from '../../components/common/Navbar';
import Loader from '../../components/common/Loader';
import CourseGroupDiscussion from '../../components/common/CourseGroupDiscussion';
import useAuth from '../../hooks/useAuth';
import { endCallSession, getCallSession } from '../../services/courseCallService';
import { getCourseCallMediaErrorMessage } from '../../utils/courseCallMediaErrors';
import { SOCKET_URL } from '../../utils/constants';
import { resolveImageUrl } from '../../utils/imageUrl';

const iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
const CALL_STATUS_LABELS = {
  'connecting-signaling': 'Connecting to call signaling',
  'joined-room': 'Joined call room',
  'establishing-webrtc': 'Establishing WebRTC connection',
  connected: 'Connected with media',
  failed: 'Connection failed',
  ended: 'Call ended'
};

const getCourseReturnPath = (role, courseId) => {
  if (role === 'youth') {
    return courseId ? `/courses/${courseId}/discussion` : '/applications';
  }
  return courseId ? `/org/group-chats/${courseId}` : '/org/group-chats';
};

const getInitials = (name) => (
  (name || 'Participant')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
);

const ParticipantAvatar = ({ name, photo }) => {
  const [failedPhoto, setFailedPhoto] = useState('');
  const imageUrl = photo ? resolveImageUrl(photo) : '';
  if (imageUrl && failedPhoto !== imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        onError={() => setFailedPhoto(imageUrl)}
        style={{
          width: '104px',
          height: '104px',
          borderRadius: '50%',
          objectFit: 'cover',
          border: '3px solid rgba(255,255,255,0.8)'
        }}
      />
    );
  }

  return (
    <div aria-hidden="true" style={{
      width: '104px',
      height: '104px',
      display: 'grid',
      placeItems: 'center',
      borderRadius: '50%',
      background: '#315b4a',
      color: '#fff',
      fontSize: '1.8rem',
      fontWeight: 800
    }}>
      {getInitials(name)}
    </div>
  );
};

const RemoteVideo = ({ stream, name, photo, hasVideo }) => {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const [hasLiveVideo, setHasLiveVideo] = useState(false);

  useEffect(() => {
    const videoTracks = stream.getVideoTracks();
    const updateVideoState = () => {
      setHasLiveVideo(videoTracks.some((track) => track.readyState === 'live'));
    };
    videoTracks.forEach((track) => {
      track.addEventListener('mute', updateVideoState);
      track.addEventListener('unmute', updateVideoState);
      track.addEventListener('ended', updateVideoState);
    });
    updateVideoState();
    if (videoRef.current) videoRef.current.srcObject = stream;
    if (audioRef.current) audioRef.current.srcObject = stream;

    return () => {
      videoTracks.forEach((track) => {
        track.removeEventListener('mute', updateVideoState);
        track.removeEventListener('unmute', updateVideoState);
        track.removeEventListener('ended', updateVideoState);
      });
    };
  }, [stream]);

  const showVideo = hasLiveVideo && hasVideo !== false;

  return (
    <div style={{
      position: 'relative',
      minHeight: '220px',
      aspectRatio: '16 / 9',
      background: '#111827',
      borderRadius: '12px',
      overflow: 'hidden'
    }}>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{
          display: showVideo ? 'block' : 'none',
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover'
        }}
      />
      <audio ref={audioRef} autoPlay style={{ display: 'none' }} />
      {!showVideo && (
        <div style={{
          display: 'grid',
          placeItems: 'center',
          position: 'absolute',
          inset: 0
        }}>
          <ParticipantAvatar name={name} photo={photo} />
        </div>
      )}
      <span style={{
        position: 'absolute',
        left: '12px',
        bottom: '10px',
        color: '#fff',
        background: 'rgba(0,0,0,0.55)',
        borderRadius: '6px',
        padding: '4px 8px',
        fontSize: '0.82rem'
      }}>
        {name || 'Participant'}
      </span>
    </div>
  );
};

const CourseCall = () => {
  const { id: callSessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { token, user } = useAuth();
  const [callData, setCallData] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [participants, setParticipants] = useState([]);
  const [signalingConnected, setSignalingConnected] = useState(false);
  const [joinedCallRoom, setJoinedCallRoom] = useState(false);
  const [connectionFailure, setConnectionFailure] = useState(false);
  const [peerStatuses, setPeerStatuses] = useState({});
  const [callEnded, setCallEnded] = useState(false);
  const [callSocket, setCallSocket] = useState(null);
  const [activePanel, setActivePanel] = useState('call');
  const [unreadChatMessages, setUnreadChatMessages] = useState(0);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [callMode, setCallMode] = useState(() => (
    ['audio', 'video'].includes(location.state?.initialMode)
      ? location.state.initialMode
      : null
  ));
  const [joinAttempt, setJoinAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState('');
  const socketRef = useRef(null);
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peersRef = useRef(new Map());
  const pendingCandidatesRef = useRef(new Map());
  const peerStatusValues = Object.values(peerStatuses);
  const hasConnectedMedia = peerStatusValues.some((peer) => (
    peer.connectionState === 'connected'
    && !['disconnected', 'failed'].includes(peer.iceConnectionState)
    && peer.hasRemoteMedia
  ));
  const hasPendingPeer = peerStatusValues.some((peer) => (
    !['failed', 'closed'].includes(peer.connectionState)
    && peer.iceConnectionState !== 'failed'
  ));
  const connectionStatus = callEnded
    ? 'ended'
    : hasConnectedMedia
      ? 'connected'
      : connectionFailure || (peerStatusValues.some((peer) => (
        peer.connectionState === 'failed' || peer.iceConnectionState === 'failed'
      )) && !hasPendingPeer)
        ? 'failed'
        : !signalingConnected || !joinedCallRoom
          ? 'connecting-signaling'
          : peerStatusValues.length > 0
            ? 'establishing-webrtc'
            : 'joined-room';

  useEffect(() => {
    let active = true;
    let mediaStream;
    let socket;
    const peerConnections = peersRef.current;
    const pendingCandidates = pendingCandidatesRef.current;
    const remoteTrackListeners = new Map();

    const clearRemoteTrackListeners = (peerSocketId) => {
      const trackListeners = remoteTrackListeners.get(peerSocketId);
      trackListeners?.forEach((listener, track) => {
        track.removeEventListener('ended', listener);
      });
      remoteTrackListeners.delete(peerSocketId);
    };

    const cleanupCallResources = () => {
      if (socketRef.current === socket) {
        socketRef.current = null;
        socket?.disconnect();
        setCallSocket(null);
      }
      Array.from(remoteTrackListeners.keys()).forEach(clearRemoteTrackListeners);
      peerConnections.forEach((peerConnection) => {
        peerConnection.ontrack = null;
        peerConnection.onicecandidate = null;
        peerConnection.onconnectionstatechange = null;
        peerConnection.oniceconnectionstatechange = null;
        peerConnection.close();
      });
      peerConnections.clear();
      pendingCandidates.clear();
      mediaStream?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
      setRemoteStreams({});
      setParticipants([]);
      setPeerStatuses({});
    };

    const removePeer = (peerSocketId, preserveStatus = false) => {
      const peerConnection = peerConnections.get(peerSocketId);
      if (peerConnection) {
        peerConnection.ontrack = null;
        peerConnection.onicecandidate = null;
        peerConnection.onconnectionstatechange = null;
        peerConnection.oniceconnectionstatechange = null;
        peerConnection.close();
        peerConnections.delete(peerSocketId);
      }
      pendingCandidates.delete(peerSocketId);
      clearRemoteTrackListeners(peerSocketId);
      if (!preserveStatus) {
        setPeerStatuses((current) => {
          const next = { ...current };
          delete next[peerSocketId];
          return next;
        });
      }
      setRemoteStreams((current) => {
        const next = { ...current };
        delete next[peerSocketId];
        return next;
      });
      setParticipants((current) => current.filter((participant) => participant.socketId !== peerSocketId));
    };

    const sendSignal = (to, signal) => {
      socketRef.current?.emit('course-call:signal', {
        callSessionId,
        to,
        signal
      }, (result) => {
        if (result?.error) setError(result.error);
      });
    };

    const createPeerConnection = async (peerSocketId, createOffer) => {
      const existing = peerConnections.get(peerSocketId);
      if (existing) return existing;

      const peerConnection = new RTCPeerConnection({ iceServers });
      let hasRemoteMedia = false;
      const updatePeerStatus = () => {
        setPeerStatuses((current) => ({
          ...current,
          [peerSocketId]: {
            connectionState: peerConnection.connectionState,
            iceConnectionState: peerConnection.iceConnectionState,
            hasRemoteMedia
          }
        }));
      };
      peerConnections.set(peerSocketId, peerConnection);
      setConnectionFailure(false);
      updatePeerStatus();
      localStreamRef.current?.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStreamRef.current);
      });
      if (!localStreamRef.current?.getVideoTracks().some((track) => track.readyState === 'live')) {
        peerConnection.addTransceiver('video', { direction: 'recvonly' });
      }
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) sendSignal(peerSocketId, { candidate: event.candidate });
      };
      peerConnection.ontrack = (event) => {
        const stream = event.streams[0] || new MediaStream([event.track]);
        hasRemoteMedia = stream.getTracks().some((track) => track.readyState === 'live');
        setRemoteStreams((current) => ({ ...current, [peerSocketId]: stream }));
        updatePeerStatus();
        const handleTrackEnded = () => {
          hasRemoteMedia = stream.getTracks().some((track) => track.readyState === 'live');
          updatePeerStatus();
        };
        event.track.addEventListener('ended', handleTrackEnded, { once: true });
        const trackListeners = remoteTrackListeners.get(peerSocketId) || new Map();
        trackListeners.set(event.track, handleTrackEnded);
        remoteTrackListeners.set(peerSocketId, trackListeners);
      };
      peerConnection.onconnectionstatechange = () => {
        updatePeerStatus();
        if (
          peerConnection.connectionState === 'failed'
          || peerConnection.iceConnectionState === 'failed'
        ) {
          removePeer(peerSocketId, true);
        } else if (peerConnection.connectionState === 'closed') {
          removePeer(peerSocketId);
        }
      };
      peerConnection.oniceconnectionstatechange = () => {
        updatePeerStatus();
        if (peerConnection.iceConnectionState === 'failed') {
          removePeer(peerSocketId, true);
        }
      };

      if (createOffer) {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        sendSignal(peerSocketId, { description: peerConnection.localDescription });
      }
      return peerConnection;
    };

    const flushCandidates = async (peerSocketId, peerConnection) => {
      const candidates = pendingCandidates.get(peerSocketId) || [];
      pendingCandidates.delete(peerSocketId);
      for (const candidate of candidates) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    };

    const handleSignal = async ({ from, signal }) => {
      try {
        let peerConnection = peerConnections.get(from);
        if (signal.description?.type === 'offer') {
          peerConnection = await createPeerConnection(from, false);
          await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.description));
          await flushCandidates(from, peerConnection);
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          sendSignal(from, { description: peerConnection.localDescription });
          return;
        }

        if (!peerConnection && signal.candidate) {
          const candidates = pendingCandidates.get(from) || [];
          candidates.push(signal.candidate);
          pendingCandidates.set(from, candidates);
          return;
        }
        if (!peerConnection) return;
        if (signal.description?.type === 'answer') {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.description));
          await flushCandidates(from, peerConnection);
        } else if (signal.candidate) {
          if (peerConnection.remoteDescription) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } else {
            const candidates = pendingCandidates.get(from) || [];
            candidates.push(signal.candidate);
            pendingCandidates.set(from, candidates);
          }
        }
      } catch (err) {
        setConnectionFailure(true);
        if (from) removePeer(from, true);
        setError(err.message || 'Unable to establish a call connection.');
      }
    };

    const start = async () => {
      try {
        const response = await getCallSession(callSessionId);
        if (!active) return;
        const nextCallData = response.data;
        if (nextCallData.callSession.status !== 'ongoing') {
          setCallData(nextCallData);
          setCallEnded(true);
          return;
        }
        setCallData(nextCallData);
        if (!callMode) return;

        const mediaConstraints = {
          audio: true,
          video: callMode === 'video'
        };
        try {
          if (!navigator.mediaDevices?.getUserMedia) {
            const mediaApiError = new Error('Media capture requires a secure browser connection.');
            mediaApiError.name = 'SecurityError';
            throw mediaApiError;
          }
          mediaStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
        } catch (err) {
          console.error('Course call media capture failed', {
            name: err?.name || 'UnknownError',
            message: err?.message || 'No browser error message was provided.',
            constraint: err?.constraint || null,
            callMode,
            requestedConstraints: mediaConstraints
          });
          if (!active) return;

          cleanupCallResources();
          setConnectionFailure(true);
          const mediaErrorMessage = getCourseCallMediaErrorMessage(err?.name, callMode);
          setError(mediaErrorMessage);

          if (nextCallData.canEndCall) {
            try {
              await endCallSession(callSessionId);
              if (!active) return;
              setCallData({
                ...nextCallData,
                callSession: { ...nextCallData.callSession, status: 'ended' }
              });
              setCallEnded(true);
              setConnectionFailure(false);
            } catch (cancelError) {
              console.error('Unable to cancel course call after media capture failed', cancelError);
              if (active) {
                setError(`${mediaErrorMessage} The call could not be canceled; please end it manually.`);
              }
            }
          }
          return;
        }
        if (!active) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }
        localStreamRef.current = mediaStream;
        setLocalStream(mediaStream);
        setSignalingConnected(false);
        setJoinedCallRoom(false);
        setConnectionFailure(false);
        setPeerStatuses({});

        socket = io(SOCKET_URL, { auth: { token }, withCredentials: true });
        socketRef.current = socket;
        setCallSocket(socket);
        socket.on('connect', () => {
          setSignalingConnected(true);
          setConnectionFailure(false);
          const localHasVideo = mediaStream.getVideoTracks().some((track) => (
            track.readyState === 'live' && track.enabled
          ));
          socket.emit('course-call:join', { callSessionId, hasVideo: localHasVideo }, (result) => {
            if (result?.error) {
              setConnectionFailure(true);
              setError(result.error);
              return;
            }
            setJoinedCallRoom(true);
            setError('');
            setParticipants([
              {
                socketId: socket.id,
                fullName: user?.fullName || 'You',
                photo: user?.photo,
                hasVideo: localHasVideo,
                local: true
              },
              ...(result.participants || [])
            ]);
            (result.participants || []).forEach((participant) => {
              if (socket.id.localeCompare(participant.socketId) < 0) {
                void createPeerConnection(participant.socketId, true).catch((err) => {
                  setConnectionFailure(true);
                  removePeer(participant.socketId, true);
                  setError(err.message || 'Unable to establish a call connection.');
                });
              }
            });
          });
        });
        socket.on('disconnect', (reason) => {
          setSignalingConnected(false);
          setJoinedCallRoom(false);
          if (reason === 'io server disconnect') setConnectionFailure(true);
        });
        socket.on('connect_error', () => {
          if (!socket.active) {
            setConnectionFailure(true);
            setError('Unable to connect to call signaling. Check your connection and try again.');
          }
        });
        socket.on('course-call:participant-joined', async (participant) => {
          setParticipants((current) => (
            current.some((item) => item.socketId === participant.socketId)
              ? current
              : [...current, participant]
          ));
          if (socket.id.localeCompare(participant.socketId) < 0) {
            try {
              await createPeerConnection(participant.socketId, true);
            } catch (err) {
              setConnectionFailure(true);
              removePeer(participant.socketId, true);
              setError(err.message || 'Unable to invite a participant into the call.');
            }
          }
        });
        socket.on('course-call:participant-media-state', ({ socketId, hasVideo }) => {
          setParticipants((current) => current.map((participant) => (
            participant.socketId === socketId
              ? { ...participant, hasVideo }
              : participant
          )));
        });
        socket.on('course-call:participant-left', ({ socketId }) => removePeer(socketId));
        socket.on('course-call:signal', handleSignal);
        socket.on('course-call:ended', () => {
          setCallEnded(true);
          setConnectionFailure(false);
          setJoinedCallRoom(false);
          setCallData((current) => (
            current
              ? { ...current, callSession: { ...current.callSession, status: 'ended' } }
              : current
          ));
          cleanupCallResources();
        });
      } catch (err) {
        if (active) {
          setConnectionFailure(true);
          setError(err.response?.data?.message || err.message || 'Unable to open the call.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void start();

    return () => {
      active = false;
      if (socketRef.current) {
        socketRef.current.emit('course-call:leave', { callSessionId });
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      peerConnections.forEach((peerConnection) => {
        peerConnection.ontrack = null;
        peerConnection.onicecandidate = null;
        peerConnection.onconnectionstatechange = null;
        peerConnection.oniceconnectionstatechange = null;
        peerConnection.close();
      });
      Array.from(remoteTrackListeners.keys()).forEach(clearRemoteTrackListeners);
      peerConnections.clear();
      pendingCandidates.clear();
      mediaStream?.getTracks().forEach((track) => track.stop());
      if (localStreamRef.current === mediaStream) localStreamRef.current = null;
    };
  }, [callMode, callSessionId, joinAttempt, navigate, token, user?.fullName, user?.photo, user?.role]);

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream || null;
    }
  }, [cameraOff, callMode, localStream]);

  const joinWithMode = (mode) => {
    setError('');
    setLoading(true);
    setSignalingConnected(false);
    setJoinedCallRoom(false);
    setConnectionFailure(false);
    setPeerStatuses({});
    setCallEnded(false);
    setLocalStream(null);
    setRemoteStreams({});
    setParticipants([]);
    setMuted(false);
    setCameraOff(mode === 'audio');
    setCallMode(mode);
    setJoinAttempt((current) => current + 1);
  };

  const leaveCall = async () => {
    if (callData?.canEndCall) {
      setEnding(true);
      try {
        await endCallSession(callSessionId);
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to end the call.');
        setEnding(false);
        return;
      }
      setEnding(false);
      navigate(getCourseReturnPath(user?.role, callData?.course?._id));
      return;
    }

    const socket = socketRef.current;
    if (!socket?.connected) {
      navigate(getCourseReturnPath(user?.role, callData?.course?._id));
      return;
    }

    setEnding(true);
    socket.emit('course-call:leave', { callSessionId }, (result) => {
      if (result?.error) {
        setError(result.error);
        setEnding(false);
        return;
      }
      navigate(getCourseReturnPath(user?.role, callData?.course?._id));
    });
  };

  const toggleMicrophone = () => {
    const nextMuted = !muted;
    localStream?.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setMuted(nextMuted);
  };

  const toggleCamera = () => {
    const nextCameraOff = !cameraOff;
    localStream?.getVideoTracks().forEach((track) => {
      track.enabled = !nextCameraOff;
    });
    setCameraOff(nextCameraOff);
    const hasVideo = !nextCameraOff;
    setParticipants((current) => current.map((participant) => (
      participant.local ? { ...participant, hasVideo } : participant
    )));
    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit('course-call:media-state', {
        callSessionId,
        hasVideo
      }, (result) => {
        if (result?.error) setError(result.error);
      });
    }
  };

  const showChat = () => {
    setActivePanel('chat');
    setUnreadChatMessages(0);
  };

  if (loading) return <Loader />;

  if (connectionStatus === 'ended' && callData) {
    return (
      <div className="fh-page">
        <Navbar />
        <main className="fh-container" style={{ maxWidth: '640px', paddingTop: '36px' }}>
          <h1 style={{ color: 'var(--text-primary)', fontSize: '1.35rem', fontWeight: 800 }}>
            {callData.course?.title || 'Course group call'}
          </h1>
          <p role="status" style={{ color: 'var(--text-secondary)', margin: '12px 0 20px' }}>
            {CALL_STATUS_LABELS.ended}
          </p>
          {error && (
            <p role="alert" style={{ color: 'var(--danger-text)', padding: '10px 0' }}>
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={() => navigate(getCourseReturnPath(user?.role, callData.course?._id))}
          >
            Return to course
          </button>
        </main>
      </div>
    );
  }

  if (
    callData?.callSession?.status === 'ongoing' &&
    (!callMode || !localStream)
  ) {
    return (
      <div className="fh-page">
        <Navbar />
        <main className="fh-container" style={{ maxWidth: '640px', paddingTop: '36px' }}>
          <h1 style={{ color: 'var(--text-primary)', fontSize: '1.35rem', fontWeight: 800 }}>
            {callData.course?.title || 'Course group call'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: '12px 0 20px' }}>
            This call started as a {callData.callSession.callType || 'video'} call. Choose how you want to join; you can switch between audio and video during the call.
          </p>
          <p role="status" aria-live="polite" style={{ color: 'var(--text-muted)', margin: '0 0 12px' }}>
            {callMode
              ? CALL_STATUS_LABELS[connectionStatus]
              : 'Choose audio or video to begin connecting.'}
          </p>
          {error && (
            <p role="alert" style={{ color: 'var(--danger-text)', padding: '10px 0' }}>
              {error}
            </p>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            <button type="button" onClick={() => joinWithMode('audio')}>
              Join with audio
            </button>
            <button type="button" onClick={() => joinWithMode('video')}>
              Join with video
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="fh-page">
      <Navbar />
      <main className={`fh-container fh-call-layout${activePanel === 'chat' ? ' fh-call-chat-active' : ''}`} style={{ maxWidth: '1320px' }}>
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          padding: '18px 0'
        }}>
          <div>
            <h1 style={{ color: 'var(--text-primary)', fontSize: '1.35rem', fontWeight: 800 }}>
              {callData?.course?.title || 'Course group call'}
            </h1>
            <p
              role="status"
              aria-live="polite"
              style={{
                color: connectionStatus === 'connected'
                  ? 'var(--success-text)'
                  : connectionStatus === 'failed'
                    ? 'var(--danger-text)'
                    : 'var(--text-muted)',
                fontSize: '0.85rem'
              }}
            >
              {callMode === 'audio' ? 'Audio call' : 'Video call'} · {CALL_STATUS_LABELS[connectionStatus]} · {participants.length} participant{participants.length === 1 ? '' : 's'}
            </p>
          </div>
          <button type="button" onClick={leaveCall} disabled={ending}>
            {ending ? 'Ending…' : callData?.canEndCall ? 'End call' : 'Leave call'}
          </button>
        </header>

        <nav className="fh-call-panel-switch" aria-label="Call and chat">
          <button
            type="button"
            className={activePanel === 'call' ? 'active' : ''}
            aria-pressed={activePanel === 'call'}
            onClick={() => setActivePanel('call')}
          >
            Call
          </button>
          <button
            type="button"
            className={activePanel === 'chat' ? 'active' : ''}
            aria-pressed={activePanel === 'chat'}
            onClick={showChat}
          >
            Chat{unreadChatMessages > 0 ? ` (${unreadChatMessages})` : ''}
          </button>
        </nav>

        {error && (
          <p role="alert" style={{ color: 'var(--danger-text)', padding: '10px 0' }}>
            {error}
          </p>
        )}

        <div className="fh-call-workspace">
          <section className="fh-call-stage" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '12px',
            alignContent: 'start'
          }}>
            <div style={{
              position: 'relative',
              minHeight: '220px',
              aspectRatio: '16 / 9',
              background: '#111827',
              borderRadius: '12px',
              overflow: 'hidden'
            }}>
              {callMode === 'video' && !cameraOff ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <div style={{
                  display: 'grid',
                  placeItems: 'center',
                  position: 'absolute',
                  inset: 0
                }}>
                  <ParticipantAvatar
                    name={user?.fullName || 'You'}
                    photo={user?.photo}
                  />
                </div>
              )}
              <span style={{
                position: 'absolute',
                left: '12px',
                bottom: '10px',
                color: '#fff',
                background: 'rgba(0,0,0,0.55)',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '0.82rem'
              }}>
                You
              </span>
            </div>
            {Object.entries(remoteStreams).map(([socketId, stream]) => {
              const participant = participants.find((item) => item.socketId === socketId);
              return (
                <RemoteVideo
                  key={socketId}
                  stream={stream}
                  name={participant?.fullName}
                  photo={participant?.photo}
                  hasVideo={participant?.hasVideo}
                />
              );
            })}
          </section>
          {callData?.course?._id && (
            <aside className="fh-call-chat" aria-label="Call conversation">
              <CourseGroupDiscussion
                courseId={callData.course._id}
                sharedSocket={callSocket}
                isChatVisible={activePanel === 'chat'}
                onIncomingMessage={() => setUnreadChatMessages((count) => count + 1)}
              />
            </aside>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', padding: '20px 0' }}>
          <button type="button" onClick={toggleMicrophone} disabled={!localStream}>
            {muted ? 'Unmute microphone' : 'Mute microphone'}
          </button>
          {callMode === 'video' && (
            <button type="button" onClick={toggleCamera} disabled={!localStream}>
              {cameraOff ? 'Turn camera on' : 'Turn camera off'}
            </button>
          )}
          <button
            type="button"
            onClick={() => joinWithMode(callMode === 'audio' ? 'video' : 'audio')}
            disabled={!localStream}
          >
            Switch to {callMode === 'audio' ? 'video' : 'audio'}
          </button>
        </div>
      </main>
    </div>
  );
};

export default CourseCall;
