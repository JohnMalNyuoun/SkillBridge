const test = require('node:test');
const assert = require('node:assert/strict');
const Application = require('../models/Application');
const Course = require('../models/course');
const GroupChat = require('../models/GroupChat');
const GroupChatMessage = require('../models/GroupChatMessage');
const User = require('../models/Users');
const { getCourseGroupChat } = require('../controllers/organisation/groupChat');

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

const runGetCourseGroupChat = async (applications) => {
  const originals = {
    applicationFind: Application.find,
    courseFindOne: Course.findOne,
    groupChatFindById: GroupChat.findById,
    groupChatUpdateOne: GroupChat.updateOne,
    messageFind: GroupChatMessage.find,
    userFind: User.find,
    userFindById: User.findById
  };
  const studentId = 'dddddddddddddddddddddddd';
  const courseId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
  const chatId = 'cccccccccccccccccccccccc';
  const updatedParticipants = [];
  const chat = {
    _id: chatId,
    course: courseId,
    organisation: 'organisation-id',
    participants: [],
    moderators: []
  };
  let groupChatLookupCount = 0;

  Application.find = () => ({
    select() {
      return this;
    },
    lean: async () => applications
  });
  Course.findOne = async () => ({
    _id: courseId,
    groupChatId: chatId,
    enrolledStudents: []
  });
  GroupChat.findById = (id) => {
    if (groupChatLookupCount++ === 0) return Promise.resolve(chat);
    return {
      populate() {
        return this;
      },
      lean: async () => ({
        ...chat,
        participants: updatedParticipants.map((_id) => ({
          _id,
          fullName: 'Enrolled student',
          role: 'youth'
        })),
        moderators: []
      })
    };
  };
  GroupChat.updateOne = async (_filter, update) => {
    const participants = update.$addToSet.participants;
    updatedParticipants.push(...(participants.$each || [participants]));
  };
  GroupChatMessage.find = () => ({
    sort() {
      return this;
    },
    limit() {
      return this;
    },
    populate() {
      return this;
    },
    lean: async () => []
  });
  User.findById = () => ({
    select: async () => ({
      _id: studentId,
      role: 'youth',
      isActive: true,
      isSuspended: false
    })
  });
  User.find = (filter) => ({
    select() {
      return this;
    },
    lean: async () => (
      filter.role ? [] : applications.map((application) => ({
        _id: application.youth,
        fullName: 'Enrolled student',
        role: 'youth'
      }))
    )
  });

  try {
    const res = makeResponse();
    await getCourseGroupChat({
      params: { courseId },
      user: { id: studentId, role: 'youth' }
    }, res);
    return { res, updatedParticipants };
  } finally {
    Application.find = originals.applicationFind;
    Course.findOne = originals.courseFindOne;
    GroupChat.findById = originals.groupChatFindById;
    GroupChat.updateOne = originals.groupChatUpdateOne;
    GroupChatMessage.find = originals.messageFind;
    User.find = originals.userFind;
    User.findById = originals.userFindById;
  }
};

test('accepted students are added to an existing chat and can read it', async () => {
  const { res, updatedParticipants } = await runGetCourseGroupChat([
    { youth: 'dddddddddddddddddddddddd' }
  ]);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(updatedParticipants, ['dddddddddddddddddddddddd']);
  assert.equal(res.body.data.chat.participants[0]._id, 'dddddddddddddddddddddddd');
});

test('students without an accepted enrollment cannot read or join an existing chat', async () => {
  const { res, updatedParticipants } = await runGetCourseGroupChat([]);

  assert.equal(res.statusCode, 403);
  assert.deepEqual(updatedParticipants, []);
});
