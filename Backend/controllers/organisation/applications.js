const Application = require('../../models/Application');
const { success, error } = require('../../utils/apiResponse');
const { notify } = require('../../services/notificationService');
const posthog = require('../../config/posthog');

// @desc    Get all applications for organisation
// @route   GET /api/org/applications
// @access  Organisation
const getOrgApplications = async (req, res) => {
  try {
    const { status, courseId } = req.query;

    const filter = { organisation: req.user.id };
    if (status) filter.status = status;
    if (courseId) filter.course = courseId;

    const applications = await Application.find(filter)
      .populate('youth', 'fullName email communityType dateOfBirth gender phoneNumber photo')
      .populate('course', 'title category location')
      .sort({ createdAt: -1 });

    return success(res, 200, 'Applications fetched', applications);

  } catch (err) {
    return error(res, 500, err.message);
  }
};

// @desc    Get single application
// @route   GET /api/org/applications/:id
// @access  Organisation
const getOrgApplication = async (req, res) => {
  try {
    const application = await Application.findOne({
      _id: req.params.id,
      organisation: req.user.id
    })
      .populate('youth', 'fullName email communityType dateOfBirth gender phoneNumber photo')
      .populate('course', 'title category location applicationQuestions');

    if (!application) {
      return error(res, 404, 'Application not found');
    }

    return success(res, 200, 'Application fetched', application);

  } catch (err) {
    return error(res, 500, err.message);
  }
};

// @desc    Shortlist applicant
// @route   PUT /api/org/applications/:id/shortlist
// @access  Organisation
const shortlistApplicant = async (req, res) => {
  try {
    const { shortlistNote, nextStep } = req.body;

    const application = await Application.findOne({
      _id: req.params.id,
      organisation: req.user.id
    });

    if (!application) {
      return error(res, 404, 'Application not found');
    }

    application.status = 'shortlisted';
    application.shortlistedAt = new Date();
    application.shortlistNote = shortlistNote;
    application.nextStep = nextStep;
    application.reviewedBy = req.user.id;
    application.reviewedAt = new Date();

    await application.save();

    application.timeline.push({
      status: 'shortlisted',
      timestamp: new Date(),
      message: 'You have been shortlisted for interview'
    });
    await application.save();

    await notify({
      recipient: application.youth,
      recipientModel: 'User',
      title: 'You Have Been Shortlisted',
      message: `Congratulations! You have been shortlisted for a course. Check your application for next steps.`,
      type: 'application_shortlisted',
      reference: application._id,
      referenceModel: 'Application',
      sender: req.user.id,
      senderModel: 'Organisation'
    });

    posthog.capture({
      distinctId: req.user.id,
      event: 'application shortlisted',
      properties: {
        application_id: application._id.toString(),
        course_id: application.course?.toString(),
        youth_id: application.youth?.toString()
      }
    });

    return success(res, 200, 'Applicant shortlisted', application);

  } catch (err) {
    return error(res, 500, err.message);
  }
};

// @desc    Accept applicant
// @route   PUT /api/org/applications/:id/accept
// @access  Organisation
const acceptApplicant = async (req, res) => {
  try {
    const application = await Application.findOne({
      _id: req.params.id,
      organisation: req.user.id
    });

    if (!application) {
      return error(res, 404, 'Application not found');
    }

    application.status = 'accepted';
    application.reviewedBy = req.user.id;
    application.reviewedAt = new Date();

    await application.save();

    application.timeline.push({
      status: 'accepted',
      timestamp: new Date(),
      message: 'Congratulations! Your application has been accepted'
    });
    await application.save();

    await notify({
      recipient: application.youth,
      recipientModel: 'User',
      title: 'Application Accepted',
      message: `Your application has been accepted. Welcome aboard!`,
      type: 'application_accepted',
      reference: application._id,
      referenceModel: 'Application',
      sender: req.user.id,
      senderModel: 'Organisation'
    });

    posthog.capture({
      distinctId: req.user.id,
      event: 'application accepted',
      properties: {
        application_id: application._id.toString(),
        course_id: application.course?.toString(),
        youth_id: application.youth?.toString()
      }
    });

    return success(res, 200, 'Applicant accepted', application);

  } catch (err) {
    return error(res, 500, err.message);
  }
};

// @desc    Reject applicant
// @route   PUT /api/org/applications/:id/reject
// @access  Organisation
const rejectApplicant = async (req, res) => {
  try {
    const { rejectionReason } = req.body;

    const application = await Application.findOne({
      _id: req.params.id,
      organisation: req.user.id
    });

    if (!application) {
      return error(res, 404, 'Application not found');
    }

    application.status = 'rejected';
    application.rejectionReason = rejectionReason;
    application.reviewedBy = req.user.id;
    application.reviewedAt = new Date();

    await application.save();

    application.timeline.push({
      status: 'rejected',
      timestamp: new Date(),
      message: 'Your application was not successful this time. Keep trying!'
    });
    await application.save();

    await notify({
      recipient: application.youth,
      recipientModel: 'User',
      title: 'Application Update',
      message: `Your application status has been updated. Log in to FursaHub to view details.`,
      type: 'application_rejected',
      reference: application._id,
      referenceModel: 'Application',
      sender: req.user.id,
      senderModel: 'Organisation'
    });

    posthog.capture({
      distinctId: req.user.id,
      event: 'application rejected',
      properties: {
        application_id: application._id.toString(),
        course_id: application.course?.toString(),
        youth_id: application.youth?.toString()
      }
    });

    return success(res, 200, 'Applicant rejected', application);

  } catch (err) {
    return error(res, 500, err.message);
  }
};

module.exports = {
  getOrgApplications,
  getOrgApplication,
  shortlistApplicant,
  acceptApplicant,
  rejectApplicant
};