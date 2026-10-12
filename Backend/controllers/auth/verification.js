const bcrypt = require('bcryptjs');
const User = require('../../models/Users');
const Organisation = require('../../models/Organisation');
const generateToken = require('../../utils/generateToken');
const { success, error } = require('../../utils/apiResponse');
const { sendCode, verifyCode } = require('../../services/verificationCodeService');

const accountModels = {
  youth: User,
  organisation: Organisation
};

const getAccount = async (accountType, email) => {
  if (!Object.hasOwn(accountModels, accountType)) return null;
  const Model = accountModels[accountType];
  return Model.findOne({ email: String(email || '').toLowerCase().trim() });
};

const verifyRegistrationEmail = async (req, res) => {
  try {
    const { email, accountType, code } = req.body || {};
    const account = await getAccount(accountType, email);
    if (!account || !account.emailVerificationCodeHash) {
      return error(res, 400, 'Invalid or expired verification code');
    }

    if (!(await verifyCode(account, 'emailVerification', code))) {
      return error(res, 400, 'Invalid or expired verification code');
    }

    account.isVerified = true;
    await account.save();

    if (accountType === 'youth') {
      const token = generateToken(account._id, account.role);
      return success(res, 200, 'Email verified successfully', {
        token,
        user: {
          id: account._id,
          fullName: account.fullName,
          email: account.email,
          photo: account.photo,
          communityType: account.communityType,
          role: account.role
        }
      });
    }

    return success(res, 200, 'Email verified. Your organisation registration is awaiting admin approval.', {
      organisation: {
        id: account._id,
        name: account.name,
        email: account.email,
        type: account.type,
        status: account.status,
        role: account.role
      }
    });
  } catch (err) {
    return error(res, 500, err.message);
  }
};

const resendRegistrationCode = async (req, res) => {
  try {
    const { email, accountType } = req.body || {};
    if (!Object.hasOwn(accountModels, accountType) || !email) {
      return error(res, 400, 'Please provide a valid account type and email');
    }

    const account = await getAccount(accountType, email);
    if (account && !account.isVerified) {
      await sendCode(account, 'emailVerification');
    }

    return success(res, 200, 'If your account is awaiting verification, a new code has been sent.');
  } catch (err) {
    return error(res, 500, err.message);
  }
};

const requestPasswordReset = async (req, res) => {
  try {
    const { email, accountType } = req.body || {};
    if (!Object.hasOwn(accountModels, accountType) || !email) {
      return error(res, 400, 'Please provide a valid account type and email');
    }

    const account = await getAccount(accountType, email);
    if (account) await sendCode(account, 'passwordReset');

    return success(res, 200, 'If an account exists for that email, a password reset code has been sent.');
  } catch (err) {
    return error(res, 500, err.message);
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, accountType, code, newPassword, confirmNewPassword } = req.body || {};
    if (!email || !Object.hasOwn(accountModels, accountType) || !code || typeof newPassword !== 'string') {
      return error(res, 400, 'Please provide account type, email, code and new password');
    }
    if (newPassword.length < 6) {
      return error(res, 400, 'New password must be at least 6 characters');
    }
    if (confirmNewPassword !== undefined && newPassword !== confirmNewPassword) {
      return error(res, 400, 'New password and confirmation do not match');
    }

    const account = await getAccount(accountType, email);
    if (!account || !(await verifyCode(account, 'passwordReset', code))) {
      return error(res, 400, 'Invalid or expired verification code');
    }

    account.password = await bcrypt.hash(newPassword, await bcrypt.genSalt(10));
    await account.save();
    return success(res, 200, 'Password reset successfully. You can now sign in.');
  } catch (err) {
    return error(res, 500, err.message);
  }
};

module.exports = {
  verifyRegistrationEmail,
  resendRegistrationCode,
  requestPasswordReset,
  resetPassword
};
