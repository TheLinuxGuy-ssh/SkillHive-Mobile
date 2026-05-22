import React from "react";

import { Text, View } from "react-native";

import { useTheme } from "@/hooks/useTheme";

import FeedCard from "./FeedCard";

export default function GlobalLockedCard() {
  const { colors, spacing, radii, typography } = useTheme();

  return (
    <FeedCard>
      <View
        style={{
          padding: spacing.xxl,

          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontSize: 42,
          }}
        >
          🔒
        </Text>

        <Text
          style={{
            marginTop: spacing.md,

            color: colors.text.primary,

            fontSize: typography.subtitle.size,

            fontWeight: "700",
          }}
        >
          Unlocks at 100 placements
        </Text>

        <Text
          style={{
            marginTop: spacing.sm,

            color: colors.text.secondary,

            textAlign: "center",

            fontSize: typography.body.size,

            lineHeight: typography.body.lineHeight,
          }}
        >
          We don’t open the global feed until the proof is real.
        </Text>

        {/* Progress */}
        <View
          style={{
            width: "100%",

            height: 6,

            marginTop: spacing.lg,

            backgroundColor: colors.surface.secondary,

            borderRadius: radii.pill,

            overflow: "hidden",
          }}
        >
          <View
            style={{
              width: "3%",

              height: "100%",

              backgroundColor: colors.tint.primary,
            }}
          />
        </View>

        <Text
          style={{
            marginTop: spacing.sm,

            color: colors.text.tertiary,

            fontSize: typography.caption.size,
          }}
        >
          3 / 100 placements
        </Text>
      </View>
    </FeedCard>
  );
}
