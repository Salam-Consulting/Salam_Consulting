import { openBrowserAsync, WebBrowserPresentationStyle } from "expo-web-browser";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";

const CHECKOUT_URLS = {
  silver: "https://www.salam-consulting.com/pricing-plans/checkout-1?planId=f0184363-fb77-42f0-8a36-374c0c834890&checkoutFlowId=8acc0201-8f8b-4cb6-938f-c3c4a406f58e",
  gold: "https://www.salam-consulting.com/pricing-plans/checkout-1?planId=48d574d0-dcb7-4369-a99a-b0beafb4f916&checkoutFlowId=c1797c86-925c-4ee2-8f6d-201ac62dfdd0",
  platinum: "https://www.salam-consulting.com/pricing-plans/checkout-1?planId=965305b8-b21c-41a5-85a8-655b249e0ea9&checkoutFlowId=cf272919-caa7-491d-be93-06e1a355ddd1",
  resumeBuilding: "https://www.salam-consulting.com/booking-calendar/resume-building",
  interviewPrep: "https://www.salam-consulting.com/booking-calendar/interview-prep",
  careerCoaching: "https://www.salam-consulting.com/booking-calendar/career-coaching-1",
};

const handleOpenURL = async (url: string) => {
  try {
    await openBrowserAsync(url, {
      presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
    });
  } catch (error) {
    console.error("Error opening URL:", error);
  }
};

