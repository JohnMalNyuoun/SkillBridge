const crypto = require('crypto');
const mongoose = require('mongoose');
const Application = require('../models/Application');
const CallSession = require('../models/CallSession');
const Course = require('../models/course');
const GroupChat = require('../models/GroupChat');
const Notification = require('../models/Notification');
const Organisation = require('../models/Organisation');
const User = require('../models/Users');
const { sendCallPushNotifications } = require('../services/callPushNotifications');
const { success, error } = require('../utils/apiResponse');
const {
  idString,
  loadCallActor,
  getCourseCallContext,
  findAccessibleCall,
  canJoinCallSession
} = require('../services/courseCallAccess');

const INVITATION_TTL_MS = 60 * 1000;

const cancelPendingInvitations = (session, cancelledAt) => {
  (session.invitations || []).forEach((invitation) => {
    if (invitation.status === 'pending') {
      invitation.status = 'cancelled';
      invitation.respondedAt = cancelledAt;
    }
  });
};

const sendCallPush = async (req, recipients, options) => {
  const configuredService = req.app?.get?.('callPushService');
  const send = typeof configuredService === 'function'
    ? configuredService
    : sendCallPushNotifications;
  try {
    return await send(recipients, options);
  } catch (err) {
    console.warn('Firebase call push delivery failed:', err.code || err.name || 'unknown');
    return { sentCount: 0, removedTokenCount: 0, failed: true };
  }
};

const getEnrolledStudents = async (course) => {
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
  return User.find({
    _id: { $in: ids },
    role: 'youth',
    isActive: true,
    isSuspended: false
  }).select('_id notificationsEnabled').lean();
};

const getCallRecipients = async (course, students, actor) => {
  const [organisation, teamMembers] = await Promise.all([
    Organisation.findById(course.organisation)
      .select('_id notificationsEnabled status isActive'),
    User.find({
      createdByOrg: course.organisation,
      role: { $in: ['org_admin', 'staff', 'trainee'] },
      isActive: true,
      isSuspended: false
    }).select('_id notificationsEnabled').lean()
  ]);
  const candidates = [
    ...students.map((student) => ({
      accountId: student._id,
      accountModel: 'User',
      notificationsEnabled: student.notificationsEnabled
    })),
    ...teamMembers.map((member) => ({
      accountId: member._id,
      accountModel: 'User',
      notificationsEnabled: member.notificationsEnabled
    }))
  ];
  if (organisation?.isActive && organisation.status === 'approved') {
    candidates.push({
      accountId: organisation._id,
      accountModel: 'Organisation',
      notificationsEnabled: organisation.notificationsEnabled
    });
  }

  const actorModel = actor.role === 'organisation' ? 'Organisation' : 'User';
  return [...new Map(candidates
    .filter((recipient) => (
      idString(recipient.accountId) !== idString(actor.id)
      || recipient.accountModel !== actorModel
    ))
    .map((recipient) => [
      `${recipient.accountModel}:${idString(recipient.accountId)}`,
      recipient
    ])).values()];
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

    const students = await getEnrolledStudents(course);
    const studentIds = students.map((student) => student._id);
    const recipients = await getCallRecipients(course, students, actor);
    if (recipients.length === 0) {
      return error(res, 400, 'There are no eligible active participants to invite.');
    }

    const invitationExpiresAt = new Date(Date.now() + INVITATION_TTL_MS);
    const notificationIdByRecipient = new Map();
    recipients.forEach((recipient) => {
      notificationIdByRecipient.set(
        `${recipient.accountModel}:${idString(recipient.accountId)}`,
        new mongoose.Types.ObjectId()
      );
    });
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
        invitedStudents: studentIds,
        invitationExpiresAt,
        invitations: recipients.map((recipient) => ({
          recipient: recipient.accountId,
          recipientModel: recipient.accountModel,
          notificationId: notificationIdByRecipient.get(
            `${recipient.accountModel}:${idString(recipient.accountId)}`
          ),
          status: 'pending',
          expiresAt: invitationExpiresAt
        }))
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

    const notifications = recipients.map((recipient) => ({
      _id: notificationIdByRecipient.get(
        `${recipient.accountModel}:${idString(recipient.accountId)}`
      ),
      recipient: recipient.accountId,
      recipientModel: recipient.accountModel,
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
      cancelPendingInvitations(callSession, callSession.endedAt);
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
          groupName: course.title,
          roomId: callSession.roomId,
          callType: callSession.callType,
          caller: {
            name: actor.fullName || 'SkillBridge member',
            photo: actor.photo || null
          },
          expiresAt: invitationExpiresAt.toISOString(),
          title: notification.title,
          message: notification.message,
          actions: ['join', 'decline']
        });
      });
    }

    await sendCallPush(req, recipients.map((recipient) => ({
      ...recipient,
      expiresAt: invitationExpiresAt,
      data: {
        type: 'incoming_call',
        callSessionId: idString(callSession._id),
        notificationId: idString(notificationIdByRecipient.get(
          `${recipient.accountModel}:${idString(recipient.accountId)}`
        )),
        callerName: (actor.fullName || 'SkillBridge member').slice(0, 120),
        courseTitle: String(course.title || 'Course group').slice(0, 180),
        callType,
        expiresAt: invitationExpiresAt.toISOString()
      }
    })));

    return success(res, 201, 'Course call started and eligible participants were invited.', {
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
    if (
      accessibleCall.session.status === 'ongoing'
      && !canJoinCallSession(accessibleCall.session, actor)
    ) {
      return error(res, 403, 'Accept the call invitation before joining.');
    }

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
    cancelPendingInvitations(accessibleCall.session, accessibleCall.session.endedAt);
    await accessibleCall.session.save();

    const io = req.app.get('io');
    const invitations = accessibleCall.session.invitations || [];
    await sendCallPush(req, invitations.map((invitation) => ({
      accountId: invitation.recipient,
      accountModel: invitation.recipientModel,
      data: {
        type: 'call_cancelled',
        callSessionId: idString(accessibleCall.session._id),
        notificationId: idString(invitation.notificationId)
      }
    })), { respectNotificationsEnabled: false });
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
      const recipients = invitations.length > 0
        ? invitations.map((invitation) => invitation.recipient)
        : accessibleCall.session.invitedStudents || [];
      recipients.forEach((recipientId) => {
        io.to(`user:${idString(recipientId)}`).emit('course-call:ended', event);
      });
    }

    return success(res, 200, 'Call ended.', { callSession: accessibleCall.session });
  } catch (err) {
    return error(res, 500, err.message);
  }
};

