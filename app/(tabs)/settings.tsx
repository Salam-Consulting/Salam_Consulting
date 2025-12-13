import { router } from "expo-router";
import {
  sendPasswordResetEmail,
  updateEmail,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth, type OnboardingData } from "@/contexts/auth";
import { auth, db } from "@/lib/firebase";

type Profile = {
  fullName: string;
  email: string;
  phoneNumber: string;
  city: string;
  state: string;
  zip: string;
};

export default function Settings() {
  const { email, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile>({
    fullName: "",
    email: email ?? "",
    phoneNumber: "",
    city: "",
    state: "",
    zip: "",
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [verificationId, setVerificationId] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [initialPhone, setInitialPhone] = useState("");
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [editingOnboarding, setEditingOnboarding] = useState(false);
  const [savingOnboarding, setSavingOnboarding] = useState(false);

  const user = auth.currentUser;
  // Phone verification temporarily disabled - expo-firebase-recaptcha was deprecated
  // const recaptchaVerifier = useRef<FirebaseRecaptchaVerifierModal>(null);

  const isValidEmail = useMemo(
    () => /^\S+@\S+\.\S+$/.test(profile.email.trim()),
    [profile.email],
  );

  useEffect(() => {
    setVerificationId("");
    setSmsCode("");
  }, [profile.phoneNumber]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const userRef = doc(db, "users", user.uid);
        const snapshot = await getDoc(userRef);
        if (snapshot.exists()) {
          const data = snapshot.data();
          const phone = data.phoneNumber ?? "";
          setProfile({
            fullName: data.fullName ?? user.displayName ?? "",
            email: data.email ?? user.email ?? "",
            phoneNumber: phone,
            city: data.location?.city ?? "",
            state: data.location?.state ?? "",
            zip: data.location?.zip ?? "",
          });
          setInitialPhone(phone);
          
          // Load onboarding data if it exists
          if (data.onboardingData) {
            setOnboardingData(data.onboardingData as OnboardingData);
          }
        } else {
          setProfile((prev) => ({
            ...prev,
            fullName: user.displayName ?? "",
            email: user.email ?? prev.email,
          }));
          setInitialPhone("");
        }
      } catch (err) {
        setError("Unable to load your profile right now.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleChange = (key: keyof Profile, value: string) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!user) {
      setError("You need to be signed in to update settings.");
      return;
    }
    const trimmedName = profile.fullName.trim();
    const trimmedEmail = profile.email.trim();
    if (!trimmedName) {
      setError("Full Name is required.");
      return;
    }
    if (!trimmedEmail || !isValidEmail) {
      setError("Enter a valid email address.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      if (user.email !== trimmedEmail) {
        await updateEmail(user, trimmedEmail);
      }
      if (user.displayName !== trimmedName) {
        await updateProfile(user, { displayName: trimmedName });
      }

      const userRef = doc(db, "users", user.uid);
      const trimmedPhone = profile.phoneNumber.trim();
      const phoneChanged = trimmedPhone !== initialPhone;
      const updates: Record<string, unknown> = {
        fullName: trimmedName,
        email: trimmedEmail,
        phoneNumber: trimmedPhone,
        location: {
          city: profile.city.trim(),
          state: profile.state.trim(),
          zip: profile.zip.trim(),
        },
        updatedAt: serverTimestamp(),
      };

      if (phoneChanged) {
        updates.phoneVerified = false;
        updates.phoneVerifiedAt = null;
      }

      await setDoc(
        userRef,
        updates,
        { merge: true },
      );

      setMessage("Profile updated.");
      setInitialPhone(trimmedPhone);
    } catch (err) {
      setError("Unable to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    const targetEmail = profile.email.trim() || email;
    if (!targetEmail || !/^\S+@\S+\.\S+$/.test(targetEmail)) {
      setError("Add a valid email to reset your password.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, targetEmail);
      Alert.alert("Password reset sent", `We emailed a reset link to ${targetEmail}.`);
    } catch {
      setError("Unable to send reset email right now.");
    }
  };

  const handleSendVerificationCode = async () => {
    // Phone verification temporarily disabled - expo-firebase-recaptcha was deprecated
    setError("Phone verification is currently unavailable. This feature will be restored in a future update.");
    return;
    
    /* Original code commented out - requires recaptcha
    if (!user) {
      setError("Sign in to verify your phone.");
      return;
    }
    const phoneNumber = profile.phoneNumber.trim();
    if (!phoneNumber) {
      setError("Add a phone number first.");
      return;
    }
    if (!phoneNumber.startsWith("+")) {
      setError("Include country code (e.g., +1...) for SMS verification.");
      return;
    }

    setSendingCode(true);
    setError("");
    setMessage("");
    try {
      const verifier = recaptchaVerifier.current;
      if (!verifier) {
        setError("Recaptcha not ready. Try again.");
        return;
      }
      const provider = new PhoneAuthProvider(auth);
      const id = await provider.verifyPhoneNumber(phoneNumber, verifier);
      setVerificationId(id);
      setSmsCode("");
      setMessage("SMS code sent. Check your phone.");
    } catch (err) {
      if (err instanceof FirebaseError) {
        switch (err.code) {
          case "auth/invalid-phone-number":
            setError("That phone number isn't valid. Use full E.164 format (e.g., +1...).");
            break;
          case "auth/missing-phone-number":
            setError("Enter a phone number to verify.");
            break;
          case "auth/too-many-requests":
            setError("Too many attempts. Wait a bit and try again.");
            break;
          case "auth/quota-exceeded":
            setError("Verification quota exceeded. Try again later.");
            break;
          case "auth/billing-not-enabled":
            setError(
              "Phone verification requires Firebase billing to be enabled. Turn on billing, then retry.",
            );
            break;
          default:
            setError(err.message || "Unable to send verification code. Please try again.");
        }
      } else {
        setError("Unable to send verification code. Please try again.");
      }
    } finally {
      setSendingCode(false);
    }
    */
  };

  const handleConfirmCode = async () => {
    // Phone verification temporarily disabled - expo-firebase-recaptcha was deprecated
    setError("Phone verification is currently unavailable. This feature will be restored in a future update.");
    return;
    
    /* Original code commented out - requires recaptcha
    if (!user) {
      setError("Sign in to verify your phone.");
      return;
    }
    if (!verificationId) {
      setError("Request a code first.");
      return;
    }
    const code = smsCode.trim();
    if (code.length < 6) {
      setError("Enter the 6-digit code you received.");
      return;
    }

    setVerifyingCode(true);
    setError("");
    setMessage("");
    try {
      const credential = PhoneAuthProvider.credential(verificationId, code);
      await linkWithCredential(user, credential);
      const userRef = doc(db, "users", user.uid);
      await setDoc(
        userRef,
        {
          phoneNumber: profile.phoneNumber.trim(),
          phoneVerified: true,
          phoneVerifiedAt: serverTimestamp(),
        },
        { merge: true },
      );
      setMessage("Phone verified and saved.");
      setInitialPhone(profile.phoneNumber.trim());
      setVerificationId("");
      setSmsCode("");
    } catch (err) {
      if (err instanceof FirebaseError) {
        switch (err.code) {
          case "auth/invalid-verification-code":
          case "auth/invalid-verification-id":
            setError("Invalid code. Request a new one and try again.");
            break;
          case "auth/session-expired":
            setError("Verification session expired. Resend the code.");
            break;
          default:
            setError(err.message || "Invalid code or verification expired. Try again.");
        }
      } else {
        setError("Invalid code or verification expired. Try again.");
      }
    } finally {
      setVerifyingCode(false);
    }
    */
  };

  const handleUpdateOnboarding = async () => {
    if (!user || !onboardingData) return;
    
    setSavingOnboarding(true);
    setError("");
    setMessage("");
    
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        onboardingData: onboardingData,
        onboardingCompletedAt: serverTimestamp(),
      });
      setMessage("Onboarding preferences updated.");
      setEditingOnboarding(false);
    } catch (err) {
      setError("Unable to save onboarding preferences. Please try again.");
    } finally {
      setSavingOnboarding(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace("/create-account");
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Please sign in to manage your profile.</Text>
        <Pressable style={styles.primaryButton} onPress={() => router.replace("/")}>
          <Text style={styles.primaryButtonLabel}>Go to Sign In</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* FirebaseRecaptchaVerifierModal removed - expo-firebase-recaptcha was deprecated */}
      <KeyboardAvoidingView
        style={{ flex: 1, width: "100%" }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={[styles.scroll, styles.scrollInset]}>
          <View style={styles.header}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <IconSymbol name="gearshape.fill" size={28} color="#3fe1c3" />
              <Text style={styles.title}>Profile Settings</Text>
            </View>
            <Text style={styles.subtitle}>
              Update your profile details.
            </Text>
          </View>

          {loading ? (
            <ActivityIndicator color="#3fe1c3" />
          ) : (
            <>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Full Name *</Text>
                <TextInput
                  value={profile.fullName}
                  onChangeText={(text) => handleChange("fullName", text)}
                  placeholder="Your full name"
                  placeholderTextColor="#6f7d83"
                  style={styles.input}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Email *</Text>
                <TextInput
                  value={profile.email}
                  onChangeText={(text) => handleChange("email", text)}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="you@example.com"
                  placeholderTextColor="#6f7d83"
                  style={styles.input}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  value={profile.phoneNumber}
                  onChangeText={(text) => handleChange("phoneNumber", text)}
                  keyboardType="phone-pad"
                  placeholder="+1 555-123-4567"
                  placeholderTextColor="#6f7d83"
                  style={styles.input}
                />
              </View>
              {verificationId ? (
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Enter SMS Code</Text>
                  <TextInput
                    value={smsCode}
                    onChangeText={setSmsCode}
                    keyboardType="number-pad"
                    placeholder="123456"
                    placeholderTextColor="#6f7d83"
                    style={styles.input}
                  />
                </View>
              ) : null}

              <View style={styles.fieldRow}>
                <View style={[styles.fieldGroup, styles.flexItem]}>
                  <Text style={styles.label}>City</Text>
                  <TextInput
                    value={profile.city}
                    onChangeText={(text) => handleChange("city", text)}
                    placeholder="City"
                    placeholderTextColor="#6f7d83"
                    style={styles.input}
                  />
                </View>
                <View style={[styles.fieldGroup, styles.flexItem]}>
                  <Text style={styles.label}>State</Text>
                  <TextInput
                    value={profile.state}
                    onChangeText={(text) => handleChange("state", text)}
                    placeholder="State"
                    placeholderTextColor="#6f7d83"
                    style={styles.input}
                  />
                </View>
                <View style={[styles.fieldGroup, styles.flexItem]}>
                  <Text style={styles.label}>ZIP</Text>
                  <TextInput
                    value={profile.zip}
                    onChangeText={(text) => handleChange("zip", text)}
                    keyboardType="number-pad"
                    placeholder="12345"
                    placeholderTextColor="#6f7d83"
                    style={styles.input}
                  />
                </View>
              </View>

              {/* Onboarding Preferences Section */}
              {onboardingData && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Career Preferences</Text>
                    {!editingOnboarding && (
                      <Pressable
                        onPress={() => setEditingOnboarding(true)}
                        style={styles.editButton}
                      >
                        <Text style={styles.editButtonText}>Edit</Text>
                      </Pressable>
                    )}
                  </View>

                  {editingOnboarding ? (
                    <View style={styles.editSection}>
                      <Text style={styles.editSectionText}>
                        Click the button below to update your career preferences.
                      </Text>
                      <View style={styles.buttonRow}>
                        <Pressable
                          style={[styles.secondaryButton, { flex: 1 }]}
                          onPress={() => {
                            setEditingOnboarding(false);
                            setError("");
                          }}
                        >
                          <Text style={styles.secondaryButtonLabel}>Cancel</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.primaryButton, { flex: 1, marginTop: 0 }]}
                          onPress={() => router.push("/onboarding")}
                          disabled={savingOnboarding}
                        >
                          {savingOnboarding ? (
                            <ActivityIndicator color="#08090d" />
                          ) : (
                            <Text style={styles.primaryButtonLabel}>Edit Preferences</Text>
                          )}
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Career Goal:</Text>
                        <Text style={styles.infoValue}>{onboardingData.careerGoal}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Job Fields:</Text>
                        <Text style={styles.infoValue}>
                          {onboardingData.jobFields.length > 0
                            ? onboardingData.jobFields.join(", ")
                            : "None selected"}
                        </Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Resume Status:</Text>
                        <Text style={styles.infoValue}>{onboardingData.resumeStatus}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Help Needed:</Text>
                        <Text style={styles.infoValue}>
                          {onboardingData.helpNeeded.length > 0
                            ? onboardingData.helpNeeded.join(", ")
                            : "None selected"}
                        </Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Availability:</Text>
                        <Text style={styles.infoValue}>{onboardingData.availability}</Text>
                      </View>
                    </>
                  )}
                </View>
              )}

              {error ? <Text style={styles.error}>{error}</Text> : null}
              {message ? <Text style={styles.info}>{message}</Text> : null}

              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && !saving ? { opacity: 0.9 } : null,
                ]}
                disabled={saving}
                onPress={handleSave}
              >
                {saving ? (
                  <ActivityIndicator color="#08090d" />
                ) : (
                  <Text style={styles.primaryButtonLabel}>Save Changes</Text>
                )}
              </Pressable>

              <View style={styles.actionRow}>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={handleResetPassword}
                >
                  <Text style={styles.secondaryButtonLabel}>Reset Your Password</Text>
                </Pressable>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={handleSendVerificationCode}
                  disabled={sendingCode}
                >
                  {sendingCode ? (
                    <ActivityIndicator color="#3fe1c3" />
                  ) : (
                    <Text style={styles.secondaryButtonLabel}>
                      {verificationId ? "Resend Code" : "Verify Phone Number"}
                    </Text>
                  )}
                </Pressable>
              </View>

              {verificationId ? (
                <Pressable
                  style={[
                    styles.primaryButton,
                    verifyingCode ? { opacity: 0.9 } : null,
                  ]}
                  onPress={handleConfirmCode}
                  disabled={verifyingCode}
                >
                  {verifyingCode ? (
                    <ActivityIndicator color="#08090d" />
                  ) : (
                    <Text style={styles.primaryButtonLabel}>Submit Code</Text>
                  )}
                </Pressable>
              ) : null}

              <Pressable style={styles.signOutButton} onPress={handleSignOut}>
                <Text style={styles.signOutLabel}>Sign Out</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#08090d",
    paddingHorizontal: 18,
    paddingTop: 24,
  },
  scroll: {
    paddingBottom: 32,
    gap: 14,
  },
  scrollInset: {
    paddingRight: 10, // gives the scrollbar its own gutter so it doesn't overlap inputs
  },
  header: {
    gap: 6,
  },
  title: {
    fontSize: 28,
    color: "white",
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 15,
    color: "#b0c7c0",
  },
  fieldGroup: {
    gap: 8,
    marginTop: 6,
  },
  label: {
    color: "#d7e0de",
    fontSize: 14,
  },
  input: {
    backgroundColor: "#11141b",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "white",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  fieldRow: {
    flexDirection: "row",
    gap: 10,
  },
  flexItem: {
    flex: 1,
  },
  primaryButton: {
    backgroundColor: "#3fe1c3",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#08090d",
  },
  secondaryButton: {
    borderColor: "#3fe1c3",
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    flex: 1,
  },
  secondaryButtonLabel: {
    color: "#3fe1c3",
    fontWeight: "600",
    fontSize: 14,
    textAlign: "center",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  signOutButton: {
    marginTop: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  signOutLabel: {
    color: "#f55c7a",
    fontWeight: "600",
  },
  error: {
    color: "#ff7b7b",
    fontSize: 14,
    marginTop: 4,
  },
  info: {
    color: "#3fe1c3",
    fontSize: 14,
    marginTop: 4,
  },
  section: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "white",
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editButtonText: {
    color: "#3fe1c3",
    fontSize: 14,
    fontWeight: "600",
  },
  infoRow: {
    flexDirection: "row",
    marginTop: 12,
    gap: 8,
  },
  infoLabel: {
    color: "#96a3a1",
    fontSize: 14,
    fontWeight: "500",
    minWidth: 100,
  },
  infoValue: {
    color: "white",
    fontSize: 14,
    flex: 1,
  },
  infoBox: {
    backgroundColor: "#11141b",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  infoText: {
    color: "white",
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  editSection: {
    gap: 12,
  },
  editSectionText: {
    color: "#96a3a1",
    fontSize: 14,
    marginBottom: 8,
  },
});
