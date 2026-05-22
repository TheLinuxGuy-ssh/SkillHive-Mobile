import React from "react";
import { Text, View } from "react-native";

import { useTheme } from "@/hooks/useTheme";

interface Props {
  title: string;
  subtitle?: string;
}

export default function SectionHeader({ title, subtitle }: Props) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View
      style={{
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.md,

        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",

        backgroundColor: colors.bg.canvas,
      }}
    >
      <Text
        style={{
          color: colors.tint.primary,

          fontSize: typography.caption.size,
          lineHeight: typography.caption.lineHeight,
          letterSpacing: typography.caption.letterSpacing,

          fontWeight: typography.caption.weight,

          textTransform: "uppercase",
        }}
      >
        {title}
      </Text>

      {!!subtitle && (
        <Text
          style={{
            color: colors.text.tertiary,

            fontSize: typography.caption.size,
            lineHeight: typography.caption.lineHeight,
          }}
        >
          {subtitle}
        </Text>
      )}
    </View>
  );
}
