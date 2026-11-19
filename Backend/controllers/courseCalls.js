const crypto = require('crypto');
const mongoose = require('mongoose');
const Application = require('../models/Application');
const CallSession = require('../models/CallSession');
const Course = require('../models/course');
const GroupChat = require('../models/GroupChat');
const Notification = require('../models/Notification');
const User = require('../models/Users');
const { success, error } = require('../utils/apiResponse');
const {
  idString,
  loadCallActor,
  getCourseCallContext,
  findAccessibleCall
} = require('../services/courseCallAccess');

const getEnrolledStudentIds = async (course) => {
  const applications = await Application.find({
    course: course._id,
    $or: [
      { status: 'accepted' },
      { completionStatus: 'enrolled' }
    ]
  }).select('youth').lean();
  const ids = [...new Set([
    ...(course.enrolledStudents || []).map(idString),
    ...applications.map((application) => idString(application.youth))
  ])];

  if (ids.length === 0) return [];
  const students = await User.find({
    _id: { $in: ids },
    role: 'youth',
    isActive: true,
    isSuspended: false
  }).select('_id').lean();
  return students.map((student) => student._id);
};

const getCourseForCall = async (courseId, actor) => {
  if (!mongoose.isObjectIdOrHexString(courseId)) return null;
  const course = await Course.findById(courseId)
    .select('title organisation enrolledStudents');
  if (!course) return null;

  const identityOrgId = actor.role === 'organisation' ? actor.id : actor.createdByOrg;
  if (!identityOrgId || idString(identityOrgId) !== idString(course.organisation)) return null;
  if (!['organisation', 'org_admin', 'staff', 'trainee'].includes(actor.role)) return null;
  return course;
};

const startCourseCall = async (req, res) => {
  try {
    const callType = req.body?.callType || 'video';
    if (!['audio', 'video'].includes(callType)) {
      return error(res, 400, 'Call type must be audio or video.');
    }

    const actor = await loadCallActor(req.user);
    if (!actor) return error(res, 403, 'Your account cannot start a course call.');

    const course = await getCourseForCall(req.params.courseId, actor);
    if (!course) return error(res, 404, 'Course not found or you cannot start a call for it.');

    const groupChat = await GroupChat.findOne({ course: course._id }).select('_id');
    if (!groupChat) return error(res, 409, 'Create the course group chat before starting a call.');

    const activeCall = await CallSession.findOne({ courseId: course._id, status: 'ongoing' });
    if (activeCall) {
      return success(res, 200, 'A call is already ongoing for this course.', {
        callSession: activeCall,
        course: { _id: course._id, title: course.title }
      });
    }

    const studentIds = await getEnrolledStudentIds(course);
    if (studentIds.length === 0) {
      return error(res, 400, 'There are no active enrolled students to invite.');
    }

    let callSession;
    try {
      callSession = await CallSession.create({
        courseId: course._id,
        groupChatId: groupChat._id,
        roomId: crypto.randomUUID(),
        status: 'ongoing',
        callType,
        startedBy: actor.id,
        startedByModel: actor.role === 'organisation' ? 'Organisation' : 'User',
        invitedStudents: studentIds
      });
    } catch (err) {
      if (err.code !== 11000) throw err;
      const concurrentCall = await CallSession.findOne({
        courseId: course._id,
        status: 'ongoing'
      });
      if (!concurrentCall) throw err;
      return success(res, 200, 'A call is already ongoing for this course.', {
        callSession: concurrentCall,
        course: { _id: course._id, title: course.title }
      });
    }

    const notifications = studentIds.map((studentId) => ({
      recipient: studentId,
      recipientModel: 'User',
      title: 'Course group call',
      message: `${actor.fullName} started ${callType === 'audio' ? 'an' : 'a'} ${callType} call for ${course.title}.`,
      type: 'course_call',
      reference: callSession._id,
      referenceModel: 'CallSession',
      course: course._id,
      sender: actor.id,
      senderModel: actor.role === 'organisation' ? 'Organisation' : 'User'
    }));

    let createdNotifications;
    try {
      createdNotifications = await Notification.insertMany(notifications);
    } catch (err) {
      callSession.status = 'ended';
      callSession.endedAt = new Date();
      await callSession.save();
      throw err;
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`group-chat:${idString(groupChat._id)}`).emit('course-call:started', {
        callSessionId: idString(callSession._id),
        courseId: idString(course._id),
        courseTitle: course.title,
        callType: callSession.callType
      });
      createdNotifications.forEach((notification) => {
        io.to(`user:${idString(notification.recipient)}`).emit('course-call:invitation', {
          notificationId: idString(notification._id),
          callSessionId: idString(callSession._id),
          courseId: idString(course._id),
          roomId: callSession.roomId,
          callType: callSession.callType,
          title: notification.title,
          message: notification.message,
          actions: ['join', 'decline']
        });
      });
    }

    return success(res, 201, 'Course call started and enrolled students were invited.', {
      callSession,
      course: { _id: course._id, title: course.title }
    });
  } catch (err) {
    return error(res, 500, err.message);
  }
};

