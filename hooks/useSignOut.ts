import { useCustomAlert } from "@/hooks/useCustomAlert";
import { supabase } from "@/lib/supabase";
import { useCallback, useState } from "react";

export const useSignOut = () => {
  const {
    showError,
    showSignOutConfirmation,
    alertConfig,
    isVisible,
    hideAlert,
  } = useCustomAlert();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const confirmAndSignOut = useCallback(async () => {
    try {
      setIsSigningOut(true);
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Sign-out failed", e);
      showError(
        "Sign-out failed",
        "Something blocked the sign-out. Try once more.",
      );
    } finally {
      setIsSigningOut(false);
    }
  }, [supabase.auth, showError]);

  const handleSignOut = useCallback(() => {
    if (isSigningOut) return;

    showSignOutConfirmation(
      "Sign out?",
      "You'll need to sign in again to read your feed.",
      confirmAndSignOut,
    );
  }, [isSigningOut, confirmAndSignOut, showSignOutConfirmation]);

  return {
    handleSignOut,
    isSigningOut,
    alertConfig,
    isVisible,
    hideAlert,
  };
};
