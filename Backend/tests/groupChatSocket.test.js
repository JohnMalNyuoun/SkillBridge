const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Course = require('../models/course');
const GroupChat = require('../models/GroupChat');
const GroupChatMessage = require('../models/GroupChatMessage');
const Notification = require('../models/Notification');
const Organisation = require('../models/Organisation');
const User = require('../models/Users');
const { registerGroupChatSocket } = require('../services/groupChatSocket');

test('group chat messages require either a user sender or organization sender name', async () => {
  const groupChat = new mongoose.Types.ObjectId();
  const userMessage = new GroupChatMessage({
    groupChat,
    sender: new mongoose.Types.ObjectId(),
    content: 'Hello'
  });
  const organisationMessage = new GroupChatMessage({
    groupChat,
    senderName: 'Course owner',
    content: 'Hello'
  });
  const invalidMessage = new GroupChatMessage({
    groupChat,
    content: 'Hello'
  });

  await assert.doesNotReject(userMessage.validate());
  await assert.doesNotReject(organisationMessage.validate());
  await assert.rejects(invalidMessage.validate(), { name: 'ValidationError' });
});

test('group chat messages allow attachments and validate reactions', async () => {
  const userId = new mongoose.Types.ObjectId();
  const groupChat = new mongoose.Types.ObjectId();
  const attachmentMessage = new GroupChatMessage({
    groupChat,
    sender: userId,
    content: '',
    attachment: {
      id: new mongoose.Types.ObjectId().toString(),
      name: 'lesson.pdf',
      mimeType: 'application/pdf',
      size: 12
    },
    reactions: [{ user: userId, userModel: 'User', emoji: '👍' }]
  });
  const invalidMessage = new GroupChatMessage({
    groupChat,
    sender: userId,
    content: ''
  });
  const invalidReaction = new GroupChatMessage({
    groupChat,
    sender: userId,
    content: 'Hello',
    reactions: [{ user: userId, userModel: 'User', emoji: 'not-an-emoji' }]
  });

  await assert.doesNotReject(attachmentMessage.validate());
  await assert.rejects(invalidMessage.validate(), { name: 'ValidationError' });
  await assert.rejects(invalidReaction.validate(), { name: 'ValidationError' });
});

