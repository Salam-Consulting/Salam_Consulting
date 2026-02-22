import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "@/contexts/auth";

export default function CreateAccountScreen() {
  const { signUp, signInWithGoogle, loading } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  
  // Add ScrollView ref
  const scrollViewRef = useRef<ScrollView>(null);

  // Function to scroll down when input is focused
  const handleInputFocus = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ 
        y: 300,  // Change this value to control scroll distance (in pixels)
        animated: true 
      });
    }, 100);
  };

  const allowedDomains = useMemo(
    () => [
      "gmail.com",
      "yahoo.com",
      "salamconsulting.com",
      "outlook.com",
      "hotmail.com",
      "live.com",
      "msn.com",
      "icloud.com",
      "me.com",
      "mac.com",
      "proton.me",
      "tutanota.com",
      "aol.com",
      "comcast.net",
      "verizon.net",
      "att.net",
      "bellsouth.net",
      "cox.net",
      "charter.net",
      "sbcglobal.net",
      "mail.com",
      "zoho.com",
      "gmx.com",
      "fastmail.com",
    ],
    [],
  );

  const blockedDomains = useMemo(
    () => [
      "mailinator.com",
      "guerrillamail.com",
      "sharklasers.com",
      "10minutemail.com",
      "tempmail.com",
      "temp-mail.org",
      "yopmail.com",
      "fakeinbox.com",
      "getnada.com",
      "nada.email",
      "trashmail.com",
      "discard.email",
      "burnermail.io",
      "maildrop.cc",
      "moakt.com",
      "throwawaymail.com",
      "spambox.us",
      "mailnesia.com",
      "mytemp.email",
      "zcxmail.com",
      "inboxbear.com",
      "emailondeck.com",
      "airmailbox.website",
      "mintemail.com",
      "spamex.com",
      "spamgourmet.com",
      "spam4.me",
      "mailpoof.com",
      "mailcatch.com",
    ],
    [],
  );

  const handleSignUp = async () => {
    setError("");
    setInfo("");
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setError("Please enter your full name.");
      return;
    }

    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setError("That doesn’t look like a valid email. Double-check and try again.");
      return;
    }

    const domain = trimmedEmail.split("@")[1]?.toLowerCase();
    const isAllowed = domain
      ? allowedDomains.some((allowed) => domain === allowed)
      : false;
    const isBlocked = domain
      ? blockedDomains.some((blocked) => domain === blocked)
      : false;

    if (!isAllowed || isBlocked) {
      setError(
        "Email domain not supported. Use a trusted provider (Gmail, Yahoo, Outlook, etc.).",
      );
      return;
    }

    if (password.length < 8) {
      setError("Passwords must be at least 8 characters long.");
      return;
    }

    try {
      await signUp(trimmedName, trimmedEmail, password);
      setPassword("");
      setInfo(
        `We emailed a verification link to ${trimmedEmail}. Please verify before signing in.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create account.");
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setInfo("");

    try {
      await signInWithGoogle();
      router.replace("/services");   
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in with Google.");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        bounces={false}
      >
        <View style={styles.form}>
          <View style={styles.header}>
            <Image
              source={require("../assets/images/salam_logo.png")}
              style={styles.heroLogo}
              resizeMode="contain"
            />
            <Text style={styles.logoText}>SALAM CONSULTING</Text>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Join us to access the Salam experience.
            </Text>
          </View>

          {/* Fancy inner card */}
          <View style={styles.card}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color="#738A9D" style={styles.inputIcon} />
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  onFocus={handleInputFocus}
                  placeholder="John Doe"
                  placeholderTextColor="#738A9D"
                  style={styles.input}
                />
              </View>
            </View>

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
                  placeholder="Create a strong password"
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

            {info ? (
              <View style={styles.infoContainer}>
                <Ionicons name="information-circle" size={16} color="#3fe1c3" />
                <Text style={styles.info}>{info}</Text>
              </View>
            ) : null}

            <Pressable
              style={({ pressed }) => [
                styles.cta,
                pressed && !loading ? { opacity: 0.85, transform: [{ scale: 0.98 }] } : null,
              ]}
              disabled={loading}
              onPress={handleSignUp}
            >
              {loading ? (
                <ActivityIndicator color="#02111E" />
              ) : (
                <Text style={styles.ctaLabel}>Create Account</Text>
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
                pressed && !loading ? { opacity: 0.85, transform: [{ scale: 0.98 }] } : null,
              ]}
              disabled={loading}
              onPress={handleGoogleSignIn}
            >
              <Ionicons name="logo-google" size={20} color="white" />
              <Text style={styles.googleButtonText}>Google</Text>
            </Pressable>
          </View>

          <Pressable 
            onPress={() => router.replace("/")}
            style={({ pressed }) => [
              styles.secondary,
              pressed ? { opacity: 0.7 } : null
            ]}
          >
            <Text style={styles.secondaryText}>
              Already have an account? <Text style={styles.link}>Sign in</Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    gap: 32, // Breathing room
  },
  header: {
    gap: 8,
    alignItems: "center",
    marginTop: 20,
  },
  heroLogo: {
    width: 80,
    height: 80,
    alignSelf: "center",
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
    textAlign: "center",
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
  infoContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(63, 225, 195, 0.1)",
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  info: {
    color: "#3fe1c3",
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
    textAlign: "center",
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
