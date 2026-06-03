import CustomAlert from "@/components/CustomAlert";
import MenuItem from "@/components/ui/MenuItem";
import OfferCard, { OfferCardData } from "@/components/ui/OfferCard";
import ProfileStatItem from "@/components/ui/ProfileStatItem";
import ProjectCard, { ProjectCardData } from "@/components/ui/ProjectCard";
import ThemeMenuItem from "@/components/ui/ThemeMenuItem";
import { useProfile } from "@/hooks/profileContext";
import { useSignOut } from "@/hooks/useSignOut";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { ImageBackground } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { Edit, Pen } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

// ── Constants ──────────────────────────────────────────────────────────────
const R         = 12;
const MONO      = Platform.OS === "ios" ? "Courier New" : "monospace";
const EMBER     = "#fffd01";
const PAGE_SIZE = 10;

// ── Types ──────────────────────────────────────────────────────────────────
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

// ── Storage helper ─────────────────────────────────────────────────────────
async function uploadToStorage(
  bucket: string,
  path: string,
  uri: string,
  oldUrl?: string | null
): Promise<string> {
  const ext      = uri.split(".").pop()?.split("?")[0] ?? "jpg";
  const mimeType = ext === "png" ? "image/png" : "image/jpeg";

  if (oldUrl) {
    const marker  = `/object/public/${bucket}/`;
    const oldPath = oldUrl.includes(marker)
      ? oldUrl.split(marker)[1]
      : null;
    if (oldPath) {
      await supabase.storage.from(bucket).remove([decodeURIComponent(oldPath)]);
    }
  }

  const formData = new FormData();
  formData.append("file", { uri, name: `upload.${ext}`, type: mimeType } as any);

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, formData, { contentType: mimeType, upsert: true });

  if (error) throw error;

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return urlData.publicUrl;
}

