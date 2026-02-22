import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router"; // Added this to control the hidden header
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function About() {
  const insets = useSafeAreaInsets();

  return (
    <>
      {/* This violently kills the hidden blank background layout from the parent router */}
      <Stack.Screen options={{ headerShown: false }} />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          // Start exactly at the notch and pad the bottom
          { paddingTop: insets.top, paddingBottom: insets.bottom + 40 }
        ]}
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
      >
        {/* Standardized App Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={styles.titleContainer}>
              <View style={styles.iconContainer}>
                <Ionicons name="information-circle" size={22} color="#3fe1c3" />
              </View>
              <Text style={styles.headerTitle}>About Us</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>
            Learn more about our mission and founder
          </Text>
        </View>

        <View style={styles.contentCard}>
          <View style={styles.imageWrapper}>
            <Image
              source={require('../../assets/images/Picture.png')}
              style={styles.image}
              resizeMode="cover"
            />
          </View>

          <Text style={styles.title}>Salam Consulting</Text>

          <Text style={styles.body}>
            Hi! I am Shahamat Chowdhury, founder of Salam Consulting.
            I have spent the past 6 years of my career building experiences
            at numerous Fortune 500s like Capital One, BAE Systems, and
            Northrop Grumman to enhance the employee life.
          </Text>

          <Text style={styles.body}>
            After completing my master's in Organizational Development &
            Knowledge Management from George Mason University, I began my
            career in coaching. Since starting Salam Consulting in 2024,
            I have helped over 700 professionals start their business, find
            their next role, earn a promotion, or improve their life.
          </Text>

          <Text style={styles.body}>
            My mission at Salam is simple — improving your experience in your own
            life and enabling you to make the best decisions doing what you enjoy.
          </Text>

          <Text style={styles.body}>
            Whether you want to start a business, land your next job, or
            improve your organization's work — Salam is here to help.
          </Text>

          <Text style={styles.body}>
            I believe that a client is a friend, not a transaction.
            We invest in you and continue the journey beyond the job offer.
            We are your permanent source of support.
          </Text>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: "#02111E", // Moved background color directly to the scroll view
  },
  scrollContent: {
    paddingHorizontal: 20,
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
  },
  imageWrapper: {
    alignItems: "center",
    marginBottom: 24,
  },
  image: {
    width: 200, 
    height: 300,
    borderRadius: 30,
    backgroundColor: "#1C3C54", 
  },
  title: {
    fontSize: 22,
    color: "white",
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  body: {
    fontSize: 15,
    color: "#8FA8BB", 
    lineHeight: 24,
    marginBottom: 16,
  },
});
