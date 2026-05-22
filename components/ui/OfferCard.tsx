import React from "react";

import { Text, View } from "react-native";

import { useTheme } from "@/hooks/useTheme";

import ActionRow from "./ActionRow";
import FeedCard from "./FeedCard";

export default function OfferCard() {
  const { colors, spacing, radii, typography } = useTheme();

  return (
    <FeedCard>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",

          paddingHorizontal: spacing.base,
          paddingTop: spacing.base,
        }}
      >
        <View
          style={{
            width: 38,
            height: 38,

            borderRadius: radii.pill,

            backgroundColor: colors.tint.success,

            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: colors.text.white,
              fontWeight: "700",
            }}
          >
            SR
          </Text>
        </View>

        <View
          style={{
            flex: 1,
            marginLeft: spacing.sm,
          }}
        >
          <Text
            style={{
              color: colors.text.primary,

              fontSize: typography.body.size,

              fontWeight: "700",
            }}
          >
            Shreya Rajan
          </Text>

          <Text
            style={{
              color: colors.text.tertiary,

              marginTop: 2,

              fontSize: typography.caption.size,
            }}
          >
            Web Dev · Cohort 3 · 2h ago
          </Text>
        </View>

        <View
          style={{
            backgroundColor: colors.tint.success,

            paddingHorizontal: spacing.sm,

            paddingVertical: spacing.xs,

            borderRadius: radii.pill,
          }}
        >
          <Text
            style={{
              color: colors.text.white,

              fontSize: typography.caption.size,

              fontWeight: "700",
            }}
          >
            Offer
          </Text>
        </View>
      </View>

      {/* Hero */}
      <View
        style={{
          margin: spacing.base,

          backgroundColor: colors.surface.secondary,

          borderRadius: radii.lg,

          padding: spacing.base,
        }}
      >
        <Text
          style={{
            color: colors.tint.success,

            fontSize: typography.caption.size,

            fontWeight: "700",

            textTransform: "uppercase",
          }}
        >
          Razorpay
        </Text>

        <Text
          style={{
            color: colors.text.primary,

            marginTop: spacing.xs,

            fontSize: typography.title.size,

            fontWeight: "800",
          }}
        >
          Frontend Engineer
        </Text>

        <Text
          style={{
            color: colors.text.secondary,

            marginTop: spacing.xs,

            fontSize: typography.bodySm.size,
          }}
        >
          ₹8.4 LPA · Bengaluru
        </Text>
      </View>

      {/* Caption */}
      <Text
        style={{
          color: colors.text.secondary,

          paddingHorizontal: spacing.base,

          paddingBottom: spacing.base,

          fontSize: typography.body.size,

          lineHeight: typography.body.lineHeight,
        }}
      >
        Work rooms changed everything. 25 people noticing when you don’t show up
        hits different.
      </Text>

      <ActionRow likes={84} comments={12} />
    </FeedCard>
  );
}
