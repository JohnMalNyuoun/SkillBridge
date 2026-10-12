const Organisation = require('../../models/Organisation');
const User = require('../../models/Users');
const { success, error } = require('../../utils/apiResponse');
const { notify } = require('../../services/notificationService');
const posthog = require('../../config/posthog');

// @desc    Get all organisations
// @route   GET /api/admin/organisations
// @access  Admin
const getAllOrganisations = async (req, res) => {
  try {
    const { status } = req.query;

    const filter = {};
    if (status) filter.status = status;

    const organisations = await Organisation.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });

    return success(res, 200, 'Organisations fetched', organisations);

  } catch (err) {
    return error(res, 500, err.message);
  }
};

// @desc    Get single organisation
// @route   GET /api/admin/organisations/:id
// @access  Admin
const getOrganisation = async (req, res) => {
  try {
    const org = await Organisation.findById(req.params.id).select('-password');

    if (!org) {
      return error(res, 404, 'Organisation not found');
    }

    return success(res, 200, 'Organisation fetched', org);

  } catch (err) {
    return error(res, 500, err.message);
  }
};

// @desc    Approve organisation
// @route   PUT /api/admin/organisations/:id/approve
// @access  Admin
const approveOrganisation = async (req, res) => {
  try {
    const org = await Organisation.findById(req.params.id);

    if (!org) {
      return error(res, 404, 'Organisation not found');
    }

    if (org.status === 'approved') {
      return error(res, 400, 'Organisation is already approved');
    }

    org.status = 'approved';
    org.approvedBy = req.user.id;
    org.approvedAt = new Date();
    org.rejectionReason = undefined;

    await org.save();

    await notify({
      recipient: org._id,
      recipientModel: 'Organisation',
      title: 'Organisation Approved',
      message: `Your organisation ${org.name} has been approved. You can now post courses on FursaHub.`,
      type: 'org_approved',
      reference: org._id,
      referenceModel: 'Organisation'
    });

    posthog.capture({
      distinctId: req.user.id.toString(),
      event: 'admin org approved',
      properties: {
        org_id: org._id.toString(),
        org_name: org.name
      }
    });

    return success(res, 200, 'Organisation approved successfully', {
      id: org._id,
      name: org.name,
      status: org.status,
      approvedAt: org.approvedAt
    });

  } catch (err) {
    return error(res, 500, err.message);
  }
};

// @desc    Reject organisation
// @route   PUT /api/admin/organisations/:id/reject
// @access  Admin
const rejectOrganisation = async (req, res) => {
  try {
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return error(res, 400, 'Please provide a rejection reason');
    }

    const org = await Organisation.findById(req.params.id);

    if (!org) {
      return error(res, 404, 'Organisation not found');
    }

    if (org.status === 'rejected') {
      return error(res, 400, 'Organisation is already rejected');
    }

    org.status = 'rejected';
    org.rejectionReason = rejectionReason;

    await org.save();

    await notify({
      recipient: org._id,
      recipientModel: 'Organisation',
      title: 'Organisation Application Rejected',
      message: `Your organisation application was rejected. Reason: ${rejectionReason}`,
      type: 'org_rejected',
      reference: org._id,
      referenceModel: 'Organisation'
    });

    posthog.capture({
      distinctId: req.user.id.toString(),
      event: 'admin org rejected',
      properties: {
        org_id: org._id.toString(),
        org_name: org.name,
        rejection_reason: rejectionReason
      }
    });

    return success(res, 200, 'Organisation rejected', {
      id: org._id,
      name: org.name,
      status: org.status,
      rejectionReason: org.rejectionReason
    });

  } catch (err) {
    return error(res, 500, err.message);
  }
};

// @desc    Suspend organisation
// @route   PUT /api/admin/organisations/:id/suspend
// @access  Admin
const suspendOrganisation = async (req, res) => {
  try {
    const { suspensionReason } = req.body || {};

    if (!suspensionReason || !suspensionReason.trim()) {
      return error(res, 400, 'Please provide a suspensionReason');
    }

    const org = await Organisation.findById(req.params.id);

    if (!org) {
      return error(res, 404, 'Organisation not found');
    }

    if (org.status === 'suspended') {
      return error(res, 400, 'Organisation is already suspended');
    }

    org.status = 'suspended';
    org.isActive = false;
    org.suspensionReason = suspensionReason.trim();
    org.suspendedAt = new Date();
    org.suspendedBy = req.user.id;
    org.reinstatement = {
      status: 'none',
      requestMessage: undefined,
      requestedAt: undefined,
      reviewedBy: undefined,
      reviewedAt: undefined,
      reviewNote: undefined
    };

    await org.save();

    await notify({
      recipient: org._id,
      recipientModel: 'Organisation',
      title: 'Organisation Suspended',
      message: `Your organisation has been suspended. Reason: ${org.suspensionReason}. You may submit a reinstatement request from the login screen.`,
      type: 'org_suspended',
      reference: org._id,
      referenceModel: 'Organisation'
    });

    posthog.capture({
      distinctId: req.user.id.toString(),
      event: 'admin org suspended',
      properties: {
        org_id: org._id.toString(),
        org_name: org.name,
        suspension_reason: org.suspensionReason
      }
    });

    return success(res, 200, 'Organisation suspended', {
      id: org._id,
      name: org.name,
      status: org.status,
      suspensionReason: org.suspensionReason,
      suspendedAt: org.suspendedAt
    });

  } catch (err) {
    return error(res, 500, err.message);
  }
};

