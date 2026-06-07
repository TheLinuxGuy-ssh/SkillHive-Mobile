import OfferCard, { OfferCardData } from "@/components/ui/OfferCard";
import ProfileStatItem from "@/components/ui/ProfileStatItem";
import ProjectCard, { ProjectCardData } from "@/components/ui/ProjectCard";
import { useProfile } from "@/hooks/profileContext";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/lib/supabase";
import { ImageBackground } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

// ── Constants ──────────────────────────────────────────────────────────────
const R         = 12;
const MONO      = Platform.OS === "ios" ? "Courier New" : "monospace";
const EMBER     = "#fffd01";
const PAGE_SIZE = 10;

// ── Types ──────────────────────────────────────────────────────────────────
type AllyStatus = "none" | "pending_sent" | "pending_received" | "accepted" | "loading";

type ViewedProfile = {
  id:          string;
  username:    string | null;
  avatar:      string | null;
  banner:      string | null;
  bio:         string | null;
  displayname: string;
};

type RawPost = {
  id:             string;
  post_type:      "project" | "media" | "offer";
  caption:        string | null;
  likes_count:    number;
  comments_count: number;
  created_at:     string;
  profiles: { username: string | null; avatar: string | null } | null;
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
  post_images: { url: string; sort_order: number }[] | null;
};

