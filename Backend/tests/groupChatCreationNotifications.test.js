const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Application = require('../models/Application');
const Course = require('../models/course');
const GroupChat = require('../models/GroupChat');
const Notification = require('../models/Notification');
const { createCourseGroupChat } = require('../controllers/organisation/groupChat');

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

test('creating a course group chat notifies each enrolled student with a live nav update', async () => {
  const originals = {
    applicationFind: Application.find,
    courseFindOne: Course.findOne,
    groupChatCreate: GroupChat.create,
    groupChatFindOne: GroupChat.findOne,
    notificationInsertMany: Notification.insertMany
  };
  const courseId = new mongoose.Types.ObjectId();
  const organizationId = new mongoose.Types.ObjectId();
  const organizationUserId = new mongoose.Types.ObjectId();
  const enrolledStudentId = new mongoose.Types.ObjectId();
  const acceptedStudentId = new mongoose.Types.ObjectId();
  const chatId = new mongoose.Types.ObjectId();
  const course = {
    _id: courseId,
    title: 'Digital Skills',
    organisation: organizationId,
    enrolledStudents: [enrolledStudentId],
    groupChatId: null,
    save: async () => {}
  };
  const createdNotifications = [];
  const emittedNotifications = [];
  const io = {
    to(room) {
      return {
        emit(eventName, payload) {
          emittedNotifications.push({ room, eventName, payload });
        }
      };
    }
  };

  Application.find = () => ({
    select() {
      return this;
    },
    lean: async () => [{ youth: acceptedStudentId }]
  });
  Course.findOne = async () => course;
  GroupChat.findOne = async () => null;
  GroupChat.create = async (data) => ({ _id: chatId, ...data });
  Notification.insertMany = async (notifications) => {
    createdNotifications.push(...notifications);
    return notifications;
  };

  try {
    const res = makeResponse();
    await createCourseGroupChat({
      params: { courseId: courseId.toString() },
      user: { id: organizationUserId.toString(), role: 'org_admin' },
      app: { get: () => io }
    }, res);

    assert.equal(res.statusCode, 201);
    assert.deepEqual(
      createdNotifications.map((notification) => notification.recipient.toString()).sort(),
      [enrolledStudentId.toString(), acceptedStudentId.toString()].sort()
    );
    assert.ok(createdNotifications.every((notification) => (
      notification.type === 'group_chat_created'
      && notification.course.equals(courseId)
      && notification.reference.equals(courseId)
    )));
    assert.deepEqual(
      emittedNotifications.map(({ room, eventName }) => [room, eventName]).sort(),
      [
        [`user:${enrolledStudentId}`, 'notification:new'],
        [`user:${acceptedStudentId}`, 'notification:new']
      ].sort()
    );
  } finally {
    Application.find = originals.applicationFind;
    Course.findOne = originals.courseFindOne;
    GroupChat.create = originals.groupChatCreate;
    GroupChat.findOne = originals.groupChatFindOne;
    Notification.insertMany = originals.notificationInsertMany;
  }
});
