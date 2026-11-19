import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import useAuth from '../../hooks/useAuth';
import {
  createCourseGroupChat,
  downloadGroupChatAttachment,
  getChatMemberProfile,
  getCourseGroupChat,
  uploadGroupChatAttachment,
  updateGroupChatMembers,
  updateGroupChatModerators
} from '../../services/courseService';
import { SOCKET_URL } from '../../utils/constants';
import {
  getActiveCourseCall,
  getCallSession,
  startCourseCall
} from '../../services/courseCallService';
import { resolveImageUrl } from '../../utils/imageUrl';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '👏'];
const ATTACHMENT_ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf,text/plain,text/csv,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const VideoCallIcon = () => (
  <svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="6" width="12" height="12" rx="2" />
    <path d="m15 10 6-3v10l-6-3z" />
  </svg>
);

const SettingsIcon = () => (
  <svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a7.8 7.8 0 0 1-1.6.9l-.3 1.8h-2.8l-.3-1.8a7.8 7.8 0 0 1-1.6-.9l-1.7.7-1.4-2.4 1.4-1.1a7.2 7.2 0 0 1 0-1.9l-1.4-1.1 1.4-2.4 1.7.7a7.8 7.8 0 0 1 1.6-.9l.3-1.8h2.8l.3 1.8a7.8 7.8 0 0 1 1.6.9l1.7-.7 1.4 2.4-1.4 1.1a7.2 7.2 0 0 1 0 1.9z" />
  </svg>
);

