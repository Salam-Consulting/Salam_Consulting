import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useState } from "react";

import { AnimatedSplash } from "@/components/ui/animated-splash";
import { AppProvider } from "@/providers/app-provider";

// Keep splash visible until app is ready
SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="create-account" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="applied" />
    </Stack>
  );
}

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <AppProvider>
      <RootNavigator />
      {showSplash && (
        <AnimatedSplash onFinish={() => setShowSplash(false)} />
      )}
    </AppProvider>
  );
}
