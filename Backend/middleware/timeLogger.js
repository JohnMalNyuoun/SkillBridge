const TimeLog = require('../models/TimeLog');

// Middleware to log user login on authentication
exports.logUserLogin = async (req, res, next) => {
  try {
    // Extract user info from request (set by auth middleware)
    const userId = req.user?.id;
    const email = req.user?.email;
    const userType = req.user?.userType; // Should be 'youth', 'organisation', or 'admin'

    if (userId && email && userType) {
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent');

      // Create time log entry
      const timeLog = new TimeLog({
        userId,
        email,
        userType,
        loginTime: new Date(),
        ipAddress,
        userAgent,
        isActive: true
      });

      await timeLog.save();

      // Attach timeLogId to request for later reference
      req.timeLogId = timeLog._id;
    }

    next();
  } catch (error) {
    console.error('Error logging user login:', error.message);
    // Continue even if logging fails - don't block authentication
    next();
  }
};

// Middleware to log user logout (use on logout endpoint)
exports.logUserLogout = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (userId) {
      // Find the most recent active session
      const timeLog = await TimeLog.findOne({
        userId,
        isActive: true,
        logoutTime: null
      }).sort({ loginTime: -1 });

      if (timeLog) {
        timeLog.logoutTime = new Date();
        timeLog.isActive = false;
        await timeLog.save();
      }
    }

    next();
  } catch (error) {
    console.error('Error logging user logout:', error.message);
    next();
  }
};

// Middleware to track activity (increment activity count)
exports.trackActivity = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (userId) {
      // Find the most recent active session
      const timeLog = await TimeLog.findOne({
        userId,
        isActive: true,
        logoutTime: null
      }).sort({ loginTime: -1 });

      if (timeLog) {
        timeLog.activityCount += 1;
        timeLog.save(); // Save asynchronously without blocking
      }
    }

    next();
  } catch (error) {
    console.error('Error tracking activity:', error.message);
    next();
  }
};
