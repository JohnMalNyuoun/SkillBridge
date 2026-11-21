const test = require('node:test');
const assert = require('node:assert/strict');
const { OAuth2Client } = require('google-auth-library');
const { verifyGoogleIdToken } = require('../services/googleAuth');

test('Google ID-token verification uses the configured website OAuth audience', async () => {
  const originalClientId = process.env.GOOGLE_CLIENT_ID;
  const originalVerify = OAuth2Client.prototype.verifyIdToken;
  const clientId = 'website-oauth-client-id';
  const claims = {
    sub: 'google-subject',
    email: 'person@gmail.com',
    email_verified: true
  };
  let verifierOptions;

  process.env.GOOGLE_CLIENT_ID = clientId;
  OAuth2Client.prototype.verifyIdToken = async function (options) {
    verifierOptions = options;
    return { getPayload: () => claims };
  };

  try {
    const result = await verifyGoogleIdToken('google-id-token');
    assert.deepEqual(verifierOptions, {
      idToken: 'google-id-token',
      audience: clientId
    });
    assert.equal(result.sub, claims.sub);
  } finally {
    OAuth2Client.prototype.verifyIdToken = originalVerify;
    if (originalClientId === undefined) delete process.env.GOOGLE_CLIENT_ID;
    else process.env.GOOGLE_CLIENT_ID = originalClientId;
  }
});
