# SkillBridge frontend

The SkillBridge web client is built with React and Vite.

From this directory, run:

- `npm run dev` to start the local development server.
- `npm run build` to create the production build in `dist/`.
- `npm run lint` to check the frontend source.
- `npm run test:e2e` to run the Playwright end-to-end tests.

## Android app (Capacitor)

The Android app reuses this React application and builds its web assets into `dist/`.
Android builds use `.env.android` to point API and Socket.IO traffic to the existing
Render backend; this file contains a public service URL, not a credential. The web
build continues to use its existing deployment environment.

From this directory:

- `npm run build:android` to build the Android-targeted web assets.
- `npm run cap:sync` to build those assets and synchronize the Android project.
- `npm run cap:open` to open the generated project in Android Studio.

Install Android Studio and its Android SDK/JDK before building or running the native
app. The backend allowlist includes the Android WebView origin (`https://localhost`)
and the production site origin. Configure `FRONTEND_URL` as the single production
site URL, and use the optional `CORS_ALLOWED_ORIGINS` for any additional website
origins; Express and Socket.IO share the same allowlist.
