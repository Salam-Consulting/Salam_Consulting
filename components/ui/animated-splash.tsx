import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Image, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const SalamLogo = require("@/assets/images/salam_logo.png");

const DURATION = 800;
const HOLD_DURATION = 1500;
const FADE_OUT_DURATION = 500;

type AnimatedSplashProps = {
  onFinish: () => void;
};

export function AnimatedSplash({ onFinish }: AnimatedSplashProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.6); // Starts smaller for a larger impact
  const translateY = useSharedValue(30); // Starts slightly lowered

  const finishSplash = () => {
    SplashScreen.hideAsync();
    onFinish();
  };

  useEffect(() => {
    // 1. Opacity: Fade in -> Hold -> Fade out
    opacity.value = withSequence(
      withTiming(1, { duration: DURATION, easing: Easing.out(Easing.quad) }),
      withDelay(
        HOLD_DURATION,
        withTiming(0, { duration: FADE_OUT_DURATION, easing: Easing.in(Easing.quad) })
      )
    );

    // 2. Position: Slide up with bounce -> Hold -> Slide up further to exit
    translateY.value = withSequence(
      withTiming(0, { duration: DURATION, easing: Easing.out(Easing.back(1.5)) }),
      withDelay(
        HOLD_DURATION,
        withTiming(-40, { duration: FADE_OUT_DURATION, easing: Easing.in(Easing.quad) })
      )
    );

    // 3. Scale: Bounce in -> Breathe/Pulse -> Zoom out to exit
    scale.value = withSequence(
      withTiming(1, { duration: DURATION, easing: Easing.out(Easing.back(1.5)) }),
      withTiming(1.03, { duration: HOLD_DURATION, easing: Easing.inOut(Easing.quad) }),
      withTiming(1.2, { duration: FADE_OUT_DURATION, easing: Easing.in(Easing.quad) }, (finished) => {
        if (finished) {
          runOnJS(finishSplash)();
        }
      })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value }
    ],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoWrapper, animatedStyle]}>
        <Image
          source={SalamLogo}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  logoWrapper: {
    width: "85%",
    maxWidth: 340,
    flex: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 280,
    height: 320,
  },
});
