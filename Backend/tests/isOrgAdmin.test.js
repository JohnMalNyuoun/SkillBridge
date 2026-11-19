const test = require('node:test');
const assert = require('node:assert/strict');
const Organisation = require('../models/Organisation');
const { isOrgAdmin } = require('../middleware/isOrgAdmin');

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

test('approved legacy organisation accounts can manage their course group chats', async () => {
  const originalFindById = Organisation.findById;
  Organisation.findById = (id) => ({
    select(fields) {
      assert.equal(id, 'organisation-id');
      assert.equal(fields, 'isActive status');
      return Promise.resolve({
        _id: 'organisation-id',
        isActive: true,
        status: 'approved'
      });
    }
  });

  const req = { user: { id: 'organisation-id', role: 'organisation' } };
  const res = makeResponse();
  let nextCalled = false;

  try {
    await isOrgAdmin(req, res, () => {
      nextCalled = true;
    });
  } finally {
    Organisation.findById = originalFindById;
  }

  assert.equal(nextCalled, true);
  assert.equal(req.organizationId, 'organisation-id');
});

test('unapproved legacy organisation accounts cannot manage course group chats', async () => {
  const originalFindById = Organisation.findById;
  Organisation.findById = () => ({
    select: async () => ({
      _id: 'organisation-id',
      isActive: true,
      status: 'pending'
    })
  });

  const res = makeResponse();
  let nextCalled = false;

  try {
    await isOrgAdmin(
      { user: { id: 'organisation-id', role: 'organisation' } },
      res,
      () => {
        nextCalled = true;
      }
    );
  } finally {
    Organisation.findById = originalFindById;
  }

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
});
