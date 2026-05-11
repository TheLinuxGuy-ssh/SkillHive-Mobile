import EditFieldModal from "@/components/ui/EditFieldModal";
import { useProfile, type Profile } from "@/hooks/profileContext";
import { useTheme } from "@/hooks/useTheme";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Feather";

const Settings = () => {
  const { colors } = useTheme();
  const router = useRouter();

  const { profile, loading, error, updateField } = useProfile();

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedField, setSelectedField] = useState<any>(null);
  const [inputValue, setInputValue] = useState("");
  const [saving, setSaving] = useState(false);

  const settingsItems = [
    {
      key: "email",
      icon: "mail",
      label: "Email",
      value: profile?.email ?? "No email",
    },
    {
      key: "username",
      icon: "user",
      label: "Username",
      value: profile?.username ?? "Not set",
    },
    {
      key: "displayname",
      icon: "type",
      label: "Display Name",
      value: profile?.displayname ?? "Not set",
    },
    {
      key: "bio",
      icon: "edit-3",
      label: "Bio",
      value: profile?.bio ?? "No bio yet",
    },
  ];

  const openEditor = (item: any) => {
    setSelectedField(item);
    setInputValue(item.value);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!selectedField) return;
    setSaving(true);
    const ok = await updateField(
      selectedField.key as keyof Omit<Profile, "id">,
      inputValue,
    );
    setSaving(false);
    if (ok) setModalVisible(false);
  };

  return (
    <View style={{ backgroundColor: colors.bg.muted, flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 18,
            paddingBottom: 120,
          }}
          style={{ flex: 1 }}
        >
          <View style={styles.header}>
            <Pressable
              onPress={() => router.back()}
              style={[
                styles.backButton,
                {
                  backgroundColor: colors.surface.primary,
                  borderColor: colors.border.subtle,
                },
              ]}
            >
              <Icon name="chevron-left" size={18} color={colors.text.primary} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
              Profile Edit
            </Text>
            <View style={{ width: 40 }} />
          </View>
          {loading && (
            <ActivityIndicator
              color={colors.tint.primary}
              style={{ marginTop: 40 }}
            />
          )}
          {error && !loading && (
            <View
              style={{
                padding: 16,
                borderRadius: 12,
                backgroundColor: "rgba(255,80,80,0.1)",
                marginBottom: 16,
              }}
            >
              <Text style={{ color: "tomato", fontSize: 13 }}>{error}</Text>
            </View>
          )}
          {!loading && (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface.primary,
                  borderColor: colors.border.subtle,
                },
              ]}
            >
              <Animated.View
                entering={FadeInUp.duration(200).delay(100)}
                style={{
                  flex: 1,
                  width: "100%",
                  backgroundColor: colors.bg.muted,
                  alignItems: "center",
                }}
              >
                {settingsItems.map((item, index) => (
                  <Pressable
                    key={item.key}
                    onPress={() => openEditor(item)}
                    style={[
                      styles.row,
                      index !== settingsItems.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border.subtle,
                      },
                    ]}
                  >
                    <View style={styles.left}>
                      <View
                        style={[
                          styles.iconWrap,
                          { backgroundColor: colors.surface.secondary },
                        ]}
                      >
                        <Icon
                          name={item.icon as any}
                          size={15}
                          color={colors.text.primary}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[styles.label, { color: colors.text.primary }]}
                        >
                          {item.label}
                        </Text>
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.value,
                            { color: colors.text.secondary },
                          ]}
                        >
                          {item.value}
                        </Text>
                      </View>
                    </View>
                    <Icon
                      name="chevron-right"
                      size={18}
                      color={colors.text.tertiary}
                    />
                  </Pressable>
                ))}
              </Animated.View>
            </View>
          )}
        </ScrollView>
        <EditFieldModal
          visible={modalVisible}
          title={selectedField?.label ?? ""}
          value={inputValue}
          onChange={setInputValue}
          onClose={() => setModalVisible(false)}
          onSave={handleSave}
          saving={saving}
          multiline={selectedField?.key === "bio"}
        />
      </SafeAreaView>
    </View>
  );
};

export default Settings;

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 26,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: "800" },
  card: { borderRadius: 24, borderWidth: 1, overflow: "hidden" },
  row: {
    minHeight: 74,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flex: 1,
  },
  left: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  label: { fontSize: 14, fontWeight: "700" },
  value: { marginTop: 2, fontSize: 12 },
});
