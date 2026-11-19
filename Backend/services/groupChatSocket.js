const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const GroupChat = require('../models/GroupChat');
const GroupChatMessage = require('../models/GroupChatMessage');
const Course = require('../models/course');
const User = require('../models/Users');
const Organisation = require('../models/Organisation');
const Notification = require('../models/Notification');
const CallSession = require('../models/CallSession');
const { getAttachment } = require('./groupChatAttachmentService');
const { canAccessChat, idString } = require('./groupChatAccess');
const {
  loadCallActor,
  getCourseCallContext
} = require('./courseCallAccess');

const respond = (ack, result) => {
  if (typeof ack === 'function') ack(result);
};

const REACTION_EMOJIS = new Set(['👍', '❤️', '😂', '😮', '😢', '👏']);

const getRoomSockets = async (io, room) => {
  if (typeof io.in === 'function') {
    const roomOperator = io.in(room);
    if (typeof roomOperator.fetchSockets === 'function') {
      return roomOperator.fetchSockets();
    }
  }

  return [...(io.sockets?.sockets?.values() || [])]
    .filter((socket) => socket.rooms?.has(room));
};

const populateGroupChatMessage = (messageId) => GroupChatMessage.findById(messageId)
  .populate('sender', 'fullName role photo')
  .populate('senderOrganisation', 'name logo')
  .populate({
    path: 'replyTo',
    select: 'content sender senderName createdAt',
    populate: { path: 'sender', select: 'fullName role photo' }
  })
  .populate('reactions.user', 'fullName')
  .lean();

const loadSocketActor = async (socket) => {
  const identity = socket.data.user;
  if (identity.role === 'organisation') {
    const organisation = await Organisation.findById(identity.id)
      .select('name role status isActive');

    if (
      !organisation ||
      !organisation.isActive ||
      organisation.status !== 'approved' ||
      organisation.role !== identity.role
    ) {
      return null;
    }

    return {
      id: organisation._id,
      role: organisation.role,
      fullName: organisation.name
    };
  }

  const user = await User.findById(identity.id)
    .select('fullName role createdByOrg isSuspended isActive');

  if (
    !user ||
    !user.isActive ||
    user.isSuspended ||
    user.role !== identity.role
  ) {
    return null;
  }

  return {
    id: user._id,
    role: user.role,
    createdByOrg: user.createdByOrg,
    fullName: user.fullName
  };
};

const getChatForCourse = async (courseId) => {
  if (!mongoose.isObjectIdOrHexString(courseId)) return null;
  const course = await Course.findById(courseId).select('groupChatId title');
  if (!course) return null;

  const chat = course.groupChatId
    ? await GroupChat.findById(course.groupChatId)
    : await GroupChat.findOne({ course: course._id });
  return chat ? { course, chat } : null;
};

const registerGroupChatSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const header = socket.handshake.headers.authorization;
      const token = socket.handshake.auth?.token ||
        (header?.startsWith('Bearer ') ? header.slice(7) : null);
      if (!token) return next(new Error('Authentication required.'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!decoded.id) return next(new Error('Invalid authentication token.'));

      socket.data.user = {
        id: decoded.id.toString(),
        role: decoded.role
      };
      const actor = await loadSocketActor(socket);
      if (!actor) {
        return next(new Error('Account is not authorized for group chat.'));
      }
      socket.data.user.fullName = actor.fullName;
      if (actor.createdByOrg) {
        socket.data.user.createdByOrg = actor.createdByOrg.toString();
      }
      return next();
    } catch (err) {
      return next(new Error('Authentication failed.'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.data.user.id}`);
    socket.data.groupChatRooms = new Set();

    socket.on('group-chat:join', async (payload = {}, ack) => {
      try {
        const chatContext = await getChatForCourse(payload.courseId);
        const actor = await loadSocketActor(socket);
        if (!chatContext || !actor || !canAccessChat(chatContext.chat, actor)) {
          return respond(ack, { error: 'You are not a member of this course group chat.' });
        }

        const room = `group-chat:${idString(chatContext.chat._id)}`;
        await socket.join(room);
        socket.data.groupChatRooms.add(room);
        const roomSockets = await getRoomSockets(io, room);
        const onlineUserIds = [...new Set(roomSockets
          .map((memberSocket) => idString(memberSocket.data.user?.id))
          .filter(Boolean))];
        if (typeof socket.to === 'function') {
          socket.to(room).emit('group-chat:presence', {
            userId: idString(actor.id),
            isOnline: true
          });
        }
        return respond(ack, {
          success: true,
          chatId: idString(chatContext.chat._id),
          onlineUserIds
        });
      } catch (err) {
        console.error('Group chat join failed:', err.message);
        return respond(ack, { error: 'Unable to join this course group chat.' });
      }
    });

    socket.on('group-chat:leave', async (payload = {}, ack) => {
      try {
        const chatContext = await getChatForCourse(payload.courseId);
        if (!chatContext) return respond(ack, { error: 'Group chat not found.' });

        const room = `group-chat:${idString(chatContext.chat._id)}`;
        await socket.leave(room);
        socket.data.groupChatRooms.delete(room);
        const roomSockets = await getRoomSockets(io, room);
        if (!roomSockets.some((memberSocket) => (
          idString(memberSocket.data.user?.id) === socket.data.user.id
        ))) {
          io.to(room).emit('group-chat:presence', {
            userId: socket.data.user.id,
            isOnline: false
          });
        }
        return respond(ack, { success: true });
      } catch (err) {
        console.error('Group chat leave failed:', err.message);
        return respond(ack, { error: 'Unable to leave this course group chat.' });
      }
    });

    socket.on('group-chat:message', async (payload = {}, ack) => {
      try {
        const content = typeof payload.content === 'string' ? payload.content.trim() : '';
        if (content.length > 2000) {
          return respond(ack, { error: 'Messages must contain no more than 2000 characters.' });
        }
        if (!content && !payload.attachmentId) {
          return respond(ack, { error: 'Add a message or attachment before sending.' });
        }

        const chatContext = await getChatForCourse(payload.courseId);
        const actor = await loadSocketActor(socket);
        if (!chatContext || !actor || !canAccessChat(chatContext.chat, actor)) {
          return respond(ack, { error: 'You are not a member of this course group chat.' });
        }

        const room = `group-chat:${idString(chatContext.chat._id)}`;
        if (!socket.rooms.has(room)) {
          return respond(ack, { error: 'Join the course group chat before sending messages.' });
        }

        const messageData = {
          groupChat: chatContext.chat._id,
          content
        };
        if (payload.replyToId) {
          if (!mongoose.isObjectIdOrHexString(payload.replyToId)) {
            return respond(ack, { error: 'Invalid reply target.' });
          }
          const replyTo = await GroupChatMessage.findOne({
            _id: payload.replyToId,
            groupChat: chatContext.chat._id
          }).select('_id');
          if (!replyTo) {
            return respond(ack, { error: 'The replied-to message is not in this group chat.' });
          }
          messageData.replyTo = replyTo._id;
        }
        if (payload.attachmentId) {
          if (!mongoose.isObjectIdOrHexString(payload.attachmentId)) {
            return respond(ack, { error: 'Invalid attachment.' });
          }
          const attachmentFile = await getAttachment(payload.attachmentId);
          if (
            !attachmentFile ||
            idString(attachmentFile.metadata?.groupChat) !== idString(chatContext.chat._id)
          ) {
            return respond(ack, { error: 'This attachment is not available in this group chat.' });
          }
          messageData.attachment = {
            id: attachmentFile._id.toString(),
            name: attachmentFile.metadata.name || attachmentFile.filename,
            mimeType: attachmentFile.metadata.contentType,
            size: attachmentFile.length
          };
        }
        if (actor.role === 'organisation') {
          messageData.senderName = actor.fullName;
          messageData.senderOrganisation = actor.id;
        } else {
          messageData.sender = actor.id;
        }

        const message = await GroupChatMessage.create(messageData);
        const populatedMessage = await populateGroupChatMessage(message._id);

        io.to(room).emit('group-chat:message', populatedMessage);
        const recipientIds = [...new Set(
          [...(chatContext.chat.participants || []), ...(chatContext.chat.moderators || [])]
            .map(idString)
            .filter((recipientId) => recipientId && recipientId !== idString(actor.id))
        )];

        if (recipientIds.length > 0) {
          const messagePreview = content || `Shared an attachment: ${messageData.attachment?.name || ''}`;
          const preview = messagePreview.length > 120
            ? `${messagePreview.slice(0, 117)}...`
            : messagePreview;
          const notificationMessage = `${actor.fullName} sent a message in ${chatContext.course.title}.`;
          try {
            const notifications = await Notification.insertMany(recipientIds.map((recipientId) => ({
              recipient: recipientId,
              recipientModel: 'User',
              title: `New message in ${chatContext.course.title}`,
              message: notificationMessage,
              type: 'group_chat_message',
              reference: chatContext.course._id,
              referenceModel: 'Course',
              course: chatContext.course._id,
              sender: actor.id,
              senderModel: actor.role === 'organisation' ? 'Organisation' : 'User'
            })));

            notifications.forEach((notification) => {
              io.to(`user:${idString(notification.recipient)}`).emit('group-chat:message-alert', {
                notificationId: idString(notification._id),
                courseId: idString(chatContext.course._id),
                courseName: chatContext.course.title,
                senderName: actor.fullName,
                preview
              });
            });
          } catch (notificationError) {
            console.error('Group chat message notification failed:', notificationError.message);
            return respond(ack, {
              success: true,
              message: populatedMessage,
              notificationWarning: 'Message sent, but group members could not be notified.'
            });
          }
        }

        return respond(ack, { success: true, message: populatedMessage });
      } catch (err) {
        console.error('Group chat message failed:', err.message);
        return respond(ack, { error: 'Unable to send message.' });
      }
    });

    socket.on('group-chat:reaction', async (payload = {}, ack) => {
      try {
        if (
          !mongoose.isObjectIdOrHexString(payload.messageId) ||
          !REACTION_EMOJIS.has(payload.emoji)
        ) {
          return respond(ack, { error: 'Choose a valid reaction.' });
        }

        const chatContext = await getChatForCourse(payload.courseId);
        const actor = await loadSocketActor(socket);
        if (!chatContext || !actor || !canAccessChat(chatContext.chat, actor)) {
          return respond(ack, { error: 'You are not a member of this course group chat.' });
        }

        const room = `group-chat:${idString(chatContext.chat._id)}`;
        if (!socket.rooms.has(room)) {
          return respond(ack, { error: 'Join the course group chat before reacting.' });
        }

        const message = await GroupChatMessage.findOne({
          _id: payload.messageId,
          groupChat: chatContext.chat._id
        });
        if (!message) return respond(ack, { error: 'Message not found in this group chat.' });

        const reactionIndex = message.reactions.findIndex((reaction) => (
          idString(reaction.user) === idString(actor.id) &&
          reaction.userModel === (actor.role === 'organisation' ? 'Organisation' : 'User') &&
          reaction.emoji === payload.emoji
        ));
        if (reactionIndex === -1) {
          message.reactions.push({
            user: actor.id,
            userModel: actor.role === 'organisation' ? 'Organisation' : 'User',
            emoji: payload.emoji
          });
        } else {
          message.reactions.splice(reactionIndex, 1);
        }
        await message.save();

        const updatedMessage = await GroupChatMessage.findById(message._id)
          .populate('reactions.user', 'fullName')
          .lean();
        io.to(room).emit('group-chat:reaction', {
          messageId: idString(message._id),
          reactions: updatedMessage.reactions
        });
        return respond(ack, { success: true, reactions: updatedMessage.reactions });
      } catch (err) {
        console.error('Group chat reaction failed:', err.message);
        return respond(ack, { error: 'Unable to update message reaction.' });
      }
    });

    socket.on('group-chat:typing', async (payload = {}, ack) => {
      try {
        const chatContext = await getChatForCourse(payload.courseId);
        const actor = await loadSocketActor(socket);
        if (!chatContext || !actor || !canAccessChat(chatContext.chat, actor)) {
          return respond(ack, { error: 'You are not a member of this course group chat.' });
        }

        const room = `group-chat:${idString(chatContext.chat._id)}`;
        if (!socket.rooms.has(room)) {
          return respond(ack, { error: 'Join the course group chat before sending typing updates.' });
        }

        if (typeof socket.to === 'function') {
          socket.to(room).emit('group-chat:typing', {
            userId: idString(actor.id),
            fullName: actor.fullName,
            isTyping: Boolean(payload.isTyping)
          });
        }
        return respond(ack, { success: true });
      } catch (err) {
        console.error('Group chat typing update failed:', err.message);
        return respond(ack, { error: 'Unable to update typing status.' });
      }
    });

    socket.on('course-call:join', async (payload = {}, ack) => {
      try {
        if (!mongoose.isObjectIdOrHexString(payload.callSessionId)) {
          return respond(ack, { error: 'Invalid call session.' });
        }

        const session = await CallSession.findById(payload.callSessionId);
        if (!session || session.status !== 'ongoing') {
          return respond(ack, { error: 'This call has ended.' });
        }

        const actor = await loadCallActor(socket.data.user);
        const context = actor ? await getCourseCallContext(session, actor) : null;
        if (!context?.course || !context.canAccess) {
          return respond(ack, { error: 'You are not enrolled in this course call.' });
        }

        const room = `course-call:${session.roomId}`;
        const existingSockets = await io.in(room).fetchSockets();
        await socket.join(room);
        socket.data.callRooms = socket.data.callRooms || {};
        socket.data.callRooms[idString(session._id)] = room;

        const participants = existingSockets.map((participant) => ({
          socketId: participant.id,
          userId: participant.data.user.id,
          fullName: participant.data.user.fullName
        }));
        socket.to(room).emit('course-call:participant-joined', {
          socketId: socket.id,
          userId: actor.id.toString(),
          fullName: actor.fullName
        });
        return respond(ack, {
          success: true,
          roomId: session.roomId,
          participants
        });
      } catch (err) {
        console.error('Course call join failed:', err.message);
        return respond(ack, { error: 'Unable to join this course call.' });
      }
    });

    socket.on('course-call:leave', (payload = {}, ack) => {
      const callId = idString(payload.callSessionId);
      const room = socket.data.callRooms?.[callId];
      if (!room) return respond(ack, { success: true });

      socket.to(room).emit('course-call:participant-left', {
        socketId: socket.id,
        userId: socket.data.user.id
      });
      socket.leave(room);
      delete socket.data.callRooms[callId];
      return respond(ack, { success: true });
    });

    socket.on('course-call:signal', async (payload = {}, ack) => {
      try {
        const callId = idString(payload.callSessionId);
        const room = socket.data.callRooms?.[callId];
        if (!room || !payload.to || !payload.signal) {
          return respond(ack, { error: 'Invalid call signal.' });
        }

        const session = await CallSession.findById(callId);
        if (!session || session.status !== 'ongoing') {
          return respond(ack, { error: 'This call has ended.' });
        }

        const actor = await loadCallActor(socket.data.user);
        const context = actor ? await getCourseCallContext(session, actor) : null;
        if (!context?.canAccess) {
          return respond(ack, { error: 'You are not enrolled in this course call.' });
        }

        const target = io.sockets.sockets.get(payload.to);
        if (!socket.rooms.has(room) || !target?.rooms.has(room)) {
          return respond(ack, { error: 'Call participant is no longer available.' });
        }

        target.emit('course-call:signal', {
          from: socket.id,
          signal: payload.signal
        });
        return respond(ack, { success: true });
      } catch (err) {
        console.error('Course call signal failed:', err.message);
        return respond(ack, { error: 'Unable to send call signal.' });
      }
    });

    socket.on('disconnecting', () => {
      for (const room of socket.rooms) {
        if (!room.startsWith('course-call:')) continue;
        socket.to(room).emit('course-call:participant-left', {
          socketId: socket.id,
          userId: socket.data.user.id
        });
      }
    });

    socket.on('disconnect', async () => {
      for (const room of socket.data.groupChatRooms || []) {
        try {
          const roomSockets = await getRoomSockets(io, room);
          if (!roomSockets.some((memberSocket) => (
            idString(memberSocket.data.user?.id) === socket.data.user.id
          ))) {
            io.to(room).emit('group-chat:presence', {
              userId: socket.data.user.id,
              isOnline: false
            });
          }
        } catch (err) {
          console.error('Group chat presence update failed:', err.message);
        }
      }
    });
  });
};

module.exports = { registerGroupChatSocket };