const getCallSession = async (req, res) => {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
      return error(res, 400, 'Invalid call session ID.');
    }

    const actor = await loadCallActor(req.user);
    const accessibleCall = actor
      ? await findAccessibleCall(req.params.id, actor)
      : null;
    if (!accessibleCall) return error(res, 404, 'Call session not found.');

    return success(res, 200, 'Call session fetched.', {
      callSession: accessibleCall.session,
      course: {
        _id: accessibleCall.course._id,
        title: accessibleCall.course.title
      },
      canEndCall: accessibleCall.canEnd
    });
  } catch (err) {
    return error(res, 500, err.message);
  }
};

const getActiveCourseCall = async (req, res) => {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.courseId)) {
      return error(res, 400, 'Invalid course ID.');
    }

    const actor = await loadCallActor(req.user);
    if (!actor) return error(res, 403, 'Your account cannot access course calls.');

    const callSession = await CallSession.findOne({
      courseId: req.params.courseId,
      status: 'ongoing'
    });
    const context = await getCourseCallContext(
      callSession || { courseId: req.params.courseId },
      actor
    );
    if (!context.course || !context.canAccess) {
      return error(res, 404, 'Course call not found.');
    }

    return success(res, 200, 'Active course call fetched.', {
      callSession,
      course: {
        _id: context.course._id,
        title: context.course.title
      },
      canEndCall: context.canEnd
    });
  } catch (err) {
    return error(res, 500, err.message);
  }
};

const endCallSession = async (req, res) => {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
      return error(res, 400, 'Invalid call session ID.');
    }

    const actor = await loadCallActor(req.user);
    const accessibleCall = actor
      ? await findAccessibleCall(req.params.id, actor)
      : null;
    if (!accessibleCall) return error(res, 404, 'Call session not found.');
    if (!accessibleCall.canEnd) return error(res, 403, 'You cannot end this call.');
    if (accessibleCall.session.status === 'ended') {
      return success(res, 200, 'Call has already ended.', {
        callSession: accessibleCall.session
      });
    }

    accessibleCall.session.status = 'ended';
    accessibleCall.session.endedAt = new Date();
    await accessibleCall.session.save();

    const io = req.app.get('io');
    if (io) {
      const event = {
        callSessionId: idString(accessibleCall.session._id),
        courseId: idString(accessibleCall.course._id)
      };
      io.to(`course-call:${accessibleCall.session.roomId}`).emit('course-call:ended', event);
      const groupChatId = accessibleCall.session.groupChatId || accessibleCall.course.groupChatId;
      if (groupChatId) {
        io.to(`group-chat:${idString(groupChatId)}`).emit('course-call:ended', event);
      }
      (accessibleCall.session.invitedStudents || []).forEach((studentId) => {
        io.to(`user:${idString(studentId)}`).emit('course-call:ended', event);
      });
    }

    return success(res, 200, 'Call ended.', { callSession: accessibleCall.session });
  } catch (err) {
    return error(res, 500, err.message);
  }
};

const declineCallSession = async (req, res) => {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
      return error(res, 400, 'Invalid call session ID.');
    }

    const actor = await loadCallActor(req.user);
    if (!actor || actor.role !== 'youth') {
      return error(res, 403, 'Only enrolled students can decline a course call.');
    }

    const accessibleCall = await findAccessibleCall(req.params.id, actor);
    if (!accessibleCall) return error(res, 404, 'Call session not found.');

    await CallSession.updateOne(
      { _id: accessibleCall.session._id },
      { $addToSet: { declinedBy: actor.id } }
    );
    await Notification.updateOne(
      {
        recipient: actor.id,
        recipientModel: 'User',
        reference: accessibleCall.session._id,
        referenceModel: 'CallSession'
      },
      { $set: { isRead: true } }
    );

    return success(res, 200, 'Call invitation declined.');
  } catch (err) {
    return error(res, 500, err.message);
  }
};

module.exports = {
  startCourseCall,
  getCallSession,
  getActiveCourseCall,
  endCallSession,
  declineCallSession
};
