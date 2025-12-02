import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  updateProfile,
  type User,
} from "firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { auth, db } from "@/lib/firebase";

type AuthContextValue = {
  isAuthenticated: boolean;
  email: string | null;
  loading: boolean;
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (fullName: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function syncUserDocument(
  user: User,
  options?: { fullName?: string },
) {
  try {
    const userRef = doc(db, "users", user.uid);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        fullName: options?.fullName ?? user.displayName ?? "",
        email: user.email ?? "",
        createdAt: serverTimestamp(),
        verifiedAt: user.emailVerified ? serverTimestamp() : null,
      });
      return;
    }

    if (user.emailVerified && !snapshot.data()?.verifiedAt) {
      await updateDoc(userRef, {
        verifiedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.warn("Failed to sync user profile", error);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false); // Start as false - don't block

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let isMounted = true;
    
    console.log("Setting up auth state listener...");
    
    // Very short timeout - don't block the app
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        console.log("Auth check complete (timeout)");
        setInitializing(false);
      }
    }, 500); // Only 500ms timeout
    
    try {
      unsubscribe = onAuthStateChanged(
        auth,
        (user) => {
          clearTimeout(timeoutId);
          console.log("Auth state changed:", user ? "User logged in" : "No user");
          if (isMounted) {
            setCurrentUser(user);
            setInitializing(false);
          }
        },
        (error) => {
          clearTimeout(timeoutId);
          console.error("Auth state change error:", error);
          if (isMounted) {
            setInitializing(false);
          }
        }
      );
    } catch (error) {
      clearTimeout(timeoutId);
      console.error("Error setting up auth listener:", error);
      if (isMounted) {
        setInitializing(false);
      }
    }

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  async function signIn(nextEmail: string, password: string) {
    setLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        nextEmail,
        password,
      );

      if (!credential.user.emailVerified) {
        await sendEmailVerification(credential.user);
        await firebaseSignOut(auth);
        throw new Error(
          "Please verify your email address. We just sent you a new verification link.",
        );
      }

      await syncUserDocument(credential.user);
    } catch (error) {
      if (!(error instanceof FirebaseError)) {
        throw error instanceof Error
          ? error
          : new Error("Unable to sign in. Please try again.");
      }

      let message = "Unable to sign in. Please try again.";

      switch (error.code) {
        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":
          message = "We couldn’t find an account with that email and password.";
          break;
        case "auth/missing-password":
          message = "Please enter your password to continue.";
          break;
        case "auth/too-many-requests":
          message = "Too many attempts. Please wait a moment and try again.";
          break;
        default:
          message = "Something went wrong. Please try again.";
      }

      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }

  async function signUp(fullName: string, nextEmail: string, password: string) {
    setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        nextEmail,
        password,
      );
      if (fullName) {
        await updateProfile(credential.user, { displayName: fullName });
      }

      await syncUserDocument(credential.user, { fullName });
      await sendEmailVerification(credential.user);
      await firebaseSignOut(auth);
    } catch (error) {
      if (!(error instanceof FirebaseError)) {
        throw error instanceof Error
          ? error
          : new Error("Unable to create your account right now.");
      }

      let message = "Unable to create your account right now.";

      switch (error.code) {
        case "auth/email-already-in-use":
          message = "That email is already registered. Try signing in instead.";
          break;
        case "auth/missing-password":
          message = "Please create a password before submitting.";
          break;
        case "auth/weak-password":
          message = "Please choose a stronger password (at least 8 characters).";
          break;
        default:
          message = "Something went wrong. Please try again.";
      }

      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    await firebaseSignOut(auth);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: Boolean(currentUser),
      email: currentUser?.email ?? null,
      loading,
      initializing,
      signIn,
      signUp,
      signOut,
    }),
    [currentUser, initializing, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return context;
}

