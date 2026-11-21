const asyncHandler = require('express-async-handler');
const Joi = require('joi');
const User = require('../models/User');
const { signToken } = require('../middleware/auth.middleware');

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
  role: Joi.string().valid('student', 'admin').default('student'),
  organization: Joi.string().allow('', null),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

exports.register = asyncHandler(async (req, res) => {
  const { value, error } = registerSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.message });

  const existing = await User.findOne({ email: value.email });
  if (existing) return res.status(409).json({ message: 'Email already registered' });

  const user = new User({
    name: value.name,
    email: value.email,
    role: value.role,
    organization: value.organization,
  });
  await user.setPassword(value.password);
  await user.save();

  const token = signToken(user);
  res.status(201).json({ token, user });
});

exports.login = asyncHandler(async (req, res) => {
  const { value, error } = loginSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.message });

  const user = await User.findOne({ email: value.email }).select('+passwordHash');
  if (!user || !user.isActive) return res.status(401).json({ message: 'Invalid credentials' });

  const ok = await user.comparePassword(value.password);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

  user.lastLoginAt = new Date();
  await user.save();

  const token = signToken(user);
  res.json({ token, user });
});

exports.me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json({ user });
});
