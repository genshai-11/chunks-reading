import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCU0khorVMOaLjJjSbMHDmpkTvJ9bWMXMw",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "chunks-reading.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "chunks-reading",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "chunks-reading.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "602623023236",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:602623023236:web:4284ca000ba48fdf1c8ad1",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-P437REL523"
};

// Initialize Firebase once
export const app: FirebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);

export default app;
