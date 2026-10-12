# Time Log Feature Documentation

## Overview
The Time Log feature tracks user login/logout times and provides analytics for monitoring platform usage. It records session duration, user activity, and provides detailed analytics for both individual users and platform-wide statistics.

## Files Created

### 1. **Model: TimeLog** (`Backend/models/TimeLog.js`)
Mongoose schema for storing time log records with the following fields:
- `userId`: Reference to the User document
- `email`: User's email address
- `loginTime`: Timestamp of login
- `logoutTime`: Timestamp of logout (null if still active)
- `duration`: Session duration in minutes (calculated automatically)
- `userType`: Type of user ('youth', 'organisation', 'admin')
- `ipAddress`: User's IP address
- `userAgent`: Browser/client information
- `isActive`: Boolean indicating if session is still active
- `activityCount`: Number of API calls/activities during session
- `timestamps`: Auto-generated createdAt and updatedAt

**Indexes**: 
- userId + loginTime for efficient user-specific queries
- email + loginTime for email-based lookups
- loginTime for global analytics

### 2. **Controller: Time Log** (`Backend/controllers/timeLog.js`)
Handles all business logic for time logging:

**Public Methods:**
- `logLogin`: Records a user login event
- `logLogout`: Records a user logout event

**Protected Methods (requires authentication):**
- `getUserTimeLogs`: Get all time logs for a specific user with pagination and filters
- `getUserAnalytics`: Get analytics for a user (total sessions, duration, averages) for a specified period

**Admin-Only Methods:**
- `getAllTimeLogs`: Get all time logs across the platform with filtering options
- `getPlatformAnalytics`: Get platform-wide analytics by user type
- `getActiveSessions`: Get all currently active sessions
- `deleteTimeLog`: Delete a specific time log record

### 3. **Routes: Time Log** (`Backend/routes/timeLog.js`)
Express routes for the time log API:

```
POST   /api/timelog/login                      - Log user login
POST   /api/timelog/logout                     - Log user logout
GET    /api/timelog/user/:userId              - Get user's time logs
GET    /api/timelog/user/:userId/analytics    - Get user analytics
GET    /api/timelog/all                        - Get all time logs (admin)
GET    /api/timelog/platform/analytics        - Get platform analytics (admin)
GET    /api/timelog/active-sessions           - Get active sessions (admin)
DELETE /api/timelog/:id                       - Delete time log (admin)
```

### 4. **Middleware: Time Logger** (`Backend/middleware/timeLogger.js`)
Middleware functions for automatic time logging:

- `logUserLogin`: Auto-logs user login on authentication
- `logUserLogout`: Auto-logs user logout on logout endpoint
- `trackActivity`: Tracks user activity by incrementing activity count

### 5. **Test File** (`Backend/requests/timeLog.rest`)
REST client test file with example requests for all endpoints.

## API Endpoints

### 1. Log Login
```
POST /api/timelog/login
Content-Type: application/json

{
  "userId": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "userType": "youth"
}

Response:
{
  "success": true,
  "message": "Login logged successfully",
  "data": {
    "_id": "...",
    "userId": "...",
    "email": "user@example.com",
    "loginTime": "2026-06-17T10:30:00Z",
    "isActive": true
  }
}
```

### 2. Log Logout
```
POST /api/timelog/logout
Content-Type: application/json

{
  "userId": "507f1f77bcf86cd799439011"
}

Response:
{
  "success": true,
  "message": "Logout logged successfully",
  "data": {
    "_id": "...",
    "userId": "...",
    "loginTime": "2026-06-17T10:30:00Z",
    "logoutTime": "2026-06-17T11:00:00Z",
    "duration": 30
  }
}
```

### 3. Get User Time Logs
```
GET /api/timelog/user/:userId?limit=50&skip=0&startDate=2026-06-01&endDate=2026-06-30
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "userId": "...",
      "loginTime": "2026-06-17T10:30:00Z",
      "logoutTime": "2026-06-17T11:00:00Z",
      "duration": 30,
      "userType": "youth"
    }
  ],
  "pagination": {
    "total": 100,
    "limit": 50,
    "skip": 0,
    "pages": 2
  }
}
```

### 4. Get User Analytics
```
GET /api/timelog/user/:userId/analytics?days=30
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "totalSessions": 45,
    "completedSessions": 45,
    "totalMinutes": 1350,
    "averageSessionDuration": 30,
    "activeSessions": 0,
    "period": "30 days",
    "firstLogin": "2026-05-18T...",
    "lastLogin": "2026-06-17T..."
  }
}
```

