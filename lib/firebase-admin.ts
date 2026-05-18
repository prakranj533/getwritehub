import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!privateKey && process.env.ADMIN_PRIVATE_KEY_BASE64) {
  try {
    privateKey = Buffer.from(process.env.ADMIN_PRIVATE_KEY_BASE64, 'base64').toString('utf8');
  } catch (error) {
    console.error("Error decoding base64 private key:", error);
  }
}

const credential = projectId && clientEmail && privateKey
  ? cert({
      projectId,
      clientEmail,
      privateKey,
    })
  : undefined;

// Initialize Firebase Admin only once and get the instance
const app = getApps().length === 0 
  ? initializeApp(credential ? { credential } : {})
  : getApps()[0];

// Explicitly pass the app instance to bypass Webpack module scoping issues
export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);
