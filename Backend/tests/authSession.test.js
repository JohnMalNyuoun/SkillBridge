const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const RefreshSession = require('../models/RefreshSession');
const PushToken = require('../models/PushToken');
const { logoutSession } = require('../controllers/auth/session');
const {
  REFRESH_TOKEN_TTL_SECONDS,
  hashRefreshToken,
  issueAuthTokens,
  refreshAuthSession,
  revokeAuthSession
} = require('../services/authSessionService');

const createSessionStore = () => {
  const records = new Map();
  return {
    records,
    async create(session) {
      records.set(String(session._id), { ...session });
      return session;
    },
    async findById(id) {
      return records.get(String(id)) || null;
    },
    async findOneAndUpdate(filter, update) {
      const session = records.get(String(filter._id));
      if (
        !session
        || session.tokenHash !== filter.tokenHash
        || session.tokenId !== filter.tokenId
        || session.revokedAt !== filter.revokedAt
        || session.expiresAt <= filter.expiresAt.$gt
      ) {
        return null;
      }
      Object.assign(session, update.$set);
      return session;
    },
    async updateOne(filter, update) {
      const session = records.get(String(filter._id));
      if (session && session.revokedAt === filter.revokedAt) {
        Object.assign(session, update.$set);
      }
    }
  };
};

