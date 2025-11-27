import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Home() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 900,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: -8,
            duration: 2400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 8,
            duration: 2400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.card,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { translateY: floatAnim }],
            },
          ]}
        >
          <Image
            source={require("../../assets/images/Logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          <Text style={styles.title}>SALAM CONSULTING</Text>
          <Text style={styles.subtitle}>HUMAN DRIVEN</Text>
          <Text style={styles.subtitle}>Development Day 1: Ahmad Noori</Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#08090d",
  },
  container: {
    flex: 1,
    justifyContent: "center", // centers vertically
    alignItems: "center",
    paddingBottom: 80,         // space above tab bar
  },
  card: {
    width: "90%",
    paddingVertical: 40,
    paddingHorizontal: 26,
    borderRadius: 30,
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.10)",
    borderColor: "rgba(255, 255, 255, 0.18)",
    borderWidth: 1.5,
  },
  logo: {
    width: 180,
    height: 120,
    marginBottom: 28,
  },
  title: {
    color: "white",
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    color: "#8ffcdf",
    fontSize: 16,
    marginTop: 8,
    letterSpacing: 2,
    textAlign: "center",
  },
});
