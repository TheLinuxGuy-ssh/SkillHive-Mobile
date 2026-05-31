import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { Text } from "@/components/ui/Text";
import { useSocialAuth, type SocialAuthStrategy } from "@/hooks/useSocialAuth";
import { supabase } from "@/lib/supabase";

// ─── Design tokens ────────────────────────────────────────────────────────────
const VOID        = "#000000";
const SURFACE     = "#0C0C0C";
const BORDER      = "#2A2A28";
const BORDER_DIM  = "#1E1E1C";

// Text — proper contrast hierarchy
const TEXT_PRIMARY   = "#F0F0EE";   // headings, typed input
const TEXT_SECONDARY = "#888886";   // provider labels, subtext
const TEXT_TERTIARY  = "#666664";   // field labels, forgot link
const TEXT_MUTED     = "#444442";   // OR divider, legal
const TEXT_GHOST     = "#333331";   // placeholder text inside inputs

const ACCENT     = "#E8FF47";
const ACCENT_DIM = "rgba(232,255,71,0.07)";
const ACCENT_MID = "rgba(232,255,71,0.13)";

// ─── Back Button ──────────────────────────────────────────────────────────────
function BackButton({ onPress }: { onPress: () => void }) {
  const scale       = useSharedValue(1);
  const borderColor = useSharedValue(BORDER);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderColor: borderColor.value,
  }));

  return (
    <Pressable
      accessibilityLabel="Go back"
      onPress={onPress}
      onPressIn={() => {
        scale.value       = withSpring(0.92, { damping: 20, stiffness: 400 });
        borderColor.value = withTiming(ACCENT, { duration: 150 });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      }}
      onPressOut={() => {
        scale.value       = withSpring(1, { damping: 20, stiffness: 400 });
        borderColor.value = withTiming(BORDER, { duration: 300 });
      }}
    >
      <Animated.View style={[styles.backButton, animStyle]}>
        <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
          <Path
            d="M9 2L4 7L9 12"
            stroke={TEXT_SECONDARY}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Animated.View>
    </Pressable>
  );
}

// ─── Identity Badge ───────────────────────────────────────────────────────────
function IdentityBadge() {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 20000, easing: Easing.linear }),
      -1,
      false,
    );
  }, []);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View style={styles.badgeWrapper}>
      <Animated.View style={[styles.badgeRingOuter, spinStyle]} />
      <View style={styles.badgeRingInner} />
      <View style={styles.badgeCore}>
        <Text style={styles.badgeMono}>SH</Text>
      </View>
      <View style={styles.badgeDot} />
    </View>
  );
}

// ─── Staggered fade-up wrapper ────────────────────────────────────────────────
function FadeUp({
  delay,
  children,
  style,
}: {
  delay: number;
  children: React.ReactNode;
  style?: object;
}) {
  const fade = useSharedValue(0);
  const y    = useSharedValue(10);

  useEffect(() => {
    fade.value = withDelay(delay, withTiming(1, { duration: 400 }));
    y.value    = withDelay(delay, withTiming(0, { duration: 420, easing: Easing.out(Easing.quad) }));
  }, []);

  const anim = useAnimatedStyle(() => ({
    opacity:   fade.value,
    transform: [{ translateY: y.value }],
  }));

  return <Animated.View style={[anim, style]}>{children}</Animated.View>;
}

