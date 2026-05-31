import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
ActivityIndicator,
Alert,
KeyboardAvoidingView,
Pressable,
ScrollView,
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
import { supabase } from "@/lib/supabase";

import ConfirmEmailScreen from "./ConfirmEmailScreen";

// ─────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────

const VOID        = "#000000";
const SURFACE     = "#0C0C0C";
const BORDER      = "#2A2A28";
const BORDER_DIM  = "#1E1E1C";

const TEXT_PRIMARY   = "#F0F0EE";
const TEXT_SECONDARY = "#888886";
const TEXT_TERTIARY  = "#666664";
const TEXT_MUTED     = "#444442";
const TEXT_GHOST     = "#333331";

const ACCENT     = "#E8FF47";
const ACCENT_DIM = "rgba(232,255,71,0.07)";
const ACCENT_MID = "rgba(232,255,71,0.13)";

// ─────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────

function validateEmail(email: string): boolean {
return /^[^\s@]+@[^\s@]+.[^\s@]+$/.test(email.trim());
}

function validatePassword(password: string): string | null {
if (password.length < 8)
return "Password must be at least 8 characters.";

if (!/[A-Z]/.test(password))
return "Password must contain an uppercase letter.";

if (!/[0-9]/.test(password))
return "Password must contain a number.";

return null;
}

// ─────────────────────────────────────────
// BACK BUTTON
// ─────────────────────────────────────────

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

    Haptics.impactAsync(
      Haptics.ImpactFeedbackStyle.Light,
    ).catch(() => undefined);
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

// ─────────────────────────────────────────
// FADE UP
// ─────────────────────────────────────────

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


y.value = withDelay(
  delay,
  withTiming(0, {
    duration: 420,
    easing: Easing.out(Easing.quad),
  }),
);


}, []);

const anim = useAnimatedStyle(() => ({
opacity: fade.value,
transform: [{ translateY: y.value }],
}));

return (
<Animated.View style={[anim, style]}>
{children}
</Animated.View>
);
}

// ─────────────────────────────────────────
// INPUT FIELD
// ─────────────────────────────────────────

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
error,
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
error?: string;
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
borderColor: error ? "#ef4444" : borderColor.value,
backgroundColor: bgColor.value,
}));

return ( <View style={styles.fieldGroup}> <Text style={styles.fieldLabel}>{label}</Text>


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

  {!!error && (
    <Text style={styles.errorText}>
      {error}
    </Text>
  )}
</View>


);
}

// ─────────────────────────────────────────
// CTA BUTTON
// ─────────────────────────────────────────

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
transform: [{ scale: scale.value }],
backgroundColor: bg.value,
}));

