import { Tabs } from "expo-router";
import { LinkNav } from "./tabs";

export default function Layout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      initialRouteName="index"
      tabBar={(props) => <LinkNav {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="About" options={{ title: "Learn" }} />
      <Tabs.Screen name="Chat" options={{ title: "Chat" }} />
    </Tabs>
  );
}
