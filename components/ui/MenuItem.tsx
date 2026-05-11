import { useTheme } from "@/hooks/useTheme";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome6";

type MenuItemProps = {
  icon: string;
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  danger?: boolean;
  rightIcon?: boolean;
};

const MenuItem = ({
  icon,
  label,
  onPress,
  disabled = false,
  danger = false,
  rightIcon = true,
}: MenuItemProps) => {
  const { colors } = useTheme();

  const iconColor = danger ? colors.tint.danger : colors.text.primary;

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      android_ripple={{
        color: "rgba(255,255,255,0.06)",
      }}
      style={({ pressed }) => [
        styles.container,
        {
          opacity: pressed ? 0.65 : 1,
        },
      ]}
    >
      <View style={styles.left}>
        <View
          style={[
            styles.iconWrapper,
            {
              backgroundColor: danger
                ? "rgba(255,59,48,0.12)"
                : "rgba(124,92,255,0.12)",
            },
          ]}
        >
          <Icon name={icon} size={15} color={iconColor} solid />
        </View>

        <Text
          style={[
            styles.label,
            {
              color: iconColor,
            },
          ]}
        >
          {label}
        </Text>
      </View>

      {rightIcon ? (
        <Icon name="chevron-right" size={13} color={colors.text.secondary} />
      ) : null}
    </Pressable>
  );
};

export default MenuItem;

const styles = StyleSheet.create({
  container: {
    minHeight: 58,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 18,
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
  },

  label: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
