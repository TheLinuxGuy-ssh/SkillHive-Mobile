import { ProfileProvider } from "@/hooks/profileContext";
import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Only update on meaningful auth changes, not token refreshes
        if (
          event === "SIGNED_IN" ||
          event === "SIGNED_OUT" ||
          event === "USER_UPDATED"
        ) {
          setSession(session);
        }
      },
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Still loading — render nothing to prevent flash
    if (session === undefined) return;

    const inAuth = segments[0] === "(auth)";
    const inMain = segments[0] === "main";

    if (!session && inMain) {
      router.replace("/(auth)");
      return;
    }
    if (session && inAuth) {
      router.replace("/main");
      return;
    }
  }, [session, segments]);

  // Block render until session is resolved to prevent route flash
  if (session === undefined) return <View style={{ flex: 1 }} />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ProfileProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="main" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="course/[id]" />
          <Stack.Screen name="profile/[id]" />
        </Stack>
      </ProfileProvider>
    </GestureHandlerRootView>
  );
}
