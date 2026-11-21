const test = require('node:test');
const assert = require('node:assert/strict');
const Application = require('../models/Application');
const CallSession = require('../models/CallSession');
const Course = require('../models/course');
const GroupChat = require('../models/GroupChat');
const Notification = require('../models/Notification');
const Organisation = require('../models/Organisation');
const User = require('../models/Users');
const PushToken = require('../models/PushToken');
const {
  startCourseCall,
  getCallSession,
  getActiveCourseCall,
  endCallSession,
  acceptCallSession,
  declineCallSession
} = require('../controllers/courseCalls');

const makeResponse = () => ({
  statusCode: null,
  body: null,
  status(statusCode) {
    this.statusCode = statusCode;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  }
});

const setupYouthInvitationAction = (session) => {
  const originals = {
    applicationExists: Application.exists,
    callFindById: CallSession.findById,
    callFindOneAndUpdate: CallSession.findOneAndUpdate,
    courseFindById: Course.findById,
    notificationUpdateOne: Notification.updateOne,
    organisationFindById: Organisation.findById,
    userFindById: User.findById
  };
  const actorId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
  const courseId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
  const invitationUpdates = [];
  const notificationUpdates = [];
  const pushBatches = [];

  Application.exists = async () => true;
  CallSession.findById = async () => session;
  CallSession.findOneAndUpdate = async (filter, update) => {
    invitationUpdates.push({ filter, update });
    return session;
  };
  Course.findById = () => ({
    select: async () => ({
      _id: courseId,
      title: 'Course title',
      organisation: 'cccccccccccccccccccccccc',
      enrolledStudents: [actorId]
    })
  });
  Notification.updateOne = async (filter, update) => {
    notificationUpdates.push({ filter, update });
    return { modifiedCount: 1 };
  };
  Organisation.findById = () => ({
    select: async () => ({
      _id: 'cccccccccccccccccccccccc',
      status: 'approved',
      isActive: true
    })
  });
  User.findById = () => ({
    select: async () => ({
      _id: actorId,
      fullName: 'Invited youth',
      role: 'youth',
      isActive: true,
      isSuspended: false
    })
  });

  const req = {
    params: { id: session._id },
    user: { id: actorId, role: 'youth' },
    app: {
      get: (name) => {
        if (name === 'io') return null;
        if (name === 'callPushService') {
          return async (recipients) => {
            pushBatches.push(recipients);
            return { sentCount: 0 };
          };
        }
        return undefined;
      }
    }
  };

  return {
    req,
    actorId,
    invitationUpdates,
    notificationUpdates,
    pushBatches,
    restore: () => {
      Application.exists = originals.applicationExists;
      CallSession.findById = originals.callFindById;
      CallSession.findOneAndUpdate = originals.callFindOneAndUpdate;
      Course.findById = originals.courseFindById;
      Notification.updateOne = originals.notificationUpdateOne;
      Organisation.findById = originals.organisationFindById;
      User.findById = originals.userFindById;
    }
  };
};

