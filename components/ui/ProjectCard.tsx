import React from "react";
import { Image, Text, View } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import ActionRow from "./ActionRow";
import FeedCard from "./FeedCard";
import { Pressable } from "react-native";
import { useRouter } from "expo-router";

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────

export type ProjectStatus = "active" | "completed" | "paused";

export type ProjectCardData = {
  user_id:        string;
  post_id:        string;
  caption:        string | null;
  likes_count:    number;
  comments_count: number;
  title:          string;
  description:    string | null;
  started_at:     string | null;
  ended_at:       string | null;
  status:         ProjectStatus;
  cover_url:      string | null;
  author_name:    string;
  author_avatar:  string | null;
};

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string; bg: string }> = {
  active:    { label: "Active",    color: "#22c55e", bg: "rgba(34,197,94,0.12)"  },
  completed: { label: "Completed", color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  paused:    { label: "Paused",    color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

function deriveDuration(started_at: string | null, ended_at: string | null): string | null {
  if (!started_at) return null;
  const start  = new Date(started_at);
  const end    = ended_at ? new Date(ended_at) : new Date();
  const months = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
  if (months < 1)  return "< 1 mo";
  if (months < 12) return `${months} mo`;
  const yr  = Math.floor(months / 12);
  const rem = months % 12;
  return rem > 0 ? `${yr} yr ${rem} mo` : `${yr} yr`;
}

// ─────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────

type Props = {
  data:      ProjectCardData;
  onPress?:  (postId: string) => void;
};

export default function ProjectCard({ data, onPress }: Props) {
  const { colors, spacing, radii, typography } = useTheme();
  const router = useRouter();
  const statusCfg  = STATUS_CONFIG[data.status];
  const duration   = deriveDuration(data.started_at, data.ended_at);
  const hasDateRange = data.started_at || data.ended_at;

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
                   <Pressable onPress={() => router.push(`/profile/${data.user_id}`)}>
          {/* Avatar */}
          {data.author_avatar ? (
            <Image
              source={{ uri: data.author_avatar }}
              style={{
                width: 32, height: 32, borderRadius: 16,
                marginRight: spacing.sm,
                backgroundColor: colors.surface.secondary,
              }}
            />
          ) : (
            <View
              style={{
                width: 32, height: 32, borderRadius: 16,
                marginRight: spacing.sm,
                backgroundColor: colors.surface.secondary,
                justifyContent: "center", alignItems: "center",
              }}
            >
              <Text style={{ color: colors.text.tertiary, fontSize: 13, fontWeight: "600" }}>
                {data.author_name?.[0]?.toUpperCase() ?? "?"}
              </Text>
            </View>
          )}

          {/* Name */}
          <Text
            style={{
              flex:       1,
              color:      colors.text.secondary,
              fontSize:   typography.bodySm.size,
              fontWeight: "600",
            }}
          >
            {data.author_name}
          </Text>
</Pressable>
          {/* ── Type badge — matches OfferCard's badge style ── */}
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
              Project
            </Text>
          </View>
        </View>

        {/* ── Title + status ── */}
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          <Text
            style={{

              color:       colors.text.primary,
              fontSize:    typography.subtitle.size,
              fontWeight:  "700",
              paddingRight: spacing.sm,
            }}
            numberOfLines={2}
          >
            {data.title}
          </Text>

          <View
            style={{
              backgroundColor:   statusCfg.bg,
              paddingHorizontal: spacing.sm,
              paddingVertical:   5,
              borderRadius:      999,
              flexShrink:        0,
            }}
          >
            <Text style={{ color: statusCfg.color, fontSize: typography.caption?.size ?? 11, fontWeight: "700" }}>
              {statusCfg.label}
            </Text>
          </View>
        </View>

        {/* ── Date range + duration ── */}
        {hasDateRange && (
          <Text style={{ color: colors.text.tertiary, marginTop: spacing.xs, fontSize: typography.bodySm.size }}>
            {data.started_at ? formatDate(data.started_at) : "?"}
            {" → "}
            {data.ended_at ? formatDate(data.ended_at) : "Present"}
            {duration ? `  ·  ${duration}` : ""}
          </Text>
        )}

        {/* ── Cover image ── */}
        {!!data.cover_url && (
          <Image
            source={{ uri: data.cover_url }}
            style={{
              height: 160, marginTop: spacing.md,
              borderRadius: radii.lg,
              backgroundColor: colors.surface.secondary,
            }}
            resizeMode="cover"
          />
        )}

        {/* ── Description ── */}
        {!!data.description && (
          <Text
            style={{
              color:      colors.text.secondary,
              marginTop:  spacing.md,
              fontSize:   typography.body.size,
              lineHeight: typography.body.lineHeight,
            }}
            numberOfLines={3}
          >
            {data.description}
          </Text>
        )}

        {/* ── Caption ── */}
        {!!data.caption && (
          <Text
            style={{
              color:      colors.text.tertiary,
              marginTop:  spacing.xs,
              fontSize:   typography.bodySm.size,
              fontStyle:  "italic",
            }}
            numberOfLines={2}
          >
            {data.caption}
          </Text>
        )}

      </View>

      <ActionRow postId={data.post_id} likes={data.likes_count} comments={data.comments_count} />
    </FeedCard>
  );
}