import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import * as firebaseAuth from "firebase/auth";
import { getAuth, initializeAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCWzAnXCQRvKKH0hwVweitL95wiFeAtWB4",
  authDomain: "salamconsulting-fe3a4.firebaseapp.com",
  projectId: "salamconsulting-fe3a4",
  storageBucket: "salamconsulting-fe3a4.firebasestorage.app",
  messagingSenderId: "345400972418",
  appId: "1:345400972418:web:54d2c77e2360cf9f4bd09b",
  measurementId: "G-ZRBSV3CWEF",
};

let app!: FirebaseApp;
let auth!: Auth;
let db!: Firestore;

try {
  console.log("Initializing Firebase...");
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  console.log("Firebase app initialized");
  
  // Initialize auth with AsyncStorage persistence for React Native
  try {
    console.log("Initializing Firebase Auth with AsyncStorage...");
    auth = initializeAuth(app, {
      persistence: (firebaseAuth as any).getReactNativePersistence(AsyncStorage),
    });
    console.log("Firebase Auth initialized successfully");
  } catch (error: any) {
    // If auth is already initialized, get the existing instance
    if (error.code === "auth/already-initialized") {
      console.log("Auth already initialized, using existing instance");
      auth = getAuth(app);
    } else {
      console.error("Error initializing auth:", error);
      // Don't throw - try to get auth anyway
      try {
        auth = getAuth(app);
        console.log("Using fallback auth instance");
      } catch (fallbackError) {
        console.error("Failed to get fallback auth:", fallbackError);
        // Fallback to getAuth without app if needed
        auth = getAuth(app);
      }
    }
  }
  
  console.log("Initializing Firestore...");
  db = getFirestore(app);
  console.log("Firebase initialization complete");
} catch (error) {
  console.error("Firebase initialization error:", error);
  // Ensure we have valid instances even if initialization had issues
  // This should rarely happen, but provides type safety
  if (!app) {
    app = initializeApp(firebaseConfig);
  }
  if (!auth) {
    auth = getAuth(app);
  }
  if (!db) {
    db = getFirestore(app);
  }
  console.warn("App will continue with Firebase - some features may not work as expected");
}

export { app, auth, db, firebaseConfig };
