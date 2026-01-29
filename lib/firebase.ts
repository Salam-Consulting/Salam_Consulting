import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import * as firebaseAuth from "firebase/auth";
import { getAuth, initializeAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCq4w4iS5DUcnQ7p9WzaS6G5M9h0vC_8UU",
  authDomain: "salam-64749.firebaseapp.com",
  projectId: "salam-64749",
  storageBucket: "salam-64749.firebasestorage.app",
  messagingSenderId: "546010459328",
  appId: "1:546010459328:web:e2ac4f1dd10a21a1961125",
  measurementId: "G-52T2YR3NQC"
};

let app!: FirebaseApp;
let auth!: Auth;
let db!: Firestore;
let storage!: FirebaseStorage;

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

  console.log("Initializing Firebase Storage...");
  storage = getStorage(app);
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
  if (!storage) {
    storage = getStorage(app);
  }
  console.warn("App will continue with Firebase - some features may not work as expected");
}

// Get Google Web Client ID from environment variables
const googleWebClientId = Constants.expoConfig?.extra?.googleWebClientId || process.env.GOOGLE_WEB_CLIENT_ID;

export { app, auth, db, storage, firebaseConfig, googleWebClientId };

