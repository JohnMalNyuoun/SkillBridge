const TimeLog = require('../models/TimeLog');
const User = require('../models/Users');

// Log user login
exports.logLogin = async (req, res) => {
  try {
    const { userId, userType } = req.body;
    const userEmail = req.user?.email || req.body.email;

    if (!userId || !userType || !userEmail) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userId, userType, or email'
      });
    }

    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

    const timeLog = new TimeLog({
      userId,
      email: userEmail,
      userType,
      loginTime: new Date(),
      ipAddress,
      userAgent,
      isActive: true
    });

    await timeLog.save();

    res.status(201).json({
      success: true,
      message: 'Login logged successfully',
      data: timeLog
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error logging login',
      error: error.message
    });
  }
};

// Log user logout
exports.logLogout = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Find the most recent active time log
    const timeLog = await TimeLog.findOne({
      userId,
      isActive: true,
      logoutTime: null
    }).sort({ loginTime: -1 });

    if (!timeLog) {
      return res.status(404).json({
        success: false,
        message: 'No active session found for this user'
      });
    }

    timeLog.logoutTime = new Date();
    timeLog.isActive = false;

    await timeLog.save();

    res.status(200).json({
      success: true,
      message: 'Logout logged successfully',
      data: {
        ...timeLog.toObject(),
        duration: timeLog.duration
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error logging logout',
      error: error.message
    });
  }
};

// Get time logs for a specific user
exports.getUserTimeLogs = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, skip = 0, startDate, endDate } = req.query;

    let query = { userId };

    if (startDate || endDate) {
      query.loginTime = {};
      if (startDate) query.loginTime.$gte = new Date(startDate);
      if (endDate) query.loginTime.$lte = new Date(endDate);
    }

    const timeLogs = await TimeLog.find(query)
      .sort({ loginTime: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await TimeLog.countDocuments(query);

    res.status(200).json({
      success: true,
      data: timeLogs,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching time logs',
      error: error.message
    });
  }
};

// Get all time logs (admin only)
exports.getAllTimeLogs = async (req, res) => {
  try {
    const { limit = 100, skip = 0, userType, startDate, endDate } = req.query;

    let query = {};

    if (userType) {
      query.userType = userType;
    }

    if (startDate || endDate) {
      query.loginTime = {};
      if (startDate) query.loginTime.$gte = new Date(startDate);
      if (endDate) query.loginTime.$lte = new Date(endDate);
    }

    const timeLogs = await TimeLog.find(query)
      .sort({ loginTime: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await TimeLog.countDocuments(query);

    res.status(200).json({
      success: true,
      data: timeLogs,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching time logs',
      error: error.message
    });
  }
};

// Get user analytics
exports.getUserAnalytics = async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const timeLogs = await TimeLog.find({
      userId,
      loginTime: { $gte: startDate }
    }).sort({ loginTime: -1 });

    if (timeLogs.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          totalSessions: 0,
          totalMinutes: 0,
          averageSessionDuration: 0,
          activeSessions: 0,
          period: `${days} days`
        }
      });
    }

    const completedSessions = timeLogs.filter(log => log.duration);
    const activeSessions = timeLogs.filter(log => log.isActive).length;

    const totalMinutes = completedSessions.reduce((acc, log) => acc + (log.duration || 0), 0);
    const averageSessionDuration = completedSessions.length > 0 
      ? Math.round(totalMinutes / completedSessions.length) 
      : 0;

    res.status(200).json({
      success: true,
      data: {
        totalSessions: timeLogs.length,
        completedSessions: completedSessions.length,
        totalMinutes,
        averageSessionDuration,
        activeSessions,
        period: `${days} days`,
        firstLogin: timeLogs[timeLogs.length - 1]?.loginTime,
        lastLogin: timeLogs[0]?.loginTime
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error calculating analytics',
      error: error.message
    });
  }
};

// Get platform analytics (admin only)
exports.getPlatformAnalytics = async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const allLogs = await TimeLog.find({
      loginTime: { $gte: startDate }
    });

    const byUserType = {};
    let totalMinutes = 0;
    const uniqueUsers = new Set();

    allLogs.forEach(log => {
      uniqueUsers.add(log.userId.toString());
      
      if (!byUserType[log.userType]) {
        byUserType[log.userType] = {
          sessions: 0,
          totalMinutes: 0,
          users: new Set()
        };
      }

      byUserType[log.userType].sessions++;
      byUserType[log.userType].users.add(log.userId.toString());
      
      if (log.duration) {
        byUserType[log.userType].totalMinutes += log.duration;
        totalMinutes += log.duration;
      }
    });

    // Convert sets to counts
    const analyticsData = {};
    for (let userType in byUserType) {
      analyticsData[userType] = {
        sessions: byUserType[userType].sessions,
        totalMinutes: byUserType[userType].totalMinutes,
        uniqueUsers: byUserType[userType].users.size
      };
    }

    res.status(200).json({
      success: true,
      data: {
        period: `${days} days`,
        totalSessions: allLogs.length,
        totalMinutes,
        uniqueUsers: uniqueUsers.size,
        byUserType: analyticsData
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error calculating platform analytics',
      error: error.message
    });
  }
};

// Get current active sessions (admin only)
exports.getActiveSessions = async (req, res) => {
  try {
    const activeSessions = await TimeLog.find({
      isActive: true,
      logoutTime: null
    }).sort({ loginTime: -1 });

    res.status(200).json({
      success: true,
      data: activeSessions,
      count: activeSessions.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching active sessions',
      error: error.message
    });
  }
};

// Delete time log (admin only)
exports.deleteTimeLog = async (req, res) => {
  try {
    const { id } = req.params;

    const timeLog = await TimeLog.findByIdAndDelete(id);

    if (!timeLog) {
      return res.status(404).json({
        success: false,
        message: 'Time log not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Time log deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting time log',
      error: error.message
    });
  }
};
