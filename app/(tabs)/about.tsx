import { Image, ScrollView, StyleSheet, Text } from "react-native";

export default function About() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image
        source={require('../../assets/images/Picture.png')}
        style={styles.image}
        resizeMode="contain"
      />

      <Text style={styles.title}>About Salam Consulting</Text>

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
        improve your organization’s work — Salam is here to help.
      </Text>

      <Text style={styles.body}>
        I believe that a client is a friend, not a transaction.
        We invest in you and continue the journey beyond the job offer.
        We are your permanent source of support.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 22,
    backgroundColor: "#08090d",
  },
  image: {
    width: "100%",
    height: 200,
    borderRadius: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    color: "white",
    fontWeight: "700",
    marginBottom: 16,
  },
  body: {
    fontSize: 16,
    color: "#d0e7df",
    lineHeight: 24,
    marginBottom: 14,
  },
});
