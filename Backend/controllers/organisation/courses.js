const Course = require('../../models/course');
const Follow = require('../../models/Follow');
const mongoose = require('mongoose');
const User = require('../../models/Users');
const { deleteImage, uploadImage } = require('../../services/mongodbImageService');
const { notify } = require('../../services/notificationService');
const { success, error } = require('../../utils/apiResponse');
const posthog = require('../../config/posthog');

const parseQuestionsPayload = (questions) => {
  if (Array.isArray(questions)) return questions;
  if (questions === undefined || questions === null || questions === '') return [];
  if (typeof questions !== 'string') return null;

  try {
    const parsed = JSON.parse(questions);
    return Array.isArray(parsed) ? parsed : null;
  } catch (err) {
    return null;
  }
};

// @desc    Post a new course
// @route   POST /api/org/courses
// @access  Organisation
const createCourse = async (req, res) => {
  let coverImage;
  try {
    const {
      title,
      description,
      category,
      targetAudience,
      ageMin,
      ageMax,
      gender,
      location,
      deliveryMode,
      startDate,
      endDate,
      applicationDeadline,
      totalSlots,
      applicationQuestions,
      googleFormLink
    } = req.body;
    const parsedQuestions = parseQuestionsPayload(applicationQuestions);
    const parsedTotalSlots = Number(totalSlots);
    const parsedAgeMin = ageMin === undefined || ageMin === '' ? undefined : Number(ageMin);
    const parsedAgeMax = ageMax === undefined || ageMax === '' ? undefined : Number(ageMax);

    if (parsedQuestions === null) {
      return error(res, 400, 'Invalid application questions payload');
    }

    // Check required fields
    if (!title || !description || !category || !targetAudience || !location || !deliveryMode || !startDate || !endDate || !applicationDeadline || !totalSlots) {
      return error(res, 400, 'Please provide all required fields');
    }

    // Require at least one non-empty eligibility question at creation time
    const hasValidQuestions = parsedQuestions.length > 0
      && parsedQuestions.some((q) => q && typeof q.question === 'string' && q.question.trim().length > 0);

    if (!hasValidQuestions) {
      return error(res, 400, 'Please add at least one application question before posting');
    }

    if (!Number.isFinite(parsedTotalSlots) || parsedTotalSlots <= 0) {
      return error(res, 400, 'Total slots must be a valid number greater than 0');
    }

    if (parsedAgeMin !== undefined && !Number.isFinite(parsedAgeMin)) {
      return error(res, 400, 'Minimum age must be a valid number');
    }

    if (parsedAgeMax !== undefined && !Number.isFinite(parsedAgeMax)) {
      return error(res, 400, 'Maximum age must be a valid number');
    }

    coverImage = await uploadImage(req.file);

    const course = await Course.create({
      organisation: req.user.id,
      title,
      description,
      category,
      targetAudience,
      ageMin: parsedAgeMin,
      ageMax: parsedAgeMax,
      gender,
      location,
      deliveryMode,
      startDate,
      endDate,
      applicationDeadline,
      totalSlots: parsedTotalSlots,
      applicationQuestions: parsedQuestions,
      googleFormLink: googleFormLink || null,
      coverImage
    });

    posthog.capture({
      distinctId: req.user.id,
      event: 'course created',
      properties: {
        course_id: course._id.toString(),
        course_title: course.title,
        category: course.category,
        delivery_mode: course.deliveryMode,
        total_slots: course.totalSlots,
        target_audience: course.targetAudience
      }
    });

    return success(res, 201, 'Course created successfully', course);

  } catch (err) {
    await deleteImage(coverImage).catch((cleanupError) => {
      console.error('Failed to remove unreferenced MongoDB course image:', cleanupError.message);
    });
    return error(res, err.statusCode || 500, err.message);
  }
};

// @desc    Get all courses by organisation
// @route   GET /api/org/courses
// @access  Organisation
const getOrgCourses = async (req, res) => {
  try {
    const courses = await Course.find({ organisation: req.user.id })
      .sort({ createdAt: -1 });

    return success(res, 200, 'Courses fetched', courses);

  } catch (err) {
    return error(res, 500, err.message);
  }
};

