import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import { markAsRead } from '../../services/notificationService';

const GroupChatMessageToast = () => {
  const navigate = useNavigate();
  const {
    groupChatMessageAlert,
    clearGroupChatMessageAlert,
    fetchUnreadCount
  } = useNotifications();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!groupChatMessageAlert) return undefined;
    const timeoutId = window.setTimeout(clearGroupChatMessageAlert, 8000);
    return () => window.clearTimeout(timeoutId);
  }, [groupChatMessageAlert?.notificationId]);

  if (!groupChatMessageAlert) return null;

  const openChat = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (groupChatMessageAlert.notificationId) {
        await markAsRead(groupChatMessageAlert.notificationId);
      }
    } catch (err) {
      console.error('Unable to mark the group chat notification as read:', err);
    } finally {
      clearGroupChatMessageAlert();
      void fetchUnreadCount();
      setBusy(false);
      navigate(`/group-chats/${groupChatMessageAlert.courseId}`);
    }
  };

  return (
    <aside
      role="status"
      aria-label="New group chat message"
      style={{
        position: 'fixed',
        right: '16px',
        bottom: '170px',
        zIndex: 1000,
        width: 'min(380px, calc(100vw - 32px))',
        padding: '16px',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        background: 'var(--bg-card)',
        boxShadow: 'var(--card-shadow)'
      }}
    >
      <strong style={{ color: 'var(--text-primary)' }}>
        {groupChatMessageAlert.courseName || 'Course group chat'}
      </strong>
      <p style={{ margin: '6px 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
        {groupChatMessageAlert.senderName || 'A member'} sent a message
      </p>
      {groupChatMessageAlert.preview && (
        <p style={{
          margin: '0 0 12px',
          color: 'var(--text-muted)',
          fontSize: '0.82rem',
          overflowWrap: 'anywhere'
        }}>
          {groupChatMessageAlert.preview}
        </p>
      )}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button type="button" onClick={openChat} disabled={busy}>
          Open chat
        </button>
        <button type="button" onClick={clearGroupChatMessageAlert} disabled={busy}>
          Dismiss
        </button>
      </div>
    </aside>
  );
};

export default GroupChatMessageToast;
