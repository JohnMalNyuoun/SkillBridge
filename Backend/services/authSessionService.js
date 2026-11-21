const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const RefreshSession = require('../models/RefreshSession');
const User = require('../models/Users');
const Organisation = require('../models/Organisation');
const generateToken = require('../utils/generateToken');

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
const SESSION_MODELS = {
  User,
  Organisation
};

class AuthSessionError extends Error {
  constructor(code) {
    super(code);
    this.name = 'AuthSessionError';
    this.code = code;
  }
}

class AuthSessionConfigurationError extends Error {
  constructor() {
    super('REFRESH_TOKEN_SECRET must contain at least 32 characters');
    this.name = 'AuthSessionConfigurationError';
  }
}

const isNativeAndroidRequest = (req) => (
  String(req?.headers?.['x-client-platform'] || '').toLowerCase() === 'android'
);

const getRefreshSecret = () => {
  const secret = process.env.REFRESH_TOKEN_SECRET;
  if (!secret || secret.length < 32) {
    throw new AuthSessionConfigurationError();
  }
  return secret;
};

const hashRefreshToken = (token) => crypto
  .createHash('sha256')
  .update(token)
  .digest('hex');

const sameHash = (left, right) => {
  if (
    typeof left !== 'string'
    || typeof right !== 'string'
    || !/^[a-f\d]{64}$/i.test(left)
    || !/^[a-f\d]{64}$/i.test(right)
  ) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'));
};

const signRefreshToken = (sessionId, accountModel, now, secret) => {
  const issuedAt = Math.floor(now.getTime() / 1000);
  const token = jwt.sign(
    { sid: String(sessionId), accountModel, typ: 'refresh', iat: issuedAt },
    secret,
    {
      expiresIn: REFRESH_TOKEN_TTL_SECONDS,
      jwtid: crypto.randomUUID()
    }
  );
  return { token, claims: jwt.decode(token) };
};

const issueAuthTokens = async (
  account,
  accountModel,
  req,
  { SessionModel = RefreshSession, createToken = generateToken, now = new Date() } = {}
) => {
  const nativeAndroid = isNativeAndroidRequest(req);
  if (!nativeAndroid) {
    return { token: createToken(account._id, account.role) };
  }

  const secret = getRefreshSecret();
  const sessionId = new mongoose.Types.ObjectId();
  const refresh = signRefreshToken(sessionId, accountModel, now, secret);
  const token = createToken(account._id, account.role, ACCESS_TOKEN_TTL, sessionId);
  await SessionModel.create({
    _id: sessionId,
    accountId: account._id,
    accountModel,
    tokenHash: hashRefreshToken(refresh.token),
    tokenId: refresh.claims.jti,
    expiresAt: new Date(refresh.claims.exp * 1000),
    lastActivityAt: now,
    revokedAt: null,
    platform: 'android',
    deviceName: 'SkillBridge Android'
  });

  return { token, refreshToken: refresh.token };
};

const getSessionById = async (SessionModel, sessionId) => {
  const query = SessionModel.findById(sessionId);
  if (query && typeof query.select === 'function') {
    query.select('+tokenHash');
  }
  return query;
};

const loadAccount = async (
  accountModel,
  accountId,
  { UserModel = User, OrganisationModel = Organisation } = {}
) => {
  const Model = { User: UserModel, Organisation: OrganisationModel }[accountModel];
  if (!Model) throw new AuthSessionError('INVALID_SESSION');
  return Model.findById(accountId);
};

const accountCanRefresh = (account, accountModel) => {
  if (!account || account.isActive === false) return false;
  if (accountModel === 'User') return account.isSuspended !== true;
  return !['pending', 'rejected', 'suspended'].includes(account.status);
};

const revokeSessionById = async (SessionModel, sessionId, now) => {
  await SessionModel.updateOne(
    { _id: sessionId, revokedAt: null },
    { $set: { revokedAt: now } }
  );
};

