import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Web app's Firebase configuration loaded from environment variables
// with fallback defaults provided in the instructions.
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyCW_FhPhNLNJR9De_38PqkMBkYSjIcVpPA",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "ificatemanagement.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "ificatemanagement",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "ificatemanagement.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "841326490483",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:841326490483:web:752829d66d3e8394e08b06",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-YYV4FPVCKB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services (safely check for window object for Analytics)
const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { app, analytics, db, auth, storage };
export default app;
