import { router } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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
  const { signUp, loading } = useAuth();
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
      >
        <View style={styles.form}>
          <View style={styles.header}>
            <Text style={styles.logo}>Salam Consulting</Text>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Join us to access the Salam Consulting experience.
            </Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              onFocus={handleInputFocus}
              placeholder="John Doe"
              placeholderTextColor="#6f7d83"
              style={styles.input}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              onFocus={handleInputFocus}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@example.com"
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
              placeholder="Create a strong password"
              placeholderTextColor="#6f7d83"
              style={styles.input}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {info ? <Text style={styles.info}>{info}</Text> : null}

          <Pressable
            style={({ pressed }) => [
              styles.cta,
              pressed && !loading ? { opacity: 0.85 } : null,
            ]}
            disabled={loading}
            onPress={handleSignUp}
          >
            {loading ? (
              <ActivityIndicator color="#08090d" />
            ) : (
              <Text style={styles.ctaLabel}>Create Account</Text>
            )}
          </Pressable>

          <Pressable onPress={() => router.replace("/")}>
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
  info: {
    color: "#3fe1c3",
    fontSize: 14,
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
  secondaryText: {
    color: "#96a3a1",
    textAlign: "center",
  },
  link: {
    color: "#3fe1c3",
    fontWeight: "600",
  },
});

