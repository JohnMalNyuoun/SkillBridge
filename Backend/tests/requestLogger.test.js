const test = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeSensitiveFields } = require('../middleware/requestLogger');

test('request logging redacts credentials and tokens recursively', () => {
  const sanitized = sanitizeSensitiveFields({
    email: 'person@example.com',
    password: 'password-value',
    refreshToken: 'refresh-value',
    nested: {
      idToken: 'google-token',
      api_key: 'api-key-value'
    },
    list: [{ authorization: 'bearer-value' }]
  });

  assert.deepEqual(sanitized, {
    email: 'person@example.com',
    password: '[redacted]',
    refreshToken: '[redacted]',
    nested: {
      idToken: '[redacted]',
      api_key: '[redacted]'
    },
    list: [{ authorization: '[redacted]' }]
  });
});
