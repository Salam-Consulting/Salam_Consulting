import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from app folder first, then root as fallback
config({ path: resolve(__dirname, 'app/.env'), quiet: true });
config({ path: resolve(__dirname, '.env'), quiet: true });

export default {
  expo: {
    name: "salam-app",
    slug: "salam-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "salamapp",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.ahmadnoori009.salamapp",
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: "com.ahmadnoori009.salamapp",
      softwareKeyboardLayoutMode: "pan"
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      "expo-web-browser",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000"
          }
        }
      ]
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true
    },
    extra: {
      eas: {
        projectId: "19c2f5f7-cd87-436e-ae41-e04ac8e0525b",
      },
      googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID,
      jsearchApiKey: process.env.JSEARCH_API_KEY,
      firebaseApiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      firebaseMeasurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    },
  },
};