const FEED_QUERY = `
  id,
  post_type,
  caption,
  likes_count,
  comments_count,
  created_at,
  profiles:profiles!posts_user_id_profiles_fkey (
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

// ── Transformers ───────────────────────────────────────────────────────────
function toProjectCardData(row: RawPost): ProjectCardData | null {
  const pp = row.project_posts;
  if (!pp) return null;
  const sortedImages = [...(row.post_images ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order
  );
  return {
    post_id:        row.id,
    caption:        row.caption,
    likes_count:    row.likes_count,
    comments_count: row.comments_count,
    title:          pp.title,
    description:    pp.description,
    started_at:     pp.started_at,
    ended_at:       pp.ended_at,
    status:         pp.status,
    cover_url:      sortedImages[0]?.url ?? null,
    author_name:    row.profiles?.username ?? "Unknown",
    author_avatar:  row.profiles?.avatar ?? null,
  };
}

function toOfferCardData(row: RawPost): OfferCardData | null {
  const op = row.offer_posts;
  if (!op) return null;
  return {
    post_id:        row.id,
    caption:        row.caption,
    likes_count:    row.likes_count,
    comments_count: row.comments_count,
    created_at:     row.created_at,
    author_name:    row.profiles?.username ?? "Unknown",
    author_avatar:  row.profiles?.avatar ?? null,
    company:        op.company,
    role:           op.role,
    salary_range:   op.salary_range,
    location:       op.location,
    offer_type:     op.offer_type,
  };
}

// ── Component ──────────────────────────────────────────────────────────────
export default function ViewProfile() {
  const params = useLocalSearchParams<{ id: string }>();
  const id     = Array.isArray(params.id) ? params.id[0] : params.id;

  const { colors }              = useTheme();
  const { profile: myProfile }  = useProfile();
  const router                  = useRouter();

  const [viewed,         setViewed]         = useState<ViewedProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [allyStatus,     setAllyStatus]     = useState<AllyStatus>("loading");
  const [actionLoading,  setActionLoading]  = useState(false);
  const [allyCount,      setAllyCount]      = useState(0);

  // posts
  const [posts,        setPosts]        = useState<RawPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [hasMore,      setHasMore]      = useState(true);
  const [cursor,       setCursor]       = useState<string | null>(null);
  const isFetchingMore                  = useRef(false);

  const BG_MUT  = colors?.bg?.muted          ?? "#110f0d";
  const SURFACE = colors?.surface?.secondary ?? "#1a1714";
  const BORDER  = colors?.border?.subtle     ?? "#3a322c";
  const INK     = colors?.text?.primary      ?? "#e8e0d5";
  const INK_MUT = colors?.text?.secondary    ?? "#9a9189";

  // ── Self-visit redirect ────────────────────────────────────────────────────
  // useEffect(() => {
  //   if (id && myProfile?.id && id === myProfile.id) {
  //     // Replace so the user can't "go back" to this screen
  //     router.replace("/main/profile");
  //   }
  // }, [id, myProfile?.id]);

  // ── Fetch profile ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoadingProfile(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar, banner, bio, displayname")
        .eq("id", id)
        .single();
      if (!error && data) setViewed(data);
      setLoadingProfile(false);
    })();
  }, [id]);

  // ── Fetch ally count ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    supabase
      .from("allies")
      .select("id", { count: "exact", head: true })
      .or(`requester_id.eq.${id},receiver_id.eq.${id}`)
      .eq("status", "accepted")
      .then(({ count }) => setAllyCount(count ?? 0));
  }, [id]);

  // ── Fetch ally status ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!id || !myProfile?.id) return;
    fetchAllyStatus();
  }, [id, myProfile?.id]);

  async function fetchAllyStatus() {
    setAllyStatus("loading");
    const { data } = await supabase
      .from("allies")
      .select("id, requester_id, status")
      .or(
        `and(requester_id.eq.${myProfile!.id},receiver_id.eq.${id}),and(requester_id.eq.${id},receiver_id.eq.${myProfile!.id})`
      )
      .maybeSingle();

    if (!data)                      { setAllyStatus("none");    return; }
    if (data.status === "accepted") { setAllyStatus("accepted"); return; }
    if (data.status === "pending") {
      setAllyStatus(
        data.requester_id === myProfile!.id ? "pending_sent" : "pending_received"
      );
      return;
    }
    setAllyStatus("none");
  }

  // ── Fetch posts ────────────────────────────────────────────────────────────
  const fetchUserPosts = useCallback(async (isRefresh = false) => {
    if (!id) return;
    if (isRefresh) setRefreshing(true);
    else           setLoadingPosts(true);

    const { data, error: fetchError } = await supabase
      .from("posts")
      .select(FEED_QUERY)
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE)
      .returns<RawPost[]>();

    if (!fetchError && data) {
      setPosts(data);
      setHasMore(data.length === PAGE_SIZE);
      setCursor(data.length > 0 ? data[data.length - 1].created_at : null);
    }

    setLoadingPosts(false);
    setRefreshing(false);
  }, [id]);

  const fetchMorePosts = useCallback(async () => {
    if (!id || isFetchingMore.current || !hasMore || !cursor) return;
    isFetchingMore.current = true;

    const { data } = await supabase
      .from("posts")
      .select(FEED_QUERY)
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .lt("created_at", cursor)
      .limit(PAGE_SIZE)
      .returns<RawPost[]>();

    if (data) {
      setPosts((prev) => [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
      setCursor(data.length > 0 ? data[data.length - 1].created_at : cursor);
    }

    isFetchingMore.current = false;
  }, [id, cursor, hasMore]);

  useEffect(() => {
    if (id) fetchUserPosts();
  }, [id]);

  // ── Ally actions ───────────────────────────────────────────────────────────
  async function sendAllyRequest() {
    if (!myProfile?.id || !id) return;
    setActionLoading(true);
    const { error } = await supabase
      .from("allies")
      .insert({ requester_id: myProfile.id, receiver_id: id });
    if (!error) setAllyStatus("pending_sent");
    setActionLoading(false);
  }

  async function acceptAllyRequest() {
    if (!myProfile?.id || !id) return;
    setActionLoading(true);
    const { error } = await supabase
      .from("allies")
      .update({ status: "accepted" })
      .eq("requester_id", id)
      .eq("receiver_id", myProfile.id);
    if (!error) setAllyStatus("accepted");
    setActionLoading(false);
  }

  async function withdrawRequest() {
    if (!myProfile?.id || !id) return;
    setActionLoading(true);
    await supabase
      .from("allies")
      .delete()
      .or(
        `and(requester_id.eq.${myProfile.id},receiver_id.eq.${id}),and(requester_id.eq.${id},receiver_id.eq.${myProfile.id})`
      );
    setAllyStatus("none");
    setActionLoading(false);
  }

  // ── Render post ────────────────────────────────────────────────────────────
  function renderPost(row: RawPost) {
    switch (row.post_type) {
      case "project": {
        const data = toProjectCardData(row);
        if (!data) return null;
        return (
          <ProjectCard
            key={row.id}
            data={data}
            onPress={(postId) => router.push(`/post/${postId}`)}
          />
        );
      }
      case "offer": {
        const data = toOfferCardData(row);
        if (!data) return null;
        return (
          <OfferCard
            key={row.id}
            data={data}
            onPress={(postId) => router.push(`/post/${postId}`)}
          />
        );
      }
      default:
        return null;
    }
  }

  // ── Ally button ────────────────────────────────────────────────────────────
  function AllyButton() {
    if (allyStatus === "loading") {
      return (
        <View style={[styles.allyBtn, { borderColor: BORDER }]}>
          <ActivityIndicator size="small" color={EMBER} />
        </View>
      );
    }

    if (allyStatus === "accepted") {
      return (
        <Pressable
          style={[styles.allyBtn, styles.allyBtnAccepted, { borderColor: BORDER, backgroundColor: SURFACE }]}
          onPress={withdrawRequest}
          disabled={actionLoading}
        >
          {actionLoading
            ? <ActivityIndicator size="small" color={INK_MUT} />
            : <>
                <Text style={[styles.allyBtnLabel, { color: INK_MUT }]}>ALLIED</Text>
                <Text style={[styles.allyBtnSub,   { color: BORDER  }]}>tap to remove</Text>
              </>
          }
        </Pressable>
      );
    }

    if (allyStatus === "pending_sent") {
      return (
        <Pressable
          style={[styles.allyBtn, { borderColor: BORDER, backgroundColor: SURFACE }]}
          onPress={withdrawRequest}
          disabled={actionLoading}
        >
          {actionLoading
            ? <ActivityIndicator size="small" color={EMBER} />
            : <>
                <Text style={[styles.allyBtnLabel, { color: INK_MUT }]}>REQUEST SENT</Text>
                <Text style={[styles.allyBtnSub,   { color: BORDER  }]}>tap to cancel</Text>
              </>
          }
        </Pressable>
      );
    }

    if (allyStatus === "pending_received") {
      return (
        <Animated.View entering={FadeInDown.duration(200)} style={styles.allyBtnRow}>
          <Pressable
            style={[styles.allyBtn, styles.allyBtnHalf, { borderColor: EMBER, backgroundColor: "#24280B" }]}
            onPress={acceptAllyRequest}
            disabled={actionLoading}
          >
            {actionLoading
              ? <ActivityIndicator size="small" color={EMBER} />
              : <Text style={[styles.allyBtnLabel, { color: EMBER }]}>⚔ ACCEPT</Text>
            }
          </Pressable>
          <Pressable
            style={[styles.allyBtn, styles.allyBtnHalf, { borderColor: BORDER, backgroundColor: SURFACE }]}
            onPress={withdrawRequest}
            disabled={actionLoading}
          >
            <Text style={[styles.allyBtnLabel, { color: INK_MUT }]}>✕ DECLINE</Text>
          </Pressable>
        </Animated.View>
      );
    }

    return (
      <Pressable
        style={({ pressed }) => [
          styles.allyBtn,
          { borderColor: EMBER, backgroundColor: "#24280B", opacity: pressed ? 0.7 : 1 },
        ]}
        onPress={sendAllyRequest}
        disabled={actionLoading}
      >
        {actionLoading
          ? <ActivityIndicator size="small" color={EMBER} />
          : <Text style={[styles.allyBtnLabel, { color: EMBER }]}>FORM ALLIANCE</Text>
        }
      </Pressable>
    );
  }

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (loadingProfile) {
    return (
      <View style={[styles.centered, { backgroundColor: BG_MUT }]}>
        <ActivityIndicator color={EMBER} />
      </View>
    );
  }

  if (!viewed) {
    return (
      <View style={[styles.centered, { backgroundColor: BG_MUT }]}>
        <Text style={{ color: INK_MUT, fontFamily: MONO }}>[ user not found ]</Text>
      </View>
    );
  }

  // ── UI ─────────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: BG_MUT }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchUserPosts(true)}
            tintColor={EMBER}
          />
        }
      >
        {/* ── Back button ── */}
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={[styles.backBtnText, { color: EMBER, fontFamily: MONO }]}>← BACK</Text>
        </Pressable>

        {/* ── Banner ── */}
        <View style={styles.banner}>
          <ImageBackground
            source={
              viewed.banner
                ? { uri: viewed.banner }
                : require("@/assets/images/banner.png")
            }
            style={{ flex: 1 }}
          />
          <View
            style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(10,10,10,0.4)" }]}
            pointerEvents="none"
          />
        </View>

        {/* ── Card ── */}
        <Animated.View
          entering={FadeInUp.duration(260).delay(80)}
          style={[styles.card, { backgroundColor: colors.bg.muted, borderColor: BORDER }]}
        >
          {/* avatar + ally button */}
          <View style={styles.avatarRow}>
            <Image
              source={
                viewed.avatar
                ? { uri: viewed.avatar }
                : require("@/assets/images/user.png")
              }
              style={[styles.avatar, { borderColor: colors.bg.muted }]}
            />
            <AllyButton />
          </View>

          {/* name + username */}
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: INK }]}>{viewed.displayname}</Text>
            {viewed.username && (
              <Text style={[styles.username, { color: INK_MUT, fontFamily: MONO }]}>
                [{viewed.username}]
              </Text>
            )}
          </View>

          {/* bio */}
          <Text style={[styles.bio, { color: INK_MUT }]}>
            {viewed.bio ?? "No bio yet."}
          </Text>

          {/* ── Stats bar ── */}
          <View style={[styles.statsBar, { backgroundColor: SURFACE, borderColor: BORDER, borderRadius: R }]}>
            <ProfileStatItem value={allyCount} label="Allied With" showDivider />
            <ProfileStatItem value="—" label="Streak" />
          </View>

          {/* ── Posts ── */}
          <View style={{ marginBottom: 24 }}>
            <Text style={[styles.sectionLabel, { color: colors.text.skillhive, marginBottom: 14 }]}>
              Posts
            </Text>

            {loadingPosts ? (
              <ActivityIndicator color={EMBER} style={{ marginVertical: 24 }} />
            ) : posts.length === 0 ? (
              <Text style={[styles.emptyText, { color: INK_MUT, fontFamily: MONO }]}>
                [ no posts yet ]
              </Text>
            ) : (
              <>
                {posts.map(renderPost)}

                {hasMore && (
                  <TouchableOpacity
                    onPress={fetchMorePosts}
                    style={{ padding: 16, alignItems: "center" }}
                  >
                    <Text style={{ color: INK_MUT, fontSize: 12, letterSpacing: 1 }}>
                      load more
                    </Text>
                  </TouchableOpacity>
                )}

                {!hasMore && posts.length > 0 && (
                  <Text style={[styles.emptyText, { color: BORDER, fontFamily: MONO }]}>
                    [ end of posts ]
                  </Text>
                )}
              </>
            )}
          </View>

          <Text style={[styles.footerLine, { color: BORDER, fontFamily: MONO }]}>
            © SkillHiive
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backBtn: {
    position: "absolute",
    top: 52,
    left: 16,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  backBtnText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
  },
  banner: {
    height: 180,
    overflow: "hidden",
  },
  card: {
    marginTop: -24,
    borderTopLeftRadius: R * 2,
    borderTopRightRadius: R * 2,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 8,
  },
  avatarRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: -40,
    marginBottom: 16,
  },
  avatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 3,
  },
  allyBtnRow: {
    flexDirection: "row",
    gap: 8,
  },
  allyBtn: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 140,
  },
  allyBtnHalf: {
    minWidth: 0,
    flex: 1,
  },
  allyBtnAccepted: {
    flexDirection: "column",
    gap: 2,
  },
  allyBtnLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.8,
  },
  allyBtnSub: {
    fontSize: 8,
    letterSpacing: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 6,
  },
  name: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  username: {
    fontSize: 13,
    fontWeight: "500",
  },
  bio: {
    fontSize: 12,
    lineHeight: 20,
    marginBottom: 22,
  },
  statsBar: {
    flexDirection: "row",
    borderWidth: 1,
    paddingVertical: 18,
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 2,
  },
  emptyText: {
    fontSize: 11,
    letterSpacing: 1.5,
    textAlign: "center",
    marginVertical: 20,
  },
  footerLine: {
    fontSize: 9,
    letterSpacing: 3,
    textTransform: "uppercase",
    textAlign: "center",
    marginTop: 12,
    marginBottom: 4,
  },
});