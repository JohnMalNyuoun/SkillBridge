const { cert, getApps, initializeApp } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');

const APP_NAME = 'skillbridge-fcm';

const getFirebaseMessaging = () => {
  const existingApp = getApps().find((app) => app.name === APP_NAME);
  if (existingApp) return getMessaging(existingApp);

  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!rawServiceAccount) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not configured');
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(rawServiceAccount);
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON');
  }

  const configuredProjectId = process.env.FIREBASE_PROJECT_ID;
  if (
    configuredProjectId
    && serviceAccount.project_id
    && configuredProjectId !== serviceAccount.project_id
  ) {
    throw new Error('FIREBASE_PROJECT_ID does not match the service account');
  }
  if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is missing required fields');
  }

  const app = initializeApp({
    credential: cert({
      ...serviceAccount,
      private_key: serviceAccount.private_key.replace(/\\n/g, '\n')
    }),
    projectId: configuredProjectId || serviceAccount.project_id
  }, APP_NAME);

  return getMessaging(app);
};

module.exports = { getFirebaseMessaging };
