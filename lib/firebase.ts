// Firebase Configuration and Initialization
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyD152fC4d75Tzb1pGiBfuTfyJwZ4zyO_34",
  authDomain: "deczon-faa54.firebaseapp.com",
  projectId: "deczon-faa54",
  messagingSenderId: "816426698816",
  appId: "1:816426698816:web:3d6d6268f69db01e0037a5",
  measurementId: "G-7D1WDN68TX"
};

// Initialize Firebase - Lazy initialization to avoid timeout in Cloud Functions
let app: FirebaseApp | undefined;
let auth: Auth | undefined;

// Lazy initialization function
function initializeFirebase() {
  if (app) return; // Already initialized

  try {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }

    auth = getAuth(app);
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
}

// Only initialize on client-side immediately, server-side will initialize on demand
if (typeof window !== 'undefined') {
  initializeFirebase();
}

export const getAuthInstance = () => {
  if (!auth && typeof window === 'undefined') {
    initializeFirebase();
  }
  return auth;
};

export { app, auth };
export default app;
