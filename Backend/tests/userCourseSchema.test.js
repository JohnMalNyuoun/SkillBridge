const test = require('node:test');
const assert = require('node:assert/strict');
const User = require('../models/Users');
const Course = require('../models/course');
const { notSuspended } = require('../middleware/auth');

const makeResponse = () => ({
  statusCode: null,
  body: null,
  status(statusCode) {
    this.statusCode = statusCode;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  }
});

test('User and Course schemas expose the requested roles and references', () => {
  assert.deepEqual(User.schema.path('role').enumValues, [
    'youth',
    'trainee',
    'staff',
    'org_admin',
    'admin'
  ]);
  assert.equal(User.schema.path('createdByOrg').options.ref, 'Organisation');
  assert.equal(User.schema.path('isSuspended').defaultValue, false);

  assert.equal(Course.schema.path('assignedInstructor').options.ref, 'User');
  assert.equal(Course.schema.path('enrolledStudents').getEmbeddedSchemaType().options.ref, 'User');
  assert.equal(Course.schema.path('groupChatId').options.ref, 'GroupChat');
});

test('suspension middleware blocks suspended User accounts', async () => {
  const originalFindById = User.findById;
  User.findById = () => ({
    select: async () => ({ isSuspended: true })
  });

  const req = { user: { id: 'user-id', role: 'youth' } };
  const res = makeResponse();
  let continued = false;

  try {
    await notSuspended(req, res, () => {
      continued = true;
    });
  } finally {
    User.findById = originalFindById;
  }

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.message, 'Your account has been suspended.');
  assert.equal(continued, false);
});

test('suspension middleware allows active User accounts', async () => {
  const originalFindById = User.findById;
  User.findById = () => ({
    select: async () => ({ isSuspended: false })
  });

  const req = { user: { id: 'user-id', role: 'trainee' } };
  const res = makeResponse();
  let continued = false;

  try {
    await notSuspended(req, res, () => {
      continued = true;
    });
  } finally {
    User.findById = originalFindById;
  }

  assert.equal(continued, true);
  assert.equal(res.statusCode, null);
});
