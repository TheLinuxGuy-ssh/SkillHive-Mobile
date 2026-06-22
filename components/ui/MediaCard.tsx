import React from "react";
import { Image, Text, View } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import ActionRow from "./ActionRow";
import FeedCard from "./FeedCard";
import { Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useProfile } from "@/hooks/profileContext";

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────

export type MediaCardData = {
  user_id?:        string;
  post_id:         string;
  caption:         string | null;
  likes_count:     number;
  comments_count:  number;
  created_at:      string;
  cover_url:       string | null;
  author_name:     string;
  author_avatar:   string | null;
};

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────

type Props = {
  data:      MediaCardData;
  onPress?:  (postId: string) => void;
};

export default function MediaCard({ data, onPress }: Props) {
  const { colors, spacing, radii, typography } = useTheme();
  const router = useRouter();
  const { profile: myProfile } = useProfile();
  const timeLabel = timeAgo(data.created_at);

  return (
    <FeedCard onPress={onPress ? () => onPress(data.post_id) : undefined}>
      <View style={{ padding: spacing.base }}>

        {/* ── Author row + type badge ── */}
        <View
          style={{
            flexDirection:  "row",
            alignItems:     "center",
            marginBottom:   spacing.sm,
          }}
        >
          {data.user_id ? (
            <Pressable 
              style={{ flex: 1, flexDirection: "row" }} 
              onPress={() => {
                if (data.user_id === myProfile?.id) return;
                router.push(`/profile/${data.user_id}`);
              }}
            >
              {data.author_avatar ? (
                <Image
                  source={{ uri: data.author_avatar }}
                  style={{
                    width: 32, 
                    height: 32, 
                    borderRadius: 16,
                    marginRight: spacing.sm,
                    backgroundColor: colors.surface.secondary,
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 32, 
                    height: 32, 
                    borderRadius: 16,
                    marginRight: spacing.sm,
                    backgroundColor: colors.surface.secondary,
                    justifyContent: "center", 
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: colors.text.tertiary, fontSize: 13, fontWeight: "600" }}>
                    {data.author_name?.[0]?.toUpperCase() ?? "?"}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text.secondary, fontSize: typography.bodySm.size, fontWeight: "600" }}>
                  {data.author_name}
                </Text>
                <Text style={{ color: colors.text.tertiary, fontSize: typography.caption?.size ?? 11, marginTop: 1 }}>
                  {timeLabel}
                </Text>
              </View>
            </Pressable>
          ) : null}

          {/* ── Type badge ── */}
          <View
            style={{
              backgroundColor:   colors.surface.skillhive + "18",
              paddingHorizontal: spacing.sm,
              paddingVertical:   spacing.xs,
              borderRadius:      999,
            }}
          >
            <Text
              style={{
                color:      colors.surface.skillhive,
                fontSize:   typography.caption?.size ?? 11,
                fontWeight: "700",
              }}
            >
              Media
            </Text>
          </View>
        </View>

        {/* ── Image ── */}
        {data.cover_url && (
          <Image
            source={{ uri: data.cover_url }}
            style={{
              height: 280, 
              marginBottom: spacing.md,
              borderRadius: radii.lg,
              backgroundColor: colors.surface.secondary,
            }}
            resizeMode="cover"
          />
        )}

        {/* ── Caption ── */}
        {data.caption && (
          <Text
            style={{
              color:      colors.text.secondary,
              fontSize:   typography.body.size,
              lineHeight: typography.body.lineHeight,
            }}
          >
            {data.caption}
          </Text>
        )}

      </View>

      <ActionRow postId={data.post_id} likes={data.likes_count} comments={data.comments_count} />
    </FeedCard>
  );
}