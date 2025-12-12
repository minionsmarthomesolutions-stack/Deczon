// Firebase Configuration and Initialization
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getAuth, Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyC95KAn9-etdlgijBnJkAVR7JGQj4EEtZU",
  authDomain: "minion-project-9bb87.firebaseapp.com",
  databaseURL: "https://minion-project-9bb87-default-rtdb.firebaseio.com",
  projectId: "minion-project-9bb87",
  storageBucket: "minion-project-9bb87.firebasestorage.app",
  messagingSenderId: "826736481617",
  appId: "1:826736481617:web:e0d2301da6c7be622def70",
  measurementId: "G-C0SRQH7QTD"
};

// Initialize Firebase - Lazy initialization to avoid timeout in Cloud Functions
let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;
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
    
    db = getFirestore(app);
    storage = getStorage(app);
    auth = getAuth(app);
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
}

// Only initialize on client-side immediately, server-side will initialize on demand
if (typeof window !== 'undefined') {
  initializeFirebase();
}

// Lazy getters for server-side
export const getDb = () => {
  if (!db && typeof window === 'undefined') {
    initializeFirebase();
  }
  return db;
};

export const getStorageInstance = () => {
  if (!storage && typeof window === 'undefined') {
    initializeFirebase();
  }
  return storage;
};

export const getAuthInstance = () => {
  if (!auth && typeof window === 'undefined') {
    initializeFirebase();
  }
  return auth;
};

export { app, db, storage, auth };
export default app;

