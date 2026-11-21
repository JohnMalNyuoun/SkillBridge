const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/Users');
const { loginYouth } = require('../controllers/auth/youthAuth');
const { protect } = require('../middleware/auth');

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

test('email/password login keeps returning the existing SkillBridge session shape', async () => {
  const originalSecret = process.env.JWT_SECRET;
  const originalFindOne = User.findOne;
  const secret = 'auth-regression-test-secret';
  process.env.JWT_SECRET = secret;

  const password = 'existing-password';
  const user = {
    _id: 'existing-youth-id',
    fullName: 'Existing Youth',
    email: 'existing@example.com',
    password: await bcrypt.hash(password, 4),
    photo: null,
    communityType: 'refugee',
    role: 'youth',
    isVerified: true,
    isActive: true,
    loginCount: 0,
    async save() {}
  };
  User.findOne = async () => user;

  try {
    const response = makeResponse();
    await loginYouth({ body: { email: user.email, password } }, response);

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.data.user.id, user._id);
    assert.equal(response.body.data.user.role, 'youth');
    assert.equal(jwt.verify(response.body.data.token, secret).id, user._id);
  } finally {
    User.findOne = originalFindOne;
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  }
});

test('existing Bearer JWTs still pass protected-route authentication', async () => {
  const originalSecret = process.env.JWT_SECRET;
  const originalFindById = User.findById;
  const secret = 'auth-regression-test-secret';
  process.env.JWT_SECRET = secret;
  User.findById = () => ({
    select: async () => ({ isSuspended: false })
  });

  try {
    const token = jwt.sign({ id: 'existing-youth-id', role: 'youth' }, secret);
    const request = { headers: { authorization: `Bearer ${token}` } };
    const response = makeResponse();
    let nextCalled = false;

    await protect(request, response, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(request.user.id, 'existing-youth-id');
  } finally {
    User.findById = originalFindById;
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  }
});
