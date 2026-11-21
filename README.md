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
3. Set the Render service environment variable `FRONTEND_URL` to the single public website origin, `https://skillbridge-tu5k.onrender.com`. The backend always allows this site, Capacitor's `https://localhost`, and existing local development origins. If additional website or preview origins need API access, set `CORS_ALLOWED_ORIGINS` to their exact comma-separated origins, for example `https://your-project.vercel.app,https://preview.example.com`. Keep `FRONTEND_URL` as a single origin because it is also used to generate email verification links. Express and Socket.IO use the same allowlist; do not use `*` with credentials.
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
REFRESH_TOKEN_SECRET=use_a_separate_random_secret_of_at_least_32_characters
GOOGLE_CLIENT_ID=322610092407-tq94gj5cqhivjud2ajnmj6qg5k6lch10.apps.googleusercontent.com
# Configure this in Render as the complete service-account JSON secret; never commit it.
# Optional; must match the service account project when configured.
FIREBASE_PROJECT_ID=skillbridge-86a30

RESEND_API_KEY=re_your_resend_api_key
RESEND_FROM_EMAIL=SkillBridge <no-reply@your-verified-domain.com>
FRONTEND_URL=https://skillbridge-tu5k.onrender.com
# Optional; only set this when separate website origins also need API access.
CORS_ALLOWED_ORIGINS=https://your-project.vercel.app,https://preview.example.com

Verify your sending domain with Resend, then configure `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in the Render service environment. The sender must use that verified domain.

## Google sign-in configuration

Set `VITE_GOOGLE_CLIENT_ID` to the website OAuth Client ID in the frontend build environment (including the Render service and Vercel, if used), and in a local `frontend/.env` file when developing the website. `frontend/.env.example` shows the required value. The Android asset build reads the same setting from `frontend/.env.android`:

```env
VITE_GOOGLE_CLIENT_ID=322610092407-tq94gj5cqhivjud2ajnmj6qg5k6lch10.apps.googleusercontent.com
```

Set `GOOGLE_CLIENT_ID` to the same website OAuth Client ID in the Render backend environment. The API verifies that ID token audience for both website and Android requests. These client IDs are public identifiers; never put OAuth client secrets or private keys in frontend code.

In Google Cloud, configure the OAuth consent screen and add `https://skillbridge-tu5k.onrender.com` and the local development origin `http://localhost:5173` to the website OAuth client's authorized JavaScript origins. Create/confirm the Android OAuth client for package `org.skillbridgeafrica.app` and register the debug signing SHA-1 `CB:F0:A4:68:67:C5:97:61:D6:0F:23:F3:92:61:B4:7A:C6:8E:85:66` and the release signing SHA-1 used to publish the app. Keep the Android OAuth client ID out of frontend source; Android Credential Manager requests the website OAuth client ID as its server client ID.

The Android implementation uses Credential Manager and Google's Sign in with Google flow. Rebuild/sync the native project after updating the Android signing configuration or native dependencies.

POSTHOG_API_KEY=your_posthog_key
POSTHOG_HOST=https://us.i.posthog.com
POSTHOG_PROJECT_ID=your_project_id
POSTHOG_PERSONAL_API_KEY=your_personal_api_key

Profile photos, organisation logos, course covers, and announcement images are stored in MongoDB GridFS. They are served from `/api/images/:id`. Existing image URLs remain unchanged and are not migrated automatically.

## Website updates and Android sessions

The website remains installable as a PWA, but it does not display an install or
manual-update prompt. Its service worker checks for deployments in the background
and activates a waiting update only after the open page has loaded a bundle from
that deployment and is the only SkillBridge window. It does not reload the page;
the new version loads on the next reload or visit. Old tabs defer activation so
their cached assets remain available. API responses are marked `no-store` and are
not cached by the service worker.

Android login uses short-lived access JWTs in memory and rotating refresh tokens in
Android Keystore-backed secure storage. Set `REFRESH_TOKEN_SECRET` on Render to a
separate random value with at least 32 characters. Keep the same value across
deployments and never commit it. The backend stores only refresh-token hashes in
the MongoDB `refreshsessions` collection; Mongoose creates the expiry index
automatically. Refresh sessions expire after 30 days without activity and are
revoked on Android logout. Website authentication continues using its existing
session-storage flow.

## Native Android incoming-call notifications

Android incoming-call alerts use Firebase Cloud Messaging data messages and the
native SkillBridge call notification. The website continues to use its existing
Socket.IO/browser notification behavior; Firebase Android messaging does not
provide closed-tab website Web Push.

The Android Firebase app must be registered for package
`org.skillbridgeafrica.app` in Firebase project `skillbridge-86a30`. Keep the
existing `frontend/android/app/google-services.json` configuration in the local
Android project. In Firebase Console, enable Cloud Messaging and create a Firebase
service account for the backend. Set these Render backend variables:

- `FIREBASE_SERVICE_ACCOUNT_JSON`: the complete service-account JSON, stored as a
  Render secret. Never add this JSON to the repository, frontend, or Android app.
- `FIREBASE_PROJECT_ID`: optional project ID (`skillbridge-86a30`); when set, it
  must match the service account.

Install the Android app built from this repository and grant notification
permission when prompted after sign-in. Calls continue to use Socket.IO and the
existing WebRTC screen while SkillBridge is active. Android can deliver FCM
notifications in the background where platform policy permits; force-stopped apps
and disabled notifications may not receive or display them. Accept and decline
actions are verified against the authenticated backend before changing call state.

The Android updater checks the public GitHub Releases page for
`JohnMalNyuoun/SkillBridge`. Publish each Android release with a numeric version tag
such as `v1.1.0`, increment both `versionName` and `versionCode` in
`frontend/android/app/build.gradle`, and attach exactly one release-signed `.apk`.
Keep the package ID `org.skillbridgeafrica.app` and use the same release signing
key for every APK update. SkillBridge opens the APK download in the Android
browser; the user must confirm installation through Android's package installer,
which verifies the APK signature. The repository currently has no published latest
release, so the in-app update notice appears only after a newer APK release is
published.


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