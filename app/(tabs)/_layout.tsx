import { useRouter } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { useEffect } from "react";

import { useAuth } from "@/contexts/auth";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabLayout() {
  let colorScheme = useColorScheme() as "light" | "dark" | null;
  const { isAuthenticated, onboardingCompleted } = useAuth();
  const router = useRouter();

  if (!colorScheme) colorScheme = "light";

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/create-account");
    } else if (isAuthenticated && onboardingCompleted === false) {
      router.replace("/onboarding");
    }
  }, [isAuthenticated, onboardingCompleted, router]);

  // Show nothing while redirecting or checking onboarding
  if (!isAuthenticated || onboardingCompleted === false) {
    return null;
  }

  // RETURN NATIVETABS DIRECTLY - NO SAFEAREAVIEW
  return (
    <NativeTabs tintColor="#3fe1c3">
      {/* HOME - Hidden from tab bar */}
      <NativeTabs.Trigger name="index" hidden />

      {/* SERVICES */}
      <NativeTabs.Trigger name="services">
        <Label>Services</Label>
        <Icon sf="briefcase.fill" />
      </NativeTabs.Trigger>

      {/* JOBS */}
      <NativeTabs.Trigger name="jobs">
        <Label>Jobs</Label>
        <Icon sf="banknote" />
      </NativeTabs.Trigger>

      {/* RESUME */}
      <NativeTabs.Trigger name="resume">
        <Label>Resume</Label>
        <Icon sf="doc.text.fill" />
      </NativeTabs.Trigger>

      {/* CONTACT - Hidden */}
      <NativeTabs.Trigger name="contact" hidden />

      {/* ABOUT */}
      <NativeTabs.Trigger name="about">
        <Label>About</Label>
        <Icon sf="info.circle" />
      </NativeTabs.Trigger>

      {/* SETTINGS */}
      <NativeTabs.Trigger name="settings">
        <Label>Settings</Label>
        <Icon sf="gearshape.fill" />
      </NativeTabs.Trigger>

      {/* TRACK - Hidden */}
      <NativeTabs.Trigger name="track" hidden />
    </NativeTabs>
  );
}
