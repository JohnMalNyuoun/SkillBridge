const Application = require('../../models/Application');
const Course = require('../../models/course');
const { success, error } = require('../../utils/apiResponse');
const posthog = require('../../config/posthog');

// @desc    Get pending outcome forms for youth
// @route   GET /api/youth/outcomes
// @access  Youth
const getPendingOutcomes = async (req, res) => {
  try {
    const applications = await Application.find({
      youth: req.user.id,
      completionStatus: 'completed',
      outcomeSubmitted: false
    }).populate('course', 'title outcomeQuestions outcomeQuestionsAdded organisation')
      .populate('organisation', 'name');

    const pending = applications.filter(
      a => a.course?.outcomeQuestionsAdded
    );

    return success(res, 200, 'Pending outcomes fetched', pending);

  } catch (err) {
    return error(res, 500, err.message);
  }
};

// @desc    Submit outcome form
// @route   POST /api/youth/outcomes/:applicationId
// @access  Youth
const submitOutcome = async (req, res) => {
  try {
    const { outcomeAnswers } = req.body;

    const application = await Application.findOne({
      _id: req.params.applicationId,
      youth: req.user.id,
      completionStatus: 'completed'
    }).populate('course', 'outcomeQuestions outcomeQuestionsAdded title');

    if (!application) {
      return error(res, 404, 'Application not found');
    }

    if (application.outcomeSubmitted) {
      return error(res, 400, 'Outcome form already submitted');
    }

    if (!application.course.outcomeQuestionsAdded) {
      return error(res, 400, 'No outcome questions available for this course');
    }

    // Validate required questions
    const requiredQuestions = application.course.outcomeQuestions.filter(
      q => q.isRequired
    );

    for (const q of requiredQuestions) {
      const answer = outcomeAnswers?.find(a => a.question === q.question);
      if (!answer || !answer.answer) {
        return error(res, 400, `Please answer: ${q.question}`);
      }
    }

    application.outcomeAnswers = outcomeAnswers;
    application.outcomeSubmitted = true;
    application.outcomeSubmittedAt = new Date();
    await application.save();

    posthog.capture({
      distinctId: req.user.id,
      event: 'outcome submitted',
      properties: {
        application_id: application._id.toString(),
        course_id: application.course?._id?.toString(),
        course_title: application.course?.title
      }
    });

    return success(res, 201, 'Outcome form submitted successfully', application);

  } catch (err) {
    return error(res, 500, err.message);
  }
};

module.exports = { getPendingOutcomes, submitOutcome };