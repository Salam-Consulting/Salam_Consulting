import { Tabs, useRouter } from "expo-router";
import { useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/auth";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabLayout() {
  let colorScheme = useColorScheme() as "light" | "dark" | null;
  const { isAuthenticated, onboardingCompleted } = useAuth();
  const router = useRouter();

  if (!colorScheme) colorScheme = "light";

  // Redirect if not authenticated using router.replace to avoid navigation stack issues
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/create-account");
    } else if (isAuthenticated && onboardingCompleted === false) {
      // Redirect to onboarding if user hasn't completed it
      router.replace("/onboarding");
    }
  }, [isAuthenticated, onboardingCompleted, router]);

  // Show nothing while redirecting or checking onboarding
  if (!isAuthenticated || onboardingCompleted === false) {
    return null;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#08090d" }}>
      <Tabs
        screenOptions={{
          headerShown: false,

          // Active tab color (Salam Consulting green)
          tabBarActiveTintColor: "#3fe1c3",

          // Inactive icons
          tabBarInactiveTintColor: Colors[colorScheme].tabIconDefault,

          // Tab bar styling
          tabBarStyle: {
            backgroundColor: "#08090d",
            borderTopColor: "rgba(255,255,255,0.08)",
            height: 60,
          },
        }}
      >

        {/* HOME - Hidden from tab bar */}
        <Tabs.Screen
          name="index"
          options={{
            href: null, // Hide from tab bar
          }}
        />

        {/* SERVICES */}
        <Tabs.Screen
          name="services"
          options={{
            title: "Services",
            tabBarButton: HapticTab,
            tabBarIcon: ({ color }) => (
              <IconSymbol name="briefcase.fill" size={26} color={color} />
            ),
          }}
        />

        {/* Jobs */}
        <Tabs.Screen
          name="jobs"
          options={{
            title: "Jobs",
            tabBarButton: HapticTab,
            tabBarIcon: ({ color }) => (
              <IconSymbol name="text.document" size={26} color={color} />
            ),
          }}
        />

        {/* Resume */}
        <Tabs.Screen
          name="resume"
          options={{
            title: "Resume",
            tabBarButton: HapticTab,
            tabBarIcon: ({ color }) => (
              <IconSymbol name="doc.text.fill" size={26} color={color} />
            ),
          }}
        />

        {/* CONTACT */}
        <Tabs.Screen
          name="contact"
          options={{
            title: "Contact",
            tabBarButton: HapticTab,
            tabBarIcon: ({ color }) => (
              <IconSymbol name="bubble.left.and.bubble.right.fill" size={26} color={color} />
            ),
          }}
        />

        {/* ABOUT */}
        <Tabs.Screen
          name="about"
          options={{
            title: "About",
            tabBarButton: HapticTab,
            tabBarIcon: ({ color }) => (
              <IconSymbol name="person.crop.circle.fill" size={26} color={color} />
            ),
          }}
        />

        {/* SETTINGS */}
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarButton: HapticTab,
            tabBarIcon: ({ color }) => (
              <IconSymbol name="gearshape.fill" size={26} color={color} />
            ),
          }}
        />

        {/* TRACK - Hidden from tab bar */}
        <Tabs.Screen
          name="track"
          options={{
            href: null, // Hide from tab bar on all platforms
          }}
        />

      </Tabs>
    </SafeAreaView> 
  );
}
