import React, { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import * as Haptics from "expo-haptics";2
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/lib/supabase";
import { Heart, MessageCircle } from "lucide-react-native";

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────

type Props = {
  postId: string;
  likes: number;
  comments?: number;
  noborder?: boolean;
  /** Optional: called when the user taps the comment button */
  onCommentPress?: (postId: string) => void;
};

// ─────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────

export default function ActionRow({
  postId,
  likes,
  comments,
  noborder,
  onCommentPress,
}: Props) {
  const { colors, spacing, typography } = useTheme();

  const [liked, setLiked]       = useState(false);
  const [likeCount, setLikeCount] = useState(likes);
  const [loading, setLoading]   = useState(false);

  // ── Check if the current user already liked this post ──

  useEffect(() => {
    let cancelled = false;

    async function checkLiked() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || cancelled) return;

      const { data } = await supabase
        .from("likes")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!cancelled) setLiked(!!data);
    }

    checkLiked();
    return () => { cancelled = true; };
  }, [postId]);

  // ── Toggle like ──

  const handleLike = useCallback(async () => {
    if (loading) return;
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    if (liked) {
      // Optimistic update
      setLiked(false);

      setLikeCount((c) => Math.max(c - 1, 0));

      const { error } = await supabase
        .from("likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);

      if (error) {
        // Rollback
        setLiked(true);
        setLikeCount((c) => c + 1);
      }
    } else {
      // Optimistic update
      setLiked(true);
      setLikeCount((c) => c + 1);

      const { error } = await supabase
        .from("likes")
        .insert({ post_id: postId, user_id: user.id });

      if (error) {
        // Rollback (handles race / duplicate gracefully)
        setLiked(false);
        setLikeCount((c) => Math.max(c - 1, 0));
      }
    }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);

    setLoading(false);
  }, [liked, loading, postId]);

  // ─────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.sm,
        borderTopWidth: noborder ? 0 : 1,
        borderTopColor: colors.border.subtle,
        gap: 4,
      }}
    >
      {/* Like button */}
      <Pressable
        onPress={handleLike}
        disabled={loading}
        hitSlop={8}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingVertical: 6,
          paddingHorizontal: 10,
          borderRadius: 999,
          backgroundColor: pressed
            ? liked
              ? "rgba(239,68,68,0.15)"
              : colors.surface.secondary
            : liked
            ? "rgba(239,68,68,0.10)"
            : "transparent",
        })}
      >
        <Text
          style={{
            fontSize: 12,
            // filled heart when liked, outline when not
            color: liked ? "#ef4444" : colors.text.tertiary,
            opacity: loading ? 0.5 : 1,
          }}
        >
          {/* {liked ? "♥" : "♡"} */}
          <Heart size={16} fill={liked ? "#ef4444" : "transparent"} color={liked ? "#ef4444" : colors.text.tertiary} />
        </Text>
        <Text
          style={{
            color: liked ? "#ef4444" : colors.text.tertiary,
            fontSize: typography.bodySm.size,
            fontWeight: liked ? "600" : "400",
            opacity: loading ? 0.5 : 1,
          }}
        >
          {likeCount > 0 ? likeCount : "Like"}
        </Text>
      </Pressable>

      {/* Comment button */}
    </View>
  );
}