test('approved organisation accounts can connect, join, and send attributed messages', async () => {
  const previousSecret = process.env.JWT_SECRET;
  const originalOrganisationFindById = Organisation.findById;
  const originalCourseFindById = Course.findById;
  const originalGroupChatFindById = GroupChat.findById;
  const originalMessageCreate = GroupChatMessage.create;
  const originalMessageFindById = GroupChatMessage.findById;
  const organisationId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
  const courseId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
  const chatId = 'cccccccccccccccccccccccc';
  const roomName = `group-chat:${chatId}`;
  const organisation = {
    _id: organisationId,
    name: 'Course owner',
    role: 'organisation',
    isActive: true,
    status: 'approved'
  };
  const chat = {
    _id: chatId,
    organisation: organisationId,
    participants: [],
    moderators: []
  };
  let createdMessage;
  let socketMiddleware;
  let connectionHandler;
  const socketEvents = {};
  const emittedMessages = [];
  const io = {
    use(handler) {
      socketMiddleware = handler;
    },
    on(event, handler) {
      if (event === 'connection') connectionHandler = handler;
    },
    to(room) {
      assert.equal(room, roomName);
      return {
        emit(event, message) {
          emittedMessages.push({ event, message });
        }
      };
    }
  };

  process.env.JWT_SECRET = 'group-chat-test-secret';
  Organisation.findById = () => ({
    select: async () => organisation
  });
  Course.findById = () => ({
    select: async () => ({ _id: courseId, groupChatId: chatId })
  });
  GroupChat.findById = async () => chat;
  GroupChatMessage.create = async (data) => {
    createdMessage = data;
    return { _id: 'message-id' };
  };
  GroupChatMessage.findById = () => ({
    populate() {
      return this;
    },
    lean: async () => ({
      _id: 'message-id',
      ...createdMessage,
      sender: null,
      senderName: createdMessage.senderName
    })
  });
  try {
    registerGroupChatSocket(io);
    const socket = {
      handshake: {
        headers: {},
        auth: {
          token: jwt.sign({ id: organisationId, role: 'organisation' }, process.env.JWT_SECRET)
        }
      },
      data: {},
      rooms: new Set(),
      on(event, handler) {
        socketEvents[event] = handler;
      },
      async join(room) {
        this.rooms.add(room);
      },
      async leave(room) {
        this.rooms.delete(room);
      },
      emit() {}
    };

    let authenticationError;
    await socketMiddleware(socket, (err) => {
      authenticationError = err;
    });
    assert.equal(authenticationError, undefined);
    assert.deepEqual(socket.data.user, {
      id: organisationId,
      role: 'organisation',
      fullName: 'Course owner'
    });

    connectionHandler(socket);
    let joinResult;
    await socketEvents['group-chat:join']({ courseId }, (result) => {
      joinResult = result;
    });
    assert.equal(joinResult.success, true);
    assert.equal(socket.rooms.has(roomName), true);
    let sendResult;
    await socketEvents['group-chat:message'](
      { courseId, content: 'Hello from the course owner' },
      (result) => {
        sendResult = result;
      }
    );
    assert.equal(sendResult.success, true);
    assert.equal(createdMessage.senderName, 'Course owner');
    assert.equal(String(createdMessage.senderOrganisation), organisationId);
    assert.equal(createdMessage.sender, undefined);
    assert.equal(emittedMessages[0].event, 'group-chat:message');
    assert.equal(emittedMessages[0].message.senderName, 'Course owner');
  } finally {
    Organisation.findById = originalOrganisationFindById;
    Course.findById = originalCourseFindById;
    GroupChat.findById = originalGroupChatFindById;
    GroupChatMessage.create = originalMessageCreate;
    GroupChatMessage.findById = originalMessageFindById;
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});

test('sending a group chat message alerts the other enrolled participants', async () => {
  const previousSecret = process.env.JWT_SECRET;
  const originalUserFindById = User.findById;
  const originalCourseFindById = Course.findById;
  const originalGroupChatFindById = GroupChat.findById;
  const originalMessageCreate = GroupChatMessage.create;
  const originalMessageFindById = GroupChatMessage.findById;
  const originalMessageFindOne = GroupChatMessage.findOne;
  const originalNotificationInsertMany = Notification.insertMany;
  const senderId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
  const recipientId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
  const courseId = 'cccccccccccccccccccccccc';
  const chatId = 'dddddddddddddddddddddddd';
  const roomName = `group-chat:${chatId}`;
  const course = { _id: courseId, title: 'Digital Skills', groupChatId: chatId };
  const chat = {
    _id: chatId,
    course: courseId,
    organisation: 'eeeeeeeeeeeeeeeeeeeeeeee',
    participants: [senderId, recipientId],
    moderators: []
  };
  const socketEvents = {};
  const emissions = [];
  const notificationsCreated = [];
  const socketBroadcasts = [];
  let middleware;
  let connectionHandler;
  let createdMessage;
  let queriedReplyFilter;
  const reactionMessage = {
    _id: 'ffffffffffffffffffffffff',
    reactions: [],
    async save() {}
  };
  const io = {
    use(handler) {
      middleware = handler;
    },
    on(event, handler) {
      if (event === 'connection') connectionHandler = handler;
    },
    to(room) {
      return {
        emit(event, payload) {
          emissions.push({ room, event, payload });
        }
      };
    }
  };

  process.env.JWT_SECRET = 'group-chat-message-alert-test-secret';
  User.findById = () => ({
    select: async () => ({
      _id: senderId,
      fullName: 'Message sender',
      role: 'youth',
      createdByOrg: null,
      isSuspended: false,
      isActive: true
    })
  });
  Course.findById = () => ({
    select: async () => course
  });
  GroupChat.findById = async () => chat;
  GroupChatMessage.create = async (data) => {
    createdMessage = data;
    return { _id: 'message-id' };
  };
  GroupChatMessage.findById = (messageId) => ({
    populate() {
      return this;
    },
    lean: async () => String(messageId) === reactionMessage._id
      ? { _id: reactionMessage._id, reactions: reactionMessage.reactions }
      : ({
        _id: 'message-id',
        ...createdMessage,
        sender: { _id: senderId, fullName: 'Message sender' }
      })
  });
  GroupChatMessage.findOne = (filter) => {
    queriedReplyFilter = filter;
    if (String(filter._id) === reactionMessage._id) return reactionMessage;
    return { select: async () => null };
  };
  Notification.insertMany = async (notifications) => {
    notificationsCreated.push(...notifications);
    return notifications.map((notification, index) => ({
      ...notification,
      _id: `notification-${index}`
    }));
  };

  try {
    registerGroupChatSocket(io);
    const socket = {
      id: 'sender-socket',
      handshake: {
        headers: {},
        auth: {
          token: jwt.sign({ id: senderId, role: 'youth' }, process.env.JWT_SECRET)
        }
      },
      data: {},
      rooms: new Set(['sender-socket']),
      on(event, handler) {
        socketEvents[event] = handler;
      },
      async join(room) {
        this.rooms.add(room);
      },
      async leave(room) {
        this.rooms.delete(room);
      },
      emit() {},
      to(room) {
        return {
          emit(event, payload) {
            socketBroadcasts.push({ room, event, payload });
          }
        };
      }
    };

    await middleware(socket, () => {});
    connectionHandler(socket);
    await socketEvents['group-chat:join']({ courseId }, () => {});
    assert.ok(socketBroadcasts.some((item) => item.event === 'group-chat:presence'));

    let sendResult;
    await socketEvents['group-chat:message']({ courseId, content: 'A new lesson is posted.' }, (result) => {
      sendResult = result;
    });

    assert.equal(sendResult.success, true);
    assert.equal(notificationsCreated.length, 1);
    assert.equal(notificationsCreated[0].recipient, recipientId);
    assert.equal(notificationsCreated[0].type, 'group_chat_message');
    assert.equal(notificationsCreated[0].course, courseId);
    const alert = emissions.find((item) => item.room === `user:${recipientId}`);
    assert.equal(alert.event, 'group-chat:message-alert');
    assert.equal(alert.payload.courseName, 'Digital Skills');
    assert.equal(alert.payload.senderName, 'Message sender');
    assert.equal(alert.payload.preview, 'A new lesson is posted.');
    assert.equal(emissions.find((item) => item.room === roomName).event, 'group-chat:message');

    let replyResult;
    await socketEvents['group-chat:message']({
      courseId,
      content: 'This reply target belongs elsewhere.',
      replyToId: 'eeeeeeeeeeeeeeeeeeeeeeee'
    }, (result) => {
      replyResult = result;
    });
    assert.equal(replyResult.error, 'The replied-to message is not in this group chat.');
    assert.equal(String(queriedReplyFilter.groupChat), chatId);

    let typingResult;
    await socketEvents['group-chat:typing']({
      courseId,
      isTyping: true
    }, (result) => {
      typingResult = result;
    });
    assert.equal(typingResult.success, true);
    assert.ok(socketBroadcasts.some((item) => (
      item.event === 'group-chat:typing' &&
      item.payload.userId === senderId &&
      item.payload.isTyping
    )));

    const reactionPayload = {
      courseId,
      messageId: reactionMessage._id,
      emoji: '👍'
    };
    let reactionResult;
    await socketEvents['group-chat:reaction'](reactionPayload, (result) => {
      reactionResult = result;
    });
    assert.equal(reactionResult.success, true);
    assert.equal(reactionMessage.reactions.length, 1);
    assert.equal(reactionMessage.reactions[0].userModel, 'User');
    await socketEvents['group-chat:reaction'](reactionPayload, (result) => {
      reactionResult = result;
    });
    assert.equal(reactionResult.success, true);
    assert.equal(reactionMessage.reactions.length, 0);
  } finally {
    User.findById = originalUserFindById;
    Course.findById = originalCourseFindById;
    GroupChat.findById = originalGroupChatFindById;
    GroupChatMessage.create = originalMessageCreate;
    GroupChatMessage.findById = originalMessageFindById;
    GroupChatMessage.findOne = originalMessageFindOne;
    Notification.insertMany = originalNotificationInsertMany;
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});