// @desc    List organisations with pending reinstatement requests
// @route   GET /api/admin/organisations/reinstatement-requests
// @access  Admin
const listReinstatementRequests = async (req, res) => {
  try {
    const orgs = await Organisation.find({
      status: 'suspended',
      'reinstatement.status': 'pending'
    })
      .select('-password')
      .sort({ 'reinstatement.requestedAt': -1 });

    return success(res, 200, 'Reinstatement requests fetched', orgs);
  } catch (err) {
    return error(res, 500, err.message);
  }
};

// @desc    Approve a reinstatement request — restore organisation to approved/active
// @route   PUT /api/admin/organisations/:id/reinstate
// @access  Admin
const reinstateOrganisation = async (req, res) => {
  try {
    const { reviewNote } = req.body || {};

    const org = await Organisation.findById(req.params.id);

    if (!org) {
      return error(res, 404, 'Organisation not found');
    }

    if (org.status !== 'suspended') {
      return error(res, 400, 'Only suspended organisations can be reinstated');
    }

    org.status = 'approved';
    org.isActive = true;
    org.suspensionReason = undefined;
    org.suspendedAt = undefined;
    org.suspendedBy = undefined;
    org.reinstatement = {
      status: 'approved',
      requestMessage: org.reinstatement?.requestMessage,
      requestedAt: org.reinstatement?.requestedAt,
      reviewedBy: req.user.id,
      reviewedAt: new Date(),
      reviewNote: reviewNote ? String(reviewNote).trim() : undefined
    };

    await org.save();

    await notify({
      recipient: org._id,
      recipientModel: 'Organisation',
      title: 'Organisation Reinstated',
      message: 'Your organisation has been reinstated. You can now log in and resume posting courses.',
      type: 'org_reinstated',
      reference: org._id,
      referenceModel: 'Organisation'
    });

    posthog.capture({
      distinctId: req.user.id.toString(),
      event: 'admin org reinstated',
      properties: {
        org_id: org._id.toString(),
        org_name: org.name,
        review_note: org.reinstatement.reviewNote
      }
    });

    return success(res, 200, 'Organisation reinstated', {
      id: org._id,
      name: org.name,
      status: org.status
    });
  } catch (err) {
    return error(res, 500, err.message);
  }
};

// @desc    Deny a reinstatement request — organisation stays suspended
// @route   PUT /api/admin/organisations/:id/deny-reinstatement
// @access  Admin
const denyReinstatement = async (req, res) => {
  try {
    const { reviewNote } = req.body || {};

    if (!reviewNote || !reviewNote.trim()) {
      return error(res, 400, 'Please provide a reviewNote explaining the denial');
    }

    const org = await Organisation.findById(req.params.id);

    if (!org) {
      return error(res, 404, 'Organisation not found');
    }

    if (org.status !== 'suspended') {
      return error(res, 400, 'Only suspended organisations can have reinstatement reviewed');
    }

    if (org.reinstatement?.status !== 'pending') {
      return error(res, 400, 'There is no pending reinstatement request to deny');
    }

    org.reinstatement = {
      status: 'denied',
      requestMessage: org.reinstatement?.requestMessage,
      requestedAt: org.reinstatement?.requestedAt,
      reviewedBy: req.user.id,
      reviewedAt: new Date(),
      reviewNote: reviewNote.trim()
    };

    await org.save();

    await notify({
      recipient: org._id,
      recipientModel: 'Organisation',
      title: 'Reinstatement Request Denied',
      message: `Your reinstatement request was denied. Reason: ${org.reinstatement.reviewNote}`,
      type: 'org_reinstatement_denied',
      reference: org._id,
      referenceModel: 'Organisation'
    });

    posthog.capture({
      distinctId: req.user.id.toString(),
      event: 'admin org reinstatement denied',
      properties: {
        org_id: org._id.toString(),
        org_name: org.name,
        review_note: org.reinstatement.reviewNote
      }
    });

    return success(res, 200, 'Reinstatement denied', {
      id: org._id,
      name: org.name,
      status: org.status,
      reinstatement: org.reinstatement
    });
  } catch (err) {
    return error(res, 500, err.message);
  }
};

module.exports = {
  getAllOrganisations,
  getOrganisation,
  approveOrganisation,
  rejectOrganisation,
  suspendOrganisation,
  listReinstatementRequests,
  reinstateOrganisation,
  denyReinstatement
};