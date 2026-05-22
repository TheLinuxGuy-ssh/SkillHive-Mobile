import { useTheme } from "@/hooks/useTheme";
import { Text, View } from "react-native";

const Chat = () => {
  const { colors } = useTheme();
  return (
    <View style={{ backgroundColor: colors.bg.muted, flex: 1 }}>
      <View style={{ flex: 1, margin: 10 }}>
        <Text style={{ color: colors.text.primary }}>
          chitty chitty chat chat chit chat
        </Text>
        <View>
          <Text style={{ color: colors.text.primary }}>something else</Text>
        </View>
      </View>
    </View>
  );
};

export default Chat;
