import React from "react";

import { Text, View } from "react-native";

import { useTheme } from "@/hooks/useTheme";

import ActionRow from "./ActionRow";
import FeedCard from "./FeedCard";

export default function StreakCard() {
  const { colors, spacing, radii, typography } = useTheme();

  return (
    <FeedCard>
      <View
        style={{
          padding: spacing.base,
        }}
      >
        <View
          style={{
            backgroundColor: colors.surface.secondary,

            borderRadius: radii.lg,

            padding: spacing.base,

            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: colors.tint.warning,

              fontSize: 42,

              fontWeight: "800",
            }}
          >
            14
          </Text>

          <View
            style={{
              marginLeft: spacing.md,
            }}
          >
            <Text
              style={{
                color: colors.tint.warning,

                fontSize: typography.caption.size,

                fontWeight: "700",

                textTransform: "uppercase",
              }}
            >
              Day Streak
            </Text>

            <Text
              style={{
                color: colors.text.secondary,

                marginTop: spacing.xs,

                fontSize: typography.bodySm.size,
              }}
            >
              Not missing a day until placement
            </Text>
          </View>
        </View>
      </View>

      <ActionRow likes={18} comments={2} />
    </FeedCard>
  );
}
