const test = require('node:test');
const assert = require('node:assert/strict');
const { imageIdFromUrl } = require('../services/mongodbImageService');

test('recognises MongoDB image route URLs for safe GridFS cleanup', () => {
  const id = '64b000000000000000000001';

  assert.equal(imageIdFromUrl(`/api/images/${id}`).toHexString(), id);
  assert.equal(imageIdFromUrl('https://res.cloudinary.com/example/image.jpg'), null);
  assert.equal(imageIdFromUrl(`/api/images/${id}?v=2`), null);
  assert.equal(imageIdFromUrl('/api/images/not-an-object-id'), null);
  assert.equal(imageIdFromUrl(null), null);
});
