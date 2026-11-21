const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { notFound, errorHandler } = require('./middleware/error.middleware');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const opportunityRoutes = require('./routes/opportunity.routes');
const applicationRoutes = require('./routes/application.routes');
const impactRoutes = require('./routes/impact.routes');
const mediaRoutes = require('./routes/media.routes');
const exportRoutes = require('./routes/export.routes');
const storyRoutes = require('./routes/story.routes');
const notificationRoutes = require('./routes/notification.routes');
const followRoutes = require('./routes/follow.routes');
const publicRoutes = require('./routes/public.routes');

const app = express();

app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// Rate limit: 2000/15min in production, effectively disabled in dev.
// Skips read-only GETs on common high-fan-out endpoints so a single page render
// (which fires ~6-10 calls) doesn't exhaust the bucket.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 2000 : 10000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'GET' && /^\/api\/(users|stories|opportunities|follows|notifications|inspire|public)/.test(req.originalUrl),
});
app.use('/api/', apiLimiter);

app.get('/health', (_req, res) => res.json({ ok: true, service: 'fursahub-api' }));

const uploadsDir = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir, { maxAge: '7d' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/opportunities', opportunityRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/impact', impactRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/exports', exportRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/inspire', storyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/follows', followRoutes);
app.use('/api/public', publicRoutes);

// Serve the built frontend from the same port (single-port deployment).
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(path.join(frontendDist, 'index.html'))) {
  app.use(express.static(frontendDist));
  app.get(/^\/(?!api\/|health$).*/, (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else if (process.env.NODE_ENV !== 'test') {
  console.warn(`[fursahub] frontend build not found at ${frontendDist}. Run \`npm run build\` to enable single-port mode.`);
}

app.use(notFound);
app.use(errorHandler);

module.exports = app;