export default function Services() {
  const [expandedSection, setExpandedSection] = useState<"packages" | "services" | null>(null);

  const toggleSection = (section: "packages" | "services") => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <IconSymbol name="briefcase.fill" size={28} color="#3fe1c3" />
            <Text style={styles.title}>Services</Text>
          </View>
          <Text style={styles.subtitle}>
            Choose between Silver, Gold, or Platinum. We have a plan that fits your budget and gives you the support you need until you land the offer you're searching for.
          </Text>
        </View>

        {/* Check out Packages Box */}
        <Pressable
          style={({ pressed }) => [
            styles.mainBox,
            expandedSection === "packages" && styles.mainBoxExpanded,
            pressed && { opacity: 0.9 },
          ]}
          onPress={() => toggleSection("packages")}
        >
          <View style={styles.mainBoxHeader}>
            <Text style={styles.mainBoxTitle}>Check out Packages</Text>
            <Text style={styles.mainBoxIcon}>
              {expandedSection === "packages" ? "▼" : "▶"}
            </Text>
          </View>
          {expandedSection === "packages" && (
            <View style={styles.expandedContent}>
              {/* Silver Package */}
              <View style={styles.packageCard}>
                <Text style={styles.packageEmoji}>🥈</Text>
                <Text style={styles.packageName}>Salam Silver Package — $300</Text>
                <Text style={styles.packageDescription}>
                  <Text style={styles.bold}>4 weekly 1-hour coaching sessions</Text> covering resume building, interview prep, LinkedIn optimization, offer negotiation, and application management.
                </Text>
                <Text style={styles.packageFeature}>Includes access to all Salam events.</Text>
                <Text style={styles.packageValidity}>Valid for 1 month.</Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.checkoutButton,
                    pressed && { opacity: 0.9 },
                  ]}
                  onPress={() => handleOpenURL(CHECKOUT_URLS.silver)}
                >
                  <Text style={styles.checkoutButtonText}>Checkout Link</Text>
                </Pressable>
              </View>

              {/* Gold Package */}
              <View style={styles.packageCard}>
                <Text style={styles.packageEmoji}>🥇</Text>
                <Text style={styles.packageName}>Salam Gold Package — $480</Text>
                <Text style={styles.packageDescription}>
                  <Text style={styles.bold}>8 weekly 1-hour coaching sessions</Text> covering resume building, interview prep, LinkedIn optimization, offer negotiation, and application management.
                </Text>
                <Text style={styles.packageFeature}>Includes access to all Salam events.</Text>
                <Text style={styles.packageValidity}>Valid for 2 months.</Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.checkoutButton,
                    pressed && { opacity: 0.9 },
                  ]}
                  onPress={() => handleOpenURL(CHECKOUT_URLS.gold)}
                >
                  <Text style={styles.checkoutButtonText}>Checkout Link</Text>
                </Pressable>
              </View>

              {/* Platinum Package */}
              <View style={styles.packageCard}>
                <Text style={styles.packageEmoji}>💎</Text>
                <Text style={styles.packageName}>Salam Platinum Package — $660</Text>
                <Text style={styles.packageDescription}>
                  <Text style={styles.bold}>12 weekly 1-hour coaching sessions</Text> covering resume building, interview prep, LinkedIn optimization, offer negotiation, and application management.
                </Text>
                <Text style={styles.packageFeature}>Includes access to all Salam events.</Text>
                <Text style={styles.packageValidity}>Valid for 3 months.</Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.checkoutButton,
                    pressed && { opacity: 0.9 },
                  ]}
                  onPress={() => handleOpenURL(CHECKOUT_URLS.platinum)}
                >
                  <Text style={styles.checkoutButtonText}>Checkout Link</Text>
                </Pressable>
              </View>
            </View>
          )}
        </Pressable>

        {/* One-Time Services Box */}
        <Pressable
          style={({ pressed }) => [
            styles.mainBox,
            expandedSection === "services" && styles.mainBoxExpanded,
            pressed && { opacity: 0.9 },
          ]}
          onPress={() => toggleSection("services")}
        >
          <View style={styles.mainBoxHeader}>
            <Text style={styles.mainBoxTitle}>One-Time Services</Text>
            <Text style={styles.mainBoxIcon}>
              {expandedSection === "services" ? "▼" : "▶"}
            </Text>
          </View>
          {expandedSection === "services" && (
            <View style={styles.expandedContent}>
              {/* Interview Prep */}
              <View style={styles.serviceCard}>
                <Text style={styles.serviceEmoji}>🎤</Text>
                <Text style={styles.serviceName}>Interview Prep — $45</Text>
                <Text style={styles.serviceDescription}>
                  45-minute mock interview + instant feedback.
                </Text>
                <Text style={styles.serviceIncludesTitle}>Includes:</Text>
                <View style={styles.serviceIncludesList}>
                  <Text style={styles.serviceIncludesItem}>• Salam Consulting Interview Packet</Text>
                  <Text style={styles.serviceIncludesItem}>• Retrospective call after interview</Text>
                  <Text style={styles.serviceIncludesItem}>• Next-step recommendations & negotiation tactics</Text>
                </View>
                <Pressable
                  style={({ pressed }) => [
                    styles.bookButton,
                    pressed && { opacity: 0.9 },
                  ]}
                  onPress={() => handleOpenURL(CHECKOUT_URLS.interviewPrep)}
                >
                  <Text style={styles.bookButtonText}>Book Now</Text>
                </Pressable>
              </View>
              {/* Resume Building */}
              <View style={styles.serviceCard}>
                <Text style={styles.serviceEmoji}>✍️</Text>
                <Text style={styles.serviceName}>Resume Building — $100</Text>
                <Text style={styles.serviceDescription}>
                  Professional, ATS-friendly resume update with personalization.
                </Text>
                <Text style={styles.serviceIncludesTitle}>Includes:</Text>
                <View style={styles.serviceIncludesList}>
                  <Text style={styles.serviceIncludesItem}>• One year of free edits</Text>
                  <Text style={styles.serviceIncludesItem}>• Job posting recommendations</Text>
                  <Text style={styles.serviceIncludesItem}>• LinkedIn optimization (headline + About section)</Text>
                </View>
                <Pressable
                  style={({ pressed }) => [
                    styles.bookButton,
                    pressed && { opacity: 0.9 },
                  ]}
                  onPress={() => handleOpenURL(CHECKOUT_URLS.resumeBuilding)}
                >
                  <Text style={styles.bookButtonText}>Book Now</Text>
                </Pressable>
              </View>

              {/* Career Coaching */}
              <View style={styles.serviceCard}>
                <Text style={styles.serviceEmoji}>🎯</Text>
                <Text style={styles.serviceName}>Career Coaching — $100</Text>
                <Text style={styles.serviceDescription}>
                  1-hour session for career guidance, business building, resume help, interview improvement, or development management.
                </Text>
                <Text style={styles.serviceIncludesTitle}>Includes:</Text>
                <Text style={styles.serviceIncludesItem}>
                  Offline support for resources, application references, and guidance.
                </Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.bookButton,
                    pressed && { opacity: 0.9 },
                  ]}
                  onPress={() => handleOpenURL(CHECKOUT_URLS.careerCoaching)}
                >
                  <Text style={styles.bookButtonText}>Book Now</Text>
                </Pressable>
              </View>
            </View>
          )}
        </Pressable>
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
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 32,
    gap: 20,
  },
  header: {
    gap: 8,
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontSize: 28,
    color: "white",
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 15,
    color: "#b0c7c0",
    lineHeight: 22,
  },
  mainBox: {
    backgroundColor: "#11141b",
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: "rgba(63, 225, 195, 0.3)",
    overflow: "hidden",
  },
  mainBoxExpanded: {
    borderColor: "#3fe1c3",
  },
  mainBoxHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mainBoxTitle: {
    fontSize: 22,
    color: "white",
    fontWeight: "700",
  },
  mainBoxIcon: {
    fontSize: 18,
    color: "#3fe1c3",
    fontWeight: "700",
  },
  expandedContent: {
    marginTop: 20,
    gap: 16,
  },
  packageCard: {
    backgroundColor: "#08090d",
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    gap: 12,
  },
  packageEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  packageName: {
    fontSize: 20,
    color: "white",
    fontWeight: "700",
  },
  packageDescription: {
    fontSize: 15,
    color: "#d7e0de",
    lineHeight: 22,
  },
  bold: {
    fontWeight: "600",
  },
  packageFeature: {
    fontSize: 14,
    color: "#b0c7c0",
    marginTop: 4,
  },
  packageValidity: {
    fontSize: 14,
    color: "#b0c7c0",
  },
  checkoutButton: {
    backgroundColor: "#3fe1c3",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  checkoutButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#08090d",
  },
  serviceCard: {
    backgroundColor: "#08090d",
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    gap: 12,
  },
  serviceEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 20,
    color: "white",
    fontWeight: "700",
  },
  serviceDescription: {
    fontSize: 15,
    color: "#d7e0de",
    lineHeight: 22,
  },
  serviceIncludesTitle: {
    fontSize: 15,
    color: "#3fe1c3",
    fontWeight: "600",
    marginTop: 4,
  },
  serviceIncludesList: {
    gap: 6,
    marginTop: 4,
  },
  serviceIncludesItem: {
    fontSize: 14,
    color: "#b0c7c0",
    lineHeight: 20,
  },
  bookButton: {
    borderColor: "#3fe1c3",
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#3fe1c3",
  },
});
