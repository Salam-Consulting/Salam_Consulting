import { Redirect } from "expo-router";

export default function LoadingRoute() {
  // Immediately redirect to login - no loading screen
  return <Redirect href="/services" />;
}
