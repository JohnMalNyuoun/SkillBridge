const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const CallSession = require('../models/CallSession');
const Course = require('../models/course');
const GroupChat = require('../models/GroupChat');
const GroupChatMessage = require('../models/GroupChatMessage');
const User = require('../models/Users');
const { registerGroupChatSocket } = require('../services/groupChatSocket');

test('enrolled students can join a call room and exchange WebRTC signals', async () => {
  const previousSecret = process.env.JWT_SECRET;
  const originalCallFindById = CallSession.findById;
  const originalCourseFindById = Course.findById;
  const originalGroupChatFindById = GroupChat.findById;
  const originalMessageCreate = GroupChatMessage.create;
  const originalMessageFindById = GroupChatMessage.findById;
  const originalUserFindById = User.findById;
  const studentId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
  const courseId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
  const callId = 'cccccccccccccccccccccccc';
  const roomId = 'course-room';
  const callRoom = `course-call:${roomId}`;
  const groupChatId = 'ffffffffffffffffffffffff';
  const groupChatRoom = `group-chat:${groupChatId}`;
  const session = { _id: callId, courseId, roomId, status: 'ongoing' };
  const course = {
    _id: courseId,
    title: 'Course title',
    organisation: 'dddddddddddddddddddddddd',
    groupChatId,
    enrolledStudents: [studentId]
  };
  const groupChat = {
    _id: groupChatId,
    organisation: course.organisation,
    participants: [studentId],
    moderators: []
  };
  const participantId = 'peer-socket-id';
  const participant = {
    id: participantId,
    data: {
      user: {
        id: 'eeeeeeeeeeeeeeeeeeeeeeee',
        fullName: 'Another student',
        photo: '/api/images/peer-photo'
      },
      callHasVideo: { [callId]: false }
    },
    rooms: new Set([callRoom]),
    emit(event, payload) {
      participant.emittedSignal = { event, ...payload };
    }
  };
  const socketEvents = {};
  const broadcasts = [];
  const chatMessages = [];
  let middleware;
  let connectionHandler;
  let currentSocket;
  const io = {
    use(handler) {
      middleware = handler;
    },
    on(event, handler) {
      if (event === 'connection') connectionHandler = handler;
    },
    in(room) {
      return {
        fetchSockets: async () => (
          room === callRoom
            ? [participant]
            : room === groupChatRoom
              ? [currentSocket]
              : []
        )
      };
    },
    sockets: {
      sockets: new Map([[participantId, participant]])
    },
    to(room) {
      return {
        emit(event, payload) {
          if (room === groupChatRoom && event === 'group-chat:message') {
            chatMessages.push(payload);
          }
        }
      };
    }
  };

  process.env.JWT_SECRET = 'course-call-test-secret';
  CallSession.findById = async () => session;
  Course.findById = () => ({
    select: async () => course
  });
  GroupChat.findById = async () => groupChat;
  GroupChatMessage.create = async (message) => ({
    _id: '111111111111111111111111',
    ...message
  });
  GroupChatMessage.findById = () => ({
    populate() {
      return this;
    },
    lean: async () => ({
      _id: '111111111111111111111111',
      groupChat: groupChatId,
      sender: { _id: studentId, fullName: 'Enrolled student' },
      content: 'Chat message during the call'
    })
  });
  User.findById = () => ({
    select: async () => ({
      _id: studentId,
      fullName: 'Enrolled student',
      photo: '/api/images/student-photo',
      role: 'youth',
      isActive: true,
      isSuspended: false
    })
  });

  try {
    registerGroupChatSocket(io);
    const socket = {
      id: 'current-socket-id',
      handshake: {
        headers: {},
        auth: {
          token: jwt.sign({ id: studentId, role: 'youth' }, process.env.JWT_SECRET)
        }
      },
      data: {},
      rooms: new Set(['current-socket-id']),
      on(event, handler) {
        socketEvents[event] = handler;
      },
      async join(room) {
        this.rooms.add(room);
      },
      leave(room) {
        this.rooms.delete(room);
      },
      to(room) {
        assert.ok([callRoom, groupChatRoom].includes(room));
        return {
          emit(event, payload) {
            broadcasts.push({ event, payload });
          }
        };
      },
      emit() {}
    };
    currentSocket = socket;

    let authError;
    await middleware(socket, (err) => {
      authError = err;
    });
    assert.equal(authError, undefined);
    connectionHandler(socket);

    let joinResult;
    await socketEvents['course-call:join']({
      callSessionId: callId,
      hasVideo: true
    }, (result) => {
      joinResult = result;
    });
    assert.equal(joinResult.success, true);
    assert.equal(joinResult.participants[0].socketId, participantId);
    assert.equal(joinResult.participants[0].photo, '/api/images/peer-photo');
    assert.equal(joinResult.participants[0].hasVideo, false);
    assert.equal(socket.rooms.has(callRoom), true);
    assert.equal(socket.data.user.photo, '/api/images/student-photo');

    let groupJoinResult;
    await socketEvents['group-chat:join']({ courseId }, (result) => {
      groupJoinResult = result;
    });
    assert.equal(groupJoinResult.success, true);
    assert.equal(socket.rooms.has(callRoom), true);
    assert.equal(socket.rooms.has(groupChatRoom), true);

    let chatMessageResult;
    await socketEvents['group-chat:message']({
      courseId,
      content: 'Chat message during the call'
    }, (result) => {
      chatMessageResult = result;
    });
    assert.equal(chatMessageResult.success, true);
    assert.equal(chatMessages.length, 1);
    assert.equal(chatMessages[0].content, 'Chat message during the call');
    assert.equal(socket.rooms.has(callRoom), true);

    let mediaStateResult;
    await socketEvents['course-call:media-state']({
      callSessionId: callId,
      hasVideo: false
    }, (result) => {
      mediaStateResult = result;
    });
    assert.equal(mediaStateResult.success, true);
    const mediaStateBroadcast = broadcasts.find((item) => item.event === 'course-call:participant-media-state');
    assert.deepEqual(mediaStateBroadcast.payload, {
      socketId: 'current-socket-id',
      hasVideo: false
    });

    let signalResult;
    await socketEvents['course-call:signal']({
      callSessionId: callId,
      to: participantId,
      signal: { description: { type: 'offer', sdp: 'example-sdp' } }
    }, (result) => {
      signalResult = result;
    });
    assert.equal(signalResult.success, true);
    const joinedBroadcast = broadcasts.find((item) => item.event === 'course-call:participant-joined');
    assert.equal(joinedBroadcast.payload.userId, studentId);
    assert.equal(joinedBroadcast.payload.photo, '/api/images/student-photo');
    assert.equal(joinedBroadcast.payload.hasVideo, true);
    assert.equal(participant.emittedSignal.event, 'course-call:signal');
    assert.equal(participant.emittedSignal.signal.description.sdp, 'example-sdp');
  } finally {
    CallSession.findById = originalCallFindById;
    Course.findById = originalCourseFindById;
    GroupChat.findById = originalGroupChatFindById;
    GroupChatMessage.create = originalMessageCreate;
    GroupChatMessage.findById = originalMessageFindById;
    User.findById = originalUserFindById;
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});
