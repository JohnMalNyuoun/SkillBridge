const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client();

class GoogleAuthConfigurationError extends Error {}

const verifyGoogleIdToken = async (idToken) => {
  const audience = process.env.GOOGLE_CLIENT_ID;
  if (!audience) {
    throw new GoogleAuthConfigurationError('GOOGLE_CLIENT_ID is not configured');
  }

  const ticket = await client.verifyIdToken({ idToken, audience });
  const payload = ticket.getPayload();

  if (!payload?.sub || !payload.email || payload.email_verified !== true) {
    throw new Error('Google ID token does not contain a verified email');
  }

  return payload;
};

module.exports = { GoogleAuthConfigurationError, verifyGoogleIdToken };
