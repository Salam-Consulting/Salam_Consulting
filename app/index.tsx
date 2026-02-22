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
          router.replace("/services");
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
        bounces={false} 
      >
        <View style={styles.form}>
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image
                // Update this path to where your new logo is saved
                source={require("../assets/images/salam_logo.png")} 
                style={styles.heroLogo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.logoText}>SALAM CONSULTING</Text>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Sign in to continue your journey
            </Text>
          </View>

          {/* Fancy inner card */}
          <View style={styles.card}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="#738A9D" style={styles.inputIcon} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  onFocus={handleInputFocus}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  autoComplete="email"
                  autoCorrect={false}
                  placeholder="you@example.com"
                  placeholderTextColor="#738A9D"
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#738A9D" style={styles.inputIcon} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  onFocus={handleInputFocus}
                  secureTextEntry
                  textContentType="password"
                  autoComplete="password"
                  autoCorrect={false}
                  placeholder="••••••••"
                  placeholderTextColor="#738A9D"
                  style={styles.input}
                />
              </View>
            </View>

            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color="#FF453A" />
                <Text style={styles.error}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              style={({ pressed }) => [
                styles.cta,
                pressed && !loading ? { opacity: 0.85, transform: [{ scale: 0.98 }] } : null,
              ]}
              disabled={loading}
              onPress={handleLogin}
            >
              {loading ? (
                <ActivityIndicator color="#02111E" />
              ) : (
                <Text style={styles.ctaLabel}>Sign In</Text>
              )}
            </Pressable>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
              <View style={styles.dividerLine} />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.googleButton,
                pressed && !loading && googleSignInReady ? { opacity: 0.85, transform: [{ scale: 0.98 }] } : null,
                !googleSignInReady ? { opacity: 0.5 } : null,
              ]}
              disabled={loading || !googleSignInReady}
              onPress={handleGoogleSignIn}
            >
              <Ionicons name="logo-google" size={20} color="white" />
              <Text style={styles.googleButtonText}>
                {googleSignInReady ? "Google" : "Loading..."}
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => router.push("/create-account")}
            style={({ pressed }) => [
              styles.secondary,
              pressed ? { opacity: 0.7 } : null
            ]}
          >
            <Text style={styles.secondaryText}>
              Don't have an account? <Text style={styles.link}>Sign Up</Text>
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
    backgroundColor: "#02111E", // Deep background
  },
  scrollView: {
    backgroundColor: "#02111E",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    paddingVertical: 40,
    backgroundColor: "#02111E",
  },
  form: {
    gap: 32, // More breathing room
  },
  header: {
    gap: 8,
    alignItems: "center",
    marginTop: 20,
  },
  logoContainer: {
    padding: 16,
    backgroundColor: "#112638",
    borderRadius: 32,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  heroLogo: {
    width: 80, 
    height: 80,
  },
  logoText: {
    color: "#3fe1c3",
    fontWeight: "800",
    letterSpacing: 3,
    fontSize: 12,
    marginBottom: 4,
  },
  title: {
    fontSize: 32,
    color: "white",
    fontWeight: "800",
  },
  subtitle: {
    color: "#738A9D",
    fontSize: 16,
    fontWeight: "500",
  },
  card: {
    backgroundColor: "#112638", 
    borderRadius: 28,
    padding: 24,
    gap: 20, 
    borderWidth: 1,
    borderColor: "rgba(63, 225, 195, 0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 10,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    color: "#8FA8BB",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1C3C54",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  inputIcon: {
    paddingLeft: 16,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 16,
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 69, 58, 0.1)",
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  error: {
    color: "#FF453A",
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  cta: {
    backgroundColor: "#3fe1c3",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: "#3fe1c3",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: "#02111E",
    letterSpacing: 0.5,
  },
  secondary: {
    alignItems: "center",
    padding: 16,
  },
  secondaryText: {
    color: "#738A9D",
    fontSize: 15,
    fontWeight: "500",
  },
  link: {
    color: "#3fe1c3",
    fontWeight: "700",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  dividerText: {
    color: "#738A9D",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#1C3C54",
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "white",
    letterSpacing: 0.5,
  },
});
