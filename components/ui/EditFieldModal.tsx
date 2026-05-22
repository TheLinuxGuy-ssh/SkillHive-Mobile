import { useTheme } from "@/hooks/useTheme";
import React, { useEffect, useRef } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Modal from "react-native-modal";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

type Props = {
  visible: boolean;
  titlePlaceholder?: string;
  title: string;
  value: string;
  btnText?: string;
  onChange: (text: string) => void;
  onClose: () => void;
  onSave: () => void;
  saving?: boolean;
  multiline?: boolean;
};

const DISMISS_THRESHOLD = 100;
const DISMISS_VELOCITY = 700;

const EditFieldModal = ({
  visible,
  title,
  titlePlaceholder,
  value,
  onChange,
  btnText,
  onClose,
  onSave,
  saving,
  multiline,
}: Props) => {
  const { colors } = useTheme();
  const inputRef = useRef<TextInput>(null);

  const translateY = useSharedValue(0);

  // Reset position when modal opens, auto-focus input
  useEffect(() => {
    if (visible) {
      translateY.value = 0;
      // slight delay so modal finishes animating in first
      setTimeout(() => inputRef.current?.focus(), 320);
    }
  }, [visible]);

  const pan = Gesture.Pan()
    .activeOffsetY([0, 8])
    .failOffsetY(-5)
    .onUpdate((e) => {
      if (e.translationY > 0) translateY.value = e.translationY;
    })
    .onEnd((e) => {
      const shouldDismiss =
        e.translationY > DISMISS_THRESHOLD || e.velocityY > DISMISS_VELOCITY;

      if (shouldDismiss) {
        translateY.value = withTiming(600, { duration: 260 });
        runOnJS(onClose)();
      } else {
        translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Handle dims slightly as you drag
  const handleOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [0, 120],
      [1, 0.3],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      useNativeDriver
      useNativeDriverForBackdrop
      hideModalContentWhileAnimating
      backdropOpacity={0.45}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      animationInTiming={320}
      animationOutTiming={260}
      avoidKeyboard
      style={{ justifyContent: "flex-end", margin: 0 }}
    >
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[
            {
              backgroundColor: colors.surface.primary,
              borderTopLeftRadius: 30,
              borderTopRightRadius: 30,
              paddingHorizontal: 24,
              paddingTop: 14,
              paddingBottom: Platform.OS === "ios" ? 44 : 32,
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

          {/* TITLE */}
          <Text
            style={{
              fontSize: 22,
              fontWeight: "800",
              color: colors.text.primary,
              marginBottom: 18,
            }}
          >
            {titlePlaceholder ?? "Edit"} {title}
          </Text>

          {/* INPUT */}
          <TextInput
            ref={inputRef}
            value={value}
            onChangeText={onChange}
            multiline={multiline}
            placeholder={`Enter ${title.toLowerCase()}`}
            placeholderTextColor={colors.text.tertiary}
            returnKeyType={multiline ? "default" : "done"}
            onSubmitEditing={multiline ? undefined : onSave}
            blurOnSubmit={!multiline}
            style={{
              minHeight: multiline ? 120 : 56,
              maxHeight: multiline ? 200 : 56,
              borderRadius: 16,
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderWidth: 1,
              borderColor: colors.border.subtle,
              backgroundColor: colors.surface.secondary,
              color: colors.text.primary,
              fontSize: 15,
              marginBottom: 16,
              textAlignVertical: multiline ? "top" : "center",
            }}
          />

          {/* BUTTONS */}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={onSave}
              disabled={saving}
              style={({ pressed }) => ({
                flex: 2,
                height: 54,
                borderRadius: 16,
                backgroundColor:
                  saving || pressed
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
                  fontSize: 15,
                }}
              >
                {saving ? "Saving..." : (btnText ?? "Save Changes")}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </GestureDetector>
    </Modal>
  );
};

export default EditFieldModal;
