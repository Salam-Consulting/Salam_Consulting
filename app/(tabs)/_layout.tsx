import { Tabs } from 'expo-router';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  let colorScheme = useColorScheme() as 'light' | 'dark' | null;
  if (!colorScheme) colorScheme = 'light';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#08090d' }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarButton: HapticTab,

          // Active tab color (Salam Consulting green)
          tabBarActiveTintColor: "#3fe1c3",

          // Inactive icons
          tabBarInactiveTintColor: Colors[colorScheme].tabIconDefault,

          // Tab bar styling
          tabBarStyle: {
            backgroundColor: '#08090d',
            borderTopColor: 'rgba(255,255,255,0.08)',
            height: 60,
          },
        }}
      >

        {/* HOME */}
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => (
              <IconSymbol name="house.fill" size={26} color={color} />
            ),
          }}
        />

        {/* ABOUT */}
        <Tabs.Screen
          name="about"
          options={{
            title: 'About',
            tabBarIcon: ({ color }) => (
              <IconSymbol name="person.crop.circle.fill" size={26} color={color} />
            ),
          }}
        />

        {/* SERVICES */}
        <Tabs.Screen
          name="services"
          options={{
            title: 'Services',
            tabBarIcon: ({ color }) => (
              <IconSymbol name="briefcase.fill" size={26} color={color} />
            ),
          }}
        />

        {/* PROJECTS */}
        <Tabs.Screen
          name="projects"
          options={{
            title: 'Projects',
            tabBarIcon: ({ color }) => (
              <IconSymbol name="square.stack.3d.up.fill" size={26} color={color} />
            ),
          }}
        />

        {/* CONTACT */}
        <Tabs.Screen
          name="contact"
          options={{
            title: 'Contact',
            tabBarIcon: ({ color }) => (
              <IconSymbol name="bubble.left.and.bubble.right.fill" size={26} color={color} />
            ),
          }}
        />

        {/* SETTINGS */}
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color }) => (
              <IconSymbol name="gearshape.fill" size={26} color={color} />
            ),
          }}
        />

      </Tabs>
    </SafeAreaView> 
  );
}