test('starting a course call invites eligible youth and organization participants', async () => {
  const originals = {
    applicationFind: Application.find,
    callSessionCreate: CallSession.create,
    callSessionFindOne: CallSession.findOne,
    courseFindById: Course.findById,
    groupChatFindOne: GroupChat.findOne,
    notificationInsertMany: Notification.insertMany,
    organisationFindById: Organisation.findById,
    userFind: User.find,
    userFindById: User.findById
  };
  const organizationId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
  const courseId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
  const staffId = 'cccccccccccccccccccccccc';
  const teamMemberId = '121212121212121212121212';
  const studentIds = [
    'dddddddddddddddddddddddd',
    'eeeeeeeeeeeeeeeeeeeeeeee'
  ];
  const insertedNotifications = [];
  const emittedInvitations = [];
  const emittedCallEvents = [];
  const deliveredPushBatches = [];
  const originalWarn = console.warn;
  const pushWarnings = [];
  console.warn = (...args) => pushWarnings.push(args);
  let createdSession;
  const io = {
    to(room) {
      return {
        emit(event, payload) {
          const emittedEvent = { room, event, payload };
          if (event === 'course-call:invitation') emittedInvitations.push(emittedEvent);
          else emittedCallEvents.push(emittedEvent);
        }
      };
    }
  };

  Application.find = () => ({
    select() {
      return this;
    },
    lean: async () => studentIds.map((youth) => ({ youth }))
  });
  CallSession.findOne = async () => null;
  CallSession.create = async (data) => {
    createdSession = { ...data, _id: 'ffffffffffffffffffffffff' };
    return createdSession;
  };
  Course.findById = () => ({
    select: async () => ({
      _id: courseId,
      title: 'Course title',
      organisation: organizationId,
      enrolledStudents: []
    })
  });
  GroupChat.findOne = () => ({
    select: async () => ({ _id: '111111111111111111111111' })
  });
  Notification.insertMany = async (notifications) => {
    insertedNotifications.push(...notifications);
    return notifications.map((notification, index) => ({
      ...notification,
      _id: `22222222222222222222222${index}`
    }));
  };
  Organisation.findById = () => ({
    select: async () => ({
      _id: organizationId,
      status: 'approved',
      isActive: true,
      notificationsEnabled: true
    })
  });
  User.findById = () => ({
    select: async () => ({
      _id: staffId,
      fullName: 'Course staff',
      role: 'staff',
      createdByOrg: organizationId,
      isActive: true,
      isSuspended: false
    })
  });
  User.find = (query) => ({
    select() {
      return this;
    },
    lean: async () => query.role === 'youth'
      ? studentIds.map((_id) => ({ _id, notificationsEnabled: true }))
      : [{ _id: teamMemberId, notificationsEnabled: true }]
  });
  const originalPushTokenFind = PushToken.find;
  PushToken.find = () => ({
    select() {
      return this;
    },
    lean: async () => []
  });

  try {
    const res = makeResponse();
    await startCourseCall({
      params: { courseId },
      body: { callType: 'audio' },
      user: { id: staffId, role: 'staff' },
      app: {
        get: (name) => {
          if (name === 'io') return io;
          if (name === 'callPushService') {
            return async (recipients) => {
              deliveredPushBatches.push(recipients);
              throw Object.assign(new Error('FCM unavailable'), {
                code: 'messaging/unavailable'
              });
            };
          }
          return undefined;
        }
      }
    }, res);

    assert.equal(res.statusCode, 201);
    assert.equal(createdSession.status, 'ongoing');
    assert.equal(createdSession.callType, 'audio');
    assert.equal(createdSession.courseId, courseId);
    assert.deepEqual(createdSession.invitedStudents, studentIds);
    const invitedRecipients = [
      ...studentIds,
      teamMemberId,
      organizationId
    ];
    assert.equal(insertedNotifications.length, invitedRecipients.length);
    assert.ok(insertedNotifications.every((item) => item.type === 'course_call'));
    assert.ok(insertedNotifications.every((item) => item.message.includes('audio call')));
    assert.deepEqual(
      emittedInvitations.map((item) => item.room),
      [
        ...studentIds.map((studentId) => `user:${studentId}`),
        `user:${teamMemberId}`,
        `user:${organizationId}`
      ]
    );
    assert.ok(emittedInvitations.every((item) => item.event === 'course-call:invitation'));
    assert.ok(emittedInvitations.every((item) => (
      item.payload.actions.includes('join') && item.payload.actions.includes('decline')
    )));
    assert.ok(emittedInvitations.every((item) => (
      item.payload.groupName === 'Course title'
      && item.payload.caller.name === 'Course staff'
      && item.payload.callType === 'audio'
      && Date.parse(item.payload.expiresAt) > Date.now()
    )));
    assert.deepEqual(emittedCallEvents, [{
      room: 'group-chat:111111111111111111111111',
      event: 'course-call:started',
      payload: {
        callSessionId: 'ffffffffffffffffffffffff',
        courseId,
        courseTitle: 'Course title',
        callType: 'audio'
      }
    }]);
    assert.equal(deliveredPushBatches.length, 1);
    assert.equal(deliveredPushBatches[0].length, invitedRecipients.length);
    assert.ok(deliveredPushBatches[0].every((recipient) => (
      recipient.data.type === 'incoming_call'
      && recipient.data.callSessionId === 'ffffffffffffffffffffffff'
      && recipient.data.notificationId
      && recipient.expiresAt instanceof Date
    )));
    assert.equal(createdSession.invitations.length, invitedRecipients.length);
    assert.deepEqual(pushWarnings, [[
      'Firebase call push delivery failed:',
      'messaging/unavailable'
    ]]);
  } finally {
    console.warn = originalWarn;
    Application.find = originals.applicationFind;
    CallSession.create = originals.callSessionCreate;
    CallSession.findOne = originals.callSessionFindOne;
    Course.findById = originals.courseFindById;
    GroupChat.findOne = originals.groupChatFindOne;
    Notification.insertMany = originals.notificationInsertMany;
    Organisation.findById = originals.organisationFindById;
    User.find = originals.userFind;
    User.findById = originals.userFindById;
    PushToken.find = originalPushTokenFind;
  }
});

