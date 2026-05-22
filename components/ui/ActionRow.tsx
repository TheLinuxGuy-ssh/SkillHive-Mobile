import React, { useState } from "react";

import { Text, TouchableOpacity, View } from "react-native";

import Svg, { Path } from "react-native-svg";

import { useTheme } from "@/hooks/useTheme";

interface ActionRowProps {
  likes: number;
  comments: number;

  initiallyLiked?: boolean;

  onLikePress?: () => void;
  onCommentPress?: () => void;
}

function HeartIcon({ color, filled }: { color: string; filled?: boolean }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21s-6.716-4.35-9.428-8.078C.86 10.57 2.1 6.75 5.686 5.6c2.154-.69 4.232.08 5.314 1.61 1.082-1.53 3.16-2.3 5.314-1.61 3.586 1.15 4.826 4.97 3.114 7.322C18.716 16.65 12 21 12 21z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={filled ? color : "transparent"}
      />
    </Svg>
  );
}

function MessageIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 11.5a8.5 8.5 0 01-8.5 8.5c-1.27 0-2.47-.28-3.55-.78L3 21l1.78-5.95A8.46 8.46 0 013 11.5 8.5 8.5 0 0111.5 3 8.5 8.5 0 0120 11.5z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function ActionRow({
  likes,
  comments,

  initiallyLiked = false,

  onLikePress,
  onCommentPress,
}: ActionRowProps) {
  const { colors, spacing, typography } = useTheme();

  const [liked, setLiked] = useState(initiallyLiked);

  const handleLike = () => {
    setLiked((prev) => !prev);

    onLikePress?.();
  };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",

        paddingHorizontal: spacing.base,
        paddingVertical: spacing.md,

        borderTopWidth: 1,
        borderTopColor: colors.border.subtle,
      }}
    >
      {/* Like */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handleLike}
        style={{
          flexDirection: "row",
          alignItems: "center",

          marginRight: spacing.lg,
        }}
      >
        <HeartIcon
          color={liked ? colors.tint.primary : colors.text.tertiary}
          filled={liked}
        />

        <Text
          style={{
            marginLeft: spacing.xs,

            color: liked ? colors.tint.primary : colors.text.tertiary,

            fontSize: typography.bodySm.size,
            lineHeight: typography.bodySm.lineHeight,

            fontWeight: "600",
          }}
        >
          {liked ? likes + 1 : likes}
        </Text>
      </TouchableOpacity>

      {/* Comment */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onCommentPress}
        style={{
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <MessageIcon color={colors.text.tertiary} />

        <Text
          style={{
            marginLeft: spacing.xs,

            color: colors.text.tertiary,

            fontSize: typography.bodySm.size,
            lineHeight: typography.bodySm.lineHeight,

            fontWeight: "500",
          }}
        >
          {comments}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
