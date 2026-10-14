const bcrypt = require('bcryptjs');
const Organisation = require('../../models/Organisation');
const User = require('../../models/Users');
const generateToken = require('../../utils/generateToken');
const { success, error } = require('../../utils/apiResponse');
const { notify } = require('../../services/notificationService');
const posthog = require('../../config/posthog');
const { sendCode } = require('../../services/verificationCodeService');

// @desc    Register organisation
// @route   POST /api/auth/org/register
// @access  Public
const registerOrg = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      type,
      description,
      phoneNumber,
      location,
      website
    } = req.body;

    // Check required fields
    if (!name || !email || !password || !type || !description || !phoneNumber) {
      return error(res, 400, 'Please provide name, email, password, type, description and phoneNumber');
    }

    // Check if email already exists
    const existingOrg = await Organisation.findOne({ email });
    if (existingOrg) {
      return error(res, 400, 'Email already registered');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create organisation
    const org = await Organisation.create({
      name,
      email,
      password: hashedPassword,
      type,
      description,
      phoneNumber,
      location,
      website
    });

    try {
      await sendCode(org, 'emailVerification');
    } catch (mailError) {
      await org.deleteOne();
      throw mailError;
    }

    posthog.capture({
      distinctId: org._id.toString(),
      event: 'org registered',
      properties: {
        org_type: org.type,
        org_name: org.name,
        $set: { name: org.name, email: org.email, org_type: org.type, role: org.role }
      }
    });

    return success(res, 201, 'A six-digit verification code was sent to your email address.', {
      email: org.email,
      accountType: 'organisation'
    });

  } catch (err) {
    return error(res, 500, err.message);
  }
};

// @desc    Login organisation
// @route   POST /api/auth/org/login
// @access  Public
const loginOrg = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check required fields
    if (!email || !password) {
      return error(res, 400, 'Please provide email and password');
    }

    // Find organisation
    const org = await Organisation.findOne({ email });
    if (!org) {
      return error(res, 401, 'Invalid email or password');
    }

    if (!org.isVerified && org.emailVerificationCodeHash) {
      return error(res, 403, 'Verify your email address before signing in.');
    }

    // Check if account is active
    if (!org.isActive) {
      return error(res, 403, 'Your account has been deactivated');
    }

    // Block login if not approved
    if (org.status === 'pending') {
      return error(res, 403, 'Your account is pending admin approval');
    }

    if (org.status === 'rejected') {
      return error(res, 403, `Your account was rejected. Reason: ${org.rejectionReason}`);
    }

    if (org.status === 'suspended') {
      const reason = org.suspensionReason ? ` Reason: ${org.suspensionReason}.` : '';
      const reinstateStatus = org.reinstatement?.status;
      let suffix = ' You may submit a reinstatement request to ask SkillBridge admins to review your account.';
      if (reinstateStatus === 'pending') {
        suffix = ' Your reinstatement request is pending admin review.';
      } else if (reinstateStatus === 'denied') {
        suffix = ` Your previous reinstatement request was denied${org.reinstatement?.reviewNote ? `: ${org.reinstatement.reviewNote}` : ''}. You may submit a new one.`;
      }
      return error(res, 403, `Your account has been suspended.${reason}${suffix}`);
    }

    // Check password
    const isMatch = await bcrypt.compare(password, org.password);
    if (!isMatch) {
      return error(res, 401, 'Invalid email or password');
    }

    // Generate token
    const token = generateToken(org._id, org.role);

    posthog.identify({
      distinctId: org._id.toString(),
      properties: {
        email: org.email,
        name: org.name,
        org_type: org.type,
        role: org.role
      }
    });
    posthog.capture({
      distinctId: org._id.toString(),
      event: 'org logged in',
      properties: {
        org_type: org.type,
        org_name: org.name
      }
    });

    return success(res, 200, 'Login successful', {
      token,
      organisation: {
        id: org._id,
        name: org.name,
        email: org.email,
        type: org.type,
        status: org.status,
        role: org.role
      }
    });

  } catch (err) {
    return error(res, 500, err.message);
  }
};

// @desc    Submit a reinstatement request from a suspended organisation
// @route   POST /api/auth/org/reinstate-request
// @access  Public (credentials required)
const requestReinstatement = async (req, res) => {
  try {
    const { email, password, message } = req.body || {};

    if (!email || !password || !message || !message.trim()) {
      return error(res, 400, 'Please provide email, password and a message describing the situation');
    }

    const org = await Organisation.findOne({ email });
    if (!org) {
      return error(res, 401, 'Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, org.password);
    if (!isMatch) {
      return error(res, 401, 'Invalid email or password');
    }

    if (org.status !== 'suspended') {
      return error(res, 400, 'Only suspended organisations can submit a reinstatement request');
    }

    if (org.reinstatement?.status === 'pending') {
      return error(res, 400, 'A reinstatement request is already pending review');
    }

    org.reinstatement = {
      status: 'pending',
      requestMessage: message.trim(),
      requestedAt: new Date(),
      reviewedBy: undefined,
      reviewedAt: undefined,
      reviewNote: undefined
    };

    await org.save();

    // Notify all admins
    const admins = await User.find({ role: 'admin' }).select('_id');
    await Promise.all(admins.map((admin) => notify({
      recipient: admin._id,
      recipientModel: 'User',
      title: 'Reinstatement Request',
      message: `${org.name} has requested to be reinstated.`,
      type: 'org_reinstatement_request',
      reference: org._id,
      referenceModel: 'Organisation'
    })));

    posthog.capture({
      distinctId: org._id.toString(),
      event: 'org reinstatement requested',
      properties: {
        org_name: org.name,
        org_type: org.type
      }
    });

    return success(res, 200, 'Reinstatement request submitted. An admin will review it shortly.', {
      organisationId: org._id,
      reinstatement: {
        status: org.reinstatement.status,
        requestedAt: org.reinstatement.requestedAt
      }
    });
  } catch (err) {
    return error(res, 500, err.message);
  }
};

module.exports = { registerOrg, loginOrg, requestReinstatement };