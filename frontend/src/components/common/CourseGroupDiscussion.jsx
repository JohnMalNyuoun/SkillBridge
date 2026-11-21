import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import useAuth from '../../hooks/useAuth';
import {
  createCourseGroupChat,
  downloadGroupChatAttachment,
  getChatMemberProfile,
  getCourseGroupChat,
  searchGroupChatMembers,
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

const CallTypePicker = ({ onStart, onClose, starting }) => (
  <div role="dialog" aria-modal="true" aria-labelledby="call-type-title" style={{
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    display: 'grid',
    placeItems: 'center',
    padding: '20px',
    background: 'rgba(0,0,0,0.55)'
  }}>
    <div style={{
      width: 'min(100%, 420px)',
      padding: '22px',
      borderRadius: '14px',
      background: 'var(--bg-surface)',
      color: 'var(--text-primary)',
      boxShadow: '0 20px 60px rgba(0,0,0,0.25)'
    }}>
      <h2 id="call-type-title" style={{ fontSize: '1.15rem', fontWeight: 800 }}>
        Choose a call type
      </h2>
      <p style={{ color: 'var(--text-secondary)', margin: '8px 0 18px' }}>
        Enrolled students will be invited to join. You can turn your camera on or off during the call.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        <button type="button" onClick={() => onStart('audio')} disabled={starting}>
          Start audio call
        </button>
        <button type="button" onClick={() => onStart('video')} disabled={starting}>
          Start video call
        </button>
        <button type="button" onClick={onClose} disabled={starting}>
          Cancel
        </button>
      </div>
    </div>
  </div>
);

const CourseGroupDiscussion = ({
  courseId,
  isOrgAdmin = false,
  canStartCall = false,
  sharedSocket = null,
  isChatVisible = true,
  onIncomingMessage
}) => {
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
  const [callTypePickerOpen, setCallTypePickerOpen] = useState(false);
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
  const [moderatorId, setModeratorId] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [memberSearchResults, setMemberSearchResults] = useState([]);
  const [memberSearchLoading, setMemberSearchLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const chatVisibleRef = useRef(isChatVisible);
  const onIncomingMessageRef = useRef(onIncomingMessage);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const typingTimersRef = useRef(new Map());
  const callStatusRevisionRef = useRef(0);
  const navigate = useNavigate();
  const currentUserId = String(user?.id || user?._id || '');

  useEffect(() => {
    chatVisibleRef.current = isChatVisible;
    onIncomingMessageRef.current = onIncomingMessage;
  }, [isChatVisible, onIncomingMessage]);

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
    if (
      !settingsOpen ||
      !chatData?.canManageMembers ||
      memberSearch.trim().length < 2
    ) {
      return undefined;
    }

    let active = true;
    const timeout = window.setTimeout(async () => {
      setMemberSearchLoading(true);
      try {
        const response = await searchGroupChatMembers(courseId, memberSearch.trim());
        if (active) setMemberSearchResults(response.data?.members || []);
      } catch (err) {
        if (active) {
          setMemberSearchResults([]);
          setError(err.response?.data?.message || 'Unable to search eligible members.');
        }
      } finally {
        if (active) setMemberSearchLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [courseId, memberSearch, settingsOpen, chatData?.canManageMembers]);

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

    const socket = sharedSocket || io(SOCKET_URL, {
      auth: { token },
      withCredentials: true
    });
    socketRef.current = socket;

    const handleConnect = () => {
      setConnected(true);
      socket.emit('group-chat:join', { courseId }, (result) => {
        if (result?.error) setError(result.error);
        else setOnlineUserIds(new Set(result?.onlineUserIds || []));
      });
    };
    const handleDisconnect = () => {
      setConnected(false);
      setOnlineUserIds(new Set());
    };
    const handleConnectError = (err) => {
      setConnected(false);
      setError(err.message || 'Unable to connect to the discussion.');
    };
    const handleMessage = (incoming) => {
      setMessages((current) => (
        current.some((item) => item._id === incoming._id)
          ? current
          : [...current, incoming]
      ));
      const senderId = String(
        incoming.sender?._id ||
        incoming.sender ||
        incoming.senderOrganisation?._id ||
        incoming.senderOrganisation ||
        ''
      );
      if (!chatVisibleRef.current && senderId !== currentUserId) {
        onIncomingMessageRef.current?.();
      }
    };
    const handleReaction = ({ messageId, reactions }) => {
      setMessages((current) => current.map((item) => (
        item._id === messageId ? { ...item, reactions } : item
      )));
    };
    const handlePresence = ({ userId, isOnline }) => {
      setOnlineUserIds((current) => {
        const next = new Set(current);
        if (isOnline) next.add(String(userId));
        else next.delete(String(userId));
        return next;
      });
    };
    const handleTyping = ({ userId, fullName, isTyping }) => {
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
    };
    const handleAccessRevoked = () => {
      setError('Your access to this discussion was removed.');
      if (sharedSocket) {
        socket.emit('group-chat:leave', { courseId });
      } else {
        socket.disconnect();
      }
    };
    const handleMembersUpdated = () => {
      setReloadKey((current) => current + 1);
    };
    const handleCallStarted = ({ callSessionId, courseId: startedCourseId, callType }) => {
      if (String(startedCourseId) !== String(courseId)) return;
      callStatusRevisionRef.current += 1;
      setActiveCall({ _id: callSessionId, status: 'ongoing', callType });
      setCallStatusError('');
    };
    const handleCallEnded = ({ callSessionId, courseId: endedCourseId }) => {
      if (String(endedCourseId) !== String(courseId)) return;
      callStatusRevisionRef.current += 1;
      setActiveCall((current) => (
        current?._id === callSessionId ? null : current
      ));
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('group-chat:message', handleMessage);
    socket.on('group-chat:reaction', handleReaction);
    socket.on('group-chat:presence', handlePresence);
    socket.on('group-chat:typing', handleTyping);
    socket.on('group-chat:access-revoked', handleAccessRevoked);
    socket.on('group-chat:members-updated', handleMembersUpdated);
    socket.on('course-call:started', handleCallStarted);
    socket.on('course-call:ended', handleCallEnded);
    if (socket.connected) handleConnect();

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimers.forEach(clearTimeout);
      typingTimers.clear();
      socket.emit('group-chat:leave', { courseId });
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('group-chat:message', handleMessage);
      socket.off('group-chat:reaction', handleReaction);
      socket.off('group-chat:presence', handlePresence);
      socket.off('group-chat:typing', handleTyping);
      socket.off('group-chat:access-revoked', handleAccessRevoked);
      socket.off('group-chat:members-updated', handleMembersUpdated);
      socket.off('course-call:started', handleCallStarted);
      socket.off('course-call:ended', handleCallEnded);
      if (!sharedSocket) socket.disconnect();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [chatData?.chat?._id, courseId, token, sharedSocket, currentUserId]);

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

  const handleStartCall = async (callType) => {
    setStartingCall(true);
    setError('');
    try {
      const response = await startCourseCall(courseId, callType);
      setActiveCall(response.data.callSession);
      setCallTypePickerOpen(false);
      navigate(`/calls/${response.data.callSession._id}`, {
        state: { initialMode: callType }
      });
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
    if (action === 'remove' && !window.confirm('Remove this member from the group?')) return;
    setError('');
    setNotice('');
    try {
      await updateGroupChatMembers(courseId, { action, userId });
      setNotice(`Discussion member ${action === 'add' ? 'added' : 'removed'}.`);
      setMemberSearch('');
      setMemberSearchResults([]);
      setReloadKey((current) => current + 1);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update discussion members.');
    }
  };

  const runModeratorAction = async (action, userId) => {
    if (action === 'remove' && !window.confirm('Remove administrator privileges from this member?')) return;
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
            onClick={() => setCallTypePickerOpen(true)}
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
        {callTypePickerOpen && (
          <CallTypePicker
            onStart={handleStartCall}
            onClose={() => setCallTypePickerOpen(false)}
            starting={startingCall}
          />
        )}
      </section>
    );
  }

  const moderators = chatData.chat.moderators || [];
  const participants = chatData.chat.participants || [];
  const moderatorIds = new Set(moderators.map((moderator) => String(moderator._id)));
  const members = [...new Map(
    [...participants, ...moderators].map((person) => [String(person._id), person])
  ).values()];
  const memberCount = members.length + (chatData.chat.organisation?._id ? 1 : 0);

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
              {activeCall.callType === 'audio' ? 'Audio' : 'Video'} call · Join the live call for {groupChatName}.
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
                : setCallTypePickerOpen(true)
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
        {callTypePickerOpen && (
            <CallTypePicker
              onStart={handleStartCall}
              onClose={() => setCallTypePickerOpen(false)}
              starting={startingCall}
            />
        )}
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={settingsOpen}
          aria-label="View group members"
          title="View group members"
          style={{
            border: '1px solid var(--border-color)',
            borderRadius: '999px',
            minHeight: '40px',
            padding: '0 12px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            color: 'var(--text-primary)',
            background: 'var(--bg-base)',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          <SettingsIcon />
          Members
        </button>
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

      {settingsOpen && (
        <div
          role="presentation"
          onClick={() => {
            setSettingsOpen(false);
            setMemberSearch('');
            setMemberSearchResults([]);
            setMemberSearchLoading(false);
          }}
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
              padding: 'clamp(14px, 4vw, 22px)',
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
                  Group members
                </h2>
                <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  Members and administrators for {groupChatName}.
                </p>
              </div>
              <button type="button" onClick={() => {
                setSettingsOpen(false);
                setMemberSearch('');
                setMemberSearchResults([]);
                setMemberSearchLoading(false);
              }}>
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
                    <span style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
                      {moderator.photo ? (
                        <img src={resolveImageUrl(moderator.photo)} alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <span aria-hidden="true" style={{ width: 34, height: 34, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--fb-blue-subtle)', color: 'var(--fb-blue)', fontWeight: 800 }}>
                          {(moderator.fullName || '?').slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      <span style={{ color: 'var(--text-primary)', fontSize: '0.88rem', fontWeight: 700 }}>
                        {moderator.fullName || 'Member'}
                        <small style={{ display: 'block', color: 'var(--text-muted)', fontWeight: 500 }}>Admin · {moderator.role}</small>
                      </span>
                    </span>
                    <button type="button" onClick={() => runModeratorAction('remove', moderator._id)} style={{ color: 'var(--danger-text)', background: 'transparent', fontWeight: 700 }}>
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

            <section style={{ padding: '14px 0', borderTop: '1px solid var(--border-color)' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: '0.95rem', fontWeight: 800 }}>
                Members ({memberCount})
              </h3>
              {chatData.chat.organisation && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                  {chatData.chat.organisation.logo ? (
                    <img src={resolveImageUrl(chatData.chat.organisation.logo)} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <span aria-hidden="true" style={{ width: 36, height: 36, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--fb-blue-subtle)', color: 'var(--fb-blue)', fontWeight: 800 }}>
                      {(chatData.chat.organisation.name || 'O').slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <span style={{ color: 'var(--text-primary)', fontSize: '0.88rem', fontWeight: 700 }}>
                    {chatData.chat.organisation.name || 'Course organisation'}
                    <small style={{ display: 'block', color: 'var(--text-muted)', fontWeight: 500 }}>Owner</small>
                  </span>
                </div>
              )}
              {members.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No members have joined yet.
                </p>
              )}
              {members.map((participant) => {
                const isAdmin = moderatorIds.has(String(participant._id));
                return (
                  <div key={participant._id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '8px',
                    padding: '8px 0',
                    borderBottom: '1px solid var(--border-color)'
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
                      {participant.photo ? (
                        <img src={resolveImageUrl(participant.photo)} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <span aria-hidden="true" style={{ width: 36, height: 36, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--fb-blue-subtle)', color: 'var(--fb-blue)', fontWeight: 800 }}>
                          {(participant.fullName || '?').slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      <span style={{ color: 'var(--text-primary)', fontSize: '0.88rem', fontWeight: 700 }}>
                        {participant.fullName || 'Member'}
                        <small style={{ display: 'block', color: 'var(--text-muted)', fontWeight: 500 }}>
                          {isAdmin ? 'Admin' : 'Member'}{participant.role ? ` · ${participant.role}` : ''}
                        </small>
                      </span>
                    </span>
                    {chatData.canManageMembers && (
                      <button type="button" onClick={() => runMemberAction('remove', participant._id)} style={{ color: 'var(--danger-text)', background: 'transparent', fontWeight: 700 }}>
                        Remove
                      </button>
                    )}
                  </div>
                );
              })}
              {chatData.canManageMembers && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <label htmlFor="group-member-search" style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}>
                    Search eligible enrolled members
                  </label>
                  <input
                    id="group-member-search"
                    type="search"
                    value={memberSearch}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setMemberSearch(nextValue);
                      if (nextValue.trim().length < 2) {
                        setMemberSearchResults([]);
                        setMemberSearchLoading(false);
                      }
                    }}
                    placeholder="Search enrolled members"
                    maxLength={60}
                    style={{ flex: 1, minWidth: 0, padding: '9px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                  />
                </div>
              )}
              {chatData.canManageMembers && memberSearch.trim().length >= 2 && (
                <div aria-live="polite" style={{ display: 'grid', gap: '6px', marginTop: '8px' }}>
                  {memberSearchLoading && <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>Searching…</p>}
                  {!memberSearchLoading && memberSearchResults.length === 0 && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>No eligible enrolled members found.</p>
                  )}
                  {memberSearchResults.map((candidate) => (
                    <div key={candidate._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '7px 0' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
                        {candidate.photo ? (
                          <img src={resolveImageUrl(candidate.photo)} alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <span aria-hidden="true" style={{ width: 34, height: 34, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--fb-blue-subtle)', color: 'var(--fb-blue)', fontWeight: 800 }}>
                            {(candidate.fullName || '?').slice(0, 1).toUpperCase()}
                          </span>
                        )}
                        <span style={{ color: 'var(--text-primary)', fontSize: '0.86rem', fontWeight: 700 }}>{candidate.fullName}</span>
                      </span>
                      <button type="button" onClick={() => runMemberAction('add', candidate._id)}>
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
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
