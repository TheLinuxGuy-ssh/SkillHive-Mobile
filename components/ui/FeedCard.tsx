import React from "react";
import { View } from "react-native";

import { useTheme } from "@/hooks/useTheme";

interface Props {
  children: React.ReactNode;
}

export default function FeedCard({ children }: Props) {
  const { colors, radii, spacing, elevation } = useTheme();

  return (
    <View
      style={{
        backgroundColor: colors.surface.primary,

        borderRadius: radii.xl,

        borderWidth: 1,
        borderColor: colors.border.subtle,

        overflow: "hidden",

        marginBottom: spacing.md,

        ...elevation.sm,
      }}
    >
      {children}
    </View>
  );
}
