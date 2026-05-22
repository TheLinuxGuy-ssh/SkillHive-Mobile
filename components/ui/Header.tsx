import { Image } from "expo-image";
import React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "@/components/ui/Text";
import { useTheme } from "@/hooks/useTheme";

const LOGO_SIZE = 50;

export const HEADER_HEIGHT = LOGO_SIZE + 20;

export function Header() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: insets.top,
          height: HEADER_HEIGHT + insets.top,
          backgroundColor: colors.bg.elevated,
        },
      ]}
    >
      <View style={styles.logoContainer}>
        <Text
          variant="title"
          style={{
            color: colors.text.skillhive,
            paddingHorizontal: 20,
            fontSize: 25,
          }}
        >
          SkillHive
        </Text>

        <Image
          source={require("@/assets/images/skillhive.png")}
          style={styles.logo}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    width: "100%",
    justifyContent: "center",
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(0,0,0,0.1)",
    zIndex: 100,
  },

  logoContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    borderWidth: 1,
    borderColor: "#fffd01",
    marginHorizontal: 20,
  },
});
