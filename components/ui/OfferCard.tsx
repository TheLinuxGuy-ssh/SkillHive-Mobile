import React from "react";
import { Pressable, Text, View } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import ActionRow from "./ActionRow";
import FeedCard from "./FeedCard";
import { Image } from "expo-image";
import { router } from "expo-router";

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────

export type OfferCardData = {
  user_id:        string;
  post_id:        string;
  caption:        string | null;
  likes_count:    number;
  comments_count: number;
  created_at:     string;
  author_name:    string;
  author_avatar:  string | null;
  company:        string | null;
  role:           string | null;
  salary_range:   string | null;
  location:       string | null;
  offer_type:     string | null;
};

type Props = {
  data: OfferCardData;
  onPress?:  (postId: string) => void;
};

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

function toInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatOfferType(raw: string | null): string {
  if (!raw) return "Offer";
  return raw.replace(/_/g, "-").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────

export default function OfferCard({ data, onPress }: Props) {
  const { colors, spacing, radii, typography } = useTheme();

  const initials  = toInitials(data.author_name);
  const timeLabel = timeAgo(data.created_at);
  const typeLabel = formatOfferType(data.offer_type);

  return (
    <FeedCard onPress={onPress ? () => onPress(data.post_id) : undefined}>
      <View style={{ padding: spacing.base }}>

        {/* ── Author row + type badge ── */}
        <View
          style={{
            flexDirection: "row",
            alignItems:    "center",
            marginBottom:  spacing.sm,
          }}
        >
         {/* Avatar */}
         <Pressable onPress={() => router.push(`/profile/${data.user_id}`)}>
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
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text.secondary, fontSize: typography.bodySm.size, fontWeight: "600" }}>
              {data.author_name}
            </Text>
            <Text style={{ color: colors.text.tertiary, fontSize: typography.caption?.size ?? 11, marginTop: 1 }}>
              {timeLabel}
            </Text>
          </View>
          </Pressable>

          {/* ── Type badge — same style as ProjectCard's badge ── */}
          <View
            style={{
              backgroundColor:   colors.tint.success + "22",
              paddingHorizontal: spacing.sm,
              paddingVertical:   spacing.xs,
              borderRadius:      999,
            }}
          >
            <Text
              style={{
                color:      colors.tint.success,
                fontSize:   typography.caption?.size ?? 11,
                fontWeight: "700",
              }}
            >
              Offer
            </Text>
          </View>
        </View>

        {/* ── Hero block ── */}
        <View
          style={{
            backgroundColor: colors.surface.secondary,
            borderRadius:    radii.lg,
            padding:         spacing.base,
            marginBottom:    spacing.sm,
          }}
        >
          {!!data.company && (
            <Text
              style={{
                color:         colors.tint.success,
                fontSize:      typography.caption?.size ?? 11,
                fontWeight:    "700",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {data.company}
            </Text>
          )}

          <Text
            style={{
              color:      colors.text.primary,
              marginTop:  data.company ? spacing.xs : 0,
              fontSize:   typography.title.size,
              fontWeight: "800",
            }}
          >
            {data.role ?? "Role TBD"}
          </Text>

          {(data.salary_range || data.location) && (
            <Text style={{ color: colors.text.secondary, marginTop: spacing.xs, fontSize: typography.bodySm.size }}>
              {[data.salary_range, data.location].filter(Boolean).join(" · ")}
            </Text>
          )}

          {/* Offer type pill — bottom-right of hero block */}
          {!!data.offer_type && (
            <View style={{ alignItems: "flex-end", marginTop: spacing.sm }}>
              <View
                style={{
                  backgroundColor:   colors.tint.success + "22",
                  paddingHorizontal: spacing.sm,
                  paddingVertical:   4,
                  borderRadius:      999,
                }}
              >
                <Text
                  style={{
                    color:      colors.tint.success,
                    fontSize:   typography.caption?.size ?? 11,
                    fontWeight: "700",
                  }}
                >
                  {typeLabel}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* ── Caption ── */}
        {!!data.caption && (
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