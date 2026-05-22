import React from "react";

import { Text, View } from "react-native";

import { Gesture, GestureDetector } from "react-native-gesture-handler";

import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";

interface Props {
  active: string;
  onPress: (section: string) => void;
}

const sections = [
  { id: "hive", label: "H" },
  { id: "cohort", label: "C" },
  { id: "global", label: "G" },
];

const ITEM_SIZE = 42;
const CONTAINER_PADDING = 4;
const STEP = ITEM_SIZE;

export default function FloatingSectionNav({ active, onPress }: Props) {
  const { colors, radii, elevation, motion } = useTheme();

  const indexMap: Record<string, number> = {
    hive: 0,
    cohort: 1,
    global: 2,
  };

  const translateY = useSharedValue(indexMap[active] * STEP);

  const startY = useSharedValue(0);

  React.useEffect(() => {
    translateY.value = withSpring(
      indexMap[active] * STEP,
      motion.spring.snappy,
    );
  }, [active]);

  const setSection = (index: number) => {
    const clamped = Math.max(0, Math.min(index, sections.length - 1));

    const section = sections[clamped];

    translateY.value = withSpring(clamped * STEP, motion.spring.snappy);

    onPress(section.id);
  };

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      startY.value = translateY.value;
    })
    .onUpdate((e) => {
      const max = (sections.length - 1) * STEP;

      translateY.value = Math.max(
        0,
        Math.min(startY.value + e.translationY, max),
      );
    })
    .onEnd(() => {
      const snapped = Math.round(translateY.value / STEP);

      runOnJS(setSection)(snapped);
    });

  const pillStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: translateY.value,
      },
    ],
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <View
        style={{
          position: "absolute",

          top: "50%",
          right: 10,

          marginTop: -(
            (ITEM_SIZE * sections.length + CONTAINER_PADDING * 2) /
            2
          ),

          flexDirection: "column",

          backgroundColor: colors.surface.raised,

          borderRadius: radii.pill,

          borderWidth: 1,

          borderColor: colors.border.subtle,

          padding: CONTAINER_PADDING,

          overflow: "hidden",

          ...elevation.md,
        }}
      >
        {/* Active Pill */}
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",

              left: CONTAINER_PADDING,

              top: CONTAINER_PADDING,

              width: ITEM_SIZE,
              height: ITEM_SIZE,

              borderRadius: radii.pill,

              backgroundColor: colors.tint.primary,
            },
            pillStyle,
          ]}
        />

        {/* Sections */}
        {sections.map((section, index) => {
          const isActive = active === section.id;

          return (
            <Text
              key={section.id}
              onPress={() => setSection(index)}
              style={{
                width: ITEM_SIZE,
                height: ITEM_SIZE,

                textAlign: "center",

                textAlignVertical: "center",

                lineHeight: ITEM_SIZE,

                color: isActive ? colors.text.black : colors.text.secondary,

                fontWeight: "700",

                zIndex: 10,
              }}
            >
              {section.label}
            </Text>
          );
        })}
      </View>
    </GestureDetector>
  );
}
