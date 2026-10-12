const crypto = require('crypto');
const { sendEmail } = require('./emailService');

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;

const fieldsByPurpose = {
  emailVerification: {
    hash: 'emailVerificationCodeHash',
    expires: 'emailVerificationCodeExpires',
    attempts: 'emailVerificationAttempts',
    subject: 'Verify your FursaHub account'
  },
  passwordReset: {
    hash: 'passwordResetCodeHash',
    expires: 'passwordResetCodeExpires',
    attempts: 'passwordResetAttempts',
    subject: 'Reset your FursaHub password'
  },
  passwordChange: {
    hash: 'passwordChangeCodeHash',
    expires: 'passwordChangeCodeExpires',
    attempts: 'passwordChangeAttempts',
    subject: 'Confirm your FursaHub password change'
  }
};

const hashCode = (code) => crypto.createHash('sha256').update(code).digest('hex');
const generateCode = () => crypto.randomInt(0, 1000000).toString().padStart(6, '0');

const clearCode = (account, purpose) => {
  const fields = fieldsByPurpose[purpose];
  account[fields.hash] = undefined;
  account[fields.expires] = undefined;
  account[fields.attempts] = 0;
};

const sendCode = async (account, purpose) => {
  const fields = fieldsByPurpose[purpose];
  if (!fields) throw new Error('Unsupported verification code purpose');

  const currentExpiry = account[fields.expires];
  if (currentExpiry && currentExpiry.getTime() - Date.now() > CODE_TTL_MS - 60_000) {
    throw new Error('Please wait 60 seconds before requesting another code.');
  }

  const code = generateCode();
  account[fields.hash] = hashCode(code);
  account[fields.expires] = new Date(Date.now() + CODE_TTL_MS);
  account[fields.attempts] = 0;
  await account.save();

  try {
    await sendEmail({
      to: account.email,
      subject: fields.subject,
      text: `Your FursaHub verification code is ${code}. It expires in 10 minutes.`,
      html: `<p>Your FursaHub verification code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:6px">${code}</p><p>This code expires in 10 minutes. If you did not request it, you can ignore this email.</p>`
    });
  } catch (err) {
    clearCode(account, purpose);
    await account.save();
    throw err;
  }
};

const verifyCode = async (account, purpose, submittedCode) => {
  const fields = fieldsByPurpose[purpose];
  if (!fields) throw new Error('Unsupported verification code purpose');
  if (!/^\d{6}$/.test(String(submittedCode || ''))) return false;

  const storedHash = account[fields.hash];
  const expiresAt = account[fields.expires];
  if (!storedHash || !expiresAt || expiresAt.getTime() <= Date.now()) {
    clearCode(account, purpose);
    await account.save();
    return false;
  }

  const submittedHash = Buffer.from(hashCode(String(submittedCode)), 'hex');
  const expectedHash = Buffer.from(storedHash, 'hex');
  const isValid = submittedHash.length === expectedHash.length &&
    crypto.timingSafeEqual(submittedHash, expectedHash);

  if (!isValid) {
    account[fields.attempts] = (account[fields.attempts] || 0) + 1;
    if (account[fields.attempts] >= MAX_CODE_ATTEMPTS) clearCode(account, purpose);
    await account.save();
    return false;
  }

  clearCode(account, purpose);
  return true;
};

module.exports = { sendCode, verifyCode, clearCode, hashCode, generateCode };