return (
<Pressable
accessibilityRole="button"
accessibilityLabel={label}
disabled={loading}
onPress={onPress}
onPressIn={() => {
scale.value = withSpring(0.97, {
damping: 20,
stiffness: 400,
});


    bg.value = withTiming(ACCENT_MID, {
      duration: 100,
    });
  }}
  onPressOut={() => {
    scale.value = withSpring(1, {
      damping: 20,
      stiffness: 400,
    });

    bg.value = withTiming(ACCENT_DIM, {
      duration: 200,
    });
  }}
>
  <Animated.View style={[styles.authButton, animStyle]}>
    {loading ? (
      <ActivityIndicator color={ACCENT} size="small" />
    ) : (
      <>
        <Text style={styles.ctaBracket}>[</Text>

        <Text style={styles.ctaLabel}>
          {label.toUpperCase()}
        </Text>

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

// ─────────────────────────────────────────
// SCREEN
// ─────────────────────────────────────────

export default function SignUpScreen() {
const router = useRouter();

const [displayName, setDisplayName]     = useState("");
const [username, setUsername]           = useState("");
const [email, setEmail]                 = useState("");
const [password, setPassword]           = useState("");
const [confirmPassword, setConfirmPassword] = useState("");

const [loading, setLoading]             = useState(false);
const [submitted, setSubmitted]         = useState(false);

const [displayNameError, setDisplayNameError] = useState("");
const [usernameError, setUsernameError]       = useState("");
const [emailError, setEmailError]             = useState("");
const [passwordError, setPasswordError]       = useState("");
const [confirmError, setConfirmError]         = useState("");

function clearErrors() {
setDisplayNameError("");
setUsernameError("");
setEmailError("");
setPasswordError("");
setConfirmError("");
}

function validate(): boolean {
clearErrors();


let valid = true;

if (!displayName.trim()) {
  setDisplayNameError("Display name is required.");
  valid = false;
}

if (!username.trim()) {
  setUsernameError("Username is required.");
  valid = false;
}

if (!validateEmail(email)) {
  setEmailError("Enter a valid email address.");
  valid = false;
}

const pwErr = validatePassword(password);

if (pwErr) {
  setPasswordError(pwErr);
  valid = false;
}

if (password !== confirmPassword) {
  setConfirmError("Passwords do not match.");
  valid = false;
}

return valid;


}

const handleSignUp = useCallback(async () => {
if (loading) return;
if (!validate()) return;


setLoading(true);

try {
  const { data, error: signUpError } =
    await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          username: username.trim().toLowerCase(),
          displayname: displayName.trim(),
        },
      },
    });

  if (signUpError) throw signUpError;

  if (!data.user) {
    Alert.alert(
      "Sign-up failed",
      "No user returned.",
    );

    return;
  }

  const { error: profileError } =
    await supabase
      .from("profiles")
      .insert({
        id: data.user.id,
        username: username.trim(),
        avatar: null,
        created_at: new Date().toISOString(),
      });

  if (profileError) {
    console.warn(profileError.message);
  }

  if (data.session) {
  } else {
    setSubmitted(true);
  }
} catch (err: unknown) {
  Alert.alert(
    "Sign-up failed",
    err instanceof Error
      ? err.message
      : "Something went wrong.",
  );
} finally {
  setLoading(false);
}


}, [
email,
password,
confirmPassword,
username,
displayName,
loading,
]);

if (submitted) {
return ( <ConfirmEmailScreen email={email.trim()} />
);
}

return ( <View style={styles.root}>
<SafeAreaView style={styles.fill} edges={["top", "bottom"]}> 
  <KeyboardAvoidingView
       behavior="padding"
       style={styles.fill}
     >
<ScrollView
contentContainerStyle={{
flexGrow: 1,
paddingBottom: 40,
}}
keyboardShouldPersistTaps="handled"
showsVerticalScrollIndicator={false}
>
{/* TOP BAR */} <FadeUp delay={50}> <View style={styles.topBar}>
<BackButton onPress={() => router.back()} />


            <View style={styles.topBarCenter}>
              <View style={styles.activeDot} />
              <Text style={styles.statusText}>
                AUTH MODULE
              </Text>
            </View>

            <View style={{ width: 36 }} />
          </View>
        </FadeUp>

        <View style={styles.centerContent}>
          {/* HEADER */}
          <FadeUp delay={150}>
            <View style={styles.badgeSection}>
              <View style={styles.badgeWrapper}>
                <Animated.View
                  style={styles.badgeRingOuter}
                />

                <View style={styles.badgeRingInner} />

                <View style={styles.badgeCore}>
                  <Text style={styles.badgeMono}>
                    SH
                  </Text>
                </View>

                <View style={styles.badgeDot} />
              </View>

              <Text style={styles.headline}>
                Create Account
              </Text>

              <Text style={styles.subline}>
                IDENTITY REGISTRATION REQUIRED
              </Text>
            </View>
          </FadeUp>

          {/* DIVIDER */}
          <FadeUp delay={250}>
            <View style={styles.fullDivider} />
          </FadeUp>

          {/* FORM */}
          <FadeUp delay={320} style={styles.formSection}>
            <HudInput
              label="DISPLAY NAME"
              placeholder="Aryan Kapoor"
              tag="ID"
              value={displayName}
              onChangeText={(v) => {
                setDisplayName(v);

                if (displayNameError)
                  setDisplayNameError("");
              }}
              editable={!loading}
              error={displayNameError}
            />

            <HudInput
              label="USERNAME"
              placeholder="aryankapoor"
              tag="USER"
              value={username}
              onChangeText={(v) => {
                setUsername(v);

                if (usernameError)
                  setUsernameError("");
              }}
              editable={!loading}
              error={usernameError}
            />

            <HudInput
              label="EMAIL ADDRESS"
              placeholder="you@example.com"
              tag="REQ"
              value={email}
              onChangeText={(v) => {
                setEmail(v);

                if (emailError)
                  setEmailError("");
              }}
              keyboardType="email-address"
              textContentType="emailAddress"
              editable={!loading}
              error={emailError}
            />

            <HudInput
              label="PASSWORD"
              placeholder="••••••••••••"
              tag="SECURE"
              value={password}
              onChangeText={(v) => {
                setPassword(v);

                if (passwordError)
                  setPasswordError("");
              }}
              secureTextEntry
              textContentType="newPassword"
              editable={!loading}
              error={passwordError}
            />

            <HudInput
              label="CONFIRM PASSWORD"
              placeholder="••••••••••••"
              tag="VERIFY"
              value={confirmPassword}
              onChangeText={(v) => {
                setConfirmPassword(v);

                if (confirmError)
                  setConfirmError("");
              }}
              secureTextEntry
              textContentType="newPassword"
              editable={!loading}
              error={confirmError}
            />

            <Text style={styles.passwordHint}>
              MIN 8 CHARS / 1 UPPERCASE / 1 NUMBER
            </Text>
          </FadeUp>

          {/* CTA */}
          <FadeUp delay={520} style={styles.ctaSection}>
            <AuthButton
              label="Create Account"
              loading={loading}
              onPress={handleSignUp}
            />
          </FadeUp>

          {/* FOOTER */}
          <FadeUp delay={650} style={styles.registerRow}>
            <View style={styles.fullDivider} />

            <View style={styles.registerInner}>
  <Text style={styles.registerMuted}>
    ALREADY REGISTERED?
  </Text>
  <Pressable onPress={() => router.back()}>
    <Text style={[styles.registerAccent, { marginLeft: 8 }]}>
      SIGN IN
    </Text>
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
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>
</View>


);
}

