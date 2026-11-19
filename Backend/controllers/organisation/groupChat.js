const mongoose = require('mongoose');
const Application = require('../../models/Application');
const Course = require('../../models/course');
const GroupChat = require('../../models/GroupChat');
const GroupChatMessage = require('../../models/GroupChatMessage');
const Notification = require('../../models/Notification');
const Organisation = require('../../models/Organisation');
const User = require('../../models/Users');
const { success, error } = require('../../utils/apiResponse');
const {
  getAttachment,
  openGroupChatAttachment,
  uploadGroupChatAttachment: storeGroupChatAttachment
} = require('../../services/groupChatAttachmentService');
const {
  idString,
  includesId,
  isChatAdministrator,
  canAccessChat,
  canManageChatMembers
} = require('../../services/groupChatAccess');

const getAuthorizedChatContext = async (req) => {
  const course = await getCourse(req.params.courseId);
  if (!course) return { status: 404, message: 'Course not found.' };

  const chat = await getChatForCourse(course);
  if (!chat) {
    return { status: 404, message: 'A group chat has not been created for this course.' };
  }

  const enrolledIds = await getCourseEnrollmentIds(course);
  const actor = await getActor(req);
  const isEnrolled = actor && includesId(enrolledIds, actor.id);
  if (!actor || (!canAccessChat(chat, actor) && !isEnrolled)) {
    return { status: 403, message: 'You are not a member of this course group chat.' };
  }

  if (isEnrolled && !includesId(chat.participants || [], actor.id)) {
    await GroupChat.updateOne(
      { _id: chat._id },
      { $addToSet: { participants: actor.id } }
    );
  }

  return { course, chat, actor };
};

const requireGroupChatAccess = async (req, res, next) => {
  try {
    const context = await getAuthorizedChatContext(req);
    if (context.status) return error(res, context.status, context.message);
    req.groupChatContext = context;
    return next();
  } catch (err) {
    return error(res, 500, err.message);
  }
};

const getCourse = async (courseId, organisationId) => {
  if (!mongoose.isObjectIdOrHexString(courseId)) return null;

  const filter = { _id: courseId };
  if (organisationId) filter.organisation = organisationId;
  return Course.findOne(filter);
};

const getCourseEnrollmentIds = async (course) => {
  const applications = await Application.find({
    course: course._id,
    $or: [
      { status: 'accepted' },
      { completionStatus: 'enrolled' }
    ]
  }).select('youth').lean();

  return [...new Set([
    ...(course.enrolledStudents || []).map(idString),
    ...applications.map((application) => idString(application.youth))
  ])];
};

const getActor = async (req) => {
  if (req.user?.role === 'organisation') {
    const organisation = await Organisation.findById(req.user.id).select('isActive status');
    if (!organisation || !organisation.isActive || organisation.status !== 'approved') return null;

    return { id: organisation._id, role: 'organisation' };
  }

  const user = await User.findById(req.user?.id)
    .select('role createdByOrg isSuspended isActive');
  if (!user || !user.isActive || user.isSuspended) return null;

  return {
    id: user._id,
    role: user.role,
    createdByOrg: user.createdByOrg
  };
};

const getChatForCourse = async (course) => {
  if (course.groupChatId) {
    const chat = await GroupChat.findById(course.groupChatId);
    if (chat) return chat;
  }

  return GroupChat.findOne({ course: course._id });
};

const createCourseGroupChat = async (req, res) => {
  try {
    const course = await getCourse(req.params.courseId, req.organizationId);
    if (!course) return error(res, 404, 'Course not found.');

    const existingChat = await getChatForCourse(course);
    if (existingChat) {
      if (!course.groupChatId) {
        course.groupChatId = existingChat._id;
        await course.save();
      }
      return success(res, 200, 'Course group chat already exists.', existingChat);
    }

    const enrolledIds = await getCourseEnrollmentIds(course);
    const chat = await GroupChat.create({
      course: course._id,
      organisation: course.organisation,
      participants: enrolledIds,
      moderators: [],
      createdBy: req.user.id,
      createdByModel: req.user.role === 'organisation' ? 'Organisation' : 'User'
    });

    course.enrolledStudents = enrolledIds;
    course.groupChatId = chat._id;
    await course.save();

    if (enrolledIds.length > 0) {
      const notifications = await Notification.insertMany(enrolledIds.map((studentId) => ({
        recipient: studentId,
        recipientModel: 'User',
        title: `Group chat ready: ${course.title}`,
        message: `The group chat for ${course.title} is ready. Join the discussion with your classmates.`,
        type: 'group_chat_created',
        reference: course._id,
        referenceModel: 'Course',
        course: course._id,
        sender: req.user.id,
        senderModel: req.user.role === 'organisation' ? 'Organisation' : 'User'
      })));

      const io = req.app && req.app.get('io');
      if (io) {
        notifications.forEach((notification) => {
          io.to(`user:${idString(notification.recipient)}`).emit('notification:new', {
            type: notification.type
          });
        });
      }
    }

    return success(res, 201, 'Course group chat created.', chat);
  } catch (err) {
    if (err.code === 11000) {
      const course = await getCourse(req.params.courseId, req.organizationId);
      const chat = course ? await getChatForCourse(course) : null;
      if (chat) {
        if (!course.groupChatId) {
          course.groupChatId = chat._id;
          await course.save();
        }
        return success(res, 200, 'Course group chat already exists.', chat);
      }
    }
    return error(res, 500, err.message);
  }
};

