import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import { markAsRead } from '../../services/notificationService';
import {
  declineCallSession,
  getCallSession
} from '../../services/courseCallService';

const playRingtonePulse = (context) => {
  const startAt = context.currentTime;
  [0, 0.22].forEach((offset, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const toneStart = startAt + offset;
    oscillator.type = 'sine';
    oscillator.frequency.value = index === 0 ? 440 : 480;
    gain.gain.setValueAtTime(0.0001, toneStart);
    gain.gain.exponentialRampToValueAtTime(0.12, toneStart + 0.04);
    gain.gain.setValueAtTime(0.12, toneStart + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.0001, toneStart + 0.42);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(toneStart);
    oscillator.stop(toneStart + 0.43);
  });
};

const startRingtoneLoop = (context, intervalRef) => {
  if (intervalRef.current !== null) return;
  const play = () => {
    if (context.state === 'running') playRingtonePulse(context);
  };
  play();
  intervalRef.current = window.setInterval(play, 2100);
};

const CourseCallInvitationToast = () => {
  const navigate = useNavigate();
  const {
    callInvitation,
    clearCallInvitation,
    fetchUnreadCount
  } = useNotifications();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ringtoneNeedsGesture, setRingtoneNeedsGesture] = useState(false);
  const [ringtoneUnavailable, setRingtoneUnavailable] = useState(false);
  const audioContextRef = useRef(null);
  const ringtoneIntervalRef = useRef(null);

  useEffect(() => {
    const primeRingtone = () => {
      window.removeEventListener('pointerdown', primeRingtone);
      window.removeEventListener('keydown', primeRingtone);
      const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextConstructor) return;

      try {
        let context = audioContextRef.current;
        if (!context || context.state === 'closed') {
          context = new AudioContextConstructor();
          audioContextRef.current = context;
        }
        if (context.state !== 'running') {
          void context.resume().catch((err) => {
            console.error('Unable to prepare course call audio.', err);
          });
        }
      } catch (err) {
        console.error('Unable to prepare course call audio.', err);
      }
    };

    window.addEventListener('pointerdown', primeRingtone, { once: true });
    window.addEventListener('keydown', primeRingtone, { once: true });
    return () => {
      window.removeEventListener('pointerdown', primeRingtone);
      window.removeEventListener('keydown', primeRingtone);
    };
  }, []);

  useEffect(() => () => {
    const context = audioContextRef.current;
    audioContextRef.current = null;
    if (context && context.state !== 'closed') {
      void context.close().catch((err) => {
        console.error('Unable to release course call audio.', err);
      });
    }
  }, []);

  const resumeRingtone = useCallback(async () => {
    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextConstructor) {
      setRingtoneUnavailable(true);
      return;
    }

    let context = audioContextRef.current;
    if (!context || context.state === 'closed') {
      context = new AudioContextConstructor();
      audioContextRef.current = context;
    }

    if (context.state !== 'running') setRingtoneNeedsGesture(true);
    try {
      if (context.state !== 'running') await context.resume();
      if (context.state !== 'running') {
        setRingtoneNeedsGesture(true);
        return;
      }
      setRingtoneNeedsGesture(false);
      setRingtoneUnavailable(false);
      startRingtoneLoop(context, ringtoneIntervalRef);
    } catch {
      setRingtoneNeedsGesture(true);
    }
  }, []);

  useEffect(() => {
    if (!callInvitation?.callSessionId) return undefined;

    let active = true;
    void Promise.resolve().then(() => {
      if (active) void resumeRingtone();
    });
    return () => {
      active = false;
      if (ringtoneIntervalRef.current !== null) {
        window.clearInterval(ringtoneIntervalRef.current);
        ringtoneIntervalRef.current = null;
      }
    };
  }, [callInvitation?.callSessionId, resumeRingtone]);

  if (!callInvitation) return null;

  const handleJoin = async () => {
    setBusy(true);
    setError('');
    try {
      const response = await getCallSession(callInvitation.callSessionId);
      if (callInvitation.notificationId) {
        await markAsRead(callInvitation.notificationId);
      }
      clearCallInvitation();
      const { callSession, course } = response.data;
      if (callSession.status === 'ongoing') {
        navigate(`/calls/${callSession._id}`);
      } else {
        navigate(`/courses/${course._id || callInvitation.courseId}/discussion`);
      }
      void fetchUnreadCount();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to open the course call.');
    } finally {
      setBusy(false);
    }
  };

  const handleDecline = async () => {
    setBusy(true);
    setError('');
    try {
      await declineCallSession(callInvitation.callSessionId);
      clearCallInvitation();
      void fetchUnreadCount();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to decline the call.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside
      role="alert"
      aria-label="Incoming course call"
      style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 0px) + 10px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1400,
        width: 'min(440px, calc(100vw - 20px))',
        padding: '16px',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        background: 'var(--bg-card)',
        boxShadow: 'var(--card-shadow)'
      }}
    >
      <strong style={{ color: 'var(--text-primary)' }}>{callInvitation.title || 'Course group call'}</strong>
      <p style={{ margin: '6px 0 12px', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
        {callInvitation.message || 'You have been invited to join a course call.'}
      </p>
      {ringtoneNeedsGesture && (
        <button
          type="button"
          onClick={() => void resumeRingtone()}
          style={{ marginBottom: '10px' }}
        >
          Enable ringtone
        </button>
      )}
      {ringtoneUnavailable && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '10px' }}>
          Ringtone audio is not supported by this browser.
        </p>
      )}
      {error && <p role="alert" style={{ color: 'var(--danger-text)', fontSize: '0.82rem', marginBottom: '10px' }}>{error}</p>}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button type="button" onClick={handleJoin} disabled={busy}>
          Join
        </button>
        <button type="button" onClick={handleDecline} disabled={busy}>
          Decline
        </button>
        <button type="button" onClick={clearCallInvitation} disabled={busy}>
          Dismiss
        </button>
      </div>
    </aside>
  );
};

export default CourseCallInvitationToast;