### 5. Get Platform Analytics (Admin)
```
GET /api/timelog/platform/analytics?days=30
Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "data": {
    "period": "30 days",
    "totalSessions": 1250,
    "totalMinutes": 50000,
    "uniqueUsers": 350,
    "byUserType": {
      "youth": {
        "sessions": 900,
        "totalMinutes": 35000,
        "uniqueUsers": 250
      },
      "organisation": {
        "sessions": 300,
        "totalMinutes": 15000,
        "uniqueUsers": 100
      },
      "admin": {
        "sessions": 50,
        "totalMinutes": 1000,
        "uniqueUsers": 5
      }
    }
  }
}
```

### 6. Get Active Sessions (Admin)
```
GET /api/timelog/active-sessions
Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "userId": "...",
      "email": "user@example.com",
      "loginTime": "2026-06-17T10:30:00Z",
      "userType": "youth",
      "isActive": true,
      "activityCount": 5
    }
  ],
  "count": 12
}
```

## Integration Steps

### Step 1: Automatic Login Logging (Optional)
To automatically log logins when users authenticate, update your auth route to use the timeLogger middleware:

```javascript
// In routes/auth/youthAuth.js
const { logUserLogin } = require('../../middleware/timeLogger');

router.post('/login', loginYouth, logUserLogin);
```

### Step 2: Manual Login Logging
For manual login logging, call the endpoint directly from frontend:

```javascript
// After successful login
const response = await fetch('/api/timelog/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: user._id,
    email: user.email,
    userType: user.role
  })
});
```

### Step 3: Logout Logging
Call the logout endpoint when user logs out:

```javascript
// Before clearing auth token
await fetch('/api/timelog/logout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: user._id })
});
```

## Frontend Integration

Add calls to the time log endpoints in your frontend:

```javascript
// services/timeLogService.js
import api from './api';

export const timeLogService = {
  logLogin: (userId, email, userType) =>
    api.post('/timelog/login', { userId, email, userType }),
  
  logLogout: (userId) =>
    api.post('/timelog/logout', { userId }),
  
  getUserAnalytics: (userId, days = 30) =>
    api.get(`/timelog/user/${userId}/analytics?days=${days}`),
  
  getUserLogs: (userId, limit = 50, skip = 0) =>
    api.get(`/timelog/user/${userId}?limit=${limit}&skip=${skip}`),
};
```

## Query Parameters

### Time Filters
- `startDate`: ISO date string (e.g., "2026-06-01")
- `endDate`: ISO date string (e.g., "2026-06-30")
- `days`: Number of days to look back (default: 30)

### Pagination
- `limit`: Number of records per page (default: 50 for users, 100 for admin)
- `skip`: Number of records to skip (default: 0)

### Filtering
- `userType`: Filter by user type ('youth', 'organisation', 'admin')

## Example Usage Scenarios

### User Dashboard: Show Last 7 Days Usage
```
GET /api/timelog/user/userId/analytics?days=7
```

### Admin Dashboard: Platform Activity
```
GET /api/timelog/platform/analytics?days=30
```

### Monitor Live Sessions
```
GET /api/timelog/active-sessions
```

### User Activity History
```
GET /api/timelog/user/userId?limit=20&skip=0&startDate=2026-06-01&endDate=2026-06-30
```

## Database Schema Notes

- **Indexes**: Pre-built indexes optimize queries for user-specific logs and timeline analysis
- **Duration Calculation**: Automatically calculated from loginTime - logoutTime
- **Activity Tracking**: activityCount can be incremented with each API call
- **Timezone**: All times stored in UTC; convert on frontend as needed

## Error Handling

Common error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

Status codes:
- `200`: Success
- `201`: Created (login logged)
- `400`: Bad request (missing fields)
- `404`: Not found (no session found for logout)
- `500`: Server error

## Performance Considerations

1. **Indexes**: Database indexes are set up for fast querying
2. **Pagination**: Always use pagination for large datasets
3. **Activity Tracking**: Activity increment is async to avoid blocking
4. **Cleanup**: Consider implementing a TTL index to auto-delete old logs if needed

## Security Notes

- Login/logout endpoints are public but should only be called from authenticated contexts
- Protected endpoints require valid JWT token
- Admin endpoints require both authentication AND admin role
- IP address and User-Agent are logged for security auditing

## Future Enhancements

- Implement session timeout auto-logout
- Add geolocation tracking
- Create dashboard visualizations
- Implement session analytics export (CSV/PDF)
- Add alerts for unusual activity patterns
