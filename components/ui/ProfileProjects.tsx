import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/lib/supabase";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import Modal from "react-native-modal";

import { Gesture, GestureDetector } from "react-native-gesture-handler";

import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

type Project = {
  id: string;
  title: string;
  description: string | null;
  created_at: string | null;
};

const DISMISS_THRESHOLD = 100;
const DISMISS_VELOCITY = 700;

export default function ProfileProjects({ userId }: { userId: string }) {
  const { colors } = useTheme();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [date, setDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // ---------------------------
  // SHEET ANIMATION
  // ---------------------------

  const translateY = useSharedValue(0);

  useEffect(() => {
    if (modalOpen) {
      translateY.value = withSpring(0, {
        damping: 2000,
        stiffness: 3000,
      });
    }
  }, [modalOpen]);

  function closeModal() {
    setModalOpen(false);
  }

  const pan = Gesture.Pan()
    .activeOffsetY([0, 8])
    .failOffsetY(-5)
    .onUpdate((e) => {
      if (e.translationY > 0) {
        translateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      const shouldDismiss =
        e.translationY > DISMISS_THRESHOLD || e.velocityY > DISMISS_VELOCITY;

      if (shouldDismiss) {
        translateY.value = withTiming(600, {
          duration: 260,
        });

        runOnJS(closeModal)();
      } else {
        translateY.value = withSpring(0, {
          damping: 2000,
          stiffness: 3000,
        });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handleOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [0, 120],
      [1, 0.3],
      Extrapolation.CLAMP,
    ),
  }));

  // ---------------------------
  // FETCH PROJECTS
  // ---------------------------

  useEffect(() => {
    if (!userId) return;

    fetchProjects();
  }, [userId]);

  async function fetchProjects() {
    setLoading(true);

    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setProjects(data);
    }

    setLoading(false);
  }

  // ---------------------------
  // CREATE PROJECT
  // ---------------------------

  async function createProject() {
    if (!title.trim()) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("projects")
      .insert([
        {
          user_id: user.id,
          title,
          description,
          created_at: date ? date.toISOString() : null,
        },
      ])
      .select()
      .single();

    if (error) {
      console.log("Create error:", error.message);
      return;
    }

    if (data) {
      setProjects((prev) => [data, ...prev]);

      setTitle("");
      setDescription("");
      setDate(null);

      closeModal();
    }
  }

  // ---------------------------
  // UI
  // ---------------------------

  return (
    <View style={{ marginTop: 20 }}>
      {/* HEADER */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: colors.text.white,
          }}
        >
          Projects
        </Text>

        <Pressable
          onPress={() => setModalOpen(true)}
          style={{
            backgroundColor: "rgba(255, 253, 1, 0.15)",
            paddingVertical: 6,
            paddingHorizontal: 12,
            borderRadius: 10,
          }}
        >
          <Text
            style={{
              color: colors.text.skillhive,
              fontSize: 15,
            }}
          >
            + Add
          </Text>
        </Pressable>
      </View>

      {/* LIST */}
      {loading ? (
        <ActivityIndicator />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {projects.length === 0 ? (
            <Text style={{ opacity: 0.5 }}>No projects yet</Text>
          ) : (
            projects.map((p) => (
              <View
                key={p.id}
                style={{
                  borderWidth: 1,
                  borderColor: "#e5e5e5",
                  borderRadius: 16,
                  backgroundColor: colors.text.white,
                  padding: 14,
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                  }}
                >
                  {p.title}
                </Text>

                {p.created_at && (
                  <Text
                    style={{
                      fontSize: 12,
                      opacity: 0.5,
                      marginTop: 2,
                    }}
                  >
                    Started: {new Date(p.created_at).toDateString()}
                  </Text>
                )}

                {!!p.description && (
                  <Text
                    style={{
                      marginTop: 8,
                      opacity: 0.8,
                    }}
                  >
                    {p.description}
                  </Text>
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* BOTTOM SHEET */}
      <Modal
        isVisible={modalOpen}
        onBackdropPress={closeModal}
        onBackButtonPress={closeModal}
        useNativeDriver
        useNativeDriverForBackdrop
        backdropOpacity={0.45}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        animationInTiming={320}
        animationOutTiming={260}
        style={{
          justifyContent: "flex-end",
          margin: 0,
        }}
      >
        <GestureDetector gesture={pan}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <Animated.View
              style={[
                {
                  backgroundColor: colors.surface.primary,
                  borderTopLeftRadius: 30,
                  borderTopRightRadius: 30,
                  paddingTop: 14,
                },
                sheetStyle,
              ]}
            >
              {/* HANDLE */}
              <Animated.View
                style={[
                  {
                    width: 36,
                    height: 4,
                    borderRadius: 999,
                    backgroundColor: colors.border.subtle,
                    alignSelf: "center",
                    marginBottom: 22,
                  },
                  handleOpacity,
                ]}
              />

              {/* CONTENT */}
              <View
                style={{
                  paddingHorizontal: 24,
                  paddingBottom: 40,
                }}
              >
                {/* TITLE */}
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: "800",
                    color: colors.text.primary,
                    marginBottom: 18,
                  }}
                >
                  New Project
                </Text>

                {/* PROJECT TITLE */}
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Project title"
                  placeholderTextColor={colors.text.tertiary}
                  style={{
                    height: 56,
                    borderRadius: 16,
                    paddingHorizontal: 16,
                    borderWidth: 1,
                    borderColor: colors.border.subtle,
                    backgroundColor: colors.surface.secondary,
                    color: colors.text.primary,
                    marginBottom: 14,
                  }}
                />

                {/* DESCRIPTION */}
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  placeholder="Description"
                  placeholderTextColor={colors.text.tertiary}
                  style={{
                    minHeight: 120,
                    borderRadius: 16,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderWidth: 1,
                    borderColor: colors.border.subtle,
                    backgroundColor: colors.surface.secondary,
                    color: colors.text.primary,
                    marginBottom: 14,
                    textAlignVertical: "top",
                  }}
                />

                {/* DATE BUTTON */}
                <Pressable
                  onPress={() => setShowDatePicker(true)}
                  style={{
                    height: 56,
                    borderRadius: 16,
                    paddingHorizontal: 16,
                    borderWidth: 1,
                    borderColor: colors.border.subtle,
                    backgroundColor: colors.surface.secondary,
                    justifyContent: "center",
                    marginBottom: 20,
                  }}
                >
                  <Text
                    style={{
                      color: colors.text.primary,
                    }}
                  >
                    {date ? date.toDateString() : "Select project start date"}
                  </Text>
                </Pressable>

                {/* DATE PICKER */}
                {showDatePicker && (
                  <DateTimePicker
                    value={date || new Date()}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                      setShowDatePicker(false);

                      if (selectedDate) {
                        setDate(selectedDate);
                      }
                    }}
                  />
                )}

                {/* BUTTONS */}
                <View
                  style={{
                    flexDirection: "row",
                    gap: 10,
                  }}
                >
                  <Pressable
                    onPress={closeModal}
                    style={({ pressed }) => ({
                      flex: 1,
                      height: 54,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: colors.border.subtle,
                      backgroundColor: pressed
                        ? colors.surface.secondary
                        : "transparent",
                      justifyContent: "center",
                      alignItems: "center",
                    })}
                  >
                    <Text
                      style={{
                        color: colors.text.secondary,
                        fontWeight: "600",
                      }}
                    >
                      Cancel
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={createProject}
                    style={({ pressed }) => ({
                      flex: 2,
                      height: 54,
                      borderRadius: 16,
                      backgroundColor: pressed
                        ? colors.tint.primary + "aa"
                        : colors.tint.primary,
                      justifyContent: "center",
                      alignItems: "center",
                    })}
                  >
                    <Text
                      style={{
                        color: colors.text.black,
                        fontWeight: "800",
                      }}
                    >
                      Create Project
                    </Text>
                  </Pressable>
                </View>
              </View>
            </Animated.View>
          </KeyboardAvoidingView>
        </GestureDetector>
      </Modal>
    </View>
  );
}