// ── Component ──────────────────────────────────────────────────────────────
export default function Profile() {
  const { colors, mode: themeMode, setThemeMode } = useTheme();
  const { profile, updateField }                  = useProfile();
  const { handleSignOut, isSigningOut, alertConfig, isVisible, hideAlert } = useSignOut();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);

  // image upload
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  // posts
  const [posts,        setPosts]        = useState<RawPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [hasMore,      setHasMore]      = useState(true);
  const [cursor,       setCursor]       = useState<string | null>(null);
  const isFetchingMore                  = useRef(false);

  const BG      = colors?.bg?.primary;
  const BG_MUT  = colors?.bg?.muted         ?? "#110f0d";
  const SURFACE = colors?.surface?.secondary ?? "#1a1714";
  const BORDER  = colors?.border?.subtle     ?? "#3a322c";
  const INK     = colors?.text?.primary      ?? "#e8e0d5";
  const INK_MUT = colors?.text?.secondary    ?? "#9a9189";

  // ── Auth listener ────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: l } = supabase.auth.onAuthStateChange((_e, s) =>
      setUser(s?.user ?? null)
    );
    return () => l.subscription.unsubscribe();
  }, []);

  // ── Fetch own posts ──────────────────────────────────────────────────────
  const fetchUserPosts = useCallback(async (isRefresh = false) => {
    const uid = profile?.id;
    if (!uid) return;

    if (isRefresh) setRefreshing(true);
    else           setLoadingPosts(true);

    const { data, error: fetchError } = await supabase
      .from("posts")
      .select(FEED_QUERY)
      .eq("user_id", uid)
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
  }, [profile?.id]);

  const fetchMorePosts = useCallback(async () => {
    const uid = profile?.id;
    if (!uid || isFetchingMore.current || !hasMore || !cursor) return;
    isFetchingMore.current = true;

    const { data } = await supabase
      .from("posts")
      .select(FEED_QUERY)
      .eq("user_id", uid)
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
  }, [profile?.id, cursor, hasMore]);

  useEffect(() => {
    if (profile?.id) fetchUserPosts();
  }, [profile?.id]);

  // ── Image upload ─────────────────────────────────────────────────────────
  async function pickAndUpload(type: "avatar" | "banner") {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === "avatar" ? [1, 1] : [16, 7],
      quality: 0.85,
    });

    if (result.canceled || !result.assets?.[0]) return;
    const uri = result.assets[0].uri;
    const uid = profile?.id;
    if (!uid) return;

    try {
      type === "avatar" ? setUploadingAvatar(true) : setUploadingBanner(true);
      const path      = `${uid}/${type}-${Date.now()}.jpg`;
      const oldUrl    = type === "avatar" ? profile?.avatar : profile?.banner;
      const publicUrl = await uploadToStorage("profile-images", path, uri, oldUrl);
      await updateField(type === "avatar" ? "avatar" : "banner", publicUrl);
    } catch (e) {
      console.error(`Upload ${type} failed:`, e);
    } finally {
      type === "avatar" ? setUploadingAvatar(false) : setUploadingBanner(false);
    }
  }

  // ── Render post ──────────────────────────────────────────────────────────
  function renderPost(row: RawPost) {
    switch (row.post_type) {
      case "project": {
        const data = toProjectCardData(row);
        if (!data) return null;
        return (
          <ProjectCard
            key={row.id}
            data={data}
            onPress={(id) => router.push(`/post/${id}`)}
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
            onPress={(id) => router.push(`/post/${id}`)}
          />
        );
      }
      default:
        return null;
    }
  }

  // ── UI ───────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
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
          {/* ── Banner ── */}
          <Pressable style={styles.banner} onPress={() => pickAndUpload("banner")}>
            <ImageBackground
              source={
                profile?.banner
                  ? { uri: profile.banner }
                  : require("@/assets/images/tanjiro.png")
              }
              style={{ flex: 1 }}
            />
            <View
              style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(10,10,10,0.4)" }]}
              pointerEvents="none"
            />
            <View
              style={[styles.bannerEditBadge, {
                backgroundColor: colors.bg.accentDim,
              }]}
              pointerEvents="none"
            >
              {uploadingBanner
                ? <ActivityIndicator size="small" color={EMBER} />
                : <Text style={[styles.bannerEditText, { color: colors.text.skillhive }]}>
                      <Pen size={10} color={colors.text.skillhive} />
                </Text>
              }
            </View>
          </Pressable>

          {/* ── Card ── */}
          <Animated.View
            entering={FadeInUp.duration(260).delay(80)}
            style={[styles.card, { backgroundColor: colors.bg.muted, borderColor: BORDER }]}
          >
            {/* avatar + edit profile */}
            <View style={styles.avatarRow}>
              <Pressable
                onPress={() => pickAndUpload("avatar")}
                style={({ pressed }) => [
                  styles.avatarWrap,
                  { opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Image
                  source={{
                    uri: profile?.avatar ??
                      "https://images.unsplash.com/photo-1527980965255-d3b416303d12",
                  }}
                  style={[styles.avatar, { borderColor: BG }]}
                />
                {/* <View style={styles.avatarOverlay} pointerEvents="none">
                  {uploadingAvatar
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.avatarOverlayIcon}>
                        <Pen color={"#fff"} size={20} />
                    </Text>
                  }
                </View> */}
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.pillBtn,
                  {
                    borderColor:     colors.surface.skillhive,
                    backgroundColor: colors.bg.accentDim,
                    opacity:         pressed ? 0.7 : 1,
                  },
                ]}
                onPress={() => router.push("/settings/profile")}
              >
                <Text style={[styles.pillBtnText, { color: colors.text.skillhive }]}>
                  Edit Profile
                </Text>
              </Pressable>
            </View>

            {/* name + username */}
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: INK }]}>{profile?.displayname}</Text>
              <Text style={[styles.username, { color: INK_MUT, fontFamily: MONO }]}>
                [{profile?.username}]
              </Text>
            </View>

            {/* bio */}
            <Text style={[styles.bio, { color: INK_MUT }]}>
              {profile?.bio ?? "No bio yet."}
            </Text>

            {/* ── Stats bar ── */}
            <View style={[styles.statsBar, { backgroundColor: SURFACE, borderColor: BORDER, borderRadius: R }]}>
              {/* <ProfileStatItem value={profile?.following || 0} label="Allied With" showDivider /> */}
              <ProfileStatItem value="12" label="Streak" />
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

            {/* ── Preferences ── */}
            <View style={[styles.block, { backgroundColor: SURFACE, borderColor: BORDER, borderRadius: R }]}>
              <Text style={[styles.sectionLabel, { color: colors.text.skillhive }]}>
                Preferences
              </Text>
              <ThemeMenuItem active={themeMode} onChange={setThemeMode} />
              <View style={[styles.divider, { backgroundColor: BORDER }]} />
              <MenuItem icon="circle-question" label="Help & Support" />
              <MenuItem
                icon="right-from-bracket"
                label={isSigningOut ? "Logging out…" : "Logout"}
                onPress={handleSignOut}
                disabled={isSigningOut}
                danger
              />
            </View>

            <Text style={[styles.footerLine, { color: BORDER, fontFamily: MONO }]}>
              © SkillHiive
            </Text>
          </Animated.View>
        </ScrollView>

        {alertConfig && (
          <CustomAlert
            visible={isVisible}
            title={alertConfig.title}
            message={alertConfig.message}
            buttons={alertConfig.buttons}
            type={alertConfig.type}
            onDismiss={hideAlert}
          />
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    height: 180,
    overflow: "hidden",
  },
  bannerEditBadge: {
    position: "absolute",
    top: 15,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 5,
    // borderWidth: 1,
  },
  bannerEditText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2,
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
  avatarWrap: {
    width: 82,
    height: 82,
    borderRadius: 41,
  },
  avatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 3,
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 41,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarOverlayIcon: {
    fontSize: 20,
    color: "#fff",
    fontWeight: "700",
  },
  pillBtn: {
    borderWidth: 1,
    borderRadius: 0,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  pillBtnText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
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
  block: {
    borderWidth: 1,
    padding: 18,
    marginBottom: 20,
    gap: 14,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 2,
  },
  divider: {
    height: 1,
    marginVertical: 2,
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
    marginTop: 4,
    marginBottom: 4,
  },
});