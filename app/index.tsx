import { Redirect } from "expo-router";

/** Initial route — registration funnel starts at Welcome. */
export default function Index() {
  return <Redirect href="/welcome" />;
}
