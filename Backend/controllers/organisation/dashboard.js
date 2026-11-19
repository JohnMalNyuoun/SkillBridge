const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const Course = require('../../models/course');
const GroupChat = require('../../models/GroupChat');
const User = require('../../models/Users');
const { success, error } = require('../../utils/apiResponse');

const memberRoles = ['staff', 'trainee'];

const serializeCourse = (course) => {
  const { enrolledStudents = [], ...courseData } = course;
  return {
    ...courseData,
    enrolledCount: Array.isArray(enrolledStudents) ? enrolledStudents.length : 0
  };
};

const getOrgDashboard = async (req, res) => {
  try {
    const [courses, staffCount, traineeCount, teamMembers, groupChats] = await Promise.all([
      Course.find({ organisation: req.organizationId, status: 'published' })
        .sort({ createdAt: -1 })
        .populate('assignedInstructor', 'fullName email')
        .lean(),
      User.countDocuments({ createdByOrg: req.organizationId, role: 'staff' }),
      User.countDocuments({ createdByOrg: req.organizationId, role: 'trainee' }),
      User.find({ createdByOrg: req.organizationId, role: { $in: memberRoles } })
        .select('fullName email role isSuspended isActive')
        .sort({ createdAt: -1 })
        .lean(),
      GroupChat.find({ organisation: req.organizationId })
        .populate('course', 'title')
        .sort({ createdAt: -1 })
        .lean()
    ]);

    const now = new Date();
    const ongoingCourses = courses
      .filter((course) => (
        course.assignedInstructor &&
        course.startDate <= now &&
        course.endDate >= now
      ))
      .map(serializeCourse);

    return success(res, 200, 'Organisation dashboard fetched.', {
      publishedCourses: courses.map(serializeCourse),
      ongoingCourses,
      staffCount,
      traineeCount,
      teamMembers,
      activeGroupChats: groupChats.map((chat) => ({
        _id: chat._id,
        courseId: chat.course?._id || chat.course,
        name: chat.course?.title || 'Course group chat',
        participantCount: Array.isArray(chat.participants) ? chat.participants.length : 0,
        createdAt: chat.createdAt
      }))
    });
  } catch (err) {
    return error(res, 500, err.message);
  }
};

const createOrgMember = async (req, res) => {
  try {
    const { fullName, email, password, role } = req.body || {};
    if (
      typeof fullName !== 'string' ||
      !fullName.trim() ||
      typeof email !== 'string' ||
      !email.trim() ||
      typeof password !== 'string' ||
      !password ||
      !memberRoles.includes(role)
    ) {
      return error(res, 400, 'Please provide fullName, email, password, and a valid member role.');
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return error(res, 400, 'Please provide a valid email address.');
    }
    if (password.length < 6) {
      return error(res, 400, 'Password must be at least 6 characters.');
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return error(res, 409, 'Email already registered.');
    }

    const hashedPassword = await bcrypt.hash(password, await bcrypt.genSalt(10));
    const member = await User.create({
      fullName: fullName.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role,
      createdByOrg: req.organizationId,
      isVerified: true
    });

    return success(res, 201, 'Organisation member created.', {
      id: member._id,
      fullName: member.fullName,
      email: member.email,
      role: member.role,
      createdByOrg: member.createdByOrg,
      isSuspended: member.isSuspended
    });
  } catch (err) {
    if (err.code === 11000) {
      return error(res, 409, 'Email already registered.');
    }
    return error(res, 500, err.message);
  }
};

const updateOrgMember = async (req, res) => {
  try {
    const { role, isSuspended } = req.body || {};
    const hasRole = Object.prototype.hasOwnProperty.call(req.body || {}, 'role');
    const hasSuspension = Object.prototype.hasOwnProperty.call(req.body || {}, 'isSuspended');

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return error(res, 400, 'Invalid member ID.');
    }
    if (!hasRole && !hasSuspension) {
      return error(res, 400, 'Provide a role or isSuspended value to update.');
    }
    if (hasRole && !memberRoles.includes(role)) {
      return error(res, 400, 'Member role must be staff or trainee.');
    }
    if (hasSuspension && typeof isSuspended !== 'boolean') {
      return error(res, 400, 'isSuspended must be a boolean.');
    }

    const member = await User.findOne({
      _id: req.params.id,
      createdByOrg: req.organizationId,
      role: { $in: memberRoles }
    });
    if (!member) {
      return error(res, 404, 'Organisation member not found.');
    }

    if (hasRole) member.role = role;
    if (hasSuspension) member.isSuspended = isSuspended;
    await member.save();

    return success(res, 200, 'Organisation member updated.', {
      id: member._id,
      fullName: member.fullName,
      email: member.email,
      role: member.role,
      isSuspended: member.isSuspended
    });
  } catch (err) {
    return error(res, 500, err.message);
  }
};

module.exports = { getOrgDashboard, createOrgMember, updateOrgMember };
