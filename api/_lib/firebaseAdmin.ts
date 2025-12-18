import admin from 'firebase-admin';
import { requireEnv, optionalEnv } from './env';

type ServiceAccountJson = {
  project_id: string;
  client_email: string;
  private_key: string;
};

function getServiceAccount(): ServiceAccountJson | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ServiceAccountJson;
  } catch {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON must be valid JSON');
  }
}

export function getAdminApp() {
  if (admin.apps.length > 0) return admin.app();

  const svc = getServiceAccount();
  const projectId = optionalEnv('GOOGLE_CLOUD_PROJECT', optionalEnv('FIRESTORE_PROJECT_ID', ''));

  if (svc) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: svc.project_id,
        clientEmail: svc.client_email,
        privateKey: svc.private_key,
      }),
      projectId: svc.project_id,
      storageBucket: requireEnv('CLOUD_STORAGE_BUCKET'),
    });
  } else {
    // Allows running on GCP environments where ADC is available.
    if (!projectId) {
      throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_JSON (or GOOGLE_CLOUD_PROJECT/FIRESTORE_PROJECT_ID for ADC).');
    }
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId,
      storageBucket: requireEnv('CLOUD_STORAGE_BUCKET'),
    });
  }

  return admin.app();
}

export function getFirestore() {
  return getAdminApp().firestore();
}

export function getBucket() {
  return getAdminApp().storage().bucket();
}


