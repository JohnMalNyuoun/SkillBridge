const Application = require('../../models/Application');
const Course = require('../../models/course');
const { success, error } = require('../../utils/apiResponse');
const { notify } = require('../../services/notificationService');

// @desc    Add outcome questions to a closed course
// @route   POST /api/org/impact/courses/:id/outcome-questions
// @access  Organisation
const addOutcomeQuestions = async (req, res) => {
  try {
    const { outcomeQuestions } = req.body;

    if (!outcomeQuestions || outcomeQuestions.length === 0) {
      return error(res, 400, 'Please provide at least one outcome question');
    }

    const course = await Course.findOne({
      _id: req.params.id,
      organisation: req.user.id
    });

    if (!course) {
      return error(res, 404, 'Course not found');
    }

    if (course.status !== 'closed') {
      return error(res, 400, 'You can only add outcome questions to closed courses');
    }

    course.outcomeQuestions = outcomeQuestions;
    course.outcomeQuestionsAdded = true;
    await course.save();

    return success(res, 200, 'Outcome questions added', course);

  } catch (err) {
    return error(res, 500, err.message);
  }
};

// @desc    Mark application completion status
// @route   PUT /api/org/impact/applications/:id/completion
// @access  Organisation
const markCompletion = async (req, res) => {
  try {
    const { completionStatus } = req.body;

    if (!completionStatus) {
      return error(res, 400, 'Please provide completion status');
    }

    const application = await Application.findOne({
      _id: req.params.id,
      organisation: req.user.id
    }).populate('course', 'title outcomeQuestions outcomeQuestionsAdded');

    if (!application) {
      return error(res, 404, 'Application not found');
    }

    if (application.status !== 'accepted') {
      return error(res, 400, 'Can only mark completion for accepted applicants');
    }

    application.completionStatus = completionStatus;
    application.completionMarkedAt = new Date();
    application.completionMarkedBy = req.user.id;
    await application.save();

    // Notify youth if completed and outcome questions exist
    if (
      completionStatus === 'completed' &&
      application.course.outcomeQuestionsAdded
    ) {
      await notify({
        recipient: application.youth,
        recipientModel: 'User',
        title: 'Share Your Experience',
        message: `You have completed ${application.course.title}. Please fill in your outcome form to share your experience.`,
        type: 'application_accepted',
        reference: application._id,
        referenceModel: 'Application',
        sender: req.user.id,
        senderModel: 'Organisation'
      });
    }

    return success(res, 200, 'Completion status updated', application);

  } catch (err) {
    return error(res, 500, err.message);
  }
};

// @desc    Get impact dashboard stats for organisation
// @route   GET /api/org/impact/dashboard
// @access  Organisation
const getImpactDashboard = async (req, res) => {
  try {
    const orgId = req.user.id;

    const [
      totalCourses,
      publishedCourses,
      closedCourses,
      allApplications,
      acceptedApplications,
      completedApplications,
      droppedApplications,
      outcomeSubmissions
    ] = await Promise.all([
      Course.countDocuments({ organisation: orgId }),
      Course.countDocuments({ organisation: orgId, status: 'published' }),
      Course.countDocuments({ organisation: orgId, status: 'closed' }),
      Application.countDocuments({ organisation: orgId }),
      Application.countDocuments({ organisation: orgId, status: 'accepted' }),
      Application.countDocuments({ organisation: orgId, completionStatus: 'completed' }),
      Application.countDocuments({ organisation: orgId, completionStatus: 'dropped_out' }),
      Application.countDocuments({ organisation: orgId, outcomeSubmitted: true })
    ]);

    // Community breakdown
    const refugeeApps = await Application.countDocuments({
      organisation: orgId
    }).populate('youth');

    const applications = await Application.find({ organisation: orgId })
      .populate('youth', 'communityType gender');

    const refugeeCount = applications.filter(
      a => a.youth?.communityType === 'refugee'
    ).length;

    const hostCount = applications.filter(
      a => a.youth?.communityType === 'host_community'
    ).length;

    const femaleCount = applications.filter(
      a => a.youth?.gender === 'female'
    ).length;

    const maleCount = applications.filter(
      a => a.youth?.gender === 'male'
    ).length;

    const completionRate = acceptedApplications > 0
      ? Math.round((completedApplications / acceptedApplications) * 100)
      : 0;

    return success(res, 200, 'Impact dashboard fetched', {
      courses: {
        total: totalCourses,
        published: publishedCourses,
        closed: closedCourses
      },
      applications: {
        total: allApplications,
        accepted: acceptedApplications,
        completed: completedApplications,
        droppedOut: droppedApplications,
        outcomeSubmitted: outcomeSubmissions
      },
      completionRate,
      demographics: {
        refugee: refugeeCount,
        hostCommunity: hostCount,
        female: femaleCount,
        male: maleCount
      }
    });

  } catch (err) {
    return error(res, 500, err.message);
  }
};

// @desc    Get outcome answers for a course
// @route   GET /api/org/impact/courses/:id/outcomes
// @access  Organisation
const getCourseOutcomes = async (req, res) => {
  try {
    const course = await Course.findOne({
      _id: req.params.id,
      organisation: req.user.id
    });

    if (!course) {
      return error(res, 404, 'Course not found');
    }

    const outcomes = await Application.find({
      course: req.params.id,
      organisation: req.user.id,
      outcomeSubmitted: true
    }).populate('youth', 'fullName communityType gender');

    return success(res, 200, 'Course outcomes fetched', {
      course: {
        title: course.title,
        outcomeQuestions: course.outcomeQuestions
      },
      outcomes
    });

  } catch (err) {
    return error(res, 500, err.message);
  }
};

module.exports = {
  addOutcomeQuestions,
  markCompletion,
  getImpactDashboard,
  getCourseOutcomes
};