import { Stack } from "expo-router";
import React from "react";

import { AppProvider } from "@/providers/app-provider";

function RootNavigator() {
  return (
    <Stack 
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="create-account" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="applied" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AppProvider>
      <RootNavigator />
    </AppProvider>
  );
}