// @desc    Discover public courses posted by other organisations
// @route   GET /api/org/courses/discover
// @access  Organisation
const getOrgDiscoverCourses = async (req, res) => {
  try {
    const courses = await Course.find({
      organisation: { $ne: req.user.id },
      status: 'published',
      applicationDeadline: { $gte: new Date() }
    })
      .populate('organisation', 'name type location logo')
      .sort({ createdAt: -1 })
      .lean();

    const follows = await Follow.find({
      follower: req.user.id,
      followingModel: 'Organisation'
    }).select('following').lean();
    const followedOrganisationIds = new Set(follows.map((follow) => follow.following.toString()));

    const feed = courses.map((course) => ({
      ...course,
      isFollowed: followedOrganisationIds.has(course.organisation?._id?.toString())
    }));

    return success(res, 200, 'Public courses fetched', feed);
  } catch (err) {
    return error(res, 500, err.message);
  }
};

// @desc    Get single course
// @route   GET /api/org/courses/:id
// @access  Organisation
const getOrgCourse = async (req, res) => {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
      return error(res, 400, 'Invalid course ID');
    }

    const course = await Course.findOne({
      _id: req.params.id,
      organisation: req.user.id
    });

    if (!course) {
      return error(res, 404, 'Course not found');
    }

    return success(res, 200, 'Course fetched', course);

  } catch (err) {
    return error(res, 500, err.message);
  }
};

// @desc    Update course
// @route   PUT /api/org/courses/:id
// @access  Organisation
const updateCourse = async (req, res) => {
  let uploadedCoverImage;
  try {
    const {
      title,
      description,
      category,
      targetAudience,
      ageMin,
      ageMax,
      gender,
      location,
      deliveryMode,
      startDate,
      endDate,
      applicationDeadline,
      totalSlots,
      applicationQuestions,
      googleFormLink
    } = req.body;
    const parsedQuestions = applicationQuestions === undefined
      ? undefined
      : parseQuestionsPayload(applicationQuestions);
    const parsedTotalSlots = totalSlots === undefined ? undefined : Number(totalSlots);
    const parsedAgeMin = ageMin === undefined || ageMin === '' ? undefined : Number(ageMin);
    const parsedAgeMax = ageMax === undefined || ageMax === '' ? undefined : Number(ageMax);

    if (parsedQuestions === null) {
      return error(res, 400, 'Invalid application questions payload');
    }

    if (parsedTotalSlots !== undefined && (!Number.isFinite(parsedTotalSlots) || parsedTotalSlots <= 0)) {
      return error(res, 400, 'Total slots must be a valid number greater than 0');
    }

    if (ageMin !== undefined && parsedAgeMin !== undefined && !Number.isFinite(parsedAgeMin)) {
      return error(res, 400, 'Minimum age must be a valid number');
    }

    if (ageMax !== undefined && parsedAgeMax !== undefined && !Number.isFinite(parsedAgeMax)) {
      return error(res, 400, 'Maximum age must be a valid number');
    }

    const course = await Course.findOne({
      _id: req.params.id,
      organisation: req.user.id
    });

    if (!course) {
      return error(res, 404, 'Course not found');
    }

    if (course.status === 'published') {
      return error(res, 400, 'Cannot edit a published course. Close it first.');
    }

    const updateData = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (targetAudience !== undefined) updateData.targetAudience = targetAudience;
    if (ageMin !== undefined) updateData.ageMin = parsedAgeMin;
    if (ageMax !== undefined) updateData.ageMax = parsedAgeMax;
    if (gender !== undefined) updateData.gender = gender;
    if (location !== undefined) updateData.location = location;
    if (deliveryMode !== undefined) updateData.deliveryMode = deliveryMode;
    if (startDate !== undefined) updateData.startDate = startDate;
    if (endDate !== undefined) updateData.endDate = endDate;
    if (applicationDeadline !== undefined) updateData.applicationDeadline = applicationDeadline;
    if (parsedTotalSlots !== undefined) updateData.totalSlots = parsedTotalSlots;
    if (parsedQuestions !== undefined) updateData.applicationQuestions = parsedQuestions;
    if (googleFormLink !== undefined) {
      updateData.googleFormLink = googleFormLink || null;
    }
    const previousCoverImage = course.coverImage;
    if (req.file) {
      uploadedCoverImage = await uploadImage(req.file);
      updateData.coverImage = uploadedCoverImage;
    }

    const updatedCourse = await Course.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    if (uploadedCoverImage) {
      await deleteImage(previousCoverImage).catch((err) => {
        console.error('Failed to remove replaced MongoDB course image:', err.message);
      });
    }

    return success(res, 200, 'Course updated', updatedCourse);

  } catch (err) {
    await deleteImage(uploadedCoverImage).catch((cleanupError) => {
      console.error('Failed to remove unreferenced MongoDB course image:', cleanupError.message);
    });
    return error(res, err.statusCode || 500, err.message);
  }
};

