import { useTheme } from "@/hooks/useTheme";
import { Moon, Sun, SunMoon } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  SharedValue,
} from "react-native-reanimated";

type ThemeOption = "light" | "dynamic" | "dark";
interface Props { active: ThemeOption; onChange: (t: ThemeOption) => void; }

const EMBER       = "#fffd01";
const ITEM_WIDTH  = 52;
const ITEM_HEIGHT = 40;
const PAD         = 3;
const STEP        = ITEM_WIDTH;
const R           = 12;
const SPRING      = { damping: 20, stiffness: 220, mass: 0.8 };
const PRESS_DUR   = { duration: 140 };
const VELOCITY    = 0.03;

const THEMES = [
  { id: "light"   as const, Icon: Sun     },
  { id: "dynamic" as const, Icon: SunMoon },
  { id: "dark"    as const, Icon: Moon    },
];

function ThemeItem({ Icon, index, translateX, onPress }: {
  Icon: React.ComponentType<{ size: number; color: string }>;
  index: number;
  translateX: SharedValue<number>;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const inactive = colors?.text?.secondary ?? "#9a9189";

  // 1 when active, 0 when not
  const activeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      Math.abs(translateX.value - index * STEP),
      [0, STEP],
      [1, 0],
    ),
  }));

  const inactiveOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      Math.abs(translateX.value - index * STEP),
      [0, STEP],
      [0, 1],
    ),
  }));

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.item}>
      {/* black icon — visible when pill is on top */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.iconCenter, activeOpacity]}>
        <Icon size={18} color="#000000" />
      </Animated.View>
      {/* muted icon — visible when inactive */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.iconCenter, inactiveOpacity]}>
        <Icon size={18} color={inactive} />
      </Animated.View>
    </Pressable>
  );
}

export default function ThemeSwitcher({ active, onChange }: Props) {
  const { colors, elevation } = useTheme();
  const BORDER = colors?.border?.subtle ?? "#3a322c";

  const indexMap: Record<ThemeOption, number> = { light: 0, dynamic: 1, dark: 2 };
  const translateX = useSharedValue(indexMap[active] * STEP);
  const dragStartX = useSharedValue(0);
  const scale      = useSharedValue(1);

  React.useEffect(() => {
    translateX.value = withSpring(indexMap[active] * STEP, SPRING);
  }, [active]);

  const pressIn  = () => { "worklet"; scale.value = withTiming(1.02, PRESS_DUR); };
  const pressOut = () => { "worklet"; scale.value = withTiming(1,    PRESS_DUR); };

  const setTheme = (i: number) => {
    const idx = Math.max(0, Math.min(i, THEMES.length - 1));
    translateX.value = withSpring(idx * STEP, SPRING);
    onChange(THEMES[idx].id);
  };

  const tap = Gesture.Tap().onBegin(pressIn).onFinalize(pressOut);
  const pan = Gesture.Pan()
    .activeOffsetX([-8, 8]).failOffsetY([-10, 10])
    .onBegin(() => { dragStartX.value = translateX.value; pressIn(); })
    .onUpdate((e) => {
      translateX.value = Math.max(0, Math.min(dragStartX.value + e.translationX, (THEMES.length - 1) * STEP));
    })
    .onFinalize(pressOut)
    .onEnd((e) => {
      runOnJS(setTheme)(Math.round((translateX.value + e.velocityX * VELOCITY) / STEP));
    });

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={Gesture.Simultaneous(tap, pan)}>
      <View style={[
        styles.container,
        { borderRadius: R, borderColor: BORDER, backgroundColor: "rgba(157, 157, 95, 0.04)", ...(elevation?.md ?? {}) },
      ]}>
        <Animated.View
          pointerEvents="none"
          style={[styles.pill, { borderRadius: R - 2, backgroundColor: EMBER }, pillStyle]}
        />
        {THEMES.map((t, i) => (
          <ThemeItem
            key={t.id}
            Icon={t.Icon}
            index={i}
            translateX={translateX}
            onPress={() => setTheme(i)}
          />
        ))}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignSelf: "flex-start",
    borderWidth: 1,
    padding: PAD,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  pill: {
    position: "absolute",
    top: PAD,
    left: PAD,
    width: ITEM_WIDTH,
    height: ITEM_HEIGHT,
  },
  item: {
    width: ITEM_WIDTH,
    height: ITEM_HEIGHT,
    zIndex: 10,
  },
  iconCenter: {
    alignItems: "center",
    justifyContent: "center",
  },
});