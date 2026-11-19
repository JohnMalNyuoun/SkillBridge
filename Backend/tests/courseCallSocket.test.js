const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const CallSession = require('../models/CallSession');
const Course = require('../models/course');
const User = require('../models/Users');
const { registerGroupChatSocket } = require('../services/groupChatSocket');

test('enrolled students can join a call room and exchange WebRTC signals', async () => {
  const previousSecret = process.env.JWT_SECRET;
  const originalCallFindById = CallSession.findById;
  const originalCourseFindById = Course.findById;
  const originalUserFindById = User.findById;
  const studentId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
  const courseId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
  const callId = 'cccccccccccccccccccccccc';
  const roomId = 'course-room';
  const callRoom = `course-call:${roomId}`;
  const session = { _id: callId, courseId, roomId, status: 'ongoing' };
  const course = {
    _id: courseId,
    title: 'Course title',
    organisation: 'dddddddddddddddddddddddd',
    enrolledStudents: [studentId]
  };
  const participantId = 'peer-socket-id';
  const participant = {
    id: participantId,
    data: {
      user: {
        id: 'eeeeeeeeeeeeeeeeeeeeeeee',
        fullName: 'Another student'
      }
    },
    rooms: new Set([callRoom]),
    emit(event, payload) {
      participant.emittedSignal = { event, ...payload };
    }
  };
  const socketEvents = {};
  const broadcasts = [];
  let middleware;
  let connectionHandler;
  const io = {
    use(handler) {
      middleware = handler;
    },
    on(event, handler) {
      if (event === 'connection') connectionHandler = handler;
    },
    in(room) {
      assert.equal(room, callRoom);
      return { fetchSockets: async () => [participant] };
    },
    sockets: {
      sockets: new Map([[participantId, participant]])
    }
  };

  process.env.JWT_SECRET = 'course-call-test-secret';
  CallSession.findById = async () => session;
  Course.findById = () => ({
    select: async () => course
  });
  User.findById = () => ({
    select: async () => ({
      _id: studentId,
      fullName: 'Enrolled student',
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
        assert.equal(room, callRoom);
        return {
          emit(event, payload) {
            broadcasts.push({ event, payload });
          }
        };
      },
      emit() {}
    };

    let authError;
    await middleware(socket, (err) => {
      authError = err;
    });
    assert.equal(authError, undefined);
    connectionHandler(socket);

    let joinResult;
    await socketEvents['course-call:join']({ callSessionId: callId }, (result) => {
      joinResult = result;
    });
    assert.equal(joinResult.success, true);
    assert.equal(joinResult.participants[0].socketId, participantId);
    assert.equal(socket.rooms.has(callRoom), true);

    let signalResult;
    await socketEvents['course-call:signal']({
      callSessionId: callId,
      to: participantId,
      signal: { description: { type: 'offer', sdp: 'example-sdp' } }
    }, (result) => {
      signalResult = result;
    });
    assert.equal(signalResult.success, true);
    assert.equal(broadcasts[0].event, 'course-call:participant-joined');
    assert.equal(broadcasts[0].payload.userId, studentId);
    assert.equal(participant.emittedSignal.event, 'course-call:signal');
    assert.equal(participant.emittedSignal.signal.description.sdp, 'example-sdp');
  } finally {
    CallSession.findById = originalCallFindById;
    Course.findById = originalCourseFindById;
    User.findById = originalUserFindById;
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});
