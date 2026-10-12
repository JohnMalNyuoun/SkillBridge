const test = require('node:test');
const assert = require('node:assert/strict');
const { generateCode, hashCode, verifyCode } = require('../services/verificationCodeService');

const makeAccount = (overrides = {}) => ({
  emailVerificationCodeHash: hashCode('045678'),
  emailVerificationCodeExpires: new Date(Date.now() + 60_000),
  emailVerificationAttempts: 0,
  saves: 0,
  async save() {
    this.saves += 1;
  },
  ...overrides
});

test('accepts a valid six-digit code and clears its stored hash', async () => {
  const account = makeAccount();

  assert.equal(await verifyCode(account, 'emailVerification', '045678'), true);
  assert.equal(account.emailVerificationCodeHash, undefined);
  assert.equal(account.emailVerificationAttempts, 0);
});

test('generates codes with exactly six digits, including leading zeroes', () => {
  assert.match(generateCode(), /^\d{6}$/);
});

test('rejects codes that are not exactly six digits', async () => {
  const account = makeAccount();

  assert.equal(await verifyCode(account, 'emailVerification', '45678'), false);
  assert.equal(account.emailVerificationAttempts, 0);
});

test('expires codes and clears them', async () => {
  const account = makeAccount({
    emailVerificationCodeExpires: new Date(Date.now() - 1)
  });

  assert.equal(await verifyCode(account, 'emailVerification', '045678'), false);
  assert.equal(account.emailVerificationCodeHash, undefined);
  assert.equal(account.saves, 1);
});

test('invalid attempts are counted and the code is cleared after five failures', async () => {
  const account = makeAccount();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    assert.equal(await verifyCode(account, 'emailVerification', '000000'), false);
  }

  assert.equal(account.emailVerificationAttempts, 0);
  assert.equal(account.emailVerificationCodeHash, undefined);
  assert.equal(account.saves, 5);
});
