const test = require('node:test');
const assert = require('node:assert/strict');
const Application = require('../models/Application');
const Course = require('../models/course');
const GroupChat = require('../models/GroupChat');
const User = require('../models/Users');
const { updateGroupChatMembers } = require('../controllers/organisation/groupChat');

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

const withGroupChatStubs = async ({ actor, chat, userId, action }, run) => {
  const originals = {
    applicationFind: Application.find,
    courseFindOne: Course.findOne,
    groupChatFindById: GroupChat.findById,
    groupChatUpdateOne: GroupChat.updateOne,
    userFindById: User.findById,
    userFindOne: User.findOne
  };
  const courseId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
  const studentId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
  let update;

  Application.find = () => ({
    select() {
      return this;
    },
    lean: async () => []
  });
  Course.findOne = async () => ({
    _id: courseId,
    groupChatId: chat._id,
    enrolledStudents: [studentId]
  });
  GroupChat.findById = async () => chat;
  GroupChat.updateOne = async (_filter, updateDocument) => {
    update = updateDocument;
  };
  User.findById = () => ({
    select: async () => actor
  });
  User.findOne = () => ({
    select: async () => ({ _id: studentId })
  });

  try {
    const response = makeResponse();
    await updateGroupChatMembers({
      params: { courseId },
      body: { userId: userId || studentId, action },
      user: { id: actor._id, role: actor.role },
      app: { get: () => null }
    }, response);
    await run({ response, update, studentId });
  } finally {
    Application.find = originals.applicationFind;
    Course.findOne = originals.courseFindOne;
    GroupChat.findById = originals.groupChatFindById;
    GroupChat.updateOne = originals.groupChatUpdateOne;
    User.findById = originals.userFindById;
    User.findOne = originals.userFindOne;
  }
};

test('ordinary members cannot add or remove other group members', async () => {
  const chat = {
    _id: 'cccccccccccccccccccccccc',
    organisation: 'dddddddddddddddddddddddd',
    participants: ['eeeeeeeeeeeeeeeeeeeeeeee'],
    moderators: []
  };

  await withGroupChatStubs({
    actor: {
      _id: 'eeeeeeeeeeeeeeeeeeeeeeee',
      role: 'youth',
      isActive: true,
      isSuspended: false
    },
    chat,
    action: 'add'
  }, ({ response, update }) => {
    assert.equal(response.statusCode, 403);
    assert.equal(update, undefined);
  });
});

test('authorized additions use set semantics and clear a prior removal marker', async () => {
  const organizationId = 'dddddddddddddddddddddddd';
  const chat = {
    _id: 'cccccccccccccccccccccccc',
    organisation: organizationId,
    participants: [],
    moderators: ['ffffffffffffffffffffffff']
  };

  await withGroupChatStubs({
    actor: {
      _id: 'ffffffffffffffffffffffff',
      role: 'staff',
      createdByOrg: organizationId,
      isActive: true,
      isSuspended: false
    },
    chat,
    action: 'add'
  }, ({ response, update, studentId }) => {
    assert.equal(response.statusCode, 200);
    assert.deepEqual(update.$addToSet, { participants: studentId });
    assert.deepEqual(update.$pull, { removedParticipants: studentId });
  });
});

test('group owner cannot be removed through member management', async () => {
  const ownerId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
  const organizationId = 'dddddddddddddddddddddddd';
  const chat = {
    _id: 'cccccccccccccccccccccccc',
    organisation: organizationId,
    createdBy: ownerId,
    createdByModel: 'User',
    participants: [ownerId],
    moderators: []
  };

  await withGroupChatStubs({
    actor: {
      _id: 'ffffffffffffffffffffffff',
      role: 'org_admin',
      createdByOrg: organizationId,
      isActive: true,
      isSuspended: false
    },
    chat,
    userId: ownerId,
    action: 'remove'
  }, ({ response, update }) => {
    assert.equal(response.statusCode, 403);
    assert.equal(update, undefined);
  });
});
