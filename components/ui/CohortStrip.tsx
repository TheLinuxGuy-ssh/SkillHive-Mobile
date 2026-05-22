import React from "react";

import { ScrollView, Text, View } from "react-native";

import { useTheme } from "@/hooks/useTheme";

const members = [
  {
    initials: "AK",
    name: "Arjun",
    live: true,
  },
  {
    initials: "SR",
    name: "Shreya",
  },
  {
    initials: "PM",
    name: "Priya",
    live: true,
  },
  {
    initials: "NK",
    name: "Nikhil",
  },
];

export default function CohortStrip() {
  const { colors, spacing, radii, typography } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: spacing.base,
      }}
    >
      {members.map((member) => (
        <View
          key={member.name}
          style={{
            alignItems: "center",

            marginRight: spacing.md,
          }}
        >
          <View
            style={{
              width: 56,
              height: 56,

              borderRadius: radii.pill,

              backgroundColor: colors.surface.secondary,

              borderWidth: 2,

              borderColor: member.live ? colors.tint.primary : "transparent",

              justifyContent: "center",

              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: colors.text.primary,

                fontWeight: "700",
              }}
            >
              {member.initials}
            </Text>
          </View>

          <Text
            style={{
              marginTop: spacing.xs,

              color: colors.text.secondary,

              fontSize: typography.caption.size,
            }}
          >
            {member.name}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}
