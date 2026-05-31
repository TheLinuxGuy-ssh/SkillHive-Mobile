import { useTheme } from "@/hooks/useTheme";
import { Platform, StyleSheet, Text, View } from "react-native";

type ProfileStatItemProps = {
  value: string | number;
  label: string;
  showDivider?: boolean;
};

const MONO = Platform.OS === "ios" ? "Courier New" : "monospace";
const EMBER = "#fffd01";

const ProfileStatItem = ({ value, label, showDivider = false }: ProfileStatItemProps) => {
  const { colors } = useTheme();
  const INK     = colors?.text?.primary   ?? "#e8e0d5";
  const INK_MUT = colors?.text?.secondary ?? "#9a9189";
  const BORDER  = colors?.border?.subtle  ?? "#3a322c";

  return (
    <>
      <View style={styles.container}>
        <Text style={[styles.value, { color: INK }]}>{value}</Text>
        <Text style={[styles.label, { color: INK_MUT }]}>{label}</Text>
      </View>
      {showDivider && <View style={[styles.divider, { backgroundColor: BORDER }]} />}
    </>
  );
};

export default ProfileStatItem;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  value: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  divider: {
    width: 1,
    marginVertical: 8,
  },
});