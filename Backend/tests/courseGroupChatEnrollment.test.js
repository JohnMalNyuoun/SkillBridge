const test = require('node:test');
const assert = require('node:assert/strict');
const Course = require('../models/course');
const GroupChat = require('../models/GroupChat');
const { addEnrolledStudentToCourse } = require('../services/courseGroupChatEnrollment');

test('accepting an applicant adds them to course enrollment and the linked group chat', async () => {
  const originalFindOneAndUpdate = Course.findOneAndUpdate;
  const originalUpdateOne = GroupChat.updateOne;
  const calls = [];

  Course.findOneAndUpdate = (filter, update, options) => {
    calls.push({ filter, update, options });
    return { select: async () => ({ groupChatId: 'chat-id' }) };
  };
  GroupChat.updateOne = async (filter, update) => {
    calls.push({ filter, update });
  };

  try {
    await addEnrolledStudentToCourse({
      courseId: 'course-id',
      organisationId: 'organisation-id',
      userId: 'student-id'
    });
  } finally {
    Course.findOneAndUpdate = originalFindOneAndUpdate;
    GroupChat.updateOne = originalUpdateOne;
  }

  assert.deepEqual(calls, [
    {
      filter: { _id: 'course-id', organisation: 'organisation-id' },
      update: { $addToSet: { enrolledStudents: 'student-id' } },
      options: { new: true }
    },
    {
      filter: { _id: 'chat-id' },
      update: { $addToSet: { participants: 'student-id' } }
    }
  ]);
});
