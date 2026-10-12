const Application = require('../../models/Application');
const Course = require('../../models/course');
const { success, error } = require('../../utils/apiResponse');
const { notify } = require('../../services/notificationService');
const posthog = require('../../config/posthog');

// @desc    Apply for a course
// @route   POST /api/youth/applications/:courseId
// @access  Youth
const applyForCourse = async (req, res) => {
  try {
    const { answers } = req.body;
    const courseId = req.params.courseId;

    // Find course
    const course = await Course.findOne({
      _id: courseId,
      status: 'published'
    });

    if (!course) {
      return error(res, 404, 'Course not found or not available');
    }

    // Check if course is full
    if (course.filledSlots >= course.totalSlots) {
      return error(res, 400, 'This course is full');
    }

    // Check if deadline has passed
    if (new Date() > new Date(course.applicationDeadline)) {
      return error(res, 400, 'Application deadline has passed');
    }

    // Check if already applied
    const existingApplication = await Application.findOne({
      youth: req.user.id,
      course: courseId
    });

    if (existingApplication) {
      return error(res, 400, 'You have already applied for this course');
    }

    // Validate required questions
    if (course.applicationQuestions.length > 0) {
      const requiredQuestions = course.applicationQuestions.filter(q => q.isRequired);
      for (const q of requiredQuestions) {
        const answer = answers?.find(a => a.question === q.question);
        if (!answer || !answer.answer) {
          return error(res, 400, `Please answer: ${q.question}`);
        }
      }
    }

    // Create application
    const application = await Application.create({
      youth: req.user.id,
      course: courseId,
      organisation: course.organisation,
      answers: answers || []
    });

    application.timeline = [{
      status: 'submitted',
      timestamp: new Date(),
      message: 'You submitted your application'
    }];
    await application.save();

    // Increment filled slots
    course.filledSlots += 1;
    await course.save();

    await notify({
      recipient: course.organisation,
      recipientModel: 'Organisation',
      title: 'New Application Received',
      message: `A youth has applied for ${course.title}`,
      type: 'application_submitted',
      reference: application._id,
      referenceModel: 'Application',
      sender: req.user.id,
      senderModel: 'User'
    });

    posthog.capture({
      distinctId: req.user.id,
      event: 'course application submitted',
      properties: {
        course_id: courseId,
        course_title: course.title,
        course_category: course.category,
        organisation_id: course.organisation?.toString(),
        application_id: application._id.toString()
      }
    });

    return success(res, 201, 'Application submitted successfully', application);

  } catch (err) {
    if (err.code === 11000) {
      return error(res, 400, 'You have already applied for this course');
    }
    return error(res, 500, err.message);
  }
};

// @desc    Get youth applications
// @route   GET /api/youth/applications
// @access  Youth
const getMyApplications = async (req, res) => {
  try {
    const applications = await Application.find({ youth: req.user.id })
      .populate('course', 'title category location deliveryMode startDate endDate status')
      .populate('organisation', 'name type')
      .sort({ createdAt: -1 });

    return success(res, 200, 'Applications fetched', applications);

  } catch (err) {
    return error(res, 500, err.message);
  }
};

// @desc    Withdraw application
// @route   PUT /api/youth/applications/:id/withdraw
// @access  Youth
const withdrawApplication = async (req, res) => {
  try {
    const application = await Application.findOne({
      _id: req.params.id,
      youth: req.user.id
    });

    if (!application) {
      return error(res, 404, 'Application not found');
    }

    if (application.status === 'accepted') {
      return error(res, 400, 'Cannot withdraw an accepted application');
    }

    if (application.status === 'withdrawn') {
      return error(res, 400, 'Application already withdrawn');
    }

    application.status = 'withdrawn';
    await application.save();

    // Decrement filled slots
    await Course.findByIdAndUpdate(application.course, {
      $inc: { filledSlots: -1 }
    });

    posthog.capture({
      distinctId: req.user.id,
      event: 'course application withdrawn',
      properties: {
        application_id: application._id.toString(),
        course_id: application.course?.toString()
      }
    });

    return success(res, 200, 'Application withdrawn', application);

  } catch (err) {
    return error(res, 500, err.message);
  }
};

module.exports = {
  applyForCourse,
  getMyApplications,
  withdrawApplication
};