// @desc    Publish course
// @route   PUT /api/org/courses/:id/publish
// @access  Organisation
const publishCourse = async (req, res) => {
  try {
    const course = await Course.findOne({
      _id: req.params.id,
      organisation: req.user.id
    });

    if (!course) {
      return error(res, 404, 'Course not found');
    }

    if (course.status === 'published') {
      return error(res, 400, 'Course is already published');
    }

    const hasValidQuestions = Array.isArray(course.applicationQuestions)
      && course.applicationQuestions.length > 0
      && course.applicationQuestions.some(
        (q) => q && typeof q.question === 'string' && q.question.trim().length > 0
      );

    if (!hasValidQuestions) {
      return error(res, 400, 'Please add at least one application question before publishing');
    }

    course.status = 'published';
    await course.save();

    // Notify youth with matching category preferences
    const matchingYouth = await User.find({
      role: 'youth',
      isActive: true,
      categoryPreferences: course.category
    });

    await Promise.all(matchingYouth.map((youth) =>
      notify({
        recipient: youth._id,
        recipientModel: 'User',
        title: 'New Course Matching Your Interests',
        message: `${course.title} has just been posted by ${req.user.name || 'an organisation'} in ${course.location}. ${course.totalSlots} slots available - apply before ${new Date(course.applicationDeadline).toLocaleDateString()}.`,
        type: 'course_published',
        reference: course._id,
        referenceModel: 'Course',
        sender: req.user.id,
        senderModel: 'Organisation'
      })
    ));

    posthog.capture({
      distinctId: req.user.id,
      event: 'course published',
      properties: {
        course_id: course._id.toString(),
        course_title: course.title,
        category: course.category,
        delivery_mode: course.deliveryMode,
        total_slots: course.totalSlots,
        location: course.location,
        target_audience: course.targetAudience,
        notified_youth_count: matchingYouth.length
      }
    });

    return success(res, 200, 'Course published successfully', course);

  } catch (err) {
    return error(res, 500, err.message);
  }
};

// @desc    Close course
// @route   PUT /api/org/courses/:id/close
// @access  Organisation
const closeCourse = async (req, res) => {
  try {
    const course = await Course.findOne({
      _id: req.params.id,
      organisation: req.user.id
    });

    if (!course) {
      return error(res, 404, 'Course not found');
    }

    course.status = 'closed';
    await course.save();

    posthog.capture({
      distinctId: req.user.id,
      event: 'course closed',
      properties: {
        course_id: course._id.toString(),
        course_title: course.title,
        category: course.category
      }
    });

    return success(res, 200, 'Course closed', course);

  } catch (err) {
    return error(res, 500, err.message);
  }
};

// @desc    Delete course
// @route   DELETE /api/org/courses/:id
// @access  Organisation
const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findOne({
      _id: req.params.id,
      organisation: req.user.id
    });

    if (!course) {
      return error(res, 404, 'Course not found');
    }

    if (course.status === 'published') {
      return error(res, 400, 'Cannot delete a published course. Close it first.');
    }

    await course.deleteOne();

    return success(res, 200, 'Course deleted');

  } catch (err) {
    return error(res, 500, err.message);
  }
};

module.exports = {
  createCourse,
  getOrgCourses,
  getOrgDiscoverCourses,
  getOrgCourse,
  updateCourse,
  publishCourse,
  closeCourse,
  deleteCourse
};