test('starting a course call rejects unsupported call types', async () => {
  const res = makeResponse();
  await startCourseCall({
    params: { courseId: 'bbbbbbbbbbbbbbbbbbbbbbbb' },
    body: { callType: 'screen-share' }
  }, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /audio or video/i);
});

test('authorized course members can discover the ongoing call for a course', async () => {
  const originals = {
    callSessionFindOne: CallSession.findOne,
    courseFindById: Course.findById,
    organisationFindById: Organisation.findById
  };
  const organisationId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
  const courseId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
  const callSession = {
    _id: 'ffffffffffffffffffffffff',
    courseId,
    roomId: 'room-id',
    status: 'ongoing'
  };

  CallSession.findOne = async () => callSession;
  Course.findById = () => ({
    select: async () => ({
      _id: courseId,
      title: 'Course title',
      organisation: organisationId,
      enrolledStudents: []
    })
  });
  Organisation.findById = () => ({
    select: async () => ({
      _id: organisationId,
      name: 'Course organization',
      role: 'organisation',
      status: 'approved',
      isActive: true
    })
  });

  try {
    const res = makeResponse();
    await getActiveCourseCall({
      params: { courseId },
      user: { id: organisationId, role: 'organisation' }
    }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.callSession._id, callSession._id);
    assert.equal(res.body.data.canEndCall, true);
  } finally {
    CallSession.findOne = originals.callSessionFindOne;
    Course.findById = originals.courseFindById;
    Organisation.findById = originals.organisationFindById;
  }
});

