import { useTheme } from "@/hooks/useTheme";
import ThemeSwitcher from "@/components/ui/ThemeSwitcher";
import { StyleSheet, Text, View } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome6";

type ThemeOption = "light" | "dynamic" | "dark";

type Props = {
  active: ThemeOption;
  onChange: (t: ThemeOption) => void;
};

export default function ThemeMenuItem({ active, onChange }: Props) {
  const { colors } = useTheme();

  const INK = colors?.text?.primary ?? "#e8e0d5";

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <View style={styles.iconWrapper}>
          <Icon name="sun" size={15} color={INK} solid />
        </View>
        <Text style={[styles.label, { color: INK }]}>Theme</Text>
      </View>

      <ThemeSwitcher active={active} onChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 58,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(124,92,255,0.12)",
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});