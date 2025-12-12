import { auth, db } from "@/lib/firebase";
import { Redirect, router } from "expo-router";
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

  // Allow editing even if onboarding is completed (user can come from settings)
  // Only redirect if coming from initial login flow

  if (loadingData) {
    return (
      <View style={styles.container}>
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
      router.replace("/(tabs)");
    } catch (error) {
      console.error("Failed to complete onboarding", error);
      setIsSubmitting(false); // Reset on error so user can try again
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
    <View style={styles.stepContainer}>
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
    <View style={styles.stepContainer}>
      <Text style={styles.question}>
        Which job fields are you most interested in?
      </Text>
      <Text style={styles.subtitle}>Select all that apply</Text>
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
    <View style={styles.stepContainer}>
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
    <View style={styles.stepContainer}>
      <Text style={styles.question}>
        What do you need the most help with?
      </Text>
      <Text style={styles.subtitle}>Select all that apply</Text>
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
    <View style={styles.stepContainer}>
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
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Let's get to know you</Text>
          <Text style={styles.stepIndicator}>
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
              style={[styles.button, styles.backButton]}
              onPress={handleBack}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </Pressable>
          )}
          {currentStep < 5 ? (
            <Pressable
              style={[
                styles.button,
                styles.nextButton,
                !canProceed() && styles.buttonDisabled,
              ]}
              onPress={handleNext}
              disabled={!canProceed()}
            >
              <Text style={styles.nextButtonText}>Next</Text>
            </Pressable>
          ) : (
            <Pressable
              style={[
                styles.button,
                styles.submitButton,
                (!canProceed() || isSubmitting) && styles.buttonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!canProceed() || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#08090d" />
              ) : (
                <Text style={styles.submitButtonText}>Complete</Text>
              )}
            </Pressable>
          )}
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
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 40,
    paddingBottom: 60,
  },
  header: {
    marginBottom: 32,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "white",
    marginBottom: 8,
  },
  stepIndicator: {
    fontSize: 14,
    color: "#96a3a1",
  },
  stepContainer: {
    gap: 20,
  },
  question: {
    fontSize: 20,
    fontWeight: "600",
    color: "white",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#96a3a1",
    marginBottom: 16,
  },
  optionsContainer: {
    gap: 12,
  },
  option: {
    backgroundColor: "#11141b",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  optionSelected: {
    backgroundColor: "#3fe1c3",
    borderColor: "#3fe1c3",
  },
  optionText: {
    fontSize: 16,
    color: "white",
  },
  optionTextSelected: {
    color: "#08090d",
    fontWeight: "600",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 32,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  backButton: {
    backgroundColor: "#11141b",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  nextButton: {
    backgroundColor: "#3fe1c3",
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#08090d",
  },
  submitButton: {
    backgroundColor: "#3fe1c3",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#08090d",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