const setCallInvitationResponse = async (session, actor, response) => {
  const invitations = session.invitations || [];
  if (invitations.length === 0) {
    if (response === 'declined' && actor.role === 'youth') {
      await CallSession.updateOne(
        { _id: session._id },
        { $addToSet: { declinedBy: actor.id } }
      );
    }
    return { status: 'updated', session };
  }

  const accountModel = actor.role === 'organisation' ? 'Organisation' : 'User';
  const invitation = invitations.find((item) => (
    idString(item.recipient) === idString(actor.id)
    && item.recipientModel === accountModel
  ));
  if (!invitation) return { status: 'not_invited' };
  if (invitation.status === response) return { status: 'updated', invitation };
  if (invitation.status !== 'pending') {
    return { status: invitation.status === 'expired' || invitation.status === 'cancelled'
      ? 'expired'
      : 'conflict' };
  }

  const now = new Date();
  const baseFilter = {
    _id: session._id,
    status: 'ongoing',
    invitations: {
      $elemMatch: {
        recipient: actor.id,
        recipientModel: accountModel,
        status: 'pending'
      }
    }
  };
  if (new Date(invitation.expiresAt).getTime() <= now.getTime()) {
    await CallSession.findOneAndUpdate(
      baseFilter,
      { $set: { 'invitations.$.status': 'expired' } },
      { new: true }
    );
    return { status: 'expired', invitation };
  }

  const updateFilter = {
    ...baseFilter,
    invitations: {
      $elemMatch: {
        recipient: actor.id,
        recipientModel: accountModel,
        status: 'pending',
        expiresAt: { $gt: now }
      }
    }
  };
  const updatedSession = await CallSession.findOneAndUpdate(
    updateFilter,
    {
      $set: {
        'invitations.$.status': response,
        'invitations.$.respondedAt': now
      },
      ...(response === 'declined' && actor.role === 'youth'
        ? { $addToSet: { declinedBy: actor.id } }
        : {})
    },
    { new: true }
  );
  if (updatedSession) {
    invitation.status = response;
    invitation.respondedAt = now;
    return { status: 'updated', invitation };
  }

  const currentSession = await CallSession.findById(session._id);
  const currentInvitation = currentSession?.invitations?.find((item) => (
    idString(item.recipient) === idString(actor.id)
    && item.recipientModel === accountModel
  ));
  if (currentInvitation?.status === response) {
    return { status: 'updated', invitation: currentInvitation };
  }
  return {
    status: currentSession?.status === 'ongoing' ? 'conflict' : 'expired',
    invitation: currentInvitation
  };
};

