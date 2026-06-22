import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import OfferCard, { OfferCardData } from "@/components/ui/OfferCard";
import ProjectCard, { ProjectCardData } from "@/components/ui/ProjectCard";
import MediaCard, { MediaCardData } from "@/components/ui/MediaCard";
import SectionHeader from "@/components/ui/SectionHeader";
import ShareBar from "@/components/ui/ShareBar";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/lib/supabase";
import { router, useFocusEffect } from "expo-router";

type RawPost = {
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

const PAGE_SIZE        = 10;
const REFRESH_INTERVAL = 5 * 60 * 1000;

const FEED_QUERY = `
  id,
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

function toProjectCardData(row: RawPost): ProjectCardData | null {
  const pp = row.project_posts;
  if (!pp) return null;
  const sortedImages = [...(row.post_images ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order
  );
  return {
    user_id:        row.profiles.id,
    post_id:        row.id,
    caption:        row.caption,
    likes_count:    row.likes_count,
    comments_count: row.comments_count,
    title:          pp.title,
    description:    pp.description,
    started_at:     pp.started_at,
    ended_at:       pp.ended_at,
    created_at:     row.created_at,
    status:         pp.status,
    cover_url:      sortedImages[0]?.url ?? null,
    author_name:    row.profiles?.username ?? "Unknown",
    author_avatar:  row.profiles?.avatar ?? null,
  };
}

function toMediaCardData(row: RawPost): MediaCardData | null {
  const sortedImages = [...(row.post_images ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order
  );
  if (!sortedImages[0]) return null;
  
  return {
    user_id:        row.profiles.id,
    post_id:        row.id,
    caption:        row.caption,
    likes_count:    row.likes_count,
    comments_count: row.comments_count,
    created_at:     row.created_at,
    cover_url:      sortedImages[0]?.url ?? null,
    author_name:    row.profiles?.username ?? "Unknown",
    author_avatar:  row.profiles?.avatar ?? null,
  };
}

function toOfferCardData(row: RawPost): OfferCardData | null {
  const op = row.offer_posts;
  if (!op) return null;
  return {
    user_id:        row.profiles.id,
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

export default function FeedScreen() {
  const { colors, spacing } = useTheme();

  const scrollRef      = useRef<ScrollView>(null);
  const intervalRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastFetchedRef = useRef<number>(0);
  const isFetchingMore = useRef(false);

  const [posts,       setPosts]       = useState<RawPost[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore,     setHasMore]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [cursor,      setCursor]      = useState<string | null>(null);

  // ── Initial load / refresh ─────────────────────────────────────────────
  const fetchFeed = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else           setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("posts")
      .select(FEED_QUERY)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE)
      .returns<RawPost[]>();

    if (fetchError) {
      setError("Couldn't load posts. Pull down to try again.");
      setLoading(false);
      setRefreshing(false);
      console.error(fetchError);
      return;
    }

    const rows = data ?? [];
    lastFetchedRef.current = Date.now();
    setPosts(rows);
    setHasMore(rows.length === PAGE_SIZE);
    setCursor(rows.length > 0 ? rows[rows.length - 1].created_at : null);
    setLoading(false);
    setRefreshing(false);
  }, []);

  // ── Keep ref to latest fetchFeed so realtime callback never goes stale ─
  const fetchFeedRef = useRef(fetchFeed);
  useEffect(() => {
    fetchFeedRef.current = fetchFeed;
  }, [fetchFeed]);

  // ── Refresh feed when returning from post detail screen ────────────────
  useFocusEffect(
    useCallback(() => {
      fetchFeedRef.current(true);
    }, [])
  );

  // ── Load more ──────────────────────────────────────────────────────────
  const fetchMore = useCallback(async () => {
    if (isFetchingMore.current || !hasMore || !cursor) return;
    isFetchingMore.current = true;
    setLoadingMore(true);

    const { data, error: fetchError } = await supabase
      .from("posts")
      .select(FEED_QUERY)
      .order("created_at", { ascending: false })
      .lt("created_at", cursor)
      .limit(PAGE_SIZE)
      .returns<RawPost[]>();

    if (!fetchError && data) {
      const rows = data ?? [];
      setPosts((prev) => [...prev, ...rows]);
      setHasMore(rows.length === PAGE_SIZE);
      setCursor(rows.length > 0 ? rows[rows.length - 1].created_at : cursor);
    }

    setLoadingMore(false);
    isFetchingMore.current = false;
  }, [cursor, hasMore]);

  // ── Scroll handler ─────────────────────────────────────────────────────
  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const scrolledTo    = layoutMeasurement.height + contentOffset.y;
    const eightyPercent = contentSize.height * 0.8;
    if (scrolledTo >= eightyPercent) fetchMore();
  }

  // ── Polling for new posts (production workaround) ──────────────────────
  // Avoids Supabase real-time subscription issues
  useEffect(() => {
    const pollInterval = setInterval(() => {
      console.log("Polling for new posts...");
      fetchFeedRef.current(true);
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(pollInterval);
  }, []);

  // ── Auto-refresh + app state ───────────────────────────────────────────
  useEffect(() => {
    fetchFeed();

    intervalRef.current = setInterval(() => {
      fetchFeed(true);
    }, REFRESH_INTERVAL);

    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        const elapsed = Date.now() - lastFetchedRef.current;
        if (elapsed >= REFRESH_INTERVAL) fetchFeed(true);
      }
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      appStateSub.remove();
    };
  }, [fetchFeed]);

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
      case "media": {
        const data = toMediaCardData(row);
        if (!data) return null;
        return (
          <MediaCard
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

  // ── UI ─────────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.muted }}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchFeed(true)}
            tintColor={colors.tint.primary}
          />
        }
        contentContainerStyle={{ paddingBottom: 140 }}
      >
        <SectionHeader title="Feed" subtitle="Everyone" />

        <View style={{ padding: spacing.base }}>
          <ShareBar onPosted={() => fetchFeed(true)} />

          {loading ? (
            <ActivityIndicator
              color={colors.tint.primary}
              style={{ marginVertical: 40 }}
            />
          ) : error ? (
            <Text
              style={{
                color:          colors.text.tertiary,
                textAlign:      "center",
                marginVertical: 40,
                fontSize:       14,
              }}
            >
              {error}
            </Text>
          ) : posts.length === 0 ? (
            <Text
              style={{
                color:          colors.text.tertiary,
                textAlign:      "center",
                marginVertical: 40,
                fontSize:       14,
              }}
            >
              No posts yet. Be the first to share something.
            </Text>
          ) : (
            <>
              {posts.map(renderPost)}

              {loadingMore && (
                <ActivityIndicator
                  color={colors.tint.primary}
                  style={{ marginVertical: 20 }}
                />
              )}

              {!hasMore && posts.length > 0 && (
                <Text
                  style={{
                    color:          colors.text.tertiary,
                    textAlign:      "center",
                    marginVertical: 20,
                    fontSize:       12,
                  }}
                >
                  You're all caught up
                </Text>
              )}

              {hasMore && posts.length > 0 && (
                <TouchableOpacity
                  onPress={fetchMore}
                  disabled={loadingMore}
                  style={{ padding: 16, alignItems: "center" }}
                >
                  {loadingMore ? (
                    <ActivityIndicator color={colors.tint.primary} />
                  ) : (
                    <Text style={{ color: colors.text.tertiary, fontSize: 13 }}>
                      Load more
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}