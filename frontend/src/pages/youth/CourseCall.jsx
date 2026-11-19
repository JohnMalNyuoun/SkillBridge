import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import Navbar from '../../components/common/Navbar';
import Loader from '../../components/common/Loader';
import useAuth from '../../hooks/useAuth';
import { endCallSession, getCallSession } from '../../services/courseCallService';
import { SOCKET_URL } from '../../utils/constants';
import { resolveImageUrl } from '../../utils/imageUrl';

const iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];

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
  const [connected, setConnected] = useState(false);
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

  useEffect(() => {
    let active = true;
    let mediaStream;
    let socket;
    const peerConnections = peersRef.current;
    const pendingCandidates = pendingCandidatesRef.current;

    const removePeer = (peerSocketId) => {
      const peerConnection = peerConnections.get(peerSocketId);
      if (peerConnection) {
        peerConnection.ontrack = null;
        peerConnection.onicecandidate = null;
        peerConnection.close();
        peerConnections.delete(peerSocketId);
      }
      pendingCandidates.delete(peerSocketId);
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
      peerConnections.set(peerSocketId, peerConnection);
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
        const stream = event.streams[0];
        if (stream) setRemoteStreams((current) => ({ ...current, [peerSocketId]: stream }));
      };
      peerConnection.onconnectionstatechange = () => {
        if (['failed', 'closed'].includes(peerConnection.connectionState)) {
          removePeer(peerSocketId);
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
        setError(err.message || 'Unable to establish a call connection.');
      }
    };

    const start = async () => {
      try {
        const response = await getCallSession(callSessionId);
        if (!active) return;
        const nextCallData = response.data;
        if (nextCallData.callSession.status !== 'ongoing') {
          navigate(`/courses/${nextCallData.course._id}/discussion`, { replace: true });
          return;
        }
        setCallData(nextCallData);
        if (!callMode) return;

        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Audio and video calls require a secure browser connection.');
        }
        mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: callMode === 'video'
        });
        if (!active) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }
        localStreamRef.current = mediaStream;
        setLocalStream(mediaStream);

        socket = io(SOCKET_URL, { auth: { token }, withCredentials: true });
        socketRef.current = socket;
        socket.on('connect', () => {
          const localHasVideo = mediaStream.getVideoTracks().some((track) => (
            track.readyState === 'live' && track.enabled
          ));
          socket.emit('course-call:join', { callSessionId, hasVideo: localHasVideo }, (result) => {
            if (result?.error) {
              setError(result.error);
              return;
            }
            setConnected(true);
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
                  setError(err.message || 'Unable to establish a call connection.');
                });
              }
            });
          });
        });
        socket.on('disconnect', () => setConnected(false));
        socket.on('connect_error', (err) => {
          setConnected(false);
          setError(err.message || 'Unable to connect to the call server.');
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
        socket.on('course-call:ended', ({ courseId }) => {
          navigate(getCourseReturnPath(user?.role, courseId), { replace: true });
        });
      } catch (err) {
        if (active) setError(err.response?.data?.message || err.message || 'Unable to open the call.');
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
      peerConnections.forEach((peerConnection) => peerConnection.close());
      peerConnections.clear();
      pendingCandidates.clear();
      mediaStream?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
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
    setConnected(false);
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

  if (loading) return <Loader />;

  if (
    callData?.callSession?.status === 'ongoing' &&
    (!callMode || (!localStream && !connected))
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
      <main className="fh-container" style={{ maxWidth: '1100px' }}>
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
            <p style={{ color: connected ? 'var(--success-text)' : 'var(--text-muted)', fontSize: '0.85rem' }}>
              {callMode === 'audio' ? 'Audio call' : 'Video call'} · {connected ? 'Connected' : 'Connecting'} · {participants.length} participant{participants.length === 1 ? '' : 's'}
            </p>
          </div>
          <button type="button" onClick={leaveCall} disabled={ending}>
            {ending ? 'Ending…' : callData?.canEndCall ? 'End call' : 'Leave call'}
          </button>
        </header>

        {error && (
          <p role="alert" style={{ color: 'var(--danger-text)', padding: '10px 0' }}>
            {error}
          </p>
        )}

        <section style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '12px'
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
