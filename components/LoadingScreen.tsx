import { useEffect, useRef } from "react";
import { ActivityIndicator, Animated, Image, StyleSheet, View } from "react-native";

import Logo from "@/assets/images/Logo.png";

/**
 * Custom loading screen shown before auth/navigation is ready.
 * Fades in the logo and loader on a dark backdrop.
 */
export default function LoadingScreen() {
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 600,
      delay: 120,
      useNativeDriver: true,
    }).start();
  }, [fade]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fade }]}>
        <Image source={Logo} style={styles.logo} resizeMode="contain" />
        <ActivityIndicator color="#3fe1c3" size="large" style={styles.spinner} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#08090d",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    alignItems: "center",
  },
  logo: {
    width: 180,
    height: 80,
  },
  spinner: {
    marginTop: 16,
  },
});