test('ending a call clears invitations and updates the group chat', async () => {
  const originals = {
    callSessionFindById: CallSession.findById,
    courseFindById: Course.findById,
    organisationFindById: Organisation.findById
  };
  const organisationId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
  const courseId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
  const chatId = '111111111111111111111111';
  const studentId = 'dddddddddddddddddddddddd';
  const callSession = {
    _id: 'ffffffffffffffffffffffff',
    courseId,
    groupChatId: chatId,
    roomId: 'room-id',
    status: 'ongoing',
    startedBy: organisationId,
    startedByModel: 'Organisation',
    invitedStudents: [studentId],
    save: async () => {}
  };
  const emittedEvents = [];
  const io = {
    to(room) {
      return {
        emit(event, payload) {
          emittedEvents.push({ room, event, payload });
        }
      };
    }
  };

  CallSession.findById = async () => callSession;
  Course.findById = () => ({
    select: async () => ({
      _id: courseId,
      title: 'Course title',
      organisation: organisationId,
      enrolledStudents: []
    })
  });
  Organisation.findById = () => ({
    select: async () => ({
      _id: organisationId,
      name: 'Course organization',
      role: 'organisation',
      status: 'approved',
      isActive: true
    })
  });

  try {
    const res = makeResponse();
    await endCallSession({
      params: { id: callSession._id },
      user: { id: organisationId, role: 'organisation' },
      app: { get: () => io }
    }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(callSession.status, 'ended');
    assert.deepEqual(
      emittedEvents.map(({ room, event }) => ({ room, event })),
      [
        { room: 'course-call:room-id', event: 'course-call:ended' },
        { room: `group-chat:${chatId}`, event: 'course-call:ended' },
        { room: `user:${studentId}`, event: 'course-call:ended' }
      ]
    );
  } finally {
    CallSession.findById = originals.callSessionFindById;
    Course.findById = originals.courseFindById;
    Organisation.findById = originals.organisationFindById;
  }
});

test('ending a call sends one cancellation identity for every invited account', async () => {
  const originals = {
    callFindById: CallSession.findById,
    courseFindById: Course.findById,
    organisationFindById: Organisation.findById
  };
  const organisationId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
  const courseId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
  const callSession = {
    _id: 'ffffffffffffffffffffffff',
    courseId,
    roomId: 'room-id',
    status: 'ongoing',
    startedBy: organisationId,
    startedByModel: 'Organisation',
    invitations: [
      {
        recipient: 'cccccccccccccccccccccccc',
        recipientModel: 'User',
        notificationId: '111111111111111111111111',
        status: 'pending'
      },
      {
        recipient: 'dddddddddddddddddddddddd',
        recipientModel: 'Organisation',
        notificationId: '222222222222222222222222',
        status: 'pending'
      }
    ],
    save: async () => {}
  };
  const pushBatches = [];
  CallSession.findById = async () => callSession;
  Course.findById = () => ({
    select: async () => ({
      _id: courseId,
      title: 'Course title',
      organisation: organisationId,
      enrolledStudents: []
    })
  });
  Organisation.findById = () => ({
    select: async () => ({
      _id: organisationId,
      name: 'Course organization',
      role: 'organisation',
      status: 'approved',
      isActive: true
    })
  });

  try {
    const response = makeResponse();
    await endCallSession({
      params: { id: callSession._id },
      user: { id: organisationId, role: 'organisation' },
      app: {
        get: (name) => {
          if (name === 'io') return null;
          if (name === 'callPushService') {
            return async (recipients, options) => {
              pushBatches.push({ recipients, options });
              return { sentCount: 0 };
            };
          }
          return undefined;
        }
      }
    }, response);

    assert.equal(response.statusCode, 200);
    assert.equal(callSession.status, 'ended');
    assert.equal(pushBatches.length, 1);
    assert.ok(callSession.invitations.every((invite) => invite.status === 'cancelled'));
    assert.deepEqual(
      pushBatches[0].recipients.map((recipient) => recipient.data.notificationId),
      ['111111111111111111111111', '222222222222222222222222']
    );
    assert.ok(pushBatches[0].recipients.every(
      (recipient) => recipient.data.type === 'call_cancelled'
    ));
    assert.deepEqual(pushBatches[0].options, { respectNotificationsEnabled: false });
  } finally {
    CallSession.findById = originals.callFindById;
    Course.findById = originals.courseFindById;
    Organisation.findById = originals.organisationFindById;
  }
});

test('an enrolled student can fetch an ended call session for discussion routing', async () => {
  const originals = {
    applicationExists: Application.exists,
    callSessionFindById: CallSession.findById,
    courseFindById: Course.findById,
    userFindById: User.findById
  };
  const studentId = 'dddddddddddddddddddddddd';
  const courseId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
  const callSession = {
    _id: 'ffffffffffffffffffffffff',
    courseId,
    roomId: 'room-id',
    status: 'ended',
    startedBy: 'cccccccccccccccccccccccc',
    startedByModel: 'User'
  };

  Application.exists = async () => true;
  CallSession.findById = async () => callSession;
  Course.findById = () => ({
    select: async () => ({
      _id: courseId,
      title: 'Course title',
      organisation: 'aaaaaaaaaaaaaaaaaaaaaaaa',
      enrolledStudents: []
    })
  });
  User.findById = () => ({
    select: async () => ({
      _id: studentId,
      fullName: 'Student',
      role: 'youth',
      isActive: true,
      isSuspended: false
    })
  });

  try {
    const res = makeResponse();
    await getCallSession({
      params: { id: callSession._id },
      user: { id: studentId, role: 'youth' }
    }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.callSession.status, 'ended');
    assert.equal(res.body.data.course._id, courseId);
  } finally {
    Application.exists = originals.applicationExists;
    CallSession.findById = originals.callSessionFindById;
    Course.findById = originals.courseFindById;
    User.findById = originals.userFindById;
  }
});

test('accepting a pending invitation is authorized, persisted and idempotent', async () => {
  const session = {
    _id: '111111111111111111111111',
    courseId: 'bbbbbbbbbbbbbbbbbbbbbbbb',
    status: 'ongoing',
    invitations: [{
      recipient: 'aaaaaaaaaaaaaaaaaaaaaaaa',
      recipientModel: 'User',
      notificationId: '222222222222222222222222',
      status: 'pending',
      expiresAt: new Date(Date.now() + 30000)
    }]
  };
  const mocks = setupYouthInvitationAction(session);

  try {
    const firstResponse = makeResponse();
    await acceptCallSession(mocks.req, firstResponse);
    assert.equal(firstResponse.statusCode, 200);
    assert.equal(session.invitations[0].status, 'accepted');
    assert.equal(mocks.invitationUpdates.length, 1);
    assert.equal(mocks.notificationUpdates.length, 1);
    assert.equal(mocks.pushBatches.length, 1);

    const secondResponse = makeResponse();
    await acceptCallSession(mocks.req, secondResponse);
    assert.equal(secondResponse.statusCode, 200);
    assert.equal(mocks.invitationUpdates.length, 1);
    assert.equal(session.status, 'ongoing');
  } finally {
    mocks.restore();
  }
});

test('a course member who was not invited cannot accept a call', async () => {
  const session = {
    _id: '111111111111111111111111',
    courseId: 'bbbbbbbbbbbbbbbbbbbbbbbb',
    status: 'ongoing',
    invitations: [{
      recipient: 'dddddddddddddddddddddddd',
      recipientModel: 'User',
      notificationId: '222222222222222222222222',
      status: 'pending',
      expiresAt: new Date(Date.now() + 30000)
    }]
  };
  const mocks = setupYouthInvitationAction(session);

  try {
    const response = makeResponse();
    await acceptCallSession(mocks.req, response);

    assert.equal(response.statusCode, 403);
    assert.equal(mocks.invitationUpdates.length, 0);
    assert.equal(mocks.pushBatches.length, 0);
  } finally {
    mocks.restore();
  }
});

test('expired call invitations are marked expired and cannot be accepted', async () => {
  const session = {
    _id: '111111111111111111111111',
    courseId: 'bbbbbbbbbbbbbbbbbbbbbbbb',
    status: 'ongoing',
    invitations: [{
      recipient: 'aaaaaaaaaaaaaaaaaaaaaaaa',
      recipientModel: 'User',
      notificationId: '222222222222222222222222',
      status: 'pending',
      expiresAt: new Date(Date.now() - 1000)
    }]
  };
  const mocks = setupYouthInvitationAction(session);

  try {
    const response = makeResponse();
    await acceptCallSession(mocks.req, response);

    assert.equal(response.statusCode, 410);
    assert.deepEqual(
      mocks.invitationUpdates[0].update,
      { $set: { 'invitations.$.status': 'expired' } }
    );
    assert.equal(mocks.notificationUpdates.length, 1);
    assert.equal(mocks.pushBatches[0][0].data.type, 'call_cancelled');
  } finally {
    mocks.restore();
  }
});

test('declining one group invitation does not end the call or affect other invitees', async () => {
  const session = {
    _id: '111111111111111111111111',
    courseId: 'bbbbbbbbbbbbbbbbbbbbbbbb',
    status: 'ongoing',
    invitations: [
      {
        recipient: 'aaaaaaaaaaaaaaaaaaaaaaaa',
        recipientModel: 'User',
        notificationId: '222222222222222222222222',
        status: 'pending',
        expiresAt: new Date(Date.now() + 30000)
      },
      {
        recipient: 'dddddddddddddddddddddddd',
        recipientModel: 'User',
        notificationId: '333333333333333333333333',
        status: 'pending',
        expiresAt: new Date(Date.now() + 30000)
      }
    ]
  };
  const mocks = setupYouthInvitationAction(session);

  try {
    const response = makeResponse();
    await declineCallSession(mocks.req, response);

    assert.equal(response.statusCode, 200);
    assert.equal(session.status, 'ongoing');
    assert.equal(session.invitations[0].status, 'declined');
    assert.equal(session.invitations[1].status, 'pending');
    assert.equal(mocks.invitationUpdates[0].update.$addToSet.declinedBy, mocks.actorId);
  } finally {
    mocks.restore();
  }
});
