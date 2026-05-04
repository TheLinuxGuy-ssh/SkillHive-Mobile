import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect } from "react";
import { Pressable, View } from "react-native";

import { Text } from "@/components/ui/Text";
import { storyRingGradient } from "@/constants/tokens";
import { useTheme } from "@/hooks/useTheme";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

export default function WelcomeScreen() {
  const router = useRouter();
  const { colors, spacing, radii } = useTheme();

  const float = useSharedValue(0);
  const drift = useSharedValue(0);
  const fade = useSharedValue(0);
  const rise = useSharedValue(24);
  const ctaScale = useSharedValue(1);

  useEffect(() => {
    float.value = withRepeat(
      withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );

    drift.value = withRepeat(
      withTiming(1, { duration: 4800, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    fade.value = withDelay(120, withTiming(1, { duration: 480 }));
    rise.value = withDelay(
      120,
      withSpring(0, { damping: 22, stiffness: 220, mass: 0.9 }),
    );
  }, [drift, fade, float, rise]);

  const heroStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -float.value * 10 },
      { translateX: float.value * 4 },
    ],
  }));

  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.32 + drift.value * 0.16,
    transform: [
      { translateY: drift.value * 6 },
      { translateX: -drift.value * 3 },
      { scale: 1 + drift.value * 0.04 },
    ],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ translateY: rise.value }],
  }));

  const ctaStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ctaScale.value }],
  }));

  const onPressIn = useCallback(() => {
    ctaScale.value = withSpring(0.96, {
      damping: 16,
      stiffness: 360,
      mass: 0.5,
    });
  }, [ctaScale]);
  const onPressOut = useCallback(() => {
    ctaScale.value = withSpring(1, { damping: 16, stiffness: 360, mass: 0.5 });
  }, [ctaScale]);

  const onContinue = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
      () => undefined,
    );
    router.push("/(auth)/sign-in");
  }, [router]);

  return (
    <View
      className="flex-1 bg-canvas"
      style={{ backgroundColor: "#000000", flex: 1 }}
    >
      <SafeAreaView
        className="flex-1"
        style={{ flex: 1 }}
        edges={["top", "bottom"]}
      >
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 12,
          }}
          className="flex-1 items-center justify-center px-xl"
        >
          <View
            style={{
              width: 220,
              height: 380,
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: "relative",
                  width: 250,
                  height: 250,
                  borderRadius: 150,
                  overflow: "hidden",
                },
                haloStyle,
              ]}
            >
              <LinearGradient
                colors={
                  storyRingGradient as unknown as [string, string, string]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ flex: 1 }}
              />
            </Animated.View>
            <Animated.View style={{ position: "absolute" }}>
              <Image
                source={require("../../assets/images/skillhive.png")}
                style={{ width: 175, height: 175 }}
                contentFit="contain"
                cachePolicy="memory-disk"
                transition={200}
              />
            </Animated.View>
          </View>

          <Animated.View style={contentStyle} className="items-center mt-xxl">
            <Text
              variant="display"
              tone="primary"
              align="center"
              className="mb-md"
            >
              SkillHive
            </Text>
            <Text variant="title" tone="secondary" align="center" weight="500">
              Where Focused People thrive.
            </Text>
          </Animated.View>
        </View>

        <View
          style={{
            paddingHorizontal: spacing.huge,
            paddingBottom: spacing.screen,
            gap: spacing.md,
          }}
        >
          <Animated.View style={ctaStyle}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Get started"
              onPress={onContinue}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              style={{
                height: 54,
                borderRadius: radii.pill,
                overflow: "hidden",
                shadowColor: colors.tint.primary,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.32,
                shadowRadius: 16,
                elevation: 10,
              }}
            >
              <LinearGradient
                colors={
                  storyRingGradient as unknown as [string, string, string]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 0 }}
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: spacing.sm,
                }}
              >
                <Text variant="subtitle" tone="inverse" weight="700">
                  Get started
                </Text>
                <Feather
                  name="arrow-right"
                  size={20}
                  color={colors.text.black}
                />
              </LinearGradient>
            </Pressable>
          </Animated.View>
          <Text variant="caption" tone="tertiary" align="center">
            Tap continue and you're agreeing to our Terms and Privacy Policy.
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}
