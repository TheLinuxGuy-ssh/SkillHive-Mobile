import { Feather } from "@expo/vector-icons";
import React, { memo } from "react";

import CustomAlert from "@/components/CustomAlert";
import { IconButton } from "@/components/ui/IconButton";
import { useSignOut } from "@/hooks/useSignOut";
import { useTheme } from "@/hooks/useTheme";

/**
 * Header sign-out affordance.
 * Routes through the shared confirmation alert so the destructive
 * action stays one-tap-with-confirmation everywhere it appears.
 */
function SignOutButtonImpl() {
  const { colors } = useTheme();
  const { handleSignOut, isSigningOut, alertConfig, isVisible, hideAlert } =
    useSignOut();

  return (
    <>
      <IconButton
        accessibilityLabel="Sign out"
        onPress={handleSignOut}
        disabled={isSigningOut}
        variant="filled"
      >
        <Feather name="log-out" size={18} color={colors.text.secondary} />
      </IconButton>

      {alertConfig ? (
        <CustomAlert
          visible={isVisible}
          title={alertConfig.title}
          message={alertConfig.message}
          buttons={alertConfig.buttons}
          type={alertConfig.type}
          onDismiss={hideAlert}
        />
      ) : null}
    </>
  );
}

export const SignOutButton = memo(SignOutButtonImpl);
SignOutButton.displayName = "SignOutButton";

export default SignOutButton;
