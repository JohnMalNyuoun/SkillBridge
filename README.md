# SkillBridge

SkillBridge is a platform that connects young people with courses and opportunities offered by organisations. It supports course discovery, applications, notifications, profiles, outcome tracking, and administrative management.

## Features

### Youth users
- Create an account and manage a profile
- Browse available courses
- Apply for courses and track application status
- Receive notifications and updates
- View public profiles
- Submit learning or programme outcomes

### Organisations
- Register and manage an organisation profile
- Create, edit, and manage courses
- Review youth applications
- Track course analytics and programme impact
- View course outcomes and send notifications

### Administrators
- Manage users, organisations, and courses
- Publish platform updates and broadcasts
- View dashboard analytics
- Manage notifications

## Tech stack

- Frontend: React, Vite, React Router, Axios
- Backend: Node.js, Express
- Database: MongoDB with Mongoose
- Authentication: JSON Web Tokens (JWT)
- Media uploads: MongoDB GridFS
- Email: Nodemailer
- Analytics: PostHog

## Continuous integration and deployment

The GitHub Actions workflow at `.github/workflows/tests.yml` runs backend tests and the frontend build and Playwright tests on pushes and pull requests. A push to `main` deploys only after both CI jobs pass:

- The backend deploys to Render through a service deploy hook.
- The frontend deploys to Vercel as a production build.

Configure the providers before enabling deployments:

1. Create a Render web service using the repository root (leave **Root Directory** blank). Set **Build Command** to `npm ci --prefix Backend --omit=dev && npm ci --prefix frontend --include=dev && npm --prefix frontend run build` and **Start Command** to `npm --prefix Backend start`. This builds `frontend/dist`, which the Express server serves alongside the API.
2. Create a Vercel project connected to this GitHub repository with `frontend` as its root directory. Set the production environment variable `VITE_API_URL` to the Render host (for example, `https://your-service.onrender.com`). The frontend appends `/api` automatically.
   Set `VITE_SITE_URL` to the exact public production origin (for example, `https://skillbridge.example.org`, with no path). The frontend uses it for canonical and social URLs and generates `sitemap.xml`; without it, the sitemap is intentionally omitted rather than publishing incorrect URLs.
3. Set the Render service environment variable `FRONTEND_URL` to the exact Vercel origin(s), with no path (for example, `https://your-project.vercel.app`). Multiple comma-separated origins are supported. Add each Vercel preview origin separately if you need preview deployments to call the API.
4. In the Vercel project, open **Settings → Git → Deploy Hooks**, create a hook for the `main` branch, and copy its URL.
5. Add these GitHub repository secrets under **Settings → Secrets and variables → Actions**:
   - `RENDER_DEPLOY_HOOK_URL`
   - `VERCEL_DEPLOY_HOOK_URL`

The workflow triggers the Vercel deploy hook only after backend tests, the frontend build, and Playwright tests pass on `main`. The hook URL is a secret; do not store it in the repository. Remove the obsolete `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` GitHub secrets if they are no longer used elsewhere. Once Render builds the frontend, both the Render and Vercel URLs can serve the app independently; use the Render URL if you want Render to be the frontend entry point.

## Project structure

```text
Fursa-Hub/
├── frontend/        # React client application
├── Backend/         # Express API and MongoDB models
├── TIMELOG_DOCUMENTATION.md
└── README.md


## This are Package to be install

npm install
npm run install:all

## Backend environment variables

PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=use_a_long_random_secret

RESEND_API_KEY=re_your_resend_api_key
RESEND_FROM_EMAIL=SkillBridge <no-reply@your-verified-domain.com>
FRONTEND_URL=https://your-frontend-domain.vercel.app

Verify your sending domain with Resend, then configure `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in the Render service environment. The sender must use that verified domain.

POSTHOG_API_KEY=your_posthog_key
POSTHOG_HOST=https://us.i.posthog.com
POSTHOG_PROJECT_ID=your_project_id
POSTHOG_PERSONAL_API_KEY=your_personal_api_key

Profile photos, organisation logos, course covers, and announcement images are stored in MongoDB GridFS. They are served from `/api/images/:id`. Existing image URLs remain unchanged and are not migrated automatically.


cd Backend
npm run dev


## Production build
npm run build
npm start


## License


## Documentation
[Time log quick start](./TIMELOG_QUICKSTART.md)
[Time log documentation](./TIMELOG_DOCUMENTATION.md)


## Author
John Mal Nyuon