const CourseGroupDiscussion = ({ courseId, isOrgAdmin = false, canStartCall = false }) => {
  const { token, user } = useAuth();
  const [chatData, setChatData] = useState(null);
  const [chatMissing, setChatMissing] = useState(false);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [startingCall, setStartingCall] = useState(false);
  const [activeCall, setActiveCall] = useState(null);
  const [joiningCallId, setJoiningCallId] = useState('');
  const [callStatusError, setCallStatusError] = useState('');
  const [sending, setSending] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [connected, setConnected] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [memberId, setMemberId] = useState('');
  const [moderatorId, setModeratorId] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const typingTimersRef = useRef(new Map());
  const callStatusRevisionRef = useRef(0);
  const navigate = useNavigate();
  const currentUserId = String(user?.id || user?._id || '');

  useEffect(() => {
    let active = true;
    getCourseGroupChat(courseId)
      .then((response) => {
        if (!active) return;
        setChatData(response.data);
        setChatMissing(false);
        setMessages(response.data.messages || []);
        setError('');
      })
      .catch((err) => {
        if (!active) return;
        if (err.response?.status === 404) {
          setChatData(null);
          setChatMissing(true);
          setMessages([]);
          setError('');
        } else {
          setChatMissing(false);
          setError(err.response?.data?.message || 'Unable to load this course discussion.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [courseId, reloadKey]);

  useEffect(() => {
    let active = true;
    const refreshActiveCall = async () => {
      const requestRevision = callStatusRevisionRef.current;
      try {
        const response = await getActiveCourseCall(courseId);
        if (active && requestRevision === callStatusRevisionRef.current) {
          setActiveCall(response.data.callSession || null);
          setCallStatusError('');
        }
      } catch (err) {
        if (active) {
          setCallStatusError(
            err.response?.data?.message || 'Unable to check for an ongoing call.'
          );
        }
      }
    };

    void refreshActiveCall();
    const interval = window.setInterval(refreshActiveCall, 15000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [courseId]);

  useEffect(() => {
    const typingTimers = typingTimersRef.current;
    const chatId = chatData?.chat?._id;
    if (!chatId || !token) return undefined;

    const socket = io(SOCKET_URL, {
      auth: { token },
      withCredentials: true
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('group-chat:join', { courseId }, (result) => {
        if (result?.error) setError(result.error);
        else setOnlineUserIds(new Set(result?.onlineUserIds || []));
      });
    });
    socket.on('disconnect', () => {
      setConnected(false);
      setOnlineUserIds(new Set());
    });
    socket.on('connect_error', (err) => {
      setConnected(false);
      setError(err.message || 'Unable to connect to the discussion.');
    });
    socket.on('group-chat:message', (incoming) => {
      setMessages((current) => (
        current.some((item) => item._id === incoming._id)
          ? current
          : [...current, incoming]
      ));
    });
    socket.on('group-chat:reaction', ({ messageId, reactions }) => {
      setMessages((current) => current.map((item) => (
        item._id === messageId ? { ...item, reactions } : item
      )));
    });
    socket.on('group-chat:presence', ({ userId, isOnline }) => {
      setOnlineUserIds((current) => {
        const next = new Set(current);
        if (isOnline) next.add(String(userId));
        else next.delete(String(userId));
        return next;
      });
    });
    socket.on('group-chat:typing', ({ userId, fullName, isTyping }) => {
      const id = String(userId);
      const timers = typingTimersRef.current;
      if (timers.has(id)) clearTimeout(timers.get(id));

      if (!isTyping) {
        timers.delete(id);
        setTypingUsers((current) => current.filter((entry) => entry.userId !== id));
        return;
      }

      setTypingUsers((current) => (
        current.some((entry) => entry.userId === id)
          ? current.map((entry) => entry.userId === id ? { userId: id, fullName } : entry)
          : [...current, { userId: id, fullName }]
      ));
      timers.set(id, setTimeout(() => {
        setTypingUsers((current) => current.filter((entry) => entry.userId !== id));
        timers.delete(id);
      }, 4000));
    });
    socket.on('group-chat:access-revoked', () => {
      setError('Your access to this discussion was removed.');
      socket.disconnect();
    });
    socket.on('course-call:started', ({ callSessionId, courseId: startedCourseId }) => {
      if (String(startedCourseId) !== String(courseId)) return;
      callStatusRevisionRef.current += 1;
      setActiveCall({ _id: callSessionId, status: 'ongoing' });
      setCallStatusError('');
    });
    socket.on('course-call:ended', ({ callSessionId, courseId: endedCourseId }) => {
      if (String(endedCourseId) !== String(courseId)) return;
      callStatusRevisionRef.current += 1;
      setActiveCall((current) => (
        current?._id === callSessionId ? null : current
      ));
    });

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimers.forEach(clearTimeout);
      typingTimers.clear();
      socket.emit('group-chat:leave', { courseId });
      socket.disconnect();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [chatData?.chat?._id, courseId, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCreateChat = async () => {
    setCreating(true);
    setError('');
    setNotice('');
    try {
      await createCourseGroupChat(courseId);
      setNotice('Course group discussion created.');
      setReloadKey((current) => current + 1);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create the course discussion.');
    } finally {
      setCreating(false);
    }
  };

  const handleStartCall = async () => {
    setStartingCall(true);
    setError('');
    try {
      const response = await startCourseCall(courseId);
      setActiveCall(response.data.callSession);
      navigate(`/calls/${response.data.callSession._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to start a course call.');
    } finally {
      setStartingCall(false);
    }
  };

  const handleJoinActiveCall = async (callSessionId) => {
    if (!callSessionId) return;
    setJoiningCallId(callSessionId);
    setCallStatusError('');
    try {
      const response = await getCallSession(callSessionId);
      if (response.data.callSession.status === 'ongoing') {
        navigate(`/calls/${callSessionId}`);
      } else {
        setActiveCall(null);
        setCallStatusError('This call has ended.');
      }
    } catch (err) {
      setCallStatusError(err.response?.data?.message || 'Unable to join this call.');
    } finally {
      setJoiningCallId('');
    }
  };

  const runMemberAction = async (action, userId) => {
    setError('');
    setNotice('');
    try {
      await updateGroupChatMembers(courseId, { action, userId });
      setNotice(`Discussion member ${action === 'add' ? 'added' : 'removed'}.`);
      setReloadKey((current) => current + 1);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update discussion members.');
    }
  };

  const runModeratorAction = async (action, userId) => {
    setError('');
    setNotice('');
    try {
      await updateGroupChatModerators(courseId, { action, userId });
      setNotice(`Chat moderator ${action === 'add' ? 'added' : 'removed'}.`);
      setReloadKey((current) => current + 1);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update chat moderators.');
    }
  };

  const handleMessageChange = (event) => {
    const nextMessage = event.target.value;
    setMessage(nextMessage);

    const socket = socketRef.current;
    if (connected && socket) {
      socket.emit('group-chat:typing', {
        courseId,
        isTyping: Boolean(nextMessage.trim())
      });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (nextMessage.trim()) {
        typingTimeoutRef.current = setTimeout(() => {
          socket.emit('group-chat:typing', { courseId, isTyping: false });
        }, 1400);
      }
    }
  };

  const handleSubmitMessage = async (event) => {
    event.preventDefault();
    const content = message.trim();
    if (!content && !attachmentFile) return;

    const socket = socketRef.current;
    if (!connected || !socket) {
      setError('Connect to the discussion before sending a message.');
      return;
    }

    setSending(true);
    setError('');
    try {
      let attachment;
      if (attachmentFile) {
        const uploadResponse = await uploadGroupChatAttachment(courseId, attachmentFile);
        attachment = uploadResponse.data;
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      socket.emit('group-chat:typing', { courseId, isTyping: false });
      socket.emit('group-chat:message', {
        courseId,
        content,
        attachmentId: attachment?.id,
        replyToId: replyingTo?._id
      }, (result) => {
        if (result?.error) {
          setError(result.error);
        } else {
          setError(result?.notificationWarning || '');
          setMessage('');
          setAttachmentFile(null);
          setReplyingTo(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
        setSending(false);
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        'Unable to send the message.'
      );
      setSending(false);
    }
  };

  const handleReaction = (messageId, emoji) => {
    const socket = socketRef.current;
    if (!connected || !socket) return;
    socket.emit('group-chat:reaction', { courseId, messageId, emoji }, (result) => {
      if (result?.error) setError(result.error);
    });
  };

  const openMemberProfile = async (memberId) => {
    if (!memberId) return;
    setSelectedProfile({ loading: true, profile: null, error: '' });
    try {
      const response = await getChatMemberProfile(memberId);
      setSelectedProfile({ loading: false, profile: response.data, error: '' });
    } catch (err) {
      setSelectedProfile({
        loading: false,
        profile: null,
        error: err.response?.data?.message || 'Unable to load this member profile.'
      });
    }
  };

  const downloadAttachment = async (attachment) => {
    try {
      const blob = await downloadGroupChatAttachment(courseId, attachment.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to download this attachment.');
    }
  };

  const groupChatName = chatData?.chat?.name || chatData?.course?.title || 'Course Group Chat';

  if (loading) {
    return <section aria-label="Course group chat" style={{ marginTop: '24px' }}>Loading discussion…</section>;
  }

  if (!chatData?.chat) {
    return (
      <section aria-label="Course group chat" style={{ marginTop: '24px' }}>
        <h2 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 800, marginBottom: '8px' }}>
          {groupChatName}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: isOrgAdmin ? '14px' : 0 }}>
          {chatMissing
            ? 'A group discussion has not been created for this course yet.'
            : 'Unable to load the group discussion.'}
        </p>
        {error && <p role="alert" style={{ color: 'var(--danger-text)', marginBottom: '12px' }}>{error}</p>}
        {isOrgAdmin && (
          <button type="button" onClick={handleCreateChat} disabled={creating} style={{
            border: 0,
            borderRadius: '9px',
            padding: '10px 14px',
            color: 'var(--text-on-primary)',
            background: 'var(--fb-blue)',
            fontWeight: 800,
            cursor: creating ? 'wait' : 'pointer'
          }}>
            {creating ? 'Creating…' : 'Create Group Chat'}
          </button>
        )}
        {canStartCall && !chatMissing && (
          <button
            type="button"
            onClick={handleStartCall}
            disabled={startingCall}
            aria-label={startingCall ? 'Starting group call' : 'Start group call'}
            title={startingCall ? 'Starting group call' : 'Start group call'}
            style={{
              border: 0,
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'grid',
              placeItems: 'center',
              marginLeft: isOrgAdmin ? '8px' : 0,
              color: 'var(--text-on-primary)',
              background: 'var(--fb-blue)',
              cursor: startingCall || joiningCallId === activeCall?._id ? 'wait' : 'pointer'
            }}
          >
            <VideoCallIcon />
          </button>
        )}
      </section>
    );
  }

  const moderators = chatData.chat.moderators || [];
  const participants = chatData.chat.participants || [];
  const memberCount = new Set(
    [...participants, ...moderators].map((person) => String(person._id))
  ).size;

  return (
    <section aria-label={groupChatName} style={{ marginTop: '24px', color: 'var(--text-primary)' }}>
      {activeCall && (
        <aside role="status" aria-label="Ongoing group call" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
          marginBottom: '14px',
          padding: '12px 14px',
          border: '1px solid var(--success-primary)',
          borderRadius: '12px',
          background: 'var(--success-bg)'
        }}>
          <div>
            <strong style={{ color: 'var(--success-text)' }}>Ongoing group call</strong>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginTop: '3px' }}>
              Join the live call for {groupChatName}.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleJoinActiveCall(activeCall._id)}
            disabled={joiningCallId === activeCall._id}
            style={{
              border: 0,
              borderRadius: '9px',
              padding: '9px 14px',
              color: 'var(--text-on-primary)',
              background: 'var(--success-primary)',
              fontWeight: 800,
              cursor: joiningCallId === activeCall._id ? 'wait' : 'pointer'
            }}
          >
            {joiningCallId === activeCall._id ? 'Joining…' : 'Join call'}
          </button>
        </aside>
      )}
      {callStatusError && (
        <p role="alert" style={{ color: 'var(--danger-text)', marginBottom: '12px' }}>
          {callStatusError}
        </p>
      )}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap',
        marginBottom: '12px',
        paddingBottom: '12px',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <div>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '1.15rem', fontWeight: 800 }}>
            {groupChatName}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '4px' }}>
            {memberCount} members · {onlineUserIds.size} online · {connected ? 'Connected' : 'Connecting…'}
          </p>
        </div>
        {canStartCall && (
          <button
            type="button"
            onClick={() => (
              activeCall
                ? handleJoinActiveCall(activeCall._id)
                : handleStartCall()
            )}
            disabled={startingCall || joiningCallId === activeCall?._id}
            aria-label={activeCall ? 'Join ongoing group call' : startingCall ? 'Starting group call' : 'Start group call'}
            title={activeCall ? 'Join ongoing group call' : startingCall ? 'Starting group call' : 'Start group call'}
            style={{
              border: 0,
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--text-on-primary)',
              background: 'var(--fb-blue)',
              cursor: startingCall ? 'wait' : 'pointer'
            }}
          >
            <VideoCallIcon />
          </button>
        )}
        {(chatData.canManageMembers || chatData.canManageModerators) && (
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={settingsOpen}
            aria-label="Group chat settings"
            title="Group chat settings"
            style={{
              border: '1px solid var(--border-color)',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'grid',
              placeItems: 'center',
              padding: 0,
              color: 'var(--text-primary)',
              background: 'var(--bg-base)',
              cursor: 'pointer'
            }}
          >
            <SettingsIcon />
          </button>
        )}
      </div>

      {error && (
        <div role="alert" style={{
          marginBottom: '12px',
          padding: '10px 12px',
          borderRadius: '8px',
          background: 'var(--danger-bg)',
          color: 'var(--danger-text)'
        }}>
          {error}
        </div>
      )}
      {notice && (
        <div role="status" style={{
          marginBottom: '12px',
          padding: '10px 12px',
          borderRadius: '8px',
          background: 'var(--fb-blue-subtle)',
          color: 'var(--fb-blue)'
        }}>
          {notice}
        </div>
      )}

      <div style={{
        height: '420px',
        overflowY: 'auto',
        padding: '16px 2px',
        marginBottom: '8px',
        borderBottom: '1px solid var(--border-color)'
      }}>
        {messages.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px 12px' }}>
            No messages yet. Start the discussion.
          </p>
        ) : messages.map((item) => {
          const senderName = item.sender?.fullName || item.senderName || 'Member';
          const senderId = String(item.sender?._id || item.sender || '');
          const senderOrganisationId = String(
            item.senderOrganisation?._id || item.senderOrganisation || ''
          );
          const ownMessage = senderId
            ? senderId === currentUserId
            : senderOrganisationId
              ? senderOrganisationId === currentUserId
              : senderName === (user?.fullName || user?.name);
          const senderPhotoValue = item.sender?.photo || item.senderOrganisation?.logo;
          const senderPhoto = senderPhotoValue ? resolveImageUrl(senderPhotoValue) : '';
          const initials = senderName.split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase();
          const replySender = item.replyTo?.sender?.fullName ||
            item.replyTo?.senderOrganisation?.name ||
            item.replyTo?.senderName ||
            'Member';
          const reactionGroups = (item.reactions || []).reduce((groups, reaction) => {
            const reactionUserId = String(reaction.user?._id || reaction.user || '');
            const group = groups[reaction.emoji] || { count: 0, selected: false };
            group.count += 1;
            if (reactionUserId === currentUserId) group.selected = true;
            groups[reaction.emoji] = group;
            return groups;
          }, {});

          return (
            <article key={item._id} style={{
              display: 'flex',
              justifyContent: ownMessage ? 'flex-end' : 'flex-start',
              marginBottom: '18px'
            }}>
              <div style={{
                display: 'flex',
                flexDirection: ownMessage ? 'row-reverse' : 'row',
                alignItems: 'flex-end',
                gap: '8px',
                maxWidth: '90%'
              }}>
                <div style={{ position: 'relative', width: '34px', height: '34px', flex: '0 0 34px' }}>
                  {senderPhoto ? (
                    <img
                      src={senderPhoto}
                      alt=""
                      style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span aria-hidden="true" style={{
                      width: '34px',
                      height: '34px',
                      display: 'grid',
                      placeItems: 'center',
                      borderRadius: '50%',
                      background: 'var(--fb-blue-subtle)',
                      color: 'var(--fb-blue)',
                      fontSize: '0.72rem',
                      fontWeight: 800
                    }}>
                      {initials || '?'}
                    </span>
                  )}
                  {senderId && onlineUserIds.has(senderId) && (
                    <span title="Online" style={{
                      position: 'absolute',
                      right: '-1px',
                      bottom: '-1px',
                      width: '11px',
                      height: '11px',
                      borderRadius: '50%',
                      background: '#31a24c',
                      border: '2px solid var(--bg-base)'
                    }} />
                  )}
                </div>
                <div style={{ minWidth: 0, maxWidth: '100%' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: ownMessage ? 'flex-end' : 'flex-start',
                    gap: '8px',
                    marginBottom: '4px'
                  }}>
                    {senderId || senderOrganisationId ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (senderId) openMemberProfile(senderId);
                          else navigate(`/profiles/organisation/${senderOrganisationId}`);
                        }}
                        style={{
                          padding: 0,
                          border: 0,
                          background: 'transparent',
                          color: 'var(--text-primary)',
                          fontSize: '0.82rem',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                      >
                        {senderName}
                      </button>
                    ) : (
                      <strong style={{ color: 'var(--text-primary)', fontSize: '0.82rem' }}>
                        {senderName}
                      </strong>
                    )}
                    <time style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                      {new Date(item.createdAt).toLocaleString()}
                    </time>
                  </div>
                  <div style={{
                    padding: '10px 13px',
                    borderRadius: '16px',
                    background: ownMessage ? 'var(--fb-blue-subtle)' : 'var(--bg-card)',
                    border: ownMessage ? 'none' : '1px solid var(--border-color)'
                  }}>
                    {item.replyTo && (
                      <div style={{
                        marginBottom: item.content ? '8px' : 0,
                        padding: '5px 8px',
                        borderLeft: '3px solid var(--fb-blue)',
                        color: 'var(--text-muted)',
                        fontSize: '0.78rem'
                      }}>
                        <strong>{replySender}: </strong>
                        {item.replyTo.content || item.replyTo.attachment?.name || 'Attachment'}
                      </div>
                    )}
                    {item.content && (
                      <p style={{
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem',
                        lineHeight: 1.5,
                        whiteSpace: 'pre-wrap',
                        overflowWrap: 'anywhere'
                      }}>
                        {item.content}
                      </p>
                    )}
                    {item.attachment && (
                      <button
                        type="button"
                        onClick={() => downloadAttachment(item.attachment)}
                        style={{
                          display: 'block',
                          marginTop: item.content ? '8px' : 0,
                          padding: '7px 0',
                          border: 0,
                          background: 'transparent',
                          color: 'var(--fb-blue)',
                          fontWeight: 700,
                          textAlign: 'left',
                          overflowWrap: 'anywhere',
                          cursor: 'pointer'
                        }}
                      >
                        Download {item.attachment.name} ({Math.max(1, Math.ceil(item.attachment.size / 1024))} KB)
                      </button>
                    )}
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: ownMessage ? 'flex-end' : 'flex-start',
                    gap: '5px',
                    marginTop: '4px',
                    flexWrap: 'wrap'
                  }}>
                    {Object.entries(reactionGroups).map(([emoji, group]) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleReaction(item._id, emoji)}
                        aria-label={`React ${emoji}, ${group.count} reactions`}
                        style={{
                          padding: '2px 6px',
                          border: `1px solid ${group.selected ? 'var(--fb-blue)' : 'var(--border-color)'}`,
                          borderRadius: '12px',
                          background: 'var(--bg-base)',
                          cursor: 'pointer'
                        }}
                      >
                        {emoji} {group.count}
                      </button>
                    ))}
                    <details>
                      <summary style={{
                        color: 'var(--text-muted)',
                        fontSize: '0.75rem',
                        cursor: 'pointer'
                      }}>
                        React
                      </summary>
                      <div style={{ display: 'flex', gap: '3px', padding: '4px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                        {REACTION_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleReaction(item._id, emoji)}
                            aria-label={`React with ${emoji}`}
                            style={{ border: 0, background: 'transparent', cursor: 'pointer', fontSize: '1rem' }}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </details>
                    <button
                      type="button"
                      onClick={() => setReplyingTo(item)}
                      style={{ border: 0, background: 'transparent', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer' }}
                    >
                      Reply
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
        {typingUsers.length > 0 && (
          <p aria-live="polite" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '4px 12px' }}>
            {typingUsers.map((entry) => entry.fullName).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing…
          </p>
        )}
        <div ref={messagesEndRef} />
      </div>

      {replyingTo && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 0',
          color: 'var(--text-muted)',
          fontSize: '0.82rem'
        }}>
          <span>
            Replying to <strong>{replyingTo.sender?.fullName || replyingTo.senderName || 'Member'}</strong>
          </span>
          <button type="button" onClick={() => setReplyingTo(null)} aria-label="Cancel reply">
            Cancel
          </button>
        </div>
      )}
      {attachmentFile && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
          <span>Attachment: {attachmentFile.name}</span>
          <button type="button" onClick={() => {
            setAttachmentFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }}>
            Remove
          </button>
        </div>
      )}
      <form onSubmit={handleSubmitMessage} style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '18px',
        padding: '8px 0',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <input
          ref={fileInputRef}
          type="file"
          accept={ATTACHMENT_ACCEPT}
          aria-label="Attach a file"
          onChange={(event) => setAttachmentFile(event.target.files?.[0] || null)}
          style={{ display: 'none' }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={!connected || sending}
          aria-label="Attach file"
          title="Attach file (10MB maximum)"
          style={{
            border: '1px solid var(--border-color)',
            borderRadius: '50%',
            width: '38px',
            height: '38px',
            background: 'var(--bg-base)',
            color: 'var(--text-secondary)',
            cursor: 'pointer'
          }}
        >
          +
        </button>
        <textarea
          aria-label="Discussion message"
          value={message}
          onChange={handleMessageChange}
          rows={2}
          maxLength={2000}
          placeholder="Write a message… (Enter for a new paragraph)"
          style={{
            minWidth: 0,
            flex: 1,
            padding: '11px 12px',
            minHeight: '48px',
            maxHeight: '160px',
            resize: 'vertical',
            fontFamily: 'inherit',
            fontSize: '0.95rem',
            lineHeight: 1.45,
            color: 'var(--text-primary)',
            background: 'transparent',
            border: '1px solid var(--border-color)',
            borderRadius: '18px'
          }}
        />
        <button type="submit" disabled={!connected || sending || (!message.trim() && !attachmentFile)} style={{
          border: 0,
          borderRadius: '20px',
          padding: '0 16px',
          color: 'var(--text-on-primary)',
          background: 'var(--fb-blue)',
          fontWeight: 800,
          height: '40px',
          cursor: connected && !sending ? 'pointer' : 'not-allowed',
          opacity: connected && !sending ? 1 : 0.6
        }}>
          {sending ? 'Sending…' : 'Send'}
        </button>
      </form>

      {settingsOpen && (chatData.canManageMembers || chatData.canManageModerators) && (
        <div
          role="presentation"
          onClick={() => setSettingsOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            display: 'grid',
            placeItems: 'center',
            padding: '20px',
            background: 'rgba(0, 0, 0, 0.45)'
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="group-chat-settings-title"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: 'min(640px, 100%)',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '22px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              boxShadow: 'var(--card-shadow)'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              marginBottom: '16px'
            }}>
              <div>
                <h2 id="group-chat-settings-title" style={{ margin: 0, fontSize: '1.1rem' }}>
                  Group chat settings
                </h2>
                <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  Manage moderators and participants for {groupChatName}.
                </p>
              </div>
              <button type="button" onClick={() => setSettingsOpen(false)}>
                Close
              </button>
            </div>

            {error && (
              <p role="alert" style={{ color: 'var(--danger-text)', fontSize: '0.85rem' }}>
                {error}
              </p>
            )}
            {notice && (
              <p role="status" style={{ color: 'var(--fb-blue)', fontSize: '0.85rem' }}>
                {notice}
              </p>
            )}

            {chatData.canManageModerators && (
              <section style={{ padding: '14px 0', borderTop: '1px solid var(--border-color)' }}>
                <h3 style={{ margin: '0 0 8px', fontSize: '0.95rem', fontWeight: 800 }}>
                  Chat Moderators
                </h3>
                {moderators.length === 0 && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No moderators have been added.
                  </p>
                )}
                {moderators.map((moderator) => (
                  <div key={moderator._id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    padding: '7px 0'
                  }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {moderator.fullName} · {moderator.role}
                    </span>
                    <button type="button" onClick={() => runModeratorAction('remove', moderator._id)}>
                      Remove
                    </button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <select
                    aria-label="Choose a chat moderator"
                    value={moderatorId}
                    onChange={(event) => setModeratorId(event.target.value)}
                    style={{ flex: 1, minWidth: 0, padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                  >
                    <option value="">Select staff or trainee</option>
                    {(chatData.availableModerators || []).map((candidate) => (
                      <option key={candidate._id} value={candidate._id}>
                        {candidate.fullName} · {candidate.role}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!moderatorId}
                    onClick={async () => {
                      await runModeratorAction('add', moderatorId);
                      setModeratorId('');
                    }}
                  >
                    Add moderator
                  </button>
                </div>
              </section>
            )}

            {chatData.canManageMembers && (
              <section style={{ padding: '14px 0', borderTop: '1px solid var(--border-color)' }}>
                <h3 style={{ margin: '0 0 8px', fontSize: '0.95rem', fontWeight: 800 }}>
                  Participants
                </h3>
                {participants.length === 0 && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No participants have joined yet.
                  </p>
                )}
                {participants.map((participant) => (
                  <div key={participant._id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    padding: '7px 0'
                  }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {participant.fullName} · {participant.email}
                    </span>
                    <button type="button" onClick={() => runMemberAction('remove', participant._id)}>
                      Remove
                    </button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <select
                    aria-label="Choose an enrolled student to add"
                    value={memberId}
                    onChange={(event) => setMemberId(event.target.value)}
                    style={{ flex: 1, minWidth: 0, padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                  >
                    <option value="">Select enrolled student</option>
                    {(chatData.availableMembers || []).map((candidate) => (
                      <option key={candidate._id} value={candidate._id}>
                        {candidate.fullName} · {candidate.email}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!memberId}
                    onClick={async () => {
                      await runMemberAction('add', memberId);
                      setMemberId('');
                    }}
                  >
                    Add member
                  </button>
                </div>
              </section>
            )}
          </section>
        </div>
      )}

      {selectedProfile && (
        <div
          role="presentation"
          onClick={() => setSelectedProfile(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1200,
            display: 'grid',
            placeItems: 'center',
            padding: '20px',
            background: 'rgba(0, 0, 0, 0.45)'
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Group chat member profile"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: 'min(420px, 100%)',
              padding: '24px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              boxShadow: 'var(--card-shadow)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Member profile</h2>
              <button type="button" onClick={() => setSelectedProfile(null)} aria-label="Close member profile">
                Close
              </button>
            </div>
            {selectedProfile.loading && <p>Loading profile…</p>}
            {selectedProfile.error && <p role="alert" style={{ color: 'var(--danger-text)' }}>{selectedProfile.error}</p>}
            {selectedProfile.profile && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                {selectedProfile.profile.photo ? (
                  <img
                    src={resolveImageUrl(selectedProfile.profile.photo)}
                    alt=""
                    style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <span aria-hidden="true" style={{
                    width: '64px',
                    height: '64px',
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: '50%',
                    background: 'var(--fb-blue-subtle)',
                    color: 'var(--fb-blue)',
                    fontSize: '1.1rem',
                    fontWeight: 800
                  }}>
                    {(selectedProfile.profile.fullName || 'M').slice(0, 1).toUpperCase()}
                  </span>
                )}
                <div>
                  <h3 style={{ margin: '2px 0 4px', fontSize: '1rem' }}>
                    {selectedProfile.profile.fullName}
                  </h3>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    {selectedProfile.profile.username ? `@${selectedProfile.profile.username} · ` : ''}
                    {selectedProfile.profile.role?.replace('_', ' ')}
                  </p>
                  {selectedProfile.profile.communityType && (
                    <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                      {selectedProfile.profile.communityType.replace('_', ' ')}
                    </p>
                  )}
                  {selectedProfile.profile.bio && (
                    <p style={{ margin: '10px 0 0', color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.5 }}>
                      {selectedProfile.profile.bio}
                    </p>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </section>
  );
};

export default CourseGroupDiscussion;