// ─── HUD Input Field ──────────────────────────────────────────────────────────
function HudInput({
  label,
  placeholder,
  tag,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  textContentType,
  autoCapitalize,
  editable,
}: {
  label: string;
  placeholder: string;
  tag: string;
  value: string;
  onChangeText: (v: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: any;
  textContentType?: any;
  autoCapitalize?: any;
  editable?: boolean;
}) {
  const borderColor = useSharedValue(BORDER);
  const bgColor     = useSharedValue(SURFACE);

  const onFocus = () => {
    borderColor.value = withTiming(ACCENT, { duration: 180 });
    bgColor.value     = withTiming("#0F0F0D", { duration: 180 });
  };
  const onBlur = () => {
    borderColor.value = withTiming(BORDER, { duration: 300 });
    bgColor.value     = withTiming(SURFACE, { duration: 300 });
  };

  const wrapperStyle = useAnimatedStyle(() => ({
    borderColor:     borderColor.value,
    backgroundColor: bgColor.value,
  }));

  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Animated.View style={[styles.inputWrapper, wrapperStyle]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={TEXT_GHOST}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          textContentType={textContentType}
          autoCapitalize={autoCapitalize ?? "none"}
          editable={editable ?? true}
          onFocus={onFocus}
          onBlur={onBlur}
          style={styles.inputText}
        />
        <Text style={styles.inputTag}>{tag}</Text>
      </Animated.View>
    </View>
  );
}

// ─── Primary CTA ─────────────────────────────────────────────────────────────
function AuthButton({
  label,
  loading,
  onPress,
}: {
  label: string;
  loading: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const bg    = useSharedValue(ACCENT_DIM);

  const animStyle = useAnimatedStyle(() => ({
    transform:       [{ scale: scale.value }],
    backgroundColor: bg.value,
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={loading}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.97, { damping: 20, stiffness: 400 });
        bg.value    = withTiming(ACCENT_MID, { duration: 100 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 20, stiffness: 400 });
        bg.value    = withTiming(ACCENT_DIM, { duration: 200 });
      }}
    >
      <Animated.View style={[styles.authButton, animStyle]}>
        {loading ? (
          <ActivityIndicator color={ACCENT} size="small" />
        ) : (
          <>
            <Text style={styles.ctaBracket}>[</Text>
            <Text style={styles.ctaLabel}>{label.toUpperCase()}</Text>
            <View style={styles.ctaArrow}>
              <View style={styles.ctaArrowLine} />
              <View style={styles.ctaArrowHead} />
            </View>
            <Text style={styles.ctaBracket}>]</Text>
          </>
        )}
      </Animated.View>
    </Pressable>
  );
}

// ─── Social Provider Button ───────────────────────────────────────────────────
function ProviderButton({
  label,
  loading,
  onPress,
}: {
  label: string;
  loading: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={loading}
      onPress={onPress}
      onPressIn={() => (scale.value = withSpring(0.97, { damping: 20, stiffness: 400 }))}
      onPressOut={() => (scale.value = withSpring(1, { damping: 20, stiffness: 400 }))}
    >
      <Animated.View style={[styles.providerButton, animStyle]}>
        {loading ? (
          <ActivityIndicator color={TEXT_SECONDARY} size="small" />
        ) : (
          <Text style={styles.providerLabel}>{label.toUpperCase()}</Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

// ─── OR Divider ───────────────────────────────────────────────────────────────
function OrDivider() {
  return (
    <View style={styles.orRow}>
      <View style={styles.orLine} />
      <Text style={styles.orText}>OR</Text>
      <View style={styles.orLine} />
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SignInScreen() {
  const router = useRouter();
  const { handleSocialAuth, isLoading: socialLoading } = useSocialAuth();

  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  const isLoading = emailLoading || socialLoading;

  const handleEmailLogin = useCallback(async () => {
    if (emailLoading) return;
    if (!email || !password) {
      Alert.alert("Missing fields", "Enter your email and password.");
      return;
    }
    setEmailLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      if (!data?.session) Alert.alert("Login failed", "No session returned.");
    } catch (err: unknown) {
      Alert.alert(
        "Sign-in failed",
        err instanceof Error ? err.message : "Something went wrong.",
      );
    } finally {
      setEmailLoading(false);
    }
  }, [email, password, emailLoading]);

  const handleSocial = useCallback(
    (provider: SocialAuthStrategy) => {
      if (socialLoading) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      handleSocialAuth(provider);
    },
    [handleSocialAuth, socialLoading],
  );

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.fill} edges={["top", "bottom"]}>
        <KeyboardAvoidingView behavior="padding" style={styles.fill}>
          <View style={[styles.fill]}>

            {/* TOP BAR */}
            <FadeUp delay={50}>
              <View style={styles.topBar}>
                <BackButton onPress={() => router.back()} />
                <View style={styles.topBarCenter}>
                  <View style={styles.activeDot} />
                  <Text style={styles.statusText}>AUTH MODULE</Text>
                </View>
                <View style={{ width: 36 }} />
              </View>
            </FadeUp>

            <View style={{ flex: 1, justifyContent: "center" }}>
            <FadeUp delay={150} style={styles.badgeSection}>
              {/* <IdentityBadge /> */}
              <Text style={styles.headline}>Sign in to SkillHive</Text>
              <Text style={styles.subline}>IDENTITY VERIFICATION REQUIRED</Text>
            </FadeUp>
            {/* IDENTITY BADGE */}

            {/* SECTION DIVIDER */}
            <FadeUp delay={250}>
              <View style={styles.fullDivider} />
            </FadeUp>

            {/* FORM */}
            <FadeUp delay={300} style={styles.formSection}>
              <HudInput
                label="EMAIL ADDRESS"
                placeholder="you@example.com"
                tag="REQ"
                value={email}
                onChangeText={setEmail}
                textContentType="emailAddress"
                keyboardType="email-address"
                editable={!isLoading}
              />
              <HudInput
                label="PASSWORD"
                placeholder="••••••••••••"
                tag="SECURE"
                value={password}
                onChangeText={setPassword}
                textContentType="password"
                secureTextEntry
                editable={!isLoading}
              />
              <Pressable style={styles.forgotRow}>
                <Text style={styles.forgotText}>FORGOT ACCESS?</Text>
              </Pressable>
            </FadeUp>

            {/* CTA */}
            <FadeUp delay={450} style={styles.ctaSection}>
              <AuthButton
                label="LOG IN"
                loading={emailLoading}
                onPress={handleEmailLogin}
              />
            </FadeUp>


            {/* REGISTER */}
            <FadeUp delay={660} style={styles.registerRow}>
              <View style={styles.fullDivider} />
              <View style={styles.registerInner}>
                <Text style={styles.registerMuted}>NO ACCESS? </Text>
                <Pressable onPress={() => router.push("/(auth)/sign-up")}>
                  <Text style={styles.registerAccent}>REGISTER</Text>
                </Pressable>
              </View>
            </FadeUp>
          </View>
            {/* LEGAL */}
            <FadeUp delay={760}>
              <Text style={styles.legalText}>
                By continuing you agree to our Terms & Privacy Policy.
              </Text>
            </FadeUp>

          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:  { flex: 1, backgroundColor: VOID },
  fill:  { flex: 1 },

  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingTop: 8,
    marginBottom: 4,
  },
  topBarCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  backButton: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderRadius: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: ACCENT,
  },
  statusText: {
    fontFamily: "SpaceMono",
    fontSize: 9,
    letterSpacing: 2.5,
    color: TEXT_TERTIARY,   // ↑ was TEXT_MUTED (#2e2e2c) — now #666664
  },

  // Badge
  badgeSection: {
    alignItems: "center",
    paddingVertical: 24,
  },
  badgeWrapper: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginBottom: 18,
  },
  badgeRingOuter: {
    position: "absolute",
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1,
    borderColor: BORDER,
  },
  badgeRingInner: {
    position: "absolute",
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER_DIM,
    borderStyle: "dashed",
  },
  badgeCore: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeMono: {
    fontFamily: "SpaceMono",
    fontSize: 16,
    fontWeight: "700",
    color: TEXT_PRIMARY,
    letterSpacing: 3,
  },
  badgeDot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: ACCENT,
    borderWidth: 2,
    borderColor: VOID,
  },
  headline: {
    fontFamily: "BebasNeue",
    fontSize: 32,
    color: TEXT_PRIMARY,    // #F0F0EE — full contrast
    letterSpacing: 1,
    lineHeight: 36,
    marginBottom: 7,
  },
  subline: {
    fontFamily: "SpaceMono",
    fontSize: 9,
    letterSpacing: 2.5,
    color: TEXT_TERTIARY,   // ↑ was TEXT_MUTED — now #666664
  },

  // Dividers
  fullDivider: {
    marginHorizontal: 24,
    height: StyleSheet.hairlineWidth,
    backgroundColor: BORDER,
  },

  // Form
  formSection: {
    paddingHorizontal: 24,
    paddingTop: 22,
    gap: 14,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontFamily: "SpaceMono",
    fontSize: 9,
    letterSpacing: 2,
    color: TEXT_TERTIARY,   // #666664 — clearly readable label
  },
  inputWrapper: {
    height: 50,
    borderWidth: 1,
    borderRadius: 2,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  inputText: {
    flex: 1,
    color: TEXT_PRIMARY,    // #F0F0EE — typed text is fully bright
    fontFamily: "SpaceMono",
    fontSize: 12,
    letterSpacing: 0.5,
    height: "100%",
  },
  inputTag: {
    fontFamily: "SpaceMono",
    fontSize: 7,
    letterSpacing: 1,
    color: TEXT_GHOST,      // barely visible tag — decorative only
  },
  forgotRow: {
    alignSelf: "flex-end",
    paddingVertical: 2,
  },
  forgotText: {
    fontFamily: "SpaceMono",
    fontSize: 9,
    letterSpacing: 1.5,
    color: TEXT_TERTIARY,   // ↑ was TEXT_MUTED — now readable
  },

  // CTA
  ctaSection: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  authButton: {
    height: 54,
    borderWidth: 1,
    borderColor: ACCENT,
    borderRadius: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  ctaBracket: {
    fontFamily: "SpaceMono",
    fontSize: 20,
    color: ACCENT,
    opacity: 0.4,
    fontWeight: "300",
    lineHeight: 24,
  },
  ctaLabel: {
    fontFamily: "SpaceMono",
    fontSize: 11,
    fontWeight: "700",
    color: ACCENT,
    letterSpacing: 3.5,
  },
  ctaArrow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ctaArrowLine: {
    width: 16,
    height: 1,
    backgroundColor: ACCENT,
    opacity: 0.5,
  },
  ctaArrowHead: {
    width: 0,
    height: 0,
    borderTopWidth: 4,
    borderBottomWidth: 4,
    borderLeftWidth: 6,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: ACCENT,
    opacity: 0.5,
  },

  // Social
  socialSection: {
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 9,
  },
  orRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 2,
  },
  orLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: BORDER,
  },
  orText: {
    fontFamily: "SpaceMono",
    fontSize: 8,
    letterSpacing: 3,
    color: TEXT_MUTED,  
  },
  providerButton: {
    height: 46,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  providerLabel: {
    fontFamily: "SpaceMono",
    fontSize: 10,
    letterSpacing: 1.5,
    color: TEXT_SECONDARY, 
    fontWeight: "700",
  },

  // Register
  registerRow: {
    paddingHorizontal: 24,
    paddingTop: 20,
    gap: 14,
  },
  registerInner: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  registerMuted: {
    fontFamily: "SpaceMono",
    fontSize: 9,
    letterSpacing: 1.5,
    color: TEXT_TERTIARY,
  },
  registerAccent: {
    fontFamily: "SpaceMono",
    fontSize: 9,
    letterSpacing: 1.5,
    color: ACCENT,
    fontWeight: "700",
  },

  // Legal
  legalText: {
    fontFamily: "SpaceMono",
    fontSize: 8.5,
    letterSpacing: 0.3,
    color: TEXT_MUTED,     
    textAlign: "center",
    lineHeight: 15,
    paddingHorizontal: 28,
    paddingTop: 14,
  },
});