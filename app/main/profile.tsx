import CustomAlert from "@/components/CustomAlert";
import MenuItem from "@/components/ui/MenuItem";
import ProfileProjects from "@/components/ui/ProfileProjects";
import ProfileStatItem from "@/components/ui/ProfileStatItem";
import ThemeMenuItem from "@/components/ui/ThemeMenuItem";
import ThemeSwitcher from "@/components/ui/ThemeSwitcher";
import { useProfile } from "@/hooks/profileContext";
import { useSignOut } from "@/hooks/useSignOut";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { ImageBackground } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image, KeyboardAvoidingView, Platform,
  Pressable, ScrollView, StyleSheet, Text, View,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

// Single radius token — used everywhere so nothing fights
const R    = 12;
const MONO = Platform.OS === "ios" ? "Courier New" : "monospace";
const EMBER = "#fffd01";

export default function Profile() {
  const { colors, mode: themeMode, setThemeMode } = useTheme();
  const { profile } = useProfile();
  const [user, setUser] = useState<User | null>(null);
  const { handleSignOut, isSigningOut, alertConfig, isVisible, hideAlert } = useSignOut();
  const router = useRouter();

  const BG      = colors?.bg?.primary;
  const BG_MUT  = colors?.bg?.muted         ?? "#110f0d";
  const SURFACE = colors?.surface?.secondary ?? "#1a1714";
  const BORDER  = colors?.border?.subtle     ?? "#3a322c";
  const INK     = colors?.text?.primary      ?? "#e8e0d5";
  const INK_MUT = colors?.text?.secondary    ?? "#9a9189";

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: l } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => l.subscription.unsubscribe();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: BG_MUT }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

          {/* ── Banner ── */}
          <View style={styles.banner}>
            <ImageBackground source={require("@/assets/images/tanjiro.png")} style={{ flex: 1 }} />
            <View style={StyleSheet.absoluteFill} pointerEvents="none"
              // dark scrim so card lifts cleanly
              // eslint-disable-next-line react-native/no-inline-styles
              children={<View style={{ flex: 1, backgroundColor: "rgba(10,10,10,0.4)" }} />}
            />
          </View>

          {/* ── Card ── */}
          <Animated.View
            entering={FadeInUp.duration(260).delay(80)}
            style={[styles.card, { backgroundColor: BG, borderColor: BORDER }]}
          >
            {/* avatar + edit profile */}
            <View style={styles.avatarRow}>
              <View>
                <Image
                  source={{ uri: "https://images.unsplash.com/photo-1527980965255-d3b416303d12" }}
                  style={[styles.avatar, { borderColor: BG }]}
                />
                {/* <ProfileImageEditButton style={styles.avatarEdit} onPress={() => {}} /> */}
              </View>

              {/* pill — relational/community action */}
              <Pressable
                style={({ pressed }) => [
                  styles.pillBtn,
                  { borderColor: EMBER, opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={() => router.push("/settings/profile")}
              >
                <Text style={[styles.pillBtnText, { color: EMBER }]}>
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
              <ProfileStatItem value={profile?.followers || 0} label="Allies"      showDivider />
              <ProfileStatItem value={profile?.following || 0} label="Allied With" showDivider />
              <ProfileStatItem value="12"                      label="Streak" />
            </View>

            {/* ── Projects ── */}
            {profile?.id && <ProfileProjects userId={profile.id} />}

            {/* ── Preferences ── */}
            <View style={[styles.block, { backgroundColor: SURFACE, borderColor: BORDER, borderRadius: R }]}>
              <Text style={[styles.sectionLabel, { color: colors.text.skillhive }]}>Preferences</Text>

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

            {/* footer */}
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
  avatarEdit: {
    position: "absolute",
    right: 0,
    bottom: 0,
  },
  // pill = community/relational action
  pillBtn: {
    borderWidth: 1,
    borderRadius: 0,
    backgroundColor: "#24280B",
    paddingHorizontal: 16,
    paddingVertical: 8,
    textAlign: "center"
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
  subLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: -4,
  },
  divider: {
    height: 1,
    marginVertical: 2,
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