import ProfileProjects from "@/components/ui/ProfileProjects";
import ProfileStatItem from "@/components/ui/ProfileStatItem";
import { useProfile } from "@/hooks/profileContext";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/lib/supabase";
import { ImageBackground } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInUp, FadeInDown } from "react-native-reanimated";

const R = 12;
const MONO = Platform.OS === "ios" ? "Courier New" : "monospace";
const EMBER = "#fffd01";

type AllyStatus = "none" | "pending_sent" | "pending_received" | "accepted" | "loading";

type ViewedProfile = {
  id: string;
  username: string | null;
  avatar: string | null;
  banner: string | null;
  bio: string | null;
  displayname: string;
  followers: number;
  following: number;
};

export default function ViewProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { profile: myProfile } = useProfile();
  const router = useRouter();

  const [viewed, setViewed] = useState<ViewedProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [allyStatus, setAllyStatus] = useState<AllyStatus>("loading");
  const [actionLoading, setActionLoading] = useState(false);

  const BG_MUT  = colors?.bg?.muted        ?? "#110f0d";
  const SURFACE = colors?.surface?.secondary ?? "#1a1714";
  const BORDER  = colors?.border?.subtle    ?? "#3a322c";
  const INK     = colors?.text?.primary     ?? "#e8e0d5";
  const INK_MUT = colors?.text?.secondary   ?? "#9a9189";

  // ── fetch profile ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoadingProfile(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar, banner, bio, displayname, followers, following")
        .eq("id", id)
        .single();

      if (!error && data) setViewed(data);
      setLoadingProfile(false);
    })();
  }, [id]);

  // ── fetch ally status ──────────────────────────────────────────────────────
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

    if (!data) { setAllyStatus("none"); return; }

    if (data.status === "accepted") { setAllyStatus("accepted"); return; }
    if (data.status === "pending") {
      setAllyStatus(
        data.requester_id === myProfile!.id ? "pending_sent" : "pending_received"
      );
      return;
    }
    setAllyStatus("none");
  }

  // ── send request ───────────────────────────────────────────────────────────
  async function sendAllyRequest() {
    if (!myProfile?.id || !id) return;
    setActionLoading(true);
    const { error } = await supabase
      .from("allies")
      .insert({ requester_id: myProfile.id, receiver_id: id });

    if (!error) setAllyStatus("pending_sent");
    setActionLoading(false);
  }

  // ── accept request ─────────────────────────────────────────────────────────
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

  // ── withdraw / cancel ──────────────────────────────────────────────────────
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

  // ── ally button rendering ──────────────────────────────────────────────────
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
                <Text style={[styles.allyBtnLabel, { color: INK_MUT }]}>⚔ ALLIED</Text>
                <Text style={[styles.allyBtnSub, { color: BORDER }]}>tap to remove</Text>
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
                <Text style={[styles.allyBtnLabel, { color: INK_MUT }]}>⏳ REQUEST SENT</Text>
                <Text style={[styles.allyBtnSub, { color: BORDER }]}>tap to cancel</Text>
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

    // none — default send button
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
          : <Text style={[styles.allyBtnLabel, { color: EMBER }]}>⚔ FORM ALLIANCE</Text>
        }
      </Pressable>
    );
  }

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

  return (
    <View style={{ flex: 1, backgroundColor: BG_MUT }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* ── Back button ── */}
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Text style={[styles.backBtnText, { color: EMBER, fontFamily: MONO }]}>← BACK</Text>
        </Pressable>

        {/* ── Banner ── */}
        <View style={styles.banner}>
          <ImageBackground
            source={
              viewed.banner
                ? { uri: viewed.banner }
                : require("@/assets/images/tanjiro.png")
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
          {/* avatar row */}
          <View style={styles.avatarRow}>
            <Image
              source={{
                uri: viewed.avatar ?? "https://images.unsplash.com/photo-1527980965255-d3b416303d12",
              }}
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
            <ProfileStatItem value={viewed.following ?? 0} label="Allied With" showDivider />
            <ProfileStatItem value={viewed.followers ?? 0} label="Allies" />
          </View>

          {/* ── Projects ── */}
          <ProfileProjects userId={viewed.id} />

          {/* footer */}
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
  footerLine: {
    fontSize: 9,
    letterSpacing: 3,
    textTransform: "uppercase",
    textAlign: "center",
    marginTop: 12,
    marginBottom: 4,
  },
});