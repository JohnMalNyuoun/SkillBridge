const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const compression = require('compression');

// Load environment variables BEFORE any module that reads process.env at import time
// (e.g. ./config/posthog instantiates the PostHog client using POSTHOG_API_KEY).
dotenv.config({ path: path.join(__dirname, '.env') });

const connectDB = require('./config/db');
const jwt =require('jsonwebtoken');
const requestLogger = require('./middleware/requestLogger');
const posthog = require('./config/posthog');
const { setupExpressRequestContext, setupExpressErrorHandler } = require('posthog-node');

connectDB();

const app = express();
const allowedOrigins = [
  'http://localhost:5000',
  'http://localhost:5173',
  'http://localhost:5174',
  ...(process.env.FRONTEND_URL || '')
    .split(',')
    .map((origin) => origin.trim())
    .map((origin) => origin.replace(/\/+$/, ''))
    .filter(Boolean)
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(compression());
app.use(express.json());
app.use('/api/images', require('./routes/images'));
app.use(requestLogger);
setupExpressRequestContext(posthog, app);

// Auth routes
app.use('/api/auth/youth', require('./routes/auth/youthAuth'));
app.use('/api/auth/org', require('./routes/auth/orgAuth'));
app.use('/api/auth/verification', require('./routes/auth/verification'));

// Youth routes
app.use('/api/youth/profile', require('./routes/youth/profile'));
app.use('/api/youth/courses', require('./routes/youth/courses'));
app.use('/api/youth/applications', require('./routes/youth/applications'));

// Organisation routes
app.use('/api/org/profile', require('./routes/organisation/profile'));
app.use('/api/org/courses', require('./routes/organisation/courses'));
app.use('/api/org/applications', require('./routes/organisation/applications'));

app.use('/api/youth/notifications', require('./routes/youth/notifications'));
app.use('/api/org/notifications', require('./routes/organisation/notifications'));
app.use('/api/profiles', require('./routes/profiles'));

// Admin routes
app.use('/api/admin/profile', require('./routes/admin/profile'));
app.use('/api/admin/organisations', require('./routes/admin/organisations'));
app.use('/api/admin/courses', require('./routes/admin/courses'));
app.use('/api/admin/users', require('./routes/admin/users'));
app.use('/api/admin/broadcasts', require('./routes/admin/broadcasts'));
app.use('/api/admin/analytics', require('./routes/admin/analytics'));
app.use('/api/org/impact', require('./routes/organisation/impact'));
app.use('/api/youth/outcomes', require('./routes/youth/outcomes'));

// Shared routes
app.use('/api/profiles', require('./routes/profiles'));
app.use('/api/follow', require('./routes/follow'));
app.use('/api/broadcasts', require('./routes/broadcasts'));
app.use('/api/track', require('./routes/track'));

// Time Log routes
app.use('/api/timelog', require('./routes/timeLog'));

app.get('/api', (req, res) => {
  res.json({ message: 'SkillBridge API Running' });
});
app.get('/api/debug/token', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if(!token) return res.json({error: 'No token provided'});
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ decoded });
  } catch (err) { 
    res.json({ error: err.message });
  }
});

// Catch unexpected route errors and keep server alive with visible terminal logs
setupExpressErrorHandler(posthog, app);
app.use((err, req, res, next) => {
  console.error('UNHANDLED ROUTE ERROR:', err && err.stack ? err.stack : err);
  if (res.headersSent) return next(err);
  return res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Serve built frontend on the same port (single-port deployment)
const distPath = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(distPath)) {
  app.use('/assets', express.static(path.join(distPath, 'assets'), {
    maxAge: '1y',
    immutable: true
  }));

  app.use(express.static(distPath));

  // SPA fallback: any non-API GET returns index.html so React Router handles it.
  // Express 5 dropped wildcard path strings, so we use middleware.
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({
      message: 'SkillBridge API Running',
      hint: 'Run `npm run build:client` (or `npm run serve`) inside /Backend to build the frontend first.'
    });
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`SkillBridge running on port ${PORT}`);
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err && err.stack ? err.stack : err);
});

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});