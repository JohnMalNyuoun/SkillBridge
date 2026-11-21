const test = require('node:test');
const assert = require('node:assert/strict');
const { getAllowedOrigins } = require('../config/allowedOrigins');

test('allows the production site, Capacitor origin, and existing local origins', () => {
  const origins = getAllowedOrigins({ frontendUrl: '', corsAllowedOrigins: '' });

  assert.deepEqual(origins, [
    'http://localhost:5000',
    'http://localhost:5173',
    'http://localhost:5174',
    'https://skillbridge-tu5k.onrender.com',
    'https://localhost'
  ]);
});

test('preserves configured website origins and normalizes duplicates', () => {
  const origins = getAllowedOrigins({
    frontendUrl: 'https://skillbridge-tu5k.onrender.com/',
    corsAllowedOrigins: 'https://preview.example.com/, https://preview.example.com'
  });

  assert.equal(origins.filter((origin) => (
    origin === 'https://skillbridge-tu5k.onrender.com'
  )).length, 1);
  assert.ok(origins.includes('https://preview.example.com'));
  assert.ok(!origins.includes('*'));
});

test('rejects wildcard origins when CORS credentials are enabled', () => {
  assert.throws(
    () => getAllowedOrigins({
      frontendUrl: '',
      corsAllowedOrigins: 'https://preview.example.com,*'
    }),
    /must be explicit/
  );
});
