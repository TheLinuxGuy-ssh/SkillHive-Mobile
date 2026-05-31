import { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { supabase } from "@/lib/supabase";

export default function RootLayout() {
  const router   = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // Check session on mount so refreshes/cold starts land correctly
    supabase.auth.getSession().then(({ data: { session } }) => {
      const inAuthGroup = segments[0] === "(auth)";

      if (session && inAuthGroup) {
        router.replace("/main");
      } else if (!session && !inAuthGroup) {
        router.replace("/(auth)");
      }
    });

    // Listen for sign in / sign out events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const inAuthGroup = segments[0] === "(auth)";

        if (event === "SIGNED_IN" && session && inAuthGroup) {
          router.replace("/main");
        }

        if (event === "SIGNED_OUT") {
          router.replace("/(auth)");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return <Slot />;
}