import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import { markAsRead } from '../../services/notificationService';
import {
  declineCallSession,
  getCallSession
} from '../../services/courseCallService';

const CourseCallInvitationToast = () => {
  const navigate = useNavigate();
  const {
    callInvitation,
    clearCallInvitation,
    fetchUnreadCount
  } = useNotifications();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

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
      role="status"
      aria-label="Course call invitation"
      style={{
        position: 'fixed',
        right: '16px',
        bottom: '16px',
        zIndex: 1000,
        width: 'min(380px, calc(100vw - 32px))',
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