// ─────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────

const styles = StyleSheet.create({
root: {
flex: 1,
backgroundColor: VOID,
},

fill: {
flex: 1,
},

centerContent: {
flex: 1,
justifyContent: "center",
paddingTop: 20,
},

// TOP BAR

topBar: {
flexDirection: "row",
alignItems: "center",
justifyContent: "space-between",
paddingHorizontal: 22,
paddingTop: 8,
},

topBarCenter: {
flexDirection: "row",
alignItems: "center",
gap: 7,
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
color: TEXT_TERTIARY,
},

backButton: {
width: 36,
height: 36,
borderWidth: 1,
borderRadius: 2,
borderColor: BORDER,
alignItems: "center",
justifyContent: "center",
backgroundColor: "transparent",
},

// BADGE

badgeSection: {
alignItems: "center",
paddingVertical: 30,
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
fontSize: 34,
color: TEXT_PRIMARY,
letterSpacing: 1,
lineHeight: 38,
marginBottom: 8,
},

subline: {
fontFamily: "SpaceMono",
fontSize: 9,
letterSpacing: 2.5,
color: TEXT_TERTIARY,
},

// DIVIDER

fullDivider: {
marginHorizontal: 24,
height: StyleSheet.hairlineWidth,
backgroundColor: BORDER,
},

// FORM

formSection: {
paddingHorizontal: 24,
paddingTop: 24,
gap: 14,
},

fieldGroup: {
gap: 6,
},

fieldLabel: {
fontFamily: "SpaceMono",
fontSize: 9,
letterSpacing: 2,
color: TEXT_TERTIARY,
},

inputWrapper: {
height: 52,
borderWidth: 1,
borderRadius: 2,
flexDirection: "row",
alignItems: "center",
paddingHorizontal: 14,
},

inputText: {
flex: 1,
color: TEXT_PRIMARY,
fontFamily: "SpaceMono",
fontSize: 12,
letterSpacing: 0.5,
height: "100%",
},

inputTag: {
fontFamily: "SpaceMono",
fontSize: 7,
letterSpacing: 1,
color: TEXT_GHOST,
},

errorText: {
color: "#ef4444",
fontFamily: "SpaceMono",
fontSize: 9,
letterSpacing: 0.5,
},

passwordHint: {
fontFamily: "SpaceMono",
fontSize: 8,
letterSpacing: 1.4,
color: TEXT_MUTED,
marginTop: 2,
},

// CTA

ctaSection: {
paddingTop: 24,
paddingHorizontal: 24,
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

// REGISTER

registerRow: {
paddingHorizontal: 24,
paddingTop: 24,
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

// LEGAL

legalText: {
fontFamily: "SpaceMono",
fontSize: 8.5,
letterSpacing: 0.3,
color: TEXT_MUTED,
textAlign: "center",
lineHeight: 15,
paddingHorizontal: 28,
paddingTop: 20,
paddingBottom: 24,
},
});
