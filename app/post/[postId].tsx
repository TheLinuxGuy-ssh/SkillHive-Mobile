import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import {
  ArrowLeft,
  Send,
  Trash2,
  Pencil,
  Check,
  X,
  MessageCircle,
  ChevronRight,
} from "lucide-react-native";

import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/lib/supabase";
import { Image } from "expo-image";
import ActionRow from "@/components/ui/ActionRow";
import { useProfile } from "@/hooks/profileContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────


type PostDetail = {
  id:             string;
  user_id:        string;
  post_type:      "project" | "media" | "offer";
  caption:        string | null;
  likes_count:    number;
  comments_count: number;
  created_at:     string;
  profiles: {
    id:       string;
    username: string | null;
    avatar:   string | null;
  };
  project_posts: {
    title:       string;
    description: string | null;
    started_at:  string | null;
    ended_at:    string | null;
    status:      "active" | "completed" | "paused";
  } | null;
  offer_posts: {
    company:      string | null;
    role:         string | null;
    salary_range: string | null;
    location:     string | null;
    offer_type:   string | null;
  } | null;
  post_images: {
    url:        string;
    sort_order: number;
  }[] | null;
};

type Comment = {
  id:         string;
  body:       string;
  created_at: string;
  parent_id:  string | null;
  user_id:    string;
  profiles: {
    username: string | null;
  } | null;
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

function formatOfferType(raw: string | null): string {
  if (!raw) return "Offer";
  return raw.replace(/_/g, "-").replace(/\b\w/g, (c) => c.toUpperCase());
}

function toInitials(name: string): string {
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

// ─────────────────────────────────────────
// QUERY
// ─────────────────────────────────────────

const POST_DETAIL_QUERY = `
  id,
  user_id,
  post_type,
  caption,
  likes_count,
  comments_count,
  created_at,
  profiles:profiles!posts_user_id_profiles_fkey (
    id,
    username,
    avatar
  ),
  project_posts:project_posts!project_posts_post_id_fkey (
    title,
    description,
    started_at,
    ended_at,
    status
  ),
  offer_posts:offer_posts!offer_posts_post_id_fkey (
    company,
    role,
    salary_range,
    location,
    offer_type
  ),
  post_images:post_images!post_images_post_id_fkey (
    url,
    sort_order
  )
`;

// ─────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────

function Avatar({
  name, size = 36, bg,
}: { name: string; size?: number; bg: string }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: bg, justifyContent: "center", alignItems: "center",
    }}>
      <Text style={{ color: "#fff", fontWeight: "700", fontSize: size * 0.35 }}>
        {toInitials(name)}
      </Text>
    </View>
  );
}

function CommentRow({
  comment, currentUserId, onDelete, colors, spacing, typography, radii,
}: {
  comment:       Comment;
  currentUserId: string | null;
  onDelete:      (id: string) => void;
  colors:        any;
  spacing:       any;
  typography:    any;
  radii:         any;
}) {
  const isOwn   = comment.user_id === currentUserId;
  const name    = comment.profiles?.username ?? "Unknown";
  const isReply = !!comment.parent_id;

  return (
    <View
      style={{
        marginLeft:    isReply ? 32 : 0,
        flexDirection: "row",
        gap:           spacing.sm,
        marginBottom:  spacing.md,
      }}
    >
      <Avatar name={name} size={30} bg={colors.surface.skillhive} />

      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, marginBottom: 3 }}>
          <Text style={{ color: colors.text.primary, fontSize: typography.bodySm.size, fontWeight: "700" }}>
            {name}
          </Text>
          <Text style={{ color: colors.text.tertiary, fontSize: 11 }}>
            · {timeAgo(comment.created_at)}
          </Text>
        </View>

        <Text style={{ color: colors.text.secondary, fontSize: typography.body.size, lineHeight: typography.body.lineHeight }}>
          {comment.body}
        </Text>
      </View>

      {isOwn && (
        <Pressable
          onPress={() => onDelete(comment.id)}
          hitSlop={8}
          style={{ paddingTop: 2 }}
        >
          <Trash2 size={14} color={colors.text.tertiary} strokeWidth={1.8} />
        </Pressable>
      )}
    </View>
  );
}