const refreshAuthSession = async (
  refreshToken,
  {
    SessionModel = RefreshSession,
    UserModel = User,
    OrganisationModel = Organisation,
    now = new Date()
  } = {}
) => {
  if (typeof refreshToken !== 'string' || refreshToken.length < 20 || refreshToken.length > 8192) {
    throw new AuthSessionError('INVALID_SESSION');
  }

  const secret = getRefreshSecret();
  let claims;
  try {
    claims = jwt.verify(refreshToken, secret, { ignoreExpiration: true });
  } catch {
    throw new AuthSessionError('INVALID_SESSION');
  }

  if (
    claims.typ !== 'refresh'
    || !claims.sid
    || !claims.jti
    || !SESSION_MODELS[claims.accountModel]
  ) {
    throw new AuthSessionError('INVALID_SESSION');
  }

  const session = await getSessionById(SessionModel, claims.sid);
  if (
    !session
    || session.revokedAt
    || session.accountModel !== claims.accountModel
  ) {
    throw new AuthSessionError('EXPIRED_SESSION');
  }

  const nowSeconds = Math.floor(now.getTime() / 1000);
  if (
    !session.expiresAt
    || new Date(session.expiresAt).getTime() <= now.getTime()
    || claims.exp <= nowSeconds
  ) {
    await revokeSessionById(SessionModel, claims.sid, now);
    throw new AuthSessionError('EXPIRED_SESSION');
  }

  const suppliedHash = hashRefreshToken(refreshToken);
  if (session.tokenId !== claims.jti || !sameHash(session.tokenHash, suppliedHash)) {
    await revokeSessionById(SessionModel, claims.sid, now);
    throw new AuthSessionError('REFRESH_TOKEN_REUSE');
  }

  const account = await loadAccount(claims.accountModel, session.accountId, {
    UserModel,
    OrganisationModel
  });
  if (!accountCanRefresh(account, claims.accountModel)) {
    await revokeSessionById(SessionModel, claims.sid, now);
    throw new AuthSessionError(account ? 'ACCOUNT_DISABLED' : 'ACCOUNT_NOT_FOUND');
  }

  const nextRefresh = signRefreshToken(claims.sid, claims.accountModel, now, secret);
  const rotatedSession = await SessionModel.findOneAndUpdate(
    {
      _id: claims.sid,
      tokenHash: suppliedHash,
      tokenId: claims.jti,
      revokedAt: null,
      expiresAt: { $gt: now }
    },
    {
      $set: {
        tokenHash: hashRefreshToken(nextRefresh.token),
        tokenId: nextRefresh.claims.jti,
        expiresAt: new Date(nextRefresh.claims.exp * 1000),
        lastActivityAt: now
      }
    },
    { new: true }
  );

  if (!rotatedSession) {
    const currentSession = await getSessionById(SessionModel, claims.sid);
    if (
      currentSession
      && !currentSession.revokedAt
      && new Date(currentSession.expiresAt).getTime() > now.getTime()
    ) {
      await revokeSessionById(SessionModel, claims.sid, now);
      throw new AuthSessionError('REFRESH_TOKEN_REUSE');
    }
    throw new AuthSessionError('EXPIRED_SESSION');
  }

  return {
    token: generateToken(account._id, account.role, ACCESS_TOKEN_TTL, claims.sid),
    refreshToken: nextRefresh.token,
    account,
    accountModel: claims.accountModel
  };
};

const revokeAuthSession = async (
  refreshToken,
  { SessionModel = RefreshSession, now = new Date() } = {}
) => {
  if (typeof refreshToken !== 'string' || refreshToken.length > 8192) return false;

  let claims;
  try {
    claims = jwt.verify(refreshToken, getRefreshSecret(), { ignoreExpiration: true });
  } catch {
    return false;
  }

  if (claims.typ !== 'refresh' || !claims.sid) return false;
  await revokeSessionById(SessionModel, claims.sid, now);
  return true;
};

const getRefreshSessionId = (refreshToken) => {
  if (typeof refreshToken !== 'string' || refreshToken.length > 8192) return null;
  try {
    const claims = jwt.verify(refreshToken, getRefreshSecret(), { ignoreExpiration: true });
    if (claims.typ !== 'refresh' || !mongoose.isObjectIdOrHexString(claims.sid)) return null;
    return claims.sid;
  } catch (err) {
    if (err instanceof AuthSessionConfigurationError) throw err;
    return null;
  }
};

const revokeAccountSessions = async (
  accountId,
  accountModel,
  { SessionModel = RefreshSession, exceptSessionId } = {}
) => {
  const filter = { accountId, accountModel, revokedAt: null };
  if (exceptSessionId) filter._id = { $ne: exceptSessionId };
  return SessionModel.updateMany(
    filter,
    { $set: { revokedAt: new Date() } }
  );
};

module.exports = {
  ACCESS_TOKEN_TTL,
  REFRESH_TOKEN_TTL_SECONDS,
  AuthSessionError,
  AuthSessionConfigurationError,
  hashRefreshToken,
  isNativeAndroidRequest,
  issueAuthTokens,
  refreshAuthSession,
  revokeAuthSession,
  getRefreshSessionId,
  revokeAccountSessions,
  accountCanRefresh
};
