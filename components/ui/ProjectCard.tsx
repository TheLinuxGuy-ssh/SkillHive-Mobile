import React from "react";

import { Text, View } from "react-native";

import { useTheme } from "@/hooks/useTheme";

import ActionRow from "./ActionRow";
import FeedCard from "./FeedCard";

export default function ProjectCard() {
  const { colors, spacing, radii, typography } = useTheme();

  return (
    <FeedCard>
      <View
        style={{
          padding: spacing.base,
        }}
      >
        <Text
          style={{
            color: colors.text.primary,

            fontSize: typography.subtitle.size,

            fontWeight: "700",
          }}
        >
          Expense Tracker
        </Text>

        <Text
          style={{
            color: colors.text.tertiary,

            marginTop: spacing.xs,

            fontSize: typography.bodySm.size,
          }}
        >
          Next.js · Supabase · Tailwind
        </Text>

        {/* Preview */}
        <View
          style={{
            height: 120,

            marginTop: spacing.md,

            backgroundColor: colors.surface.secondary,

            borderRadius: radii.lg,

            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: colors.tint.primary,

              fontWeight: "700",
            }}
          >
            Live Preview
          </Text>
        </View>

        <Text
          style={{
            color: colors.text.secondary,

            marginTop: spacing.md,

            fontSize: typography.body.size,

            lineHeight: typography.body.lineHeight,
          }}
        >
          Week 8 done. Feedback welcome on mobile layout.
        </Text>
      </View>

      <ActionRow likes={27} comments={8} />
    </FeedCard>
  );
}
