import { useAuth } from "@/contexts/auth";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
export default function LoginScreen() {
  const { signIn, signInWithGoogle, loading, isAuthenticated, onboardingCompleted, initializing, googleSignInReady } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [justLoggedIn, setJustLoggedIn] = useState(false);
  
  // Add ScrollView ref
  const scrollViewRef = useRef<ScrollView>(null);

  // Function to scroll down when input is focused
  // On iOS, don't scroll to prevent weird behavior with Face ID autofill
  // iOS handles keyboard avoidance natively without KeyboardAvoidingView
  const handleInputFocus = () => {
    // Only scroll on Android - iOS handles keyboard avoidance better natively
    if (Platform.OS === 'android') {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ 
          y: 200,  // Change this value to control scroll distance (in pixels)
          animated: true 
        });
      }, 100);
    }
    // On iOS, do nothing - let native iOS keyboard handling work
  };

  // Handle redirect ONLY after user explicitly logs in
  // This ensures login screen is shown first, then onboarding check happens after login
  useEffect(() => {
    console.log("Login redirect check:", {
      justLoggedIn,
      isAuthenticated,
      onboardingCompleted,
    });

    if (justLoggedIn && isAuthenticated && onboardingCompleted !== null) {
      // Small delay to ensure login completes and onboarding status is ready
      const timer = setTimeout(() => {
        console.log("Redirecting based on onboarding status:", onboardingCompleted);
        if (onboardingCompleted === false) {
          console.log("Redirecting to onboarding");
          router.replace("/onboarding");
        } else {
          console.log("Redirecting to main app");
          router.replace("/(tabs)");
        }
        setJustLoggedIn(false);
      }, 500); // Increased delay to ensure onboarding status is loaded
      return () => clearTimeout(timer);
    }
  }, [justLoggedIn, isAuthenticated, onboardingCompleted]);

  const handleLogin = async () => {
    setError("");

    try {
      await signIn(email.trim(), password);
      setJustLoggedIn(true);
      // Wait a moment for auth state to update, then redirect will happen
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
      setJustLoggedIn(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");

    try {
      await signInWithGoogle();
      setJustLoggedIn(true);
      // Wait a moment for auth state to update, then redirect will happen
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in with Google.");
      setJustLoggedIn(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        bounces={false} // Prevent bounce on iOS to avoid weird behavior with autofill
      >
        <View style={styles.form}>
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
              onFocus={handleInputFocus}
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              autoCorrect={false}
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
              onFocus={handleInputFocus}
              secureTextEntry
              textContentType="password"
              autoComplete="password"
              autoCorrect={false}
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

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.googleButton,
              pressed && !loading && googleSignInReady ? { opacity: 0.85 } : null,
              !googleSignInReady ? { opacity: 0.5 } : null,
            ]}
            disabled={loading || !googleSignInReady}
            onPress={handleGoogleSignIn}
          >
            <Ionicons name="logo-google" size={20} color="white" />
            <Text style={styles.googleButtonText}>
              {googleSignInReady ? "Continue with Google" : "Loading..."}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/create-account")}
            style={styles.secondary}
          >
            <Text style={styles.secondaryText}>
              New here? <Text style={styles.link}>Create an account</Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#08090d",
  },
  scrollView: {
    backgroundColor: "#08090d",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    paddingVertical: 40,
    backgroundColor: "#08090d",
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
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  dividerText: {
    color: "#96a3a1",
    fontSize: 12,
    fontWeight: "500",
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#11141b",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
});
