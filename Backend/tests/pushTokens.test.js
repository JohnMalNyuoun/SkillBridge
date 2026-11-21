const test = require('node:test');
const assert = require('node:assert/strict');
const PushToken = require('../models/PushToken');
const RefreshSession = require('../models/RefreshSession');
const { registerPushToken, removePushToken } = require('../controllers/pushTokens');

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

const validRequest = (accountId, role, sessionId, token) => ({
  headers: { 'x-client-platform': 'android' },
  user: { id: accountId, role, sid: sessionId },
  body: { token }
});

test('push token registration derives youth account and device session from the JWT', async () => {
  const originals = {
    refreshFindOne: RefreshSession.findOne,
    pushDeleteMany: PushToken.deleteMany,
    pushFindOneAndUpdate: PushToken.findOneAndUpdate
  };
  const accountId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
  const sessionId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
  const token = 'fcm-token-for-youth-device-123456789';
  let saved;
  let sessionQuery;

  RefreshSession.findOne = (query) => {
    sessionQuery = query;
    return { select: async () => ({ _id: sessionId }) };
  };
  PushToken.deleteMany = async () => ({ deletedCount: 0 });
  PushToken.findOneAndUpdate = async (filter, update) => {
    saved = { filter, ...update.$set };
    return saved;
  };

  try {
    const response = makeResponse();
    await registerPushToken(validRequest(accountId, 'youth', sessionId, token), response);

    assert.equal(response.statusCode, 200);
    assert.equal(saved.accountId, accountId);
    assert.equal(saved.accountModel, 'User');
    assert.equal(saved.refreshSessionId, sessionId);
    assert.equal(saved.token, token);
    assert.equal(saved.platform, 'android');
    assert.equal(sessionQuery.accountId, accountId);
    assert.equal(sessionQuery.accountModel, 'User');
    assert.equal(sessionQuery._id, sessionId);
  } finally {
    RefreshSession.findOne = originals.refreshFindOne;
    PushToken.deleteMany = originals.pushDeleteMany;
    PushToken.findOneAndUpdate = originals.pushFindOneAndUpdate;
  }
});

test('push token registration supports organization accounts and token refresh', async () => {
  const originals = {
    refreshFindOne: RefreshSession.findOne,
    pushDeleteMany: PushToken.deleteMany,
    pushFindOneAndUpdate: PushToken.findOneAndUpdate
  };
  const accountId = 'cccccccccccccccccccccccc';
  const sessionId = 'dddddddddddddddddddddddd';
  const tokens = [];

  RefreshSession.findOne = (query) => ({
    select: async () => ({ _id: query._id })
  });
  PushToken.deleteMany = async () => ({ deletedCount: 1 });
  PushToken.findOneAndUpdate = async (_filter, update) => {
    tokens.push(update.$set.token);
    return update.$set;
  };

  try {
    for (const token of [
      'fcm-organization-token-version-one-12345',
      'fcm-organization-token-version-two-67890'
    ]) {
      const response = makeResponse();
      await registerPushToken(
        validRequest(accountId, 'organisation', sessionId, token),
        response
      );
      assert.equal(response.statusCode, 200);
    }

    assert.deepEqual(tokens, [
      'fcm-organization-token-version-one-12345',
      'fcm-organization-token-version-two-67890'
    ]);
  } finally {
    RefreshSession.findOne = originals.refreshFindOne;
    PushToken.deleteMany = originals.pushDeleteMany;
    PushToken.findOneAndUpdate = originals.pushFindOneAndUpdate;
  }
});

test('push token registration rejects non-Android and revoked device sessions', async () => {
  const originalRefreshFindOne = RefreshSession.findOne;
  RefreshSession.findOne = () => ({ select: async () => null });

  try {
    const response = makeResponse();
    await registerPushToken(
      {
        headers: {},
        user: {
          id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
          role: 'youth',
          sid: 'bbbbbbbbbbbbbbbbbbbbbbbb'
        },
        body: { token: 'fcm-token-for-youth-device-123456789' }
      },
      response
    );

    assert.equal(response.statusCode, 401);
  } finally {
    RefreshSession.findOne = originalRefreshFindOne;
  }
});

test('push token deletion is scoped to the authenticated account and refresh session', async () => {
  const originals = {
    refreshFindOne: RefreshSession.findOne,
    pushDeleteMany: PushToken.deleteMany
  };
  const accountId = 'eeeeeeeeeeeeeeeeeeeeeeee';
  const sessionId = 'ffffffffffffffffffffffff';
  let deleteFilter;

  RefreshSession.findOne = () => ({ select: async () => ({ _id: sessionId }) });
  PushToken.deleteMany = async (filter) => {
    deleteFilter = filter;
    return { deletedCount: 1 };
  };

  try {
    const response = makeResponse();
    await removePushToken(validRequest(accountId, 'organisation', sessionId), response);

    assert.equal(response.statusCode, 200);
    assert.deepEqual(deleteFilter, {
      accountId,
      accountModel: 'Organisation',
      refreshSessionId: sessionId
    });
  } finally {
    RefreshSession.findOne = originals.refreshFindOne;
    PushToken.deleteMany = originals.pushDeleteMany;
  }
});
