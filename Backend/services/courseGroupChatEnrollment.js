const Course = require('../models/course');
const GroupChat = require('../models/GroupChat');

const addEnrolledStudentToCourse = async ({ courseId, organisationId, userId }) => {
  const course = await Course.findOneAndUpdate(
    { _id: courseId, organisation: organisationId },
    { $addToSet: { enrolledStudents: userId } },
    { new: true }
  ).select('groupChatId');

  if (!course) {
    throw new Error('Course not found while updating enrollment.');
  }

  const chat = course.groupChatId
    ? { _id: course.groupChatId }
    : await GroupChat.findOne({ course: courseId }).select('_id');

  if (chat) {
    await GroupChat.updateOne(
      { _id: chat._id },
      { $addToSet: { participants: userId } }
    );
  }
};

module.exports = { addEnrolledStudentToCourse };
