import { Stack } from "expo-router";
import { openBrowserAsync, WebBrowserPresentationStyle } from "expo-web-browser";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: "#02111E" }} edges={["top", "bottom"]}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={styles.iconContainer}>
              <IconSymbol name="briefcase.fill" size={22} color="#3fe1c3" />
            </View>
            <Text style={styles.title}>Services</Text>
          </View>
          <Text style={styles.subtitle}>
            Choose between Silver, Gold, or Platinum. We have a plan that fits your budget and gives you the support you need until you land the offer you're searching for.
          </Text>
        </View>

        {/* Check out Packages Box */}
        <View style={styles.sectionContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.sectionHeader,
              pressed && { opacity: 0.8 },
            ]}
            onPress={() => toggleSection("packages")}
          >
            <Text style={styles.sectionTitle}>Check out Packages</Text>
            <View style={styles.toggleIconContainer}>
              <Text style={styles.toggleIcon}>
                {expandedSection === "packages" ? "▼" : "▶"}
              </Text>
            </View>
          </Pressable>
          
          {expandedSection === "packages" && (
            <View style={styles.expandedContent}>
              {/* Silver Package */}
              <View style={styles.itemCard}>
                <View style={styles.itemTopRow}>
                  <View style={styles.itemIconWrapper}>
                    <Text style={styles.emoji}>🥈</Text>
                  </View>
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemName}>Salam Silver</Text>
                    <Text style={styles.itemCategory}>Valid for 1 month</Text>
                  </View>
                  <View style={styles.itemPriceContainer}>
                    <Text style={styles.itemPrice}>$300</Text>
                  </View>
                </View>
                <View style={styles.itemBody}>
                  <Text style={styles.itemDescription}>
                    <Text style={styles.boldWhite}>4 weekly 1-hour coaching sessions</Text> covering resume building, interview prep, LinkedIn optimization, offer negotiation, and application management.
                  </Text>
                  <Text style={styles.itemFeature}>Includes access to all Salam events.</Text>
                </View>
                <Pressable
                  style={({ pressed }) => [
                    styles.actionButton,
                    pressed && styles.actionButtonPressed,
                  ]}
                  onPress={() => handleOpenURL(CHECKOUT_URLS.silver)}
                >
                  <Text style={styles.actionButtonText}>Checkout Link</Text>
                </Pressable>
              </View>

              {/* Gold Package */}
              <View style={styles.itemCard}>
                <View style={styles.itemTopRow}>
                  <View style={styles.itemIconWrapper}>
                    <Text style={styles.emoji}>🥇</Text>
                  </View>
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemName}>Salam Gold</Text>
                    <Text style={styles.itemCategory}>Valid for 2 months</Text>
                  </View>
                  <View style={styles.itemPriceContainer}>
                    <Text style={styles.itemPrice}>$480</Text>
                  </View>
                </View>
                <View style={styles.itemBody}>
                  <Text style={styles.itemDescription}>
                    <Text style={styles.boldWhite}>8 weekly 1-hour coaching sessions</Text> covering resume building, interview prep, LinkedIn optimization, offer negotiation, and application management.
                  </Text>
                  <Text style={styles.itemFeature}>Includes access to all Salam events.</Text>
                </View>
                <Pressable
                  style={({ pressed }) => [
                    styles.actionButton,
                    pressed && styles.actionButtonPressed,
                  ]}
                  onPress={() => handleOpenURL(CHECKOUT_URLS.gold)}
                >
                  <Text style={styles.actionButtonText}>Checkout Link</Text>
                </Pressable>
              </View>

              {/* Platinum Package */}
              <View style={styles.itemCard}>
                <View style={styles.itemTopRow}>
                  <View style={styles.itemIconWrapper}>
                    <Text style={styles.emoji}>💎</Text>
                  </View>
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemName}>Salam Platinum</Text>
                    <Text style={styles.itemCategory}>Valid for 3 months</Text>
                  </View>
                  <View style={styles.itemPriceContainer}>
                    <Text style={styles.itemPrice}>$660</Text>
                  </View>
                </View>
                <View style={styles.itemBody}>
                  <Text style={styles.itemDescription}>
                    <Text style={styles.boldWhite}>12 weekly 1-hour coaching sessions</Text> covering resume building, interview prep, LinkedIn optimization, offer negotiation, and application management.
                  </Text>
                  <Text style={styles.itemFeature}>Includes access to all Salam events.</Text>
                </View>
                <Pressable
                  style={({ pressed }) => [
                    styles.actionButton,
                    pressed && styles.actionButtonPressed,
                  ]}
                  onPress={() => handleOpenURL(CHECKOUT_URLS.platinum)}
                >
                  <Text style={styles.actionButtonText}>Checkout Link</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {/* One-Time Services Box */}
        <View style={styles.sectionContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.sectionHeader,
              pressed && { opacity: 0.8 },
            ]}
            onPress={() => toggleSection("services")}
          >
            <Text style={styles.sectionTitle}>One-Time Services</Text>
            <View style={styles.toggleIconContainer}>
              <Text style={styles.toggleIcon}>
                {expandedSection === "services" ? "▼" : "▶"}
              </Text>
            </View>
          </Pressable>
          
          {expandedSection === "services" && (
            <View style={styles.expandedContent}>
              {/* Interview Prep */}
              <View style={styles.itemCard}>
                <View style={styles.itemTopRow}>
                  <View style={styles.itemIconWrapper}>
                    <Text style={styles.emoji}>🎤</Text>
                  </View>
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemName}>Interview Prep</Text>
                  </View>
                  <View style={styles.itemPriceContainer}>
                    <Text style={styles.itemPrice}>$45</Text>
                  </View>
                </View>
                <View style={styles.itemBody}>
                  <Text style={styles.itemDescription}>
                    45-minute mock interview + instant feedback.
                  </Text>
                  <Text style={styles.includesTitle}>Includes:</Text>
                  <View style={styles.includesList}>
                    <Text style={styles.includesItem}>• Salam Consulting Interview Packet</Text>
                    <Text style={styles.includesItem}>• Retrospective call after interview</Text>
                    <Text style={styles.includesItem}>• Next-step recommendations & negotiation tactics</Text>
                  </View>
                </View>
                <Pressable
                  style={({ pressed }) => [
                    styles.actionButton,
                    pressed && styles.actionButtonPressed,
                  ]}
                  onPress={() => handleOpenURL(CHECKOUT_URLS.interviewPrep)}
                >
                  <Text style={styles.actionButtonText}>Book Now</Text>
                </Pressable>
              </View>

              {/* Resume Building */}
              <View style={styles.itemCard}>
                <View style={styles.itemTopRow}>
                  <View style={styles.itemIconWrapper}>
                    <Text style={styles.emoji}>✍️</Text>
                  </View>
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemName}>Resume Building</Text>
                  </View>
                  <View style={styles.itemPriceContainer}>
                    <Text style={styles.itemPrice}>$100</Text>
                  </View>
                </View>
                <View style={styles.itemBody}>
                  <Text style={styles.itemDescription}>
                    Professional, ATS-friendly resume update with personalization.
                  </Text>
                  <Text style={styles.includesTitle}>Includes:</Text>
                  <View style={styles.includesList}>
                    <Text style={styles.includesItem}>• One year of free edits</Text>
                    <Text style={styles.includesItem}>• Job posting recommendations</Text>
                    <Text style={styles.includesItem}>• LinkedIn optimization (headline + About section)</Text>
                  </View>
                </View>
                <Pressable
                  style={({ pressed }) => [
                    styles.actionButton,
                    pressed && styles.actionButtonPressed,
                  ]}
                  onPress={() => handleOpenURL(CHECKOUT_URLS.resumeBuilding)}
                >
                  <Text style={styles.actionButtonText}>Book Now</Text>
                </Pressable>
              </View>

              {/* Career Coaching */}
              <View style={styles.itemCard}>
                <View style={styles.itemTopRow}>
                  <View style={styles.itemIconWrapper}>
                    <Text style={styles.emoji}>🎯</Text>
                  </View>
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemName}>Career Coaching</Text>
                  </View>
                  <View style={styles.itemPriceContainer}>
                    <Text style={styles.itemPrice}>$100</Text>
                  </View>
                </View>
                <View style={styles.itemBody}>
                  <Text style={styles.itemDescription}>
                    1-hour session for career guidance, business building, resume help, interview improvement, or development management.
                  </Text>
                  <Text style={styles.includesTitle}>Includes:</Text>
                  <View style={styles.includesList}>
                    <Text style={styles.includesItem}>• Offline support for resources, application references, and guidance.</Text>
                  </View>
                </View>
                <Pressable
                  style={({ pressed }) => [
                    styles.actionButton,
                    pressed && styles.actionButtonPressed,
                  ]}
                  onPress={() => handleOpenURL(CHECKOUT_URLS.careerCoaching)}
                >
                  <Text style={styles.actionButtonText}>Book Now</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#02111E", // Dark app background matching the image
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 20,
  },
  header: {
    gap: 12,
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#112638",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    color: "white",
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 15,
    color: "#738A9D", // Muted blue-grey for secondary text
    lineHeight: 22,
  },
  sectionContainer: {
    backgroundColor: "#112638", // Operations container background
    borderRadius: 24,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 18,
    color: "white",
    fontWeight: "600",
  },
  toggleIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1C3C54", // Inner accent background
    alignItems: "center",
    justifyContent: "center",
  },
  toggleIcon: {
    fontSize: 14,
    color: "#3fe1c3",
    fontWeight: "700",
  },
  expandedContent: {
    marginTop: 20,
    gap: 16,
  },
  itemCard: {
    backgroundColor: "#133E59", // Inner card background
    borderRadius: 20,
    padding: 18,
    gap: 16,
  },
  itemTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#254D6B",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  emoji: {
    fontSize: 22,
  },
  itemDetails: {
    flex: 1,
    gap: 4,
  },
  itemName: {
    fontSize: 16,
    color: "white",
    fontWeight: "600",
  },
  itemCategory: {
    fontSize: 13,
    color: "#738A9D",
  },
  itemPriceContainer: {
    alignItems: "flex-end",
  },
  itemPrice: {
    fontSize: 18,
    color: "white",
    fontWeight: "700",
  },
  itemBody: {
    gap: 4,
  },
  itemDescription: {
    fontSize: 14,
    color: "#8FA8BB",
    lineHeight: 22,
  },
  boldWhite: {
    color: "white",
    fontWeight: "600",
  },
  itemFeature: {
    fontSize: 13,
    color: "#738A9D",
    marginTop: 4,
  },
  includesTitle: {
    fontSize: 14,
    color: "#3fe1c3",
    fontWeight: "600",
    marginTop: 8,
    marginBottom: 2,
  },
  includesList: {
    gap: 4,
  },
  includesItem: {
    fontSize: 13,
    color: "#8FA8BB",
    lineHeight: 20,
  },
  actionButton: {
    backgroundColor: "#254D6B", // Sleek button matching theme
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 4,
  },
  actionButtonPressed: {
    backgroundColor: "#1C3C54",
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#3fe1c3",
  },
});