// ─────────────────────────────────────────
// SCREEN
// ─────────────────────────────────────────

export default function PostDetailScreen() {
  const { postId }                             = useLocalSearchParams<{ postId: string }>();
  const router                                 = useRouter();
  const { colors, spacing, radii, typography } = useTheme();
  const { profile: myProfile }                 = useProfile();

  // ── post ──
  const [post,          setPost]          = useState<PostDetail | null>(null);
  const [comments,      setComments]      = useState<Comment[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [error,         setError]         = useState<string | null>(null);

  // ── comment input ──
  const [commentText, setCommentText] = useState("");
  const [replyTo,     setReplyTo]     = useState<Comment | null>(null);
  const [submitting,  setSubmitting]  = useState(false);
  const inputRef = useRef<TextInput>(null);

  // ── edit mode (owner only) ──
  const [editing,     setEditing]     = useState(false);
  const [editCaption, setEditCaption] = useState("");
  const [editTitle,   setEditTitle]   = useState("");
  const [editDesc,    setEditDesc]    = useState("");
  const [saving,      setSaving]      = useState(false);

  // ── refs for polling ──
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchAllRef = useRef<typeof fetchAll | null>(null);

  const isOwner = !!currentUserId && !!post && post.user_id === currentUserId;

  const insets = useSafeAreaInsets();

  // ── fetch ──
  const fetchAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else           setLoading(true);
    setError(null);

    const [{ data: { user } }, postRes, commentsRes] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("posts").select(POST_DETAIL_QUERY).eq("id", postId).single(),
      supabase
        .from("comments")
        .select("id, body, created_at, parent_id, user_id, profiles:profiles(username)")
        .eq("post_id", postId)
        .order("created_at", { ascending: true }),
    ]);

    setCurrentUserId(user?.id ?? null);

    if (postRes.error) {
      setError("Couldn't load post.");
    } else {
      // Normalize — Supabase can return joined relations as arrays
      const raw = postRes.data as any;
      const normalized: PostDetail = {
        ...raw,
        profiles:      Array.isArray(raw.profiles)      ? raw.profiles[0]      : raw.profiles,
        project_posts: Array.isArray(raw.project_posts) ? raw.project_posts[0] : raw.project_posts,
        offer_posts:   Array.isArray(raw.offer_posts)   ? raw.offer_posts[0]   : raw.offer_posts,
      };
      setPost(normalized);
      setEditCaption(normalized.caption ?? "");
      if (normalized.project_posts) {
        setEditTitle(normalized.project_posts.title ?? "");
        setEditDesc(normalized.project_posts.description ?? "");
      }
    }

    setComments((commentsRes.data as unknown as Comment[]) ?? []);
    setLoading(false);
    setRefreshing(false);
  }, [postId]);

  // Keep ref up to date for polling
  useEffect(() => {
    fetchAllRef.current = fetchAll;
  }, [fetchAll]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Comment polling (every 8 seconds) ──
  useEffect(() => {
    pollIntervalRef.current = setInterval(() => {
      if (fetchAllRef.current) {
        fetchAllRef.current(false);
      }
    }, 8000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // ── Refetch when screen comes into focus ──
  useFocusEffect(
    useCallback(() => {
      if (fetchAllRef.current) {
        fetchAllRef.current(true);
      }
    }, [])
  );

  // ── submit comment ──
  async function submitComment() {
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSubmitting(false); return; }

    const { error } = await supabase.from("comments").insert({
      post_id:   postId,
      user_id:   user.id,
      body:      commentText.trim(),
      parent_id: replyTo?.id ?? null,
    });

    if (!error) {
      setCommentText("");
      setReplyTo(null);
      if (fetchAllRef.current) {
        await fetchAllRef.current(true);
      }
      inputRef.current?.blur();
    }
    setSubmitting(false);
  }

  // ── delete comment ──
  async function deleteComment(id: string) {
    Alert.alert("Delete comment", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          await supabase.from("comments").delete().eq("id", id);
          if (fetchAllRef.current) {
            await fetchAllRef.current(true);
          }
        },
      },
    ]);
  }

  // ── delete post ──
  async function deletePost() {
    Alert.alert("Delete post", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          await supabase.from("posts").delete().eq("id", postId);
          router.back();
        },
      },
    ]);
  }

  // ── save edits ──
  async function saveEdits() {
    if (!post || saving) return;
    setSaving(true);

    await supabase.from("posts").update({ caption: editCaption.trim() || null }).eq("id", postId);

    if (post.post_type === "project") {
      await supabase.from("project_posts").update({
        title:       editTitle.trim(),
        description: editDesc.trim() || null,
      }).eq("post_id", postId);
    }

    setSaving(false);
    setEditing(false);
    if (fetchAllRef.current) {
      await fetchAllRef.current(true);
    }
  }

  // ─────────────────────────────────────────
  // RENDER HELPERS
  // ─────────────────────────────────────────

  function renderPostBody() {
    if (!post) return null;

    const pp  = post.project_posts;
    const op  = post.offer_posts;
    const img = [...(post.post_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0];

    return (
      <View style={{ paddingHorizontal: spacing.base }}>

        {/* ── Author row ── */}
        <View style={{ flexDirection: "row", paddingTop: insets.top + spacing.md, alignItems: "center", gap: spacing.sm, marginBottom: spacing.md }}>
          <Pressable
            style={{ flex: 1, flexDirection: "row" }}
            onPress={() => {
              if (post.user_id === myProfile?.id) return;
              router.push(`/profile/${post.user_id}`);
            }}
          >
            {post.profiles?.avatar ? (
              <Image
                source={{ uri: post.profiles.avatar }}
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
                  {post.profiles?.username?.[0]?.toUpperCase() ?? "?"}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text.secondary, fontSize: typography.bodySm.size, fontWeight: "600" }}>
                {post.profiles?.username ?? "Unknown"}
              </Text>
              <Text style={{ color: colors.text.tertiary, fontSize: typography.caption?.size ?? 11, marginTop: 1 }}>
                {timeAgo(post.created_at)}
              </Text>
            </View>
          </Pressable>

          {/* Post type badge */}
          <View style={{
            backgroundColor: post.post_type === "offer"
              ? colors.tint.success + "22"
              : colors.surface.skillhive + "18",
            paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: 999,
          }}>
            <Text style={{
              color:    post.post_type === "offer" ? colors.tint.success : colors.surface.skillhive,
              fontSize: 11, fontWeight: "700",
            }}>
              {post.post_type === "offer" ? "Offer" : post.post_type === "project" ? "Project" : "Media"}
            </Text>
          </View>
        </View>

        {/* ── PROJECT body ── */}
        {post.post_type === "project" && pp && (
          <>
            {editing ? (
              <View style={{ gap: spacing.sm, marginBottom: spacing.md }}>
                <TextInput
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="Project title"
                  placeholderTextColor={colors.text.tertiary}
                  style={{
                    backgroundColor: colors.surface.secondary, borderRadius: radii.lg,
                    paddingHorizontal: spacing.md, paddingVertical: 12,
                    color: colors.text.primary, fontSize: typography.subtitle.size, fontWeight: "700",
                  }}
                />
                <TextInput
                  value={editDesc}
                  onChangeText={setEditDesc}
                  placeholder="Description"
                  placeholderTextColor={colors.text.tertiary}
                  multiline
                  style={{
                    backgroundColor: colors.surface.secondary, borderRadius: radii.lg,
                    paddingHorizontal: spacing.md, paddingVertical: 12,
                    color: colors.text.primary, fontSize: typography.body.size,
                    minHeight: 100, textAlignVertical: "top",
                    lineHeight: typography.body.lineHeight,
                  }}
                />
              </View>
            ) : (
              <>
                <Text style={{
                  color: colors.text.primary, fontSize: typography.title.size,
                  fontWeight: "800", marginBottom: spacing.xs,
                }}>
                  {pp.title}
                </Text>

                {(pp.started_at || pp.ended_at) && (
                  <Text style={{ color: colors.text.tertiary, fontSize: typography.bodySm.size, marginBottom: spacing.md }}>
                    {pp.started_at ? formatDate(pp.started_at) : "?"} → {pp.ended_at ? formatDate(pp.ended_at) : "Present"}
                  </Text>
                )}

                {!!pp.description && (
                  <Text style={{
                    color: colors.text.secondary, fontSize: typography.body.size,
                    lineHeight: typography.body.lineHeight, marginBottom: spacing.md,
                  }}>
                    {pp.description}
                  </Text>
                )}
              </>
            )}

            {/* Cover image */}
            {!!img?.url && (
              <View style={{ borderRadius: radii.xl, overflow: "hidden", marginBottom: spacing.md }}>
                <View style={{
                  position: "absolute", bottom: spacing.sm, right: spacing.sm, zIndex: 1,
                  backgroundColor: pp.status === "active"
                    ? "rgba(34,197,94,0.15)" : pp.status === "completed"
                    ? "rgba(59,130,246,0.15)" : "rgba(245,158,11,0.15)",
                  paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 999,
                }}>
                  <Text style={{
                    color: pp.status === "active" ? "#22c55e" : pp.status === "completed" ? "#3b82f6" : "#f59e0b",
                    fontSize: 11, fontWeight: "700",
                  }}>
                    {pp.status.charAt(0).toUpperCase() + pp.status.slice(1)}
                  </Text>
                </View>
                <Image
                  source={{ uri: img.url }}
                  style={{ width: "100%", aspectRatio: 16 / 9 }}
                  contentFit="cover"
                />
              </View>
            )}
          </>
        )}

        {/* ── OFFER body ── */}
        {post.post_type === "offer" && op && (
          <View style={{
            backgroundColor: colors.surface.secondary, borderRadius: radii.xl,
            padding: spacing.base, marginBottom: spacing.md,
          }}>
            {!!op.company && (
              <Text style={{
                color: colors.tint.success, fontSize: 11, fontWeight: "700",
                textTransform: "uppercase", letterSpacing: 0.5,
              }}>
                {op.company}
              </Text>
            )}
            <Text style={{
              color: colors.text.primary, fontSize: typography.title.size,
              fontWeight: "800", marginTop: op.company ? spacing.xs : 0,
            }}>
              {op.role ?? "Role TBD"}
            </Text>
            {(op.salary_range || op.location) && (
              <Text style={{ color: colors.text.secondary, fontSize: typography.bodySm.size, marginTop: spacing.xs }}>
                {[op.salary_range, op.location].filter(Boolean).join(" · ")}
              </Text>
            )}
            {!!op.offer_type && (
              <View style={{ alignItems: "flex-end", marginTop: spacing.sm }}>
                <View style={{
                  backgroundColor: colors.tint.success + "22",
                  paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 999,
                }}>
                  <Text style={{ color: colors.tint.success, fontSize: 11, fontWeight: "700" }}>
                    {formatOfferType(op.offer_type)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── Caption (editable) ── */}
        {editing ? (
          <TextInput
            value={editCaption}
            onChangeText={setEditCaption}
            placeholder="Caption..."
            placeholderTextColor={colors.text.tertiary}
            multiline
            maxLength={500}
            style={{
              backgroundColor: colors.surface.secondary, borderRadius: radii.lg,
              paddingHorizontal: spacing.md, paddingVertical: 12,
              color: colors.text.primary, fontSize: typography.body.size,
              minHeight: 80, textAlignVertical: "top",
              lineHeight: typography.body.lineHeight, marginBottom: spacing.md,
            }}
          />
        ) : (
          !!post.caption && (
            <Text style={{
              color: colors.text.secondary, fontSize: typography.body.size,
              lineHeight: typography.body.lineHeight, marginBottom: spacing.md,
            }}>
              {post.caption}
            </Text>
          )
        )}

        {/* ── Stats row ── */}
        <View style={{
          flexDirection: "row", gap: spacing.md,
          paddingVertical: spacing.sm,
          borderTopWidth: 1, borderTopColor: colors.border.subtle,
          borderBottomWidth: 1, borderBottomColor: colors.border.subtle,
          marginBottom: spacing.lg,
        }}>
          <ActionRow postId={post.id} likes={post.likes_count} noborder />
        </View>

        {/* ── Comments heading ── */}
        <Text style={{
          color: colors.text.primary, fontSize: typography.body.size,
          fontWeight: "700", marginBottom: spacing.md,
        }}>
          Comments
        </Text>

      </View>
    );
  }

  // ─────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg.canvas, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={colors.tint.primary} />
      </View>
    );
  }

  if (error || !post) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg.canvas, justifyContent: "center", alignItems: "center", padding: spacing.base }}>
        <Text style={{ color: colors.text.tertiary, textAlign: "center" }}>{error ?? "Post not found."}</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: spacing.md }}>
          <Text style={{ color: colors.tint.primary, fontWeight: "600" }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const topLevel = comments.filter((c) => !c.parent_id);
  const replies  = comments.filter((c) => !!c.parent_id);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg.muted }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
    >
      {/* ── HEADER ── */}
      <View style={{
        flexDirection: "row", alignItems: "center",
        paddingHorizontal: spacing.base,
        paddingTop: Platform.OS === "ios" ? 56 : spacing.lg,
        paddingBottom: spacing.md,
        backgroundColor: colors.bg.muted,
        borderBottomWidth: 1, borderBottomColor: colors.border.subtle,
      }}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ marginRight: spacing.sm }}>
          <ArrowLeft size={22} color={colors.text.primary} strokeWidth={2} />
        </Pressable>

        <Text style={{ flex: 1, color: colors.text.primary, fontSize: typography.body.size, fontWeight: "700" }}>
          {post.post_type === "project" && post.project_posts
            ? post.project_posts.title
            : post.post_type === "offer" && post.offer_posts
            ? post.offer_posts.role ?? "Offer"
            : "Post"}
        </Text>

        {/* Owner actions */}
        {isOwner && !editing && (
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <Pressable
              onPress={() => setEditing(true)}
              hitSlop={8}
              style={{
                flexDirection: "row", alignItems: "center", gap: 4,
                backgroundColor: colors.surface.secondary,
                paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radii.pill,
              }}
            >
              <Pencil size={13} color={colors.text.secondary} strokeWidth={2} />
              <Text style={{ color: colors.text.secondary, fontSize: 12, fontWeight: "600" }}>Edit</Text>
            </Pressable>

            <Pressable
              onPress={deletePost}
              hitSlop={8}
              style={{
                flexDirection: "row", alignItems: "center", gap: 4,
                backgroundColor: "rgba(239,68,68,0.08)",
                paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radii.pill,
              }}
            >
              <Trash2 size={13} color="#ef4444" strokeWidth={2} />
              <Text style={{ color: "#ef4444", fontSize: 12, fontWeight: "600" }}>Delete</Text>
            </Pressable>
          </View>
        )}

        {/* Edit mode save/cancel */}
        {isOwner && editing && (
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <Pressable
              onPress={() => setEditing(false)}
              hitSlop={8}
              style={{
                width: 32, height: 32, borderRadius: 16,
                backgroundColor: colors.surface.secondary,
                justifyContent: "center", alignItems: "center",
              }}
            >
              <X size={15} color={colors.text.tertiary} strokeWidth={2.5} />
            </Pressable>
            <Pressable
              onPress={saveEdits}
              disabled={saving}
              hitSlop={8}
              style={{
                width: 32, height: 32, borderRadius: 16,
                backgroundColor: colors.tint.primary,
                justifyContent: "center", alignItems: "center",
              }}
            >
              {saving
                ? <ActivityIndicator size="small" color="#000" />
                : <Check size={15} color="#000" strokeWidth={2.5} />}
            </Pressable>
          </View>
        )}
      </View>

      {/* ── SCROLL BODY ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchAll(true)} tintColor={colors.tint.primary} />
        }
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {renderPostBody()}

        {/* ── COMMENTS ── */}
        <View style={{ paddingHorizontal: spacing.base }}>
          {topLevel.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: spacing.xl, gap: spacing.sm }}>
              <MessageCircle size={32} color={colors.text.tertiary} strokeWidth={1.4} />
              <Text style={{ color: colors.text.tertiary, fontSize: typography.bodySm.size }}>
                No comments yet. Be the first.
              </Text>
            </View>
          ) : (
            topLevel.map((c) => (
              <View key={c.id}>
                <CommentRow
                  comment={c}
                  currentUserId={currentUserId}
                  onDelete={deleteComment}
                  colors={colors}
                  spacing={spacing}
                  typography={typography}
                  radii={radii}
                />
                {replies.filter((r) => r.parent_id === c.id).map((r) => (
                  <CommentRow
                    key={r.id}
                    comment={r}
                    currentUserId={currentUserId}
                    onDelete={deleteComment}
                    colors={colors}
                    spacing={spacing}
                    typography={typography}
                    radii={radii}
                  />
                ))}
                <Pressable
                  onPress={() => {
                    setReplyTo(c);
                    inputRef.current?.focus();
                  }}
                  style={{ marginLeft: 42, marginBottom: spacing.md, marginTop: -spacing.xs }}
                >
                  <Text style={{ color: colors.text.tertiary, fontSize: 11, fontWeight: "600" }}>
                    Reply
                  </Text>
                </Pressable>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* ── COMMENT INPUT ── */}
      <View style={{
        borderTopWidth: 1, borderTopColor: colors.border.subtle,
        backgroundColor: colors.bg.elevated,
        paddingHorizontal: spacing.base,
        paddingTop: spacing.sm,
        paddingBottom: Platform.OS === "ios" ? 32 : spacing.md,
      }}>
        {!!replyTo && (
          <View style={{
            flexDirection: "row", alignItems: "center",
            backgroundColor: colors.surface.secondary,
            borderRadius: radii.lg, paddingHorizontal: spacing.sm,
            paddingVertical: 6, marginBottom: spacing.sm, gap: spacing.sm,
          }}>
            <ChevronRight size={13} color={colors.text.tertiary} strokeWidth={2} />
            <Text style={{ flex: 1, color: colors.text.tertiary, fontSize: 12 }} numberOfLines={1}>
              Replying to <Text style={{ fontWeight: "700", color: colors.text.secondary }}>
                {replyTo.profiles?.username ?? "someone"}
              </Text>
            </Text>
            <Pressable onPress={() => setReplyTo(null)} hitSlop={8}>
              <X size={13} color={colors.text.tertiary} strokeWidth={2.5} />
            </Pressable>
          </View>
        )}

        <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "flex-end" }}>
          <TextInput
            ref={inputRef}
            value={commentText}
            onChangeText={setCommentText}
            placeholder="Write a comment..."
            placeholderTextColor={colors.text.tertiary}
            multiline
            maxLength={2000}
            style={{
              flex: 1,
              backgroundColor: colors.surface.secondary,
              borderRadius: radii.xl,
              paddingHorizontal: spacing.md,
              paddingVertical: 10,
              color: colors.text.primary,
              fontSize: typography.body.size,
              maxHeight: 100,
            }}
          />
          <Pressable
            onPress={submitComment}
            disabled={!commentText.trim() || submitting}
            style={{
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: commentText.trim() ? colors.tint.primary : colors.surface.secondary,
              justifyContent: "center", alignItems: "center",
            }}
          >
            {submitting
              ? <ActivityIndicator size="small" color="#000" />
              : <Send size={16} color={commentText.trim() ? "#000" : colors.text.tertiary} strokeWidth={2} />}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}