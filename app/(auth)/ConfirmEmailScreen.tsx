import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "@/components/ui/Text";
import { storyRingGradient } from "@/constants/tokens";
import { useTheme } from "@/hooks/useTheme";

type Props = {
  email: string;
};

export default function ConfirmEmailScreen({ email }: Props) {
  const { colors, spacing, radii } = useTheme();
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.muted }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <View
          style={{
            flex:              1,
            alignItems:        "center",
            justifyContent:    "center",
            paddingHorizontal: spacing.xl,
          }}
        >
          {/* Logo */}
          <View
            style={{
              width:         96,
              height:        96,
              borderRadius:  radii.xxl,
              overflow:      "hidden",
              marginBottom:  spacing.xl,
              shadowColor:   colors.tint.primary,
              shadowOffset:  { width: 0, height: 10 },
              shadowOpacity: 0.28,
              shadowRadius:  18,
              elevation:     10,
            }}
          >
            <LinearGradient
              colors={storyRingGradient as unknown as [string, string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
            >
              <Image
                source={require("../../assets/images/skillhive.png")}
                style={{ width: 56, height: 56, tintColor: colors.text.onTint }}
                contentFit="contain"
              />
            </LinearGradient>
          </View>

          {/* Envelope icon */}
          <Text style={{ fontSize: 56, marginBottom: spacing.lg }}>📬</Text>

          <Text variant="headline" tone="primary" align="center">
            Check your email
          </Text>

          <Text
            variant="body"
            tone="secondary"
            align="center"
            style={{ marginTop: spacing.sm, maxWidth: 300 }}
          >
            We sent a confirmation link to
          </Text>

          <Text
            variant="body"
            tone="primary"
            align="center"
            style={{ fontWeight: "700", marginTop: 4, maxWidth: 300 }}
          >
            {email}
          </Text>

          <Text
            variant="body"
            tone="secondary"
            align="center"
            style={{ marginTop: spacing.sm, maxWidth: 300 }}
          >
            Click the link in the email to activate your account and get in.
          </Text>

          {/* Divider */}
          <View
            style={{
              width:           40,
              height:          1,
              backgroundColor: colors.border.subtle,
              marginVertical:  spacing.xl,
            }}
          />

          <Text variant="caption" tone="tertiary" align="center">
            Wrong email?
          </Text>

          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={{ marginTop: spacing.xs }}
          >
            <Text
              variant="caption"
              align="center"
              style={{ color: colors.tint.primary, fontWeight: "700" }}
            >
              Go back and try again
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}