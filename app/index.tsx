import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import LoadingScreen from "@/components/LoadingScreen";
import { useAuth } from "@/contexts/auth";

export default function LoginScreen() {
  const { signIn, loading } = useAuth();

  // 🔥 Only for when the app FIRST loads
  const [initialAppLoad, setInitialAppLoad] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // 🔥 Show LoadingScreen ONLY once when app first loads
  useEffect(() => {
    const timer = setTimeout(() => setInitialAppLoad(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // ⛔ Only show loading screen FIRST — not during login attempts
  if (initialAppLoad) {
    return (
      <View style={{ flex: 1, backgroundColor: "#08090d" }}>
        <LoadingScreen />
      </View>
    );
  }

  const handleLogin = async () => {
    setError("");

    try {
      await signIn(email.trim(), password);
      router.replace("/(tabs)");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.form}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <Image
            source={require("@/assets/images/Logo.png")}
            style={styles.heroLogo}
            resizeMode="contain"
          />
          <Text style={styles.logo}>Salam Consulting</Text>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>
            Sign in to continue exploring the app.
          </Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@salam-consulting.com"
            placeholderTextColor="#6f7d83"
            style={styles.input}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor="#6f7d83"
            style={styles.input}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={({ pressed }) => [
            styles.cta,
            pressed && !loading ? { opacity: 0.85 } : null,
          ]}
          disabled={loading}
          onPress={handleLogin}
        >
          {loading ? (
            <ActivityIndicator color="#08090d" />
          ) : (
            <Text style={styles.ctaLabel}>Sign In</Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => router.push("/create-account")}
          style={styles.secondary}
        >
          <Text style={styles.secondaryText}>
            New here? <Text style={styles.link}>Create an account</Text>
          </Text>
        </Pressable>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#08090d",
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  form: {
    gap: 20,
  },
  header: {
    gap: 6,
    alignItems: "center",
  },
  heroLogo: {
    width: 140,
    height: 140,
    marginBottom: 8,
  },
  logo: {
    color: "#3fe1c3",
    fontWeight: "700",
    letterSpacing: 1,
  },
  title: {
    fontSize: 32,
    color: "white",
    fontWeight: "700",
  },
  subtitle: {
    color: "#a8b4b1",
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    color: "#d7e0de",
    fontSize: 14,
  },
  input: {
    backgroundColor: "#11141b",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "white",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  error: {
    color: "#ff7b7b",
  },
  cta: {
    backgroundColor: "#3fe1c3",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  ctaLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#08090d",
  },
  secondary: {
    alignItems: "center",
    marginTop: 6,
  },
  secondaryText: {
    color: "#96a3a1",
  },
  link: {
    color: "#3fe1c3",
    fontWeight: "600",
  },
});
