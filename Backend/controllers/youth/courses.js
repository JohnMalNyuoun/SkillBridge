const Course = require('../../models/course');
const posthog = require('../../config/posthog');
const CourseEngagement = require('../../models/CourseEngagement');
const { success, error } = require('../../utils/apiResponse');

const ensureEngagement = async (courseId) => {
  let engagement = await CourseEngagement.findOne({ course: courseId });

  if (!engagement) {
    engagement = await CourseEngagement.create({
      course: courseId,
      reactions: [],
      comments: []
    });
  }

  return engagement;
};

// @desc    Get all published courses
// @route   GET /api/youth/courses
// @access  Youth
const getAllCourses = async (req, res) => {
  try {
    const { category, deliveryMode, targetAudience, search } = req.query;
    const now = new Date();

    const filter = {
      status: 'published',
      applicationDeadline: { $gte: now }
    };

    if (category) filter.category = category;
    if (deliveryMode) filter.deliveryMode = deliveryMode;
    if (targetAudience) filter.targetAudience = { $in: [targetAudience, 'both'] };
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const courses = await Course.find(filter)
      .populate('organisation', 'name type location logo')
      .sort({ createdAt: -1 });

    const courseIds = courses.map((course) => course._id);
    const engagements = await CourseEngagement.find({ course: { $in: courseIds } })
      .populate('comments.user', 'fullName photo')
      .lean();

    const engagementMap = engagements.reduce((acc, item) => {
      acc[item.course.toString()] = item;
      return acc;
    }, {});

    const enrichedCourses = courses.map((courseDoc) => {
      const course = courseDoc.toObject();
      const engagement = engagementMap[course._id.toString()];
      const reactions = engagement?.reactions || [];
      const comments = engagement?.comments || [];

      course.engagement = {
        reactionsCount: reactions.length,
        commentsCount: comments.length,
        reactedByMe: reactions.some((userId) => userId.toString() === req.user.id),
        recentComments: comments
          .slice(-3)
          .reverse()
          .map((comment) => ({
            _id: comment._id,
            text: comment.text,
            createdAt: comment.createdAt,
            user: {
              _id: comment.user?._id,
              fullName: comment.user?.fullName || 'User',
              photo: comment.user?.photo || null
            }
          }))
      };

      return course;
    });

    return success(res, 200, 'Courses fetched', enrichedCourses);

  } catch (err) {
    return error(res, 500, err.message);
  }
};

// @desc    Get single course
// @route   GET /api/youth/courses/:id
// @access  Youth
const getCourse = async (req, res) => {
  try {
    const now = new Date();
    const course = await Course.findOne({
      _id: req.params.id,
      status: 'published',
      applicationDeadline: { $gte: now }
    }).populate('organisation', 'name type location phoneNumber email logo');

    if (!course) {
      return error(res, 404, 'Course not found');
    }

    posthog.capture({
      distinctId: req.user.id.toString(),
      event: 'course viewed',
      properties: {
        course_id: course._id.toString(),
        course_title: course.title,
        org_id: course.organisation?._id?.toString(),
        org_name: course.organisation?.name
      }
    });

    return success(res, 200, 'Course fetched', course);

  } catch (err) {
    return error(res, 500, err.message);
  }
};

// @desc    Get engagement for a course
// @route   GET /api/youth/courses/:id/engagement
// @access  Youth
const getCourseEngagement = async (req, res) => {
  try {
    const now = new Date();
    const course = await Course.findOne({
      _id: req.params.id,
      status: 'published',
      applicationDeadline: { $gte: now }
    });

    if (!course) {
      return error(res, 404, 'Course not found');
    }

    const engagement = await ensureEngagement(req.params.id);
    await engagement.populate('comments.user', 'fullName photo');

    const reactedByMe = engagement.reactions.some(
      (userId) => userId.toString() === req.user.id
    );

    return success(res, 200, 'Course engagement fetched', {
      reactionsCount: engagement.reactions.length,
      commentsCount: engagement.comments.length,
      reactedByMe,
      recentComments: engagement.comments
        .slice(-5)
        .reverse()
        .map((comment) => ({
          _id: comment._id,
          text: comment.text,
          createdAt: comment.createdAt,
          user: {
            _id: comment.user?._id,
            fullName: comment.user?.fullName || 'User',
            photo: comment.user?.photo || null
          }
        }))
    });
  } catch (err) {
    return error(res, 500, err.message);
  }
};

// @desc    Toggle reaction for a course
// @route   PUT /api/youth/courses/:id/reaction
// @access  Youth
const toggleCourseReaction = async (req, res) => {
  try {
    const now = new Date();
    const course = await Course.findOne({
      _id: req.params.id,
      status: 'published',
      applicationDeadline: { $gte: now }
    });

    if (!course) {
      return error(res, 404, 'Course not found');
    }

    const engagement = await ensureEngagement(req.params.id);
    const existingIndex = engagement.reactions.findIndex(
      (userId) => userId.toString() === req.user.id
    );

    let reacted;

    if (existingIndex >= 0) {
      engagement.reactions.splice(existingIndex, 1);
      reacted = false;
    } else {
      engagement.reactions.push(req.user.id);
      reacted = true;
    }

    await engagement.save();

    return success(res, 200, 'Reaction updated', {
      reacted,
      reactionsCount: engagement.reactions.length,
      commentsCount: engagement.comments.length
    });
  } catch (err) {
    return error(res, 500, err.message);
  }
};

// @desc    Add comment to a course
// @route   POST /api/youth/courses/:id/comments
// @access  Youth
const addCourseComment = async (req, res) => {
  try {
    const now = new Date();
    const course = await Course.findOne({
      _id: req.params.id,
      status: 'published',
      applicationDeadline: { $gte: now }
    });

    if (!course) {
      return error(res, 404, 'Course not found');
    }

    const text = (req.body?.text || '').trim();

    if (!text) {
      return error(res, 400, 'Comment text is required');
    }

    const engagement = await ensureEngagement(req.params.id);
    engagement.comments.push({ user: req.user.id, text });

    await engagement.save();
    await engagement.populate('comments.user', 'fullName photo');

    const latestComment = engagement.comments[engagement.comments.length - 1];

    return success(res, 201, 'Comment added', {
      commentsCount: engagement.comments.length,
      comment: {
        _id: latestComment._id,
        text: latestComment.text,
        createdAt: latestComment.createdAt,
        user: {
          _id: latestComment.user?._id,
          fullName: latestComment.user?.fullName || 'User',
          photo: latestComment.user?.photo || null
        }
      }
    });
  } catch (err) {
    return error(res, 500, err.message);
  }
};

module.exports = {
  getAllCourses,
  getCourse,
  getCourseEngagement,
  toggleCourseReaction,
  addCourseComment
};