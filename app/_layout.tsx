/**
 * app/_layout.tsx
 *
 * Changes from original:
 *  1. Wrap everything in <RoomSessionProvider>  (◆ PiP)
 *  2. Render <GlobalPiPWindow /> as a floating sibling of <Stack>  (◆ PiP)
 *
 * Search "◆ PiP" for every touched line.
 */

import { ProfileProvider } from "@/hooks/profileContext";
import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemeProvider } from "@/hooks/useTheme";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";

// ◆ PiP
import { RoomSessionProvider } from "@/hooks/RoomSessionContext";
import { GlobalPiPWindow } from "@/components/GlobalPiPWindow";

export const unstable_settings = {
  initialRouteName: "main",
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const router   = useRouter();
  const segments = useSegments();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "USER_UPDATED"
      ) {
        setSession(session);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === undefined) return;

    const inAuth = segments[0] === "(auth)";

    if (session === null && !inAuth) {
      router.replace("/(auth)");
    } else if (session && inAuth) {
      router.replace("/main");
    }

    SplashScreen.hideAsync();
  }, [session, segments]);

  if (session === undefined) {
    return <View style={{ flex: 1, backgroundColor: "#000000" }} />;
  }

  return (
    <ProfileProvider>
      <ThemeProvider>
        {/* ◆ PiP — RoomSessionProvider wraps everything so any screen can read room state */}
        <RoomSessionProvider>
          <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#000000" }}>
            <BottomSheetModalProvider>
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: "none",
                }}
              >
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="main" />
                <Stack.Screen name="settings" />
                <Stack.Screen name="course/[id]" />
                <Stack.Screen name="web" />
                <Stack.Screen name="profile/[id]" />
                <Stack.Screen
                  name="rooms/[roomName]"
                  options={{ gestureEnabled: false }}
                />
              </Stack>

              {/* ◆ PiP — global floating window; renders above the Stack, below nothing */}
              <GlobalPiPWindow />
            </BottomSheetModalProvider>
          </GestureHandlerRootView>
        </RoomSessionProvider>
      </ThemeProvider>
    </ProfileProvider>
  );
}