# Time Log Feature - Quick Start Guide

## What Was Added

A complete time logging system for tracking user sessions with login/logout times, session duration, and analytics.

## Files Created

1. **Backend/models/TimeLog.js** - Database schema for time logs
2. **Backend/controllers/timeLog.js** - Business logic and API controllers
3. **Backend/routes/timeLog.js** - API endpoints
4. **Backend/middleware/timeLogger.js** - Automatic login/logout tracking
5. **Backend/requests/timeLog.rest** - REST client test file
6. **TIMELOG_DOCUMENTATION.md** - Complete documentation

## Server Integration

The time log routes have been automatically added to `Backend/server.js`:
```javascript
app.use('/api/timelog', require('./routes/timeLog'));
```

## Quick Setup (Backend Only)

1. **The backend is already configured** - no additional setup needed! The TimeLog model and routes are integrated into your Express server.

2. **Test the endpoints** using the REST file:
   - Open `Backend/requests/timeLog.rest` in VS Code with REST Client extension
   - Replace placeholders with actual user IDs and tokens
   - Send requests to test

## Frontend Integration (Next Steps)

### 1. Create Time Log Service
Create `src/services/timeLogService.js`:
```javascript
import api from './api';

export const timeLogService = {
  logLogin: (userId, email, userType) =>
    api.post('/timelog/login', { userId, email, userType }),
  
  logLogout: (userId) =>
    api.post('/timelog/logout', { userId }),
  
  getUserAnalytics: (userId, days = 30) =>
    api.get(`/timelog/user/${userId}/analytics?days=${days}`),
  
  getUserLogs: (userId, limit = 50) =>
    api.get(`/timelog/user/${userId}?limit=${limit}`),
  
  getPlatformAnalytics: (days = 30) =>
    api.get(`/timelog/platform/analytics?days=${days}`),
  
  getActiveSessions: () =>
    api.get('/timelog/active-sessions'),
};
```

### 2. Update Auth Context/Hook
In `src/context/AuthContext.jsx` or `src/hooks/useAuth.js`:

```javascript
// After successful login
const handleLogin = async (credentials) => {
  const response = await authService.login(credentials);
  const user = response.data;
  
  // Log the login
  await timeLogService.logLogin(user._id, user.email, user.role);
  
  // Store auth data...
  setAuth(user);
};

// On logout
const handleLogout = () => {
  // Log the logout
  timeLogService.logLogout(authUser._id);
  
  // Clear auth...
  setAuth(null);
};
```

### 3. Add Analytics Dashboard (Optional)
Create `src/pages/admin/Analytics.jsx` to display time log analytics:
```javascript
const [analytics, setAnalytics] = useState(null);

useEffect(() => {
  timeLogService.getPlatformAnalytics(30).then(res => {
    setAnalytics(res.data);
  });
}, []);
```

## API Endpoints Available

```
POST   /api/timelog/login                      - Log login
POST   /api/timelog/logout                     - Log logout
GET    /api/timelog/user/:userId              - Get user logs
GET    /api/timelog/user/:userId/analytics    - Get user analytics
GET    /api/timelog/all                        - Get all logs (admin)
GET    /api/timelog/platform/analytics        - Platform stats (admin)
GET    /api/timelog/active-sessions           - Active sessions (admin)
DELETE /api/timelog/:id                       - Delete log (admin)
```

## Testing Without Frontend

You can test everything using the REST client file:

1. Open `Backend/requests/timeLog.rest`
2. Replace `USER_ID_HERE` with actual MongoDB user ID
3. Replace `YOUR_TOKEN_HERE` with actual JWT token
4. Click "Send Request" on each endpoint

## Key Features

✅ **Track User Sessions** - Login/logout times automatically recorded
✅ **Session Duration** - Automatically calculated in minutes
✅ **User Analytics** - View usage patterns per user
✅ **Platform Analytics** - Admin can see system-wide statistics
✅ **Activity Monitoring** - Track activity count during sessions
✅ **Active Sessions** - See who is currently logged in
✅ **Filtering & Pagination** - Query by date range, user type, etc.
✅ **Security** - IP address and user agent logging

## Important Notes

1. **Manual vs Automatic Logging**:
   - Currently set up for manual logging via API calls
   - Can be integrated into auth middleware for automatic logging (see docs)

2. **Time Zone**:
   - All times stored in UTC
   - Convert to local time on frontend if needed

3. **Performance**:
   - Database indexes are set up for fast queries
   - Use pagination for large datasets

4. **Cleanup**:
   - Consider implementing TTL index to auto-delete old logs if space is a concern

## Troubleshooting

**"verifyToken not found"**: Fixed! Routes now use `protect` middleware correctly.

**"TimeLog is not defined"**: Make sure TimeLog model is imported in controller.

**"No active session found for logout"**: User hasn't logged in, or previous logout already recorded.

## Next Steps

1. ✅ Backend time log system is ready
2. → Create time log service in frontend
3. → Integrate login/logout calls in Auth context
4. → Create admin dashboard for analytics
5. → Test end-to-end functionality

For detailed documentation, see [TIMELOG_DOCUMENTATION.md](TIMELOG_DOCUMENTATION.md)
