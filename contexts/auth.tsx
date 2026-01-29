import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithCredential,
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

// Complete the auth session for web browser
WebBrowser.maybeCompleteAuthSession();

import { auth, db, googleWebClientId } from "@/lib/firebase";

type AuthContextValue = {
  isAuthenticated: boolean;
  email: string | null;
  loading: boolean;
  initializing: boolean;
  onboardingCompleted: boolean | null; // null = not loaded yet
  googleSignInReady: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (fullName: string, email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  completeOnboarding: (onboardingData: OnboardingData) => Promise<void>;
};

export type OnboardingData = {
  careerGoal: string;
  jobFields: string[];
  resumeStatus: string;
  helpNeeded: string[];
  availability: string;
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
        onboardingCompleted: false, // New users need to complete onboarding
      });
      return;
    }

    // For existing users, ensure onboardingCompleted field exists
    const data = snapshot.data();
    const updates: Record<string, any> = {};

    if (user.emailVerified && !data?.verifiedAt) {
      updates.verifiedAt = serverTimestamp();
    }

    // If onboardingCompleted field doesn't exist, set it to false
    if (!("onboardingCompleted" in data)) {
      updates.onboardingCompleted = false;
      console.log("Adding onboardingCompleted field to existing user");
    }

    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      await updateDoc(userRef, updates);
    }
  } catch (error) {
    console.warn("Failed to sync user profile", error);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false); // Start as false - don't block
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);

  // Google Auth hook
  console.log("Google Web Client ID:", googleWebClientId);

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: googleWebClientId || undefined,
  });

  console.log("Google Auth request ready:", !!request);
  console.log("Google Auth redirect URI:", request?.redirectUri);

  // Handle Google Sign-In response
  useEffect(() => {
    if (response?.type === "success") {
      const { id_token } = response.params;

      if (id_token) {
        // Create Firebase credential and sign in
        const credential = GoogleAuthProvider.credential(id_token);
        signInWithCredential(auth, credential)
          .then((userCredential) => {
            return syncUserDocument(userCredential.user);
          })
          .catch((error) => {
            console.error("Firebase sign-in error:", error);
            if (error instanceof FirebaseError) {
              switch (error.code) {
                case "auth/account-exists-with-different-credential":
                  setGoogleError("An account already exists with this email using a different sign-in method.");
                  break;
                case "auth/invalid-credential":
                  setGoogleError("The credential is invalid or has expired. Please try again.");
                  break;
                default:
                  setGoogleError("Unable to sign in with Google. Please try again.");
              }
            } else {
              setGoogleError("Unable to sign in with Google. Please try again.");
            }
          })
          .finally(() => {
            setLoading(false);
          });
      } else {
        setLoading(false);
        setGoogleError("No ID token received from Google.");
      }
    } else if (response?.type === "error") {
      setLoading(false);
      console.error("Google OAuth error:", response.error);
      setGoogleError(response.error?.message || "Google Sign-In failed.");
    } else if (response?.type === "cancel") {
      setLoading(false);
    }
  }, [response]);

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
        async (user) => {
          clearTimeout(timeoutId);
          console.log("Auth state changed:", user ? "User logged in" : "No user");
          if (isMounted) {
            setCurrentUser(user);
            setInitializing(false);
            
            // Fetch onboarding status when user changes
            if (user) {
              try {
                const userRef = doc(db, "users", user.uid);
                const snapshot = await getDoc(userRef);
                if (snapshot.exists()) {
                  const data = snapshot.data();
                  // Check if onboardingCompleted field exists
                  // If it doesn't exist, treat as false (needs onboarding)
                  const hasOnboardingField = "onboardingCompleted" in data;
                  const isCompleted = data?.onboardingCompleted === true;
                  const hasOnboardingData = !!data?.onboardingData;
                  
                  console.log("Onboarding status check:", {
                    hasField: hasOnboardingField,
                    isCompleted,
                    hasOnboardingData,
                    userId: user.uid,
                  });
                  
                  // User needs onboarding if:
                  // 1. onboardingCompleted field doesn't exist
                  // 2. onboardingCompleted is false
                  // 3. onboardingData doesn't exist (even if field says true, data might be missing)
                  if (!hasOnboardingField || !isCompleted || !hasOnboardingData) {
                    setOnboardingCompleted(false);
                    
                    // Update existing user documents that don't have the field or data
                    const updates: Record<string, any> = {};
                    if (!hasOnboardingField) {
                      updates.onboardingCompleted = false;
                    }
                    if (Object.keys(updates).length > 0) {
                      try {
                        await updateDoc(userRef, updates);
                        console.log("Updated user document with onboardingCompleted field");
                      } catch (updateError) {
                        console.warn("Failed to update onboarding field", updateError);
                      }
                    }
                  } else {
                    setOnboardingCompleted(true);
                  }
                } else {
                  // User document doesn't exist - will be created on next sync
                  setOnboardingCompleted(false);
                }
              } catch (error) {
                console.warn("Failed to fetch onboarding status", error);
                setOnboardingCompleted(false);
              }
            } else {
              setOnboardingCompleted(null);
            }
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

  async function signInWithGoogle() {
    if (!googleWebClientId || googleWebClientId === "process.env.GOOGLE_WEB_CLIENT_ID") {
      throw new Error("Google Web Client ID is not configured. Please add it to your .env file.");
    }

    if (!request) {
      throw new Error("Google Sign-In is not ready. Please try again.");
    }

    setLoading(true);
    setGoogleError(null);

    try {
      await promptAsync();
      // Response is handled in the useEffect above
    } catch (error) {
      setLoading(false);
      console.error("Google Sign-In error:", error);
      throw error instanceof Error
        ? error
        : new Error("Unable to sign in with Google. Please try again.");
    }
  }

  async function completeOnboarding(onboardingData: OnboardingData) {
    if (!currentUser) {
      throw new Error("No user logged in");
    }

    try {
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, {
        onboardingCompleted: true,
        onboardingData: onboardingData,
        onboardingCompletedAt: serverTimestamp(),
      });
      setOnboardingCompleted(true);
    } catch (error) {
      console.error("Failed to complete onboarding", error);
      throw new Error("Failed to save onboarding data. Please try again.");
    }
  }

  async function signOut() {
    await firebaseSignOut(auth);
    setOnboardingCompleted(null);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: Boolean(currentUser),
      email: currentUser?.email ?? null,
      loading,
      initializing,
      onboardingCompleted,
      googleSignInReady: !!request,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      completeOnboarding,
    }),
    [currentUser, initializing, loading, onboardingCompleted, request],
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

