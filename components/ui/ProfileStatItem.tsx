import { useTheme } from "@/hooks/useTheme";
import { StyleSheet, Text, View } from "react-native";

type ProfileStatItemProps = {
  value: string | number;
  label: string;
  showDivider?: boolean;
};

const ProfileStatItem = ({
  value,
  label,
  showDivider = false,
}: ProfileStatItemProps) => {
  const { colors } = useTheme();

  return (
    <>
      <View style={styles.container}>
        <Text
          style={[
            styles.value,
            {
              color: colors.text.primary,
            },
          ]}
        >
          {value}
        </Text>

        <Text
          style={[
            styles.label,
            {
              color: colors.text.secondary,
            },
          ]}
        >
          {label}
        </Text>
      </View>

      {showDivider ? (
        <View
          style={[
            styles.divider,
            {
              backgroundColor: colors.border.subtle,
            },
          ]}
        />
      ) : null}
    </>
  );
};

export default ProfileStatItem;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  value: {
    fontSize: 22,
    fontWeight: "800",
  },

  label: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "600",
  },

  divider: {
    width: 1,
    marginVertical: 6,
  },
});
