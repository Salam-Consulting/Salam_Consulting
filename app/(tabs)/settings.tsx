import { router, Stack } from "expo-router";
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

import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

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
  const [initialPhone, setInitialPhone] = useState("");
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [editingOnboarding, setEditingOnboarding] = useState(false);
  const [savingOnboarding, setSavingOnboarding] = useState(false);

  const user = auth.currentUser;

  const isValidEmail = useMemo(
    () => /^\S+@\S+\.\S+$/.test(profile.email.trim()),
    [profile.email],
  );

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

      await setDoc(userRef, updates, { merge: true });

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
      <View style={{ flex: 1, backgroundColor: "#02111E", padding: 20, justifyContent: "center" }}>
        <Text style={styles.headerTitle}>Settings</Text>
        <Text style={[styles.subtitle, { marginBottom: 20 }]}>Please sign in to manage your profile.</Text>
        <Pressable style={styles.primaryButton} onPress={() => router.replace("/")}>
          <Text style={styles.primaryButtonLabel}>Go to Sign In</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: "#02111E" }} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.titleContainer}>
                <View style={styles.iconContainer}>
                  <IconSymbol name="gearshape.fill" size={22} color="#3fe1c3" />
                </View>
                <Text style={styles.headerTitle}>Profile Settings</Text>
              </View>
            </View>
            <Text style={styles.subtitle}>
              Update your profile details and preferences
            </Text>
          </View>

          {loading ? (
            <ActivityIndicator color="#3fe1c3" style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.contentCard}>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Full Name *</Text>
                <TextInput
                  value={profile.fullName}
                  onChangeText={(text) => handleChange("fullName", text)}
                  placeholder="Your full name"
                  placeholderTextColor="#738A9D"
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
                  placeholderTextColor="#738A9D"
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
                  placeholderTextColor="#738A9D"
                  style={styles.input}
                />
              </View>

              <View style={styles.fieldRow}>
                <View style={[styles.fieldGroup, styles.flexItem]}>
                  <Text style={styles.label}>City</Text>
                  <TextInput
                    value={profile.city}
                    onChangeText={(text) => handleChange("city", text)}
                    placeholder="City"
                    placeholderTextColor="#738A9D"
                    style={styles.input}
                  />
                </View>
                <View style={[styles.fieldGroup, styles.flexItem]}>
                  <Text style={styles.label}>State</Text>
                  <TextInput
                    value={profile.state}
                    onChangeText={(text) => handleChange("state", text)}
                    placeholder="State"
                    placeholderTextColor="#738A9D"
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
                    placeholderTextColor="#738A9D"
                    style={styles.input}
                  />
                </View>
              </View>

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
                            <ActivityIndicator color="#02111E" />
                          ) : (
                            <Text style={styles.primaryButtonLabel}>Edit Details</Text>
                          )}
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.infoContainer}>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Goal:</Text>
                        <Text style={styles.infoValue}>{onboardingData.careerGoal}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Fields:</Text>
                        <Text style={styles.infoValue}>
                          {onboardingData.jobFields.length > 0
                            ? onboardingData.jobFields.join(", ")
                            : "None selected"}
                        </Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Resume:</Text>
                        <Text style={styles.infoValue}>{onboardingData.resumeStatus}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Help:</Text>
                        <Text style={styles.infoValue}>
                          {onboardingData.helpNeeded.length > 0
                            ? onboardingData.helpNeeded.join(", ")
                            : "None selected"}
                        </Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Avail:</Text>
                        <Text style={styles.infoValue}>{onboardingData.availability}</Text>
                      </View>
                    </View>
                  )}
                </View>
              )}

              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && !saving ? { opacity: 0.85 } : null,
                  styles.saveChangesButton,
                ]}
                disabled={saving}
                onPress={handleSave}
              >
                {saving ? (
                  <ActivityIndicator color="#02111E" />
                ) : (
                  <Text style={styles.primaryButtonLabel}>Save Changes</Text>
                )}
              </Pressable>

              {error ? <Text style={styles.error}>{error}</Text> : null}
              {message ? <Text style={styles.info}>{message}</Text> : null}

              <View style={styles.buttonStack}>
                <Pressable
                  style={({ pressed }) => [
                    styles.resetPasswordButton,
                    pressed && styles.resetPasswordButtonPressed,
                  ]}
                  onPress={handleResetPassword}
                >
                  <Text style={styles.secondaryButtonLabel}>Reset Password</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.signOutButton,
                    pressed && styles.signOutButtonPressed,
                  ]}
                  onPress={handleSignOut}
                >
                  <Ionicons name="log-out-outline" size={20} color="#FF453A" />
                  <Text style={styles.signOutLabel}>Sign Out</Text>
                </Pressable>
              </View>

            </View>
          )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 20,
  },
  header: {
    gap: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#112638",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 28,
    color: "white",
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 15,
    color: "#738A9D",
    lineHeight: 22,
  },
  contentCard: {
    backgroundColor: "#112638",
    borderRadius: 24,
    padding: 24,
    gap: 16,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    color: "#8FA8BB",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 4,
  },
  input: {
    backgroundColor: "#1C3C54",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "white",
    fontSize: 15,
  },
  fieldRow: {
    flexDirection: "row",
    gap: 12,
  },
  flexItem: {
    flex: 1,
  },
  primaryButton: {
    backgroundColor: "#3fe1c3",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  saveChangesButton: {
    marginTop: 0,
  },
  primaryButtonLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#02111E",
  },
  secondaryButton: {
    backgroundColor: "#1C3C54",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
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
    gap: 12,
    marginTop: 8,
  },
  buttonStack: {
    gap: 12,
  },
  resetPasswordButton: {
    backgroundColor: "#254D6B",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  resetPasswordButtonPressed: {
    backgroundColor: "#1C3C54",
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    backgroundColor: "rgba(255, 69, 58, 0.1)",
    borderRadius: 14,
  },
  signOutButtonPressed: {
    backgroundColor: "rgba(255, 69, 58, 0.2)",
  },
  signOutLabel: {
    color: "#FF453A",
    fontWeight: "600",
    fontSize: 15,
  },
  error: {
    color: "#FF453A",
    fontSize: 14,
    textAlign: "center",
  },
  info: {
    color: "#3fe1c3",
    fontSize: 14,
    textAlign: "center",
  },
  section: {
    marginTop: 16,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#1C3C54",
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
    backgroundColor: "rgba(63, 225, 195, 0.1)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editButtonText: {
    color: "#3fe1c3",
    fontSize: 13,
    fontWeight: "600",
  },
  infoContainer: {
    backgroundColor: "#1C3C54",
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  infoLabel: {
    color: "#8FA8BB",
    fontSize: 14,
    fontWeight: "500",
    width: 60,
  },
  infoValue: {
    color: "white",
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  editSection: {
    backgroundColor: "#1C3C54",
    borderRadius: 16,
    padding: 16,
  },
  editSectionText: {
    color: "#8FA8BB",
    fontSize: 14,
    lineHeight: 20,
  },
});
