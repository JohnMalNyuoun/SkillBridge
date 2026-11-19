const test = require('node:test');
const assert = require('node:assert/strict');
const Application = require('../models/Application');
const CallSession = require('../models/CallSession');
const Course = require('../models/course');
const GroupChat = require('../models/GroupChat');
const Notification = require('../models/Notification');
const Organisation = require('../models/Organisation');
const User = require('../models/Users');
const {
  startCourseCall,
  getCallSession
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

test('starting a course call creates an invitation for every enrolled student', async () => {
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
  const studentIds = [
    'dddddddddddddddddddddddd',
    'eeeeeeeeeeeeeeeeeeeeeeee'
  ];
  const insertedNotifications = [];
  const emittedInvitations = [];
  let createdSession;
  const io = {
    to(room) {
      return {
        emit(event, payload) {
          emittedInvitations.push({ room, event, payload });
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
    select: async () => ({ status: 'approved', isActive: true })
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
  User.find = () => ({
    select() {
      return this;
    },
    lean: async () => studentIds.map((_id) => ({ _id }))
  });

  try {
    const res = makeResponse();
    await startCourseCall({
      params: { courseId },
      user: { id: staffId, role: 'staff' },
      app: { get: () => io }
    }, res);

    assert.equal(res.statusCode, 201);
    assert.equal(createdSession.status, 'ongoing');
    assert.equal(createdSession.courseId, courseId);
    assert.equal(insertedNotifications.length, studentIds.length);
    assert.ok(insertedNotifications.every((item) => item.type === 'course_call'));
    assert.deepEqual(
      emittedInvitations.map((item) => item.room),
      studentIds.map((studentId) => `user:${studentId}`)
    );
    assert.ok(emittedInvitations.every((item) => item.event === 'course-call:invitation'));
    assert.ok(emittedInvitations.every((item) => (
      item.payload.actions.includes('join') && item.payload.actions.includes('decline')
    )));
  } finally {
    Application.find = originals.applicationFind;
    CallSession.create = originals.callSessionCreate;
    CallSession.findOne = originals.callSessionFindOne;
    Course.findById = originals.courseFindById;
    GroupChat.findOne = originals.groupChatFindOne;
    Notification.insertMany = originals.notificationInsertMany;
    Organisation.findById = originals.organisationFindById;
    User.find = originals.userFind;
    User.findById = originals.userFindById;
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
