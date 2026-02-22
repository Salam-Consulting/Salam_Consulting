import { auth, db } from "@/lib/firebase";
import { Redirect, router, Stack } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth, type OnboardingData } from "@/contexts/auth";

const CAREER_GOALS = [
  "Get my first job",
  "Switch careers",
  "Improve my resume",
  "Prepare for interviews",
  "Explore career options",
  "Not sure yet",
];

const JOB_FIELDS = [
  "Technology / IT",
  "Healthcare",
  "Business / Finance",
  "Customer Service / Retail",
  "Government / Public Sector",
  "Trades / Skilled Labor",
  "Education",
  "Engineering",
  "Other",
];

const RESUME_STATUSES = [
  "Yes, I want to upload it now",
  "Yes, but I'll upload it later",
  "No, I need help creating one",
  "Not sure",
];

const HELP_OPTIONS = [
  "Resume improvement",
  "Cover letter writing",
  "Interview preparation",
  "Job search strategy",
  "LinkedIn profile setup",
  "Career direction / choosing a path",
];

const AVAILABILITY_OPTIONS = [
  "Morning",
  "Afternoon",
  "Evening",
  "Weekends",
  "Flexible / Anytime",
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { completeOnboarding, isAuthenticated, onboardingCompleted } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [careerGoal, setCareerGoal] = useState("");
  const [jobFields, setJobFields] = useState<string[]>([]);
  const [resumeStatus, setResumeStatus] = useState("");
  const [helpNeeded, setHelpNeeded] = useState<string[]>([]);
  const [availability, setAvailability] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const [loadingData, setLoadingData] = useState(true);

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Redirect href="/" />;
  }

  // Load existing onboarding data if user is editing
  useEffect(() => {
    const loadExistingData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const userRef = doc(db, "users", user.uid);
        const snapshot = await getDoc(userRef);
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.onboardingData) {
            const existing = data.onboardingData as OnboardingData;
            setCareerGoal(existing.careerGoal || "");
            setJobFields(existing.jobFields || []);
            setResumeStatus(existing.resumeStatus || "");
            setHelpNeeded(existing.helpNeeded || []);
            setAvailability(existing.availability || "");
          }
        }
      } catch (error) {
        console.error("Failed to load existing onboarding data", error);
      } finally {
        setLoadingData(false);
      }
    };

    loadExistingData();
  }, []);

  if (loadingData) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: "#02111E" }]}>
        <ActivityIndicator color="#3fe1c3" size="large" />
      </View>
    );
  }

  const toggleSelection = (
    item: string,
    selectedItems: string[],
    setSelectedItems: (items: string[]) => void,
  ) => {
    if (selectedItems.includes(item)) {
      setSelectedItems(selectedItems.filter((i) => i !== item));
    } else {
      setSelectedItems([...selectedItems, item]);
    }
  };

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  const handleSubmit = async () => {
    if (!careerGoal || !resumeStatus || !availability) {
      return;
    }

    setIsSubmitting(true);
    try {
      const onboardingData: OnboardingData = {
        careerGoal,
        jobFields,
        resumeStatus,
        helpNeeded,
        availability,
      };

      await completeOnboarding(onboardingData);
      router.replace("/services");
    } catch (error) {
      console.error("Failed to complete onboarding", error);
      setIsSubmitting(false); 
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return careerGoal !== "";
      case 2:
        return jobFields.length > 0;
      case 3:
        return resumeStatus !== "";
      case 4:
        return helpNeeded.length > 0;
      case 5:
        return availability !== "";
      default:
        return false;
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepCard}>
      <Text style={styles.question}>
        What is your career goal right now?
      </Text>
      <View style={styles.optionsContainer}>
        {CAREER_GOALS.map((goal) => (
          <Pressable
            key={goal}
            style={[
              styles.option,
              careerGoal === goal && styles.optionSelected,
            ]}
            onPress={() => setCareerGoal(goal)}
          >
            <Text
              style={[
                styles.optionText,
                careerGoal === goal && styles.optionTextSelected,
              ]}
            >
              {goal}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepCard}>
      <Text style={styles.question}>
        Which job fields are you most interested in?
      </Text>
      <Text style={styles.stepSubtitle}>Select all that apply</Text>
      <View style={styles.optionsContainer}>
        {JOB_FIELDS.map((field) => (
          <Pressable
            key={field}
            style={[
              styles.option,
              jobFields.includes(field) && styles.optionSelected,
            ]}
            onPress={() => toggleSelection(field, jobFields, setJobFields)}
          >
            <Text
              style={[
                styles.optionText,
                jobFields.includes(field) && styles.optionTextSelected,
              ]}
            >
              {field}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepCard}>
      <Text style={styles.question}>
        Do you have a resume ready to upload?
      </Text>
      <View style={styles.optionsContainer}>
        {RESUME_STATUSES.map((status) => (
          <Pressable
            key={status}
            style={[
              styles.option,
              resumeStatus === status && styles.optionSelected,
            ]}
            onPress={() => setResumeStatus(status)}
          >
            <Text
              style={[
                styles.optionText,
                resumeStatus === status && styles.optionTextSelected,
              ]}
            >
              {status}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepCard}>
      <Text style={styles.question}>
        What do you need the most help with?
      </Text>
      <Text style={styles.stepSubtitle}>Select all that apply</Text>
      <View style={styles.optionsContainer}>
        {HELP_OPTIONS.map((help) => (
          <Pressable
            key={help}
            style={[
              styles.option,
              helpNeeded.includes(help) && styles.optionSelected,
            ]}
            onPress={() => toggleSelection(help, helpNeeded, setHelpNeeded)}
          >
            <Text
              style={[
                styles.optionText,
                helpNeeded.includes(help) && styles.optionTextSelected,
              ]}
            >
              {help}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const renderStep5 = () => (
    <View style={styles.stepCard}>
      <Text style={styles.question}>
        When are you usually available for coaching?
      </Text>
      <View style={styles.optionsContainer}>
        {AVAILABILITY_OPTIONS.map((option) => (
          <Pressable
            key={option}
            style={[
              styles.option,
              availability === option && styles.optionSelected,
            ]}
            onPress={() => setAvailability(option)}
          >
            <Text
              style={[
                styles.optionText,
                availability === option && styles.optionTextSelected,
              ]}
            >
              {option}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={styles.titleContainer}>
              <View style={styles.iconContainer}>
                <Ionicons name="rocket" size={22} color="#3fe1c3" />
              </View>
              <Text style={styles.headerTitle}>Let's get to know you</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>
            Step {currentStep} of 5
          </Text>
        </View>

        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
        {currentStep === 5 && renderStep5()}

        <View style={styles.buttonContainer}>
          {currentStep > 1 && (
            <Pressable
              style={styles.secondaryButton}
              onPress={handleBack}
            >
              <Text style={styles.secondaryButtonText}>Back</Text>
            </Pressable>
          )}
          {currentStep < 5 ? (
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                (!canProceed() || pressed) && styles.buttonDisabled,
              ]}
              onPress={handleNext}
              disabled={!canProceed()}
            >
              <Text style={styles.primaryButtonText}>Next</Text>
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                (!canProceed() || isSubmitting || pressed) && styles.buttonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!canProceed() || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#02111E" />
              ) : (
                <Text style={styles.primaryButtonText}>Complete</Text>
              )}
            </Pressable>
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
    backgroundColor: "#02111E", // Matched App Dark Theme
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 24, // Consistent spacing between header, card, and buttons
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
    fontSize: 26,
    color: "white",
    fontWeight: "700",
    flexShrink: 1,
  },
  subtitle: {
    fontSize: 15,
    color: "#738A9D",
    lineHeight: 22,
    fontWeight: "600",
  },
  stepCard: {
    backgroundColor: "#112638", // Main Card Container
    borderRadius: 24,
    padding: 24,
    gap: 16,
  },
  question: {
    fontSize: 20,
    fontWeight: "700",
    color: "white",
    lineHeight: 28,
  },
  stepSubtitle: {
    fontSize: 14,
    color: "#8FA8BB",
    marginTop: -8, // Pull closer to the question
  },
  optionsContainer: {
    gap: 12,
    marginTop: 8,
  },
  option: {
    backgroundColor: "#1C3C54", // Input/Button color
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: "transparent",
  },
  optionSelected: {
    backgroundColor: "rgba(63, 225, 195, 0.15)",
    borderColor: "#3fe1c3",
  },
  optionText: {
    fontSize: 15,
    color: "white",
    fontWeight: "500",
  },
  optionTextSelected: {
    color: "#3fe1c3",
    fontWeight: "700",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#3fe1c3",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#02111E",
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "#1C3C54",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