const getCourseGroupChat = async (req, res) => {
  try {
    const course = await getCourse(req.params.courseId);
    if (!course) return error(res, 404, 'Course not found.');

    const chat = await getChatForCourse(course);
    if (!chat) return error(res, 404, 'A group chat has not been created for this course.');

    const enrolledIds = await getCourseEnrollmentIds(course);
    const actor = await getActor(req);
    const isEnrolled = actor && includesId(enrolledIds, actor.id);
    if (!actor || (!canAccessChat(chat, actor) && !isEnrolled)) {
      return error(res, 403, 'You are not a member of this course group chat.');
    }

    if (isEnrolled && !includesId(chat.participants || [], actor.id)) {
      await GroupChat.updateOne(
        { _id: chat._id },
        { $addToSet: { participants: actor.id } }
      );
    }

    const [populatedChat, messages, enrolledUsers, eligibleModerators] = await Promise.all([
      GroupChat.findById(chat._id)
        .populate('participants', 'fullName email role photo')
        .populate('moderators', 'fullName email role photo')
        .lean(),
      GroupChatMessage.find({ groupChat: chat._id })
        .sort({ createdAt: -1 })
        .limit(100)
        .populate('sender', 'fullName role photo')
        .populate('senderOrganisation', 'name logo')
        .populate({
          path: 'replyTo',
          select: 'content sender senderName createdAt',
          populate: { path: 'sender', select: 'fullName role photo' }
        })
        .populate('reactions.user', 'fullName')
        .lean(),
      User.find({ _id: { $in: enrolledIds } })
        .select('fullName email role')
        .lean(),
      User.find({
        createdByOrg: chat.organisation,
        role: { $in: ['staff', 'trainee'] },
        isActive: true,
        isSuspended: false
      }).select('fullName email role').lean()
    ]);
    if (!populatedChat) return error(res, 404, 'Course group chat not found.');

    const participantIds = new Set((populatedChat.participants || []).map((user) => idString(user._id)));
    const moderatorIds = new Set((populatedChat.moderators || []).map((user) => idString(user._id)));
    const admin = isChatAdministrator(chat, actor);

    return success(res, 200, 'Course group chat fetched.', {
      chat: { ...populatedChat, name: course.title },
      course: { _id: course._id, title: course.title },
      messages: messages.reverse(),
      availableMembers: enrolledUsers.filter((user) => !participantIds.has(idString(user._id))),
      availableModerators: eligibleModerators.filter((user) => !moderatorIds.has(idString(user._id))),
      canManageMembers: canManageChatMembers(chat, actor),
      canManageModerators: admin
    });
  } catch (err) {
    return error(res, 500, err.message);
  }
};

const updateGroupChatModerators = async (req, res) => {
  try {
    const { userId, action } = req.body || {};
    if (!mongoose.isObjectIdOrHexString(req.params.courseId) || !mongoose.isObjectIdOrHexString(userId)) {
      return error(res, 400, 'Invalid course or member ID.');
    }
    if (!['add', 'remove'].includes(action)) {
      return error(res, 400, 'Action must be add or remove.');
    }

    const course = await getCourse(req.params.courseId, req.organizationId);
    if (!course) return error(res, 404, 'Course not found.');
    const chat = await getChatForCourse(course);
    if (!chat) return error(res, 404, 'A group chat has not been created for this course.');

    const moderator = await User.findOne({
      _id: userId,
      createdByOrg: req.organizationId,
      role: { $in: ['staff', 'trainee'] }
    }).select('_id');
    if (!moderator) {
      return error(res, 404, 'Staff or trainee account not found in this organisation.');
    }

    if (action === 'add') {
      const activeModerator = await User.findOne({
        _id: moderator._id,
        isActive: true,
        isSuspended: false
      }).select('_id');
      if (!activeModerator) {
        return error(res, 400, 'Only active, non-suspended members can moderate a chat.');
      }
      await GroupChat.updateOne({ _id: chat._id }, { $addToSet: { moderators: moderator._id } });
    } else {
      await GroupChat.updateOne({ _id: chat._id }, { $pull: { moderators: moderator._id } });
      if (!includesId(chat.participants, moderator._id)) {
        await revokeChatSocketAccess(req, chat._id, moderator._id);
      }
    }

    return success(res, 200, `Chat moderator ${action === 'add' ? 'added' : 'removed'}.`);
  } catch (err) {
    return error(res, 500, err.message);
  }
};

