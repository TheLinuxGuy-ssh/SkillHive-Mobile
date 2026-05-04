import { useTheme } from "@/hooks/useTheme";
import { Link } from "expo-router";
import { Image, Text, View } from "react-native";

const Index = () => {
  const { colors, spacing, radii, typography } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg.muted,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{ color: colors.text.primary, fontSize: typography.title.size }}
      >
        Welcome to SkillHive
      </Text>
      <Image
        style={{ width: 100, height: 100 }}
        source={require("@/assets/images/skillhive.png")}
        alt=""
      />
      <Link
        href="/"
        style={{
          fontSize: typography.subtitle.size,
          textDecorationLine: "underline",
          color: colors.text.primary,
        }}
      >
        Go to Login
      </Link>
    </View>
  );
};

export default Index;