const withAuthSecrets = async (run) => {
  const previousJwtSecret = process.env.JWT_SECRET;
  const previousRefreshSecret = process.env.REFRESH_TOKEN_SECRET;
  process.env.JWT_SECRET = 'test-jwt-secret-with-sufficient-length';
  process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret-with-sufficient-length';
  try {
    await run();
  } finally {
    if (previousJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousJwtSecret;
    if (previousRefreshSecret === undefined) delete process.env.REFRESH_TOKEN_SECRET;
    else process.env.REFRESH_TOKEN_SECRET = previousRefreshSecret;
  }
};

test('Android login stores only a hash and issues a short-lived access token', async () => {
  await withAuthSecrets(async () => {
    const SessionModel = createSessionStore();
    const now = new Date('2026-01-01T00:00:00.000Z');
    const account = { _id: 'youth-id', role: 'youth' };
    const result = await issueAuthTokens(account, 'User', {
      headers: { 'x-client-platform': 'android' }
    }, { SessionModel, now });

    const accessClaims = jwt.verify(result.token, process.env.JWT_SECRET);
    const [session] = SessionModel.records.values();
    assert.equal(accessClaims.id, account._id);
    assert.equal(accessClaims.role, 'youth');
    assert.equal(Math.round(accessClaims.exp - accessClaims.iat), 15 * 60);
    assert.equal(accessClaims.sid, String(session._id));
    assert.equal(session.tokenHash, hashRefreshToken(result.refreshToken));
    assert.notEqual(session.tokenHash, result.refreshToken);
    assert.equal(session.accountModel, 'User');
    assert.equal(session.platform, 'android');
    assert.equal(
      Math.round((session.expiresAt.getTime() - now.getTime()) / 1000),
      REFRESH_TOKEN_TTL_SECONDS
    );
  });
});

test('refresh rotates the token and reusing a rotated token revokes that device session', async () => {
  await withAuthSecrets(async () => {
    const SessionModel = createSessionStore();
    const now = new Date('2026-01-01T00:00:00.000Z');
    const account = {
      _id: 'youth-id',
      role: 'youth',
      isActive: true,
      isSuspended: false
    };
    const accountModel = {
      findById: async () => account
    };
    const original = await issueAuthTokens(account, 'User', {
      headers: { 'x-client-platform': 'android' }
    }, { SessionModel, now });

    const rotated = await refreshAuthSession(original.refreshToken, {
      SessionModel,
      UserModel: accountModel,
      now: new Date(now.getTime() + 60_000)
    });

    assert.notEqual(rotated.refreshToken, original.refreshToken);
    assert.equal(
      rotated.token && jwt.verify(rotated.token, process.env.JWT_SECRET).role,
      'youth'
    );
    assert.equal(SessionModel.records.values().next().value.tokenHash, hashRefreshToken(rotated.refreshToken));

    await assert.rejects(
      refreshAuthSession(original.refreshToken, {
        SessionModel,
        UserModel: accountModel,
        now: new Date(now.getTime() + 120_000)
      }),
      { code: 'REFRESH_TOKEN_REUSE' }
    );
    assert.ok(SessionModel.records.values().next().value.revokedAt);
  });
});

test('organization refresh preserves its account type and remains subject to account status', async (t) => {
  await withAuthSecrets(async () => {
    const SessionModel = createSessionStore();
    const now = new Date('2026-01-01T00:00:00.000Z');
    const organisation = {
      _id: 'organisation-id',
      role: 'organisation',
      status: 'approved',
      isActive: true
    };
    const initial = await issueAuthTokens(organisation, 'Organisation', {
      headers: { 'x-client-platform': 'android' }
    }, { SessionModel, now });
    const refreshed = await refreshAuthSession(initial.refreshToken, {
      SessionModel,
      OrganisationModel: { findById: async () => organisation },
      now: new Date(now.getTime() + 60_000)
    });

    assert.equal(refreshed.accountModel, 'Organisation');
    assert.equal(jwt.verify(refreshed.token, process.env.JWT_SECRET).role, 'organisation');

    await t.test('suspended organization cannot refresh', async () => {
      const session = createSessionStore();
      const activeOrg = { ...organisation, status: 'approved' };
      const issued = await issueAuthTokens(activeOrg, 'Organisation', {
        headers: { 'x-client-platform': 'android' }
      }, { SessionModel: session, now });
      activeOrg.status = 'suspended';

      await assert.rejects(
        refreshAuthSession(issued.refreshToken, {
          SessionModel: session,
          OrganisationModel: { findById: async () => activeOrg },
          now: new Date(now.getTime() + 60_000)
        }),
        { code: 'ACCOUNT_DISABLED' }
      );
    });
  });
});

test('expired refresh sessions cannot be renewed', async () => {
  await withAuthSecrets(async () => {
    const SessionModel = createSessionStore();
    const now = new Date('2026-01-01T00:00:00.000Z');
    const account = { _id: 'youth-id', role: 'youth' };
    const issued = await issueAuthTokens(account, 'User', {
      headers: { 'x-client-platform': 'android' }
    }, { SessionModel, now });

    await assert.rejects(
      refreshAuthSession(issued.refreshToken, {
        SessionModel,
        UserModel: { findById: async () => account },
        now: new Date(now.getTime() + (REFRESH_TOKEN_TTL_SECONDS * 1000))
      }),
      { code: 'EXPIRED_SESSION' }
    );
    assert.ok(SessionModel.records.values().next().value.revokedAt);
  });
});

test('logout revokes the refresh session and malformed tokens are rejected', async () => {
  await withAuthSecrets(async () => {
    const SessionModel = createSessionStore();
    const account = { _id: 'youth-id', role: 'youth' };
    const issued = await issueAuthTokens(account, 'User', {
      headers: { 'x-client-platform': 'android' }
    }, { SessionModel });

    assert.equal(await revokeAuthSession(issued.refreshToken, { SessionModel }), true);
    await assert.rejects(
      refreshAuthSession(issued.refreshToken, { SessionModel }),
      { code: 'EXPIRED_SESSION' }
    );
    await assert.rejects(
      refreshAuthSession('not-a-refresh-token', { SessionModel }),
      { code: 'INVALID_SESSION' }
    );
  });
});

test('website authentication keeps the existing 30-day JWT and creates no refresh session', async () => {
  await withAuthSecrets(async () => {
    const SessionModel = createSessionStore();
    const result = await issueAuthTokens(
      { _id: 'web-user-id', role: 'youth' },
      'User',
      { headers: {} },
      { SessionModel }
    );
    const claims = jwt.verify(result.token, process.env.JWT_SECRET);

    assert.equal(result.refreshToken, undefined);
    assert.equal(Math.round(claims.exp - claims.iat), REFRESH_TOKEN_TTL_SECONDS);
    assert.equal(SessionModel.records.size, 0);
  });
});

test('Android logout removes push tokens linked to the revoked refresh session', async () => {
  await withAuthSecrets(async () => {
    const SessionModel = createSessionStore();
    const issued = await issueAuthTokens(
      { _id: 'youth-id', role: 'youth' },
      'User',
      { headers: { 'x-client-platform': 'android' } },
      { SessionModel }
    );
    const originalUpdateOne = RefreshSession.updateOne;
    const originalDeleteMany = PushToken.deleteMany;
    let revokedSessionId;
    let deletedTokenFilter;
    RefreshSession.updateOne = async (filter) => {
      revokedSessionId = filter._id;
      return { modifiedCount: 1 };
    };
    PushToken.deleteMany = async (filter) => {
      deletedTokenFilter = filter;
      return { deletedCount: 1 };
    };

    try {
      const response = {
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
      };
      await logoutSession({ body: { refreshToken: issued.refreshToken } }, response);

      assert.equal(response.statusCode, 200);
      assert.equal(revokedSessionId, jwt.decode(issued.refreshToken).sid);
      assert.equal(deletedTokenFilter.refreshSessionId, revokedSessionId);
    } finally {
      RefreshSession.updateOne = originalUpdateOne;
      PushToken.deleteMany = originalDeleteMany;
    }
  });
});
