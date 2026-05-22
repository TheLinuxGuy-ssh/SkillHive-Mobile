import CustomAlert from "@/components/CustomAlert";
import MenuItem from "@/components/ui/MenuItem";
import ProfileImageEditButton from "@/components/ui/ProfileImageEditButton";
import ProfileProjects from "@/components/ui/ProfileProjects";
import ProfileStatItem from "@/components/ui/ProfileStatItem";
import StatCard from "@/components/ui/StatCard";
import { useProfile } from "@/hooks/profileContext";
import { useSignOut } from "@/hooks/useSignOut";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { ImageBackground } from "expo-image";
import { useRouter } from "expo-router";

import { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

const Profile = () => {
  const { colors } = useTheme();
  const { profile, loading, error, updateField } = useProfile();
  const [user, setUser] = useState<User | null>(null);

  const { handleSignOut, isSigningOut, alertConfig, isVisible, hideAlert } =
    useSignOut();

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };

    loadUser();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      },
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const router = useRouter();
  return (
    <View
      style={{
        flex: 1,
      }}
    >
      <View style={{ flex: 1, zIndex: 10, backgroundColor: colors.bg.muted }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: 120,
          }}
        >
          <View style={[styles.header]}>
            <ImageBackground
              source={require("@/assets/images/tanjiro.png")}
              style={{
                flex: 1,
              }}
            />
          </View>
          <Animated.View
            style={[styles.profileCard, {}]}
            entering={FadeInUp.duration(200).delay(100)}
          >
            <View style={styles.profileTop}>
              <View
                style={{
                  position: "relative",
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <Image
                  source={{
                    uri: "https://images.unsplash.com/photo-1527980965255-d3b416303d12",
                  }}
                  style={styles.avatar}
                />
                <ProfileImageEditButton
                  style={{ right: 0, bottom: 0 }}
                  onPress={() => console.log("profile")}
                />
              </View>
            </View>
            <View
              style={{
                display: "flex",
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Text
                style={[
                  styles.name,
                  {
                    color: colors.text.primary,
                  },
                ]}
              >
                {profile?.displayname}
              </Text>
              <Text
                style={{ color: colors.text.secondary, marginHorizontal: 10 }}
              >
                [{profile?.username}]
              </Text>
            </View>
            <Text
              style={[
                styles.email,
                {
                  color: colors.text.secondary,
                },
              ]}
            >
              {profile?.bio ?? "guest@email.com"}
            </Text>

            <View
              style={[
                styles.followContainer,
                {
                  backgroundColor: colors.surface.secondary,
                },
              ]}
            >
              <ProfileStatItem
                value={profile?.followers || 0}
                label="Allies"
                showDivider
              />

              <ProfileStatItem
                value={profile?.following || 0}
                label="Allied With"
                showDivider
              />

              <ProfileStatItem value="12" label="Streak" />
            </View>

            {/* GRID */}
            <View style={styles.grid}>
              <StatCard icon="star" value="51" label="Balance" />

              <StatCard icon="trophy" value="1" label="Level" />

              <StatCard icon="shield" value="Barefoot" label="Current League" />

              <StatCard icon="bolt" value="30" label="Total XP" />
            </View>

            {/* ACTIONS */}
            <View
              style={[
                styles.menuContainer,
                {
                  backgroundColor: colors.surface.secondary,
                  borderColor: colors.border.subtle,
                },
              ]}
            >
              {profile?.id && <ProfileProjects userId={profile.id} />}
              <Text
                style={[
                  styles.menuTitle,
                  {
                    color: colors.text.primary,
                  },
                ]}
              >
                Preferences
              </Text>

              <View style={styles.menuList}>
                <MenuItem
                  icon="user"
                  label="Edit Profile"
                  onPress={() => router.push("/settings")}
                />

                <MenuItem icon="bell" label="Notifications" />

                <MenuItem icon="shield-halved" label="Privacy & Security" />

                <MenuItem
                  icon="gear"
                  label="Settings"
                  onPress={() => router.push("../settings")}
                />

                <MenuItem icon="circle-question" label="Help & Support" />

                <MenuItem
                  icon="right-from-bracket"
                  label={isSigningOut ? "Logging out..." : "Logout"}
                  onPress={handleSignOut}
                  disabled={isSigningOut}
                  danger
                />
              </View>
            </View>
          </Animated.View>
        </ScrollView>

        {alertConfig ? (
          <CustomAlert
            visible={isVisible}
            title={alertConfig.title}
            message={alertConfig.message}
            buttons={alertConfig.buttons}
            type={alertConfig.type}
            onDismiss={hideAlert}
          />
        ) : null}
      </View>
    </View>
  );
};

export default Profile;

const styles = StyleSheet.create({
  header: {
    height: 170,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingTop: 0,
    zIndex: -1,
  },

  headerTop: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },

  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },

  profileCard: {
    marginHorizontal: 0,
    marginTop: -70,
    borderRadius: 28,
    padding: 20,
  },

  profileTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },

  avatar: {
    width: 82,
    height: 82,
    marginHorizontal: 10,
    borderRadius: 41,
  },

  friendButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },

  friendButtonText: {
    fontSize: 12,
    fontWeight: "700",
  },

  name: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 4,
  },

  email: {
    fontSize: 13,
    marginBottom: 22,
  },

  socialStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 26,
  },

  socialNumber: {
    fontSize: 18,
    fontWeight: "800",
  },

  socialLabel: {
    fontSize: 12,
    marginTop: 2,
  },

  recordButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 14,
    marginBottom: 24,
  },

  actionsCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
  },

  actionsTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 20,
  },

  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  actionText: {
    fontSize: 15,
    fontWeight: "600",
  },
  menuContainer: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 18,
    marginBottom: 22,
  },

  menuTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 18,
  },

  menuList: {
    gap: 14,
  },
  followContainer: {
    flexDirection: "row",
    borderRadius: 24,
    paddingVertical: 18,
    marginBottom: 28,
  },
});
