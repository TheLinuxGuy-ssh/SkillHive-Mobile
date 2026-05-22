import React from "react";

import { Text, TouchableOpacity, View } from "react-native";

import { useTheme } from "@/hooks/useTheme";

export default function ShareBar() {
  const { colors, spacing, radii, typography } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={{
        backgroundColor: colors.surface.primary,

        borderRadius: radii.lg,

        borderWidth: 1,
        borderColor: colors.border.subtle,

        padding: spacing.md,

        flexDirection: "row",
        alignItems: "center",

        marginBottom: spacing.md,
      }}
    >
      <View
        style={{
          width: 34,
          height: 34,

          borderRadius: radii.pill,

          backgroundColor: colors.surface.skillhive,

          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text
          style={{
            color: colors.text.black,
            fontWeight: "700",
          }}
        >
          AK
        </Text>
      </View>

      <Text
        style={{
          flex: 1,

          marginLeft: spacing.sm,

          color: colors.text.tertiary,

          fontSize: typography.body.size,
          lineHeight: typography.body.lineHeight,
        }}
      >
        Share your progress...
      </Text>

      <View
        style={{
          backgroundColor: colors.surface.skillhive,

          borderRadius: radii.pill,

          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
        }}
      >
        <Text
          style={{
            color: colors.text.black,

            fontSize: typography.caption.size,

            fontWeight: "700",
          }}
        >
          + Post
        </Text>
      </View>
    </TouchableOpacity>
  );
}
