// Redirects to the Explore tab inside (tabs) group
import { Redirect } from "expo-router";
export default function ExploreRedirect() {
  return <Redirect href="/(tabs)/explore" />;
}