const emitInvitationCancelled = (io, session, invitation) => {
  if (io) {
    io.to(`user:${idString(invitation.recipient)}`).emit('course-call:invitation-cancelled', {
      callSessionId: idString(session._id),
      notificationId: idString(invitation.notificationId)
    });
  }
};

const clearCallInvitation = async (req, accessibleCall, actor, invitation, io) => {
  if (!invitation?.notificationId) return;
  const accountModel = actor.role === 'organisation' ? 'Organisation' : 'User';
  await Notification.updateOne(
    {
      _id: invitation.notificationId,
      recipient: actor.id,
      recipientModel: accountModel
    },
    { $set: { isRead: true } }
  );
  await sendCallPush(req, [{
    accountId: actor.id,
    accountModel,
    data: {
      type: 'call_cancelled',
      callSessionId: idString(accessibleCall.session._id),
      notificationId: idString(invitation.notificationId)
    }
  }], { respectNotificationsEnabled: false });
  emitInvitationCancelled(io, accessibleCall.session, invitation);
};

const acceptCallSession = async (req, res) => {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
      return error(res, 400, 'Invalid call session ID.');
    }
    const actor = await loadCallActor(req.user);
    const accessibleCall = actor
      ? await findAccessibleCall(req.params.id, actor)
      : null;
    if (!accessibleCall) return error(res, 404, 'Call session not found.');
    if (accessibleCall.session.status !== 'ongoing') {
      return error(res, 410, 'This call has ended.');
    }

    const accountModel = actor.role === 'organisation' ? 'Organisation' : 'User';
    const isStarter = (
      idString(accessibleCall.session.startedBy) === idString(actor.id)
      && accessibleCall.session.startedByModel === accountModel
    );
    const result = isStarter
      ? { status: 'updated', session: accessibleCall.session }
      : await setCallInvitationResponse(accessibleCall.session, actor, 'accepted');
    if (result.status === 'not_invited') {
      return error(res, 403, 'You were not invited to this call.');
    }
    if (result.status === 'expired') {
      await clearCallInvitation(
        req,
        accessibleCall,
        actor,
        result.invitation,
        req.app.get('io')
      );
      return error(res, 410, 'This call invitation has expired.');
    }
    if (result.status === 'conflict') {
      return error(res, 409, 'This call invitation has already been answered.');
    }

    const invitation = result.invitation;
    await clearCallInvitation(
      req,
      accessibleCall,
      actor,
      invitation,
      req.app.get('io')
    );

    return success(res, 200, 'Call invitation accepted.', {
      callSession: accessibleCall.session,
      course: { _id: accessibleCall.course._id, title: accessibleCall.course.title }
    });
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
    if (!actor) return error(res, 403, 'Your account cannot decline this call.');

    const accessibleCall = await findAccessibleCall(req.params.id, actor);
    if (!accessibleCall) return error(res, 404, 'Call session not found.');
    if (accessibleCall.session.status !== 'ongoing') {
      return error(res, 410, 'This call has ended.');
    }

    const result = await setCallInvitationResponse(
      accessibleCall.session,
      actor,
      'declined'
    );
    if (result.status === 'not_invited') {
      return error(res, 403, 'You were not invited to this call.');
    }
    if (result.status === 'expired') {
      await clearCallInvitation(
        req,
        accessibleCall,
        actor,
        result.invitation,
        req.app.get('io')
      );
      return error(res, 410, 'This call invitation has expired.');
    }
    if (result.status === 'conflict') {
      return error(res, 409, 'This call invitation has already been answered.');
    }

    const invitation = result.invitation;
    if (invitation?.notificationId) {
      await clearCallInvitation(
        accessibleCall,
        actor,
        invitation,
        req.app.get('io')
      );
    } else if (actor.role === 'youth') {
      await Notification.updateOne(
        {
          recipient: actor.id,
          recipientModel: 'User',
          reference: accessibleCall.session._id,
          referenceModel: 'CallSession'
        },
        { $set: { isRead: true } }
      );
    }

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
  acceptCallSession,
  declineCallSession
};
