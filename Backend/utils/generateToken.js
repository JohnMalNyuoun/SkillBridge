const jwt = require('jsonwebtoken');

const generateToken = (id, role, expiresIn = '30d', sessionId) => {
  const payload = {
    id,
    role,
    ...(sessionId ? { sid: String(sessionId) } : {})
  };
  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn }
  );
};

module.exports = generateToken;