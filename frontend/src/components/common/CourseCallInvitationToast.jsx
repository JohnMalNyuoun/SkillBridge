import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import { markAsRead } from '../../services/notificationService';
import {
  acceptCallSession,
  declineCallSession
} from '../../services/courseCallService';
import { isNativeAndroid } from '../../services/nativeAuthSession';
import useAuth from '../../hooks/useAuth';
import { resolveImageUrl } from '../../utils/imageUrl';

const INVITATION_TTL_MS = 60 * 1000;

const CourseCallInvitationToast = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    callInvitation,
    clearCallInvitation,
    fetchUnreadCount,
    nativeCallAction,
    clearNativeCallAction
  } = useNotifications();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notificationPermission, setNotificationPermission] = useState(() => (
    !isNativeAndroid() && typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'unsupported'
  ));
  const notificationRef = useRef(null);
  const handledNativeActionRef = useRef('');
  const [failedPhoto, setFailedPhoto] = useState('');
  const groupName = callInvitation?.groupName || 'Course group';
  const callerName = callInvitation?.caller?.name || 'A group member';
  const callType = callInvitation?.callType === 'audio' ? 'voice' : 'video';
  const callerPhoto = callInvitation?.caller?.photo
    ? resolveImageUrl(callInvitation.caller.photo)
    : '';

  const handleJoin = useCallback(async () => {
    if (!callInvitation?.callSessionId) return;

    setBusy(true);
    setError('');
    try {
      const response = await acceptCallSession(callInvitation.callSessionId);
      clearCallInvitation();
      const { callSession, course } = response.data;
      if (callSession.status === 'ongoing') {
        navigate(`/calls/${callSession._id}`, {
          state: { initialMode: callSession.callType }
        });
      } else {
        navigate(`/courses/${course._id || callInvitation.courseId}/discussion`);
      }
      void fetchUnreadCount();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to open the course call.');
    } finally {
      setBusy(false);
    }
  }, [
    callInvitation,
    clearCallInvitation,
    fetchUnreadCount,
    navigate
  ]);

  const handleDecline = useCallback(async () => {
    if (!callInvitation?.callSessionId) return;

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
  }, [callInvitation, clearCallInvitation, fetchUnreadCount]);

  useEffect(() => {
    if (
      !nativeCallAction?.callSessionId
      || !['answer', 'decline'].includes(nativeCallAction.action)
    ) return;
    const actionId = `${nativeCallAction.action}:${nativeCallAction.callSessionId}`;
    if (handledNativeActionRef.current === actionId) return;
    handledNativeActionRef.current = actionId;

    const handleAction = async () => {
      setError('');
      try {
        if (nativeCallAction.action === 'decline') {
          await declineCallSession(nativeCallAction.callSessionId);
          clearCallInvitation();
          return;
        }

        const response = await acceptCallSession(nativeCallAction.callSessionId);
        const { callSession } = response.data;
        clearCallInvitation();
        navigate(`/calls/${callSession._id}`, {
          state: { initialMode: callSession.callType }
        });
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to respond to the call invitation.');
      } finally {
        clearNativeCallAction();
        void fetchUnreadCount();
      }
    };

    void handleAction();
  }, [
    clearCallInvitation,
    clearNativeCallAction,
    fetchUnreadCount,
    navigate,
    nativeCallAction
  ]);

  useEffect(() => {
    if (!callInvitation?.callSessionId) return undefined;

    let notification = null;
    const expiresAt = Date.parse(callInvitation.expiresAt);
    const expiryTime = Number.isFinite(expiresAt)
      ? expiresAt
      : Date.now() + INVITATION_TTL_MS;
    const remainingMs = Math.max(0, expiryTime - Date.now());
    const vibrate = () => {
      if (isNativeAndroid()) return;
      if (typeof navigator.vibrate === 'function') {
        navigator.vibrate([450, 250, 450]);
      }
    };
    const showBrowserNotification = () => {
      if (
        isNativeAndroid()
        ||
        !document.hidden
        || !('Notification' in window)
        || Notification.permission !== 'granted'
        || notification
      ) return;

      try {
        notification = new Notification(`Incoming ${callType} call`, {
          body: `${callerName} is calling in ${groupName}.`,
          tag: `course-call-${callInvitation.callSessionId}`,
          requireInteraction: true,
          vibrate: [450, 250, 450]
        });
        notificationRef.current = notification;
        notification.onclick = () => {
          window.focus();
          void handleJoin();
        };
        notification.onerror = (event) => {
          console.error('Unable to show the course call notification:', event);
          setError('Browser call notification could not be displayed.');
        };
      } catch (err) {
        console.error('Unable to show the course call notification:', err);
        setError('Browser call notification could not be displayed.');
      }
    };

    vibrate();
    const vibrationInterval = window.setInterval(vibrate, 3200);
    const expiryTimer = window.setTimeout(() => {
      clearCallInvitation();
      if (user?.role === 'youth' && callInvitation.notificationId) {
        void markAsRead(callInvitation.notificationId)
          .then(() => fetchUnreadCount())
          .catch((err) => {
            console.error('Unable to mark the expired call invitation as read:', err);
          });
      }
    }, remainingMs);
    document.addEventListener('visibilitychange', showBrowserNotification);
    showBrowserNotification();

    return () => {
      window.clearInterval(vibrationInterval);
      window.clearTimeout(expiryTimer);
      document.removeEventListener('visibilitychange', showBrowserNotification);
      if (typeof navigator.vibrate === 'function') navigator.vibrate(0);
      if (notification) notification.close();
      if (notificationRef.current === notification) notificationRef.current = null;
    };
  }, [
    callInvitation,
    callType,
    callerName,
    clearCallInvitation,
    fetchUnreadCount,
    groupName,
    handleJoin,
    user?.role
  ]);

  if (!callInvitation) {
    if (!error) return null;
    return (
      <aside
        role="alert"
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
          color: 'var(--text-primary)',
          boxShadow: 'var(--card-shadow)'
        }}
      >
        {error}
        <button type="button" onClick={() => setError('')} style={{ marginLeft: '12px' }}>
          Dismiss
        </button>
      </aside>
    );
  }

  const enableBrowserNotifications = async () => {
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    } catch (err) {
      console.error('Unable to request browser notification permission:', err);
      setError('Browser notifications could not be enabled.');
    }
  };

  return (
    <aside
      role="alert"
      aria-label="Incoming group call"
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
        color: 'var(--text-primary)',
        boxShadow: 'var(--card-shadow)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {callerPhoto && failedPhoto !== callerPhoto ? (
          <img
            src={callerPhoto}
            alt=""
            onError={() => setFailedPhoto(callerPhoto)}
            style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }}
          />
        ) : (
          <div
            aria-hidden="true"
            style={{
              width: '48px',
              height: '48px',
              flex: '0 0 48px',
              display: 'grid',
              placeItems: 'center',
              borderRadius: '50%',
              background: 'var(--bg-section-alt)',
              color: 'var(--text-primary)',
              fontWeight: 700
            }}
          >
            {callerName.trim().charAt(0).toUpperCase() || 'S'}
          </div>
        )}
        <div>
          <strong>{groupName}</strong>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {callerName} is starting a {callType} call
          </p>
        </div>
      </div>
      {!isNativeAndroid() && notificationPermission === 'default' && (
        <button
          type="button"
          onClick={enableBrowserNotifications}
          style={{ marginTop: '12px', background: 'transparent', color: 'var(--text-secondary)' }}
        >
          Enable browser call alerts
        </button>
      )}
      {!isNativeAndroid() && notificationPermission === 'denied' && (
        <p style={{ margin: '10px 0 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          Browser notifications are blocked. You can still answer while SkillBridge is open.
        </p>
      )}
      {error && (
        <p role="alert" style={{ color: 'var(--danger-text)', fontSize: '0.82rem', margin: '10px 0 0' }}>
          {error}
        </p>
      )}
      <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
        <button type="button" onClick={handleJoin} disabled={busy}>
          Accept
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
