const test = require('node:test');
const assert = require('node:assert/strict');
const { createGoogleAuthHandler } = require('../controllers/auth/googleAuth');

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

const makeHarness = ({ users = [], organisation = null, verifyIdToken } = {}) => {
  const savedUsers = users;
  let createdUserCount = 0;
  class UserModel {
    constructor(values) {
      Object.assign(this, values);
      this._id = 'new-user-id';
      this.isActive = true;
      this.isSuspended = false;
      createdUserCount += 1;
    }

    static async findOne(query) {
      return savedUsers.find((user) => (
        query.googleId
          ? user.googleId === query.googleId
          : user.email === query.email
      )) || null;
    }

    async save() {
      if (!savedUsers.includes(this)) savedUsers.push(this);
    }
  }

  const OrganisationModel = {
    async findOne() {
      return organisation;
    }
  };
  const handler = createGoogleAuthHandler({
    UserModel,
    OrganisationModel,
    verifyIdToken: verifyIdToken || (async () => ({
      sub: 'google-subject',
      email: 'person@gmail.com',
      email_verified: true,
      name: 'Google Person'
    })),
    createToken: (id, role) => `jwt:${id}:${role}`,
    analytics: { identify() {}, capture() {} }
  });

  return {
    handler,
    users: savedUsers,
    get createdUserCount() {
      return createdUserCount;
    }
  };
};

const invoke = async (handler, idToken = 'valid-google-id-token-value') => {
  const response = makeResponse();
  await handler({ body: { idToken } }, response);
  return response;
};

test('creates a youth account for a new verified Google identity', async () => {
  const harness = makeHarness();
  const response = await invoke(harness.handler);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.data.user.role, 'youth');
  assert.equal(response.body.data.user.email, 'person@gmail.com');
  assert.equal(response.body.data.user.communityType, null);
  assert.equal(response.body.data.token, 'jwt:new-user-id:youth');
  assert.equal(harness.createdUserCount, 1);
  assert.equal(harness.users[0].isVerified, true);
  assert.notEqual(harness.users[0].password, 'valid-google-id-token-value');

  const secondResponse = await invoke(harness.handler);
  assert.equal(secondResponse.statusCode, 200);
  assert.equal(harness.createdUserCount, 1);
  assert.equal(harness.users.length, 1);
});

test('authenticates an already-linked Google subject without creating duplicates', async () => {
  const existingUser = {
    _id: 'existing-id',
    email: 'person@gmail.com',
    fullName: 'Existing Person',
    password: 'existing-password-hash',
    googleId: 'google-subject',
    role: 'admin',
    isActive: true,
    isSuspended: false,
    loginCount: 2,
    async save() {}
  };
  const harness = makeHarness({ users: [existingUser] });
  const response = await invoke(harness.handler);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.data.token, 'jwt:existing-id:admin');
  assert.equal(harness.createdUserCount, 0);
  assert.equal(existingUser.password, 'existing-password-hash');
  assert.equal(existingUser.role, 'admin');
});

test('links a verified Gmail match without changing its password or role', async () => {
  const existingUser = {
    _id: 'existing-id',
    email: 'person@gmail.com',
    fullName: 'Existing Person',
    password: 'existing-password-hash',
    role: 'trainee',
    isVerified: true,
    isActive: true,
    isSuspended: false,
    async save() {}
  };
  const harness = makeHarness({ users: [existingUser] });
  const response = await invoke(harness.handler);

  assert.equal(response.statusCode, 200);
  assert.equal(existingUser.googleId, 'google-subject');
  assert.equal(existingUser.password, 'existing-password-hash');
  assert.equal(existingUser.role, 'trainee');
  assert.equal(harness.createdUserCount, 0);
});

test('rejects unverified and non-Gmail email matches without linking', async (t) => {
  for (const user of [
    { email: 'person@gmail.com', isVerified: false },
    { email: 'person@company.example', isVerified: true }
  ]) {
    await t.test(user.email, async () => {
      const existingUser = {
        ...user,
        _id: 'existing-id',
        fullName: 'Existing Person',
        password: 'existing-password-hash',
        role: 'youth',
        isActive: true,
        isSuspended: false,
        async save() {}
      };
      const harness = makeHarness({
        users: [existingUser],
        verifyIdToken: async () => ({
          sub: 'google-subject',
          email: user.email,
          email_verified: true
        })
      });
      const response = await invoke(harness.handler);

      assert.equal(response.statusCode, 409);
      assert.equal(existingUser.googleId, undefined);
      assert.equal(harness.createdUserCount, 0);
    });
  }
});

test('rejects organization account collisions', async () => {
  const harness = makeHarness({
    organisation: { email: 'person@gmail.com' }
  });
  const response = await invoke(harness.handler);

  assert.equal(response.statusCode, 409);
  assert.equal(harness.createdUserCount, 0);
});

test('rejects invalid, expired, and unverified Google ID tokens', async (t) => {
  await t.test('invalid token', async () => {
    const harness = makeHarness({
      verifyIdToken: async () => {
        throw new Error('Google rejected token');
      }
    });
    const response = await invoke(harness.handler);
    assert.equal(response.statusCode, 401);
  });

  await t.test('expired token', async () => {
    const harness = makeHarness({
      verifyIdToken: async () => {
        throw new Error('Token used too late');
      }
    });
    const response = await invoke(harness.handler);
    assert.equal(response.statusCode, 401);
  });

  await t.test('email is not verified', async () => {
    const harness = makeHarness({
      verifyIdToken: async () => ({
        sub: 'google-subject',
        email: 'person@gmail.com',
        email_verified: false
      })
    });
    const response = await invoke(harness.handler);
    assert.equal(response.statusCode, 401);
  });
});
