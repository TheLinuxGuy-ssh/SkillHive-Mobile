import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Pressable,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";
import { Text } from "@/components/ui/Text";
import { storyRingGradient } from "@/constants/tokens";
import { useSocialAuth, type SocialAuthStrategy } from "@/hooks/useSocialAuth";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";

export default function SignInScreen() {
  const router = useRouter();
  const { colors, spacing, radii } = useTheme();
  const { handleSocialAuth, isLoading: socialLoading } = useSocialAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  const isLoading = emailLoading || socialLoading;

  const handleEmailLogin = useCallback(async () => {
    if (emailLoading) return;

    if (!email || !password) {
      Alert.alert("Missing fields", "Please enter your email and password.");
      return;
    }
    setEmailLoading(true);

    try {
      console.log("LOGIN START");

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      console.log("LOGIN RESPONSE:", { data, error });

      if (error) {
        throw error;
      }

      if (!data?.session) {
        Alert.alert("Login failed", "No session returned.");
        return;
      }
      Alert.alert("Success", "Logged in successfully!");
    } catch (err: unknown) {
      console.log("LOGIN ERROR:", err);

      const message =
        err instanceof Error ? err.message : "Something went wrong.";

      Alert.alert("Sign-in failed", message);
    } finally {
      setEmailLoading(false);
    }
  }, [email, password, emailLoading]);

  const press = useCallback(
    (provider: SocialAuthStrategy) => {
      if (socialLoading) return;
      handleSocialAuth(provider);
    },
    [handleSocialAuth, socialLoading],
  );

  return (
    <View
      style={[
        { flex: 1, backgroundColor: "#1f1f1f" },
        { paddingVertical: spacing.screen },
      ]}
    >
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
          <View style={{ margin: 5, flex: 1 }}>
            <View style={{ position: "absolute", top: 0, left: 20 }}>
              <Button
                label="<-"
                variant="ghost"
                onPress={() => router.push("/")}
              />
            </View>
            <View style={{ flex: 1, paddingHorizontal: spacing.xl }}>
              <View
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 40,
                }}
              >
                <View
                  style={{
                    width: 104,
                    height: 104,
                    borderRadius: radii.xxl,
                    overflow: "hidden",
                    marginBottom: spacing.xl,
                    shadowColor: colors.tint.primary,
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.32,
                    shadowRadius: 18,
                    elevation: 10,
                  }}
                >
                  <LinearGradient
                    colors={
                      storyRingGradient as unknown as [string, string, string]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      flex: 1,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Image
                      source={require("../../assets/images/skillhive.png")}
                      style={{
                        width: 60,
                        height: 60,
                        tintColor: colors.text.onTint,
                      }}
                      contentFit="contain"
                    />
                  </LinearGradient>
                </View>

                <Text variant="headline" tone="primary" align="center">
                  Sign in to Skillhive
                </Text>

                <Text
                  variant="body"
                  tone="secondary"
                  align="center"
                  style={{ maxWidth: 320, marginTop: spacing.sm }}
                >
                  something
                </Text>
              </View>
              <View style={{ gap: 12, marginBottom: spacing.lg }}>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email"
                  placeholderTextColor={"#ffffff"}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!emailLoading}
                  style={{
                    height: 52,
                    borderWidth: 1,
                    borderColor: colors.border.subtle,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    backgroundColor: colors.surface.primary,
                    color: colors.text.primary,
                  }}
                />

                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor={"#ffffff"}
                  secureTextEntry
                  editable={!emailLoading}
                  style={{
                    height: 52,
                    borderWidth: 1,
                    borderColor: colors.border.subtle,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    backgroundColor: colors.surface.primary,
                    color: colors.text.primary,
                  }}
                />

                <ProviderButton
                  label="Sign in"
                  icon={require("../../assets/images/skillhive.png")}
                  loading={emailLoading}
                  onPress={handleEmailLogin}
                />
              </View>
              <View style={{ marginBottom: spacing.lg }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing.sm,
                    marginBottom: spacing.md,
                  }}
                >
                  <View
                    style={{
                      flex: 1,
                      height: 1,
                      backgroundColor: colors.border.subtle,
                    }}
                  />
                  <Text variant="caption" tone="tertiary" weight="600">
                    Continue with
                  </Text>
                  <View
                    style={{
                      flex: 1,
                      height: 1,
                      backgroundColor: colors.border.subtle,
                    }}
                  />
                </View>
              </View>
              <Text
                variant="caption"
                tone="tertiary"
                align="center"
                style={{ marginBottom: spacing.lg }}
              >
                By continuing you agree to our Terms and Privacy Policy.
              </Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

interface ProviderButtonProps {
  label: string;
  icon: number;
  loading: boolean;
  onPress: () => void;
}

function ProviderButton({
  label,
  icon,
  loading,
  onPress,
}: ProviderButtonProps) {
  const { colors, radii, spacing } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: loading }}
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => ({
        opacity: loading ? 0.6 : pressed ? 0.85 : 1,
      })}
    >
      <Surface
        variant="solid"
        radius={radii.pill}
        style={{
          height: 56,
          paddingHorizontal: spacing.lg,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: spacing.md,
          borderWidth: 1,
          borderColor: colors.border.subtle,
        }}
      >
        {loading ? (
          <ActivityIndicator color={colors.tint.primary} />
        ) : (
          <>
            <Image
              source={icon}
              style={{ width: 22, height: 22 }}
              contentFit="contain"
            />
            <Text variant="subtitle" tone="primary">
              {label}
            </Text>
          </>
        )}
      </Surface>
    </Pressable>
  );
}
