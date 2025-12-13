import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from app folder first, then root as fallback
config({ path: resolve(__dirname, 'app/.env') });
config({ path: resolve(__dirname, '.env') });

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
      googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID,
      jsearchApiKey: process.env.JSEARCH_API_KEY,
    },
  },
};

