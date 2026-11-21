require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./src/app');
const connectDB = require('./src/config/db');
const { startFollowUpJobs } = require('./src/services/followup.service');

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await connectDB();
    startFollowUpJobs();
    const server = app.listen(PORT, () => {
      console.log(`[fursahub] API listening on http://localhost:${PORT}`);
    });

    const shutdown = async (signal) => {
      console.log(`\n[fursahub] ${signal} received. Shutting down...`);
      server.close(async () => {
        await mongoose.connection.close();
        process.exit(0);
      });
    };
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    console.error('[fursahub] Failed to start:', err);
    process.exit(1);
  }
})();
