import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCWzAnXCQRvKKH0hwVweitL95wiFeAtWB4",
  authDomain: "salamconsulting-fe3a4.firebaseapp.com",
  projectId: "salamconsulting-fe3a4",
  storageBucket: "salamconsulting-fe3a4.firebasestorage.app",
  messagingSenderId: "345400972418",
  appId: "1:345400972418:web:54d2c77e2360cf9f4bd09b",
  measurementId: "G-ZRBSV3CWEF",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db, firebaseConfig };

