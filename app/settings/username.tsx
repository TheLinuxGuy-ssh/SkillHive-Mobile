import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Feather";

export default function UsernamePage() {
  const { colors } = useTheme();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const { data } = await supabase.auth.getUser();

    setUsername(
      data.user?.user_metadata?.username ??
        data.user?.email?.split("@")[0] ??
        "",
    );
  };

  const updateUsername = async () => {
    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      data: {
        username,
      },
    });

    setLoading(false);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    Alert.alert("Success", "Username updated");
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg.canvas,
      }}
    >
      <SafeAreaView style={{ flex: 1, padding: 20 }}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={[
              styles.backButton,
              {
                backgroundColor: colors.surface.secondary,
              },
            ]}
          >
            <Icon name="chevron-left" size={18} color={colors.text.primary} />
          </Pressable>

          <Text
            style={[
              styles.title,
              {
                color: colors.text.primary,
              },
            ]}
          >
            Username
          </Text>

          <View style={{ width: 40 }} />
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface.primary,
              borderColor: colors.border.subtle,
            },
          ]}
        >
          <Text
            style={[
              styles.label,
              {
                color: colors.text.secondary,
              },
            ]}
          >
            Username
          </Text>

          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="Enter username"
            placeholderTextColor={colors.text.tertiary}
            style={[
              styles.input,
              {
                backgroundColor: colors.surface.secondary,
                color: colors.text.primary,
                borderColor: colors.border.subtle,
              },
            ]}
          />

          <Pressable
            onPress={updateUsername}
            disabled={loading}
            style={[
              styles.saveButton,
              {
                backgroundColor: colors.tint.primary,
              },
            ]}
          >
            <Text
              style={[
                styles.saveText,
                {
                  color: colors.text.black,
                },
              ]}
            >
              {loading ? "Saving..." : "Save"}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },

  title: {
    fontSize: 18,
    fontWeight: "800",
  },

  card: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 10,
  },

  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 54,
    fontSize: 15,
    marginBottom: 20,
  },

  saveButton: {
    height: 54,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },

  saveText: {
    fontSize: 15,
    fontWeight: "800",
  },
});
