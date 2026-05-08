import { useTheme } from "@/hooks/useTheme";
import { StyleSheet, View } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome6";
import { Text } from "./Text";

const StatCard = ({
  icon,
  value,
  label,
}: {
  icon: string;
  value: string;
  label: string;
}) => {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.statCard,
        {
          backgroundColor: colors.surface.secondary,
          borderColor: colors.border.subtle,
          position: "relative",
        },
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: "rgba(255, 253, 1, 0.15)" },
        ]}
      >
        <Icon name={icon} size={14} color={colors.tint.primary} />
      </View>
      <Text style={[styles.statLabel, { color: colors.text.secondary }]}>
        {label}
      </Text>
      <Text style={[styles.statValue, { color: colors.text.primary }]}>
        {value}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  statCard: {
    width: "47%",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    minHeight: 85,
    justifyContent: "space-between",
  },

  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    position: "absolute",
    right: 10,
    top: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  statValue: {
    fontSize: 18,
    fontWeight: "800",
  },

  statLabel: {
    fontSize: 12,
    marginTop: 0,
  },
});

export default StatCard;