const updateGroupChatMembers = async (req, res) => {
  try {
    const { userId, action } = req.body || {};
    if (!mongoose.isObjectIdOrHexString(req.params.courseId) || !mongoose.isObjectIdOrHexString(userId)) {
      return error(res, 400, 'Invalid course or member ID.');
    }
    if (!['add', 'remove'].includes(action)) {
      return error(res, 400, 'Action must be add or remove.');
    }

    const course = await getCourse(req.params.courseId);
    if (!course) return error(res, 404, 'Course not found.');
    const chat = await getChatForCourse(course);
    if (!chat) return error(res, 404, 'A group chat has not been created for this course.');

    const actor = await getActor(req);
    if (!actor || !canManageChatMembers(chat, actor)) {
      return error(res, 403, 'Only organisation admins and assigned chat moderators can manage members.');
    }

    const enrolledIds = await getCourseEnrollmentIds(course);
    if (!enrolledIds.includes(idString(userId))) {
      return error(res, 400, 'Only currently enrolled students can be added to this group chat.');
    }

    if (action === 'add') {
      await GroupChat.updateOne({ _id: chat._id }, { $addToSet: { participants: userId } });
    } else {
      const isParticipant = includesId(chat.participants, userId);
      if (!isParticipant) return error(res, 404, 'Group chat member not found.');

      await GroupChat.updateOne({ _id: chat._id }, { $pull: { participants: userId } });
      await revokeChatSocketAccess(req, chat._id, userId);
    }

    return success(res, 200, `Group chat member ${action === 'add' ? 'added' : 'removed'}.`);
  } catch (err) {
    return error(res, 500, err.message);
  }
};

const uploadChatAttachment = async (req, res) => {
  try {
    if (!req.file) return error(res, 400, 'Choose an attachment to upload.');

    const { course, chat } = req.groupChatContext;
    const attachment = await storeGroupChatAttachment(req.file, chat._id, course._id);
    return success(res, 201, 'Group chat attachment uploaded.', attachment);
  } catch (err) {
    return error(res, err.statusCode || 500, err.message);
  }
};

const downloadChatAttachment = async (req, res) => {
  try {
    const { chat } = req.groupChatContext;
    const file = await getAttachment(req.params.attachmentId);
    if (!file || idString(file.metadata?.groupChat) !== idString(chat._id)) {
      return error(res, 404, 'Group chat attachment not found.');
    }

    const attachment = await openGroupChatAttachment(req.params.attachmentId);
    if (!attachment) return error(res, 404, 'Group chat attachment not found.');

    const name = String(file.metadata?.name || file.filename || 'attachment')
      .replace(/[\r\n"]/g, '');
    res.set({
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
      'Content-Length': file.length,
      'Content-Type': 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff'
    });
    attachment.stream.on('error', (err) => {
      if (res.headersSent) return res.destroy(err);
      return error(res, 500, 'Unable to download this group chat attachment.');
    });
    attachment.stream.pipe(res);
  } catch (err) {
    return error(res, 500, err.message);
  }
};

const revokeChatSocketAccess = async (req, chatId, userId) => {
  const io = req.app.get('io');
  if (!io) return;

  const room = `group-chat:${idString(chatId)}`;
  const sockets = await io.in(room).fetchSockets();
  let removedSocket = false;
  for (const socket of sockets) {
    if (idString(socket.data.user?.id) === idString(userId)) {
      socket.leave(room);
      socket.data.groupChatRooms?.delete(room);
      socket.emit('group-chat:access-revoked');
      removedSocket = true;
    }
  }
  if (removedSocket) {
    const remainingSockets = await io.in(room).fetchSockets();
    if (!remainingSockets.some((socket) => idString(socket.data.user?.id) === idString(userId))) {
      io.to(room).emit('group-chat:presence', {
        userId: idString(userId),
        isOnline: false
      });
    }
  }
};

module.exports = {
  createCourseGroupChat,
  getCourseGroupChat,
  updateGroupChatModerators,
  updateGroupChatMembers,
  requireGroupChatAccess,
  uploadChatAttachment,
  downloadChatAttachment
};
