// This file is intended for server-side use only.
// In a real Next.js app, you would protect this file from being bundled in the client.
import { initializeApp, getApps, cert, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// IMPORTANT: You need to generate a service account key in the Firebase console
// and place it in your project. For security, DO NOT commit this file to git.
// Use environment variables to load the credentials.
// For this demo, we will use a placeholder.
const serviceAccount = {
  // In a real project, you would load this from an environment variable.
  // process.env.FIREBASE_SERVICE_ACCOUNT
  // This is a placeholder and will not work without a real service account key.
  "projectId": "keep-know",
  "privateKey": "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n",
  "clientEmail": "firebase-adminsdk-...@keep-know.iam.gserviceaccount.com"
};

let app;
if (!getApps().length) {
  app = initializeApp({
    credential: cert(serviceAccount),
  });
} else {
  app = getApp();
}

export const auth = getAuth(app);
