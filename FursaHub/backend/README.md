# Fursahub Backend

Node.js / Express / MongoDB API for Fursahub.

## Setup

```bash
cd backend
cp .env.example .env
# fill in MONGO_URI, JWT_SECRET, CLOUDINARY_* values
npm install
npm run dev
```

Server runs on `http://localhost:5000` by default.

## Structure

```
backend/
  server.js                 entry point
  src/
    app.js                  Express app + route wiring
    config/
      db.js                 Mongo connection
      cloudinary.js         Cloudinary SDK config
    models/
      User.js               students & admins (single collection, role-based)
      Opportunity.js        internships / scholarships / jobs
      Application.js        student application to an opportunity
      ImpactRecord.js       3/6/12 month outcome check-ins
      MediaAsset.js         Cloudinary asset metadata
    middleware/
      auth.middleware.js    JWT verifyToken + signToken
      role.middleware.js    isAdmin / isStudent / requireRole
      error.middleware.js   404 + central error handler
      validate.middleware.js  Joi validator factory
    controllers/            request handlers per resource
    routes/                 Express routers per resource
    services/
      followup.service.js   node-cron job that auto-creates 3/6/12-month impact prompts
      export.service.js     CSV + PDF donor / impact reports
      media.service.js      multer + Cloudinary upload pipeline
```

## Key endpoints

| Method | Path                              | Auth        |
| ------ | --------------------------------- | ----------- |
| POST   | /api/auth/register                | public      |
| POST   | /api/auth/login                   | public      |
| GET    | /api/auth/me                      | any user    |
| GET    | /api/opportunities                | public      |
| POST   | /api/opportunities                | admin       |
| POST   | /api/applications                 | student     |
| GET    | /api/applications/mine            | student     |
| PATCH  | /api/applications/:id/status      | admin       |
| POST   | /api/impact                       | any user    |
| GET    | /api/impact/summary               | admin       |
| POST   | /api/media/upload                 | any user    |
| GET    | /api/exports/impact.csv           | admin       |
| GET    | /api/exports/impact.pdf           | admin       |

## Notes

- `ImpactRecord` is a separate collection (not embedded) so students can have multiple entries across the 3/6/12-month checkpoints.
- `MediaAsset` stores Cloudinary `publicId` + `secureUrl`; raw files never touch MongoDB.
- The follow-up cron runs daily at 02:00 and creates pending `ImpactRecord` rows for any student whose graduation date is now past a checkpoint without an existing record.
- Every admin route is protected by `verifyToken` + `isAdmin`.
