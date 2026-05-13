import { Text } from "@/components/ui/Text";
import { WorkRoomCard } from "@/components/ui/WorkRoomCard";
import { useTheme } from "@/hooks/useTheme";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useRef } from "react";
import {
  Animated,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const LOGO_SIZE = 50;

const Index = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = LOGO_SIZE + insets.top + 20;

  const scrollY = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const lastScrollY = useRef(0);
  const contentHeight = useRef(0);
  const containerHeight = useRef(0);

  const isWithinBounds = (y: number) => {
    return y >= 0 && y <= contentHeight.current - containerHeight.current;
  };

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: true,
      listener: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const currentY = e.nativeEvent.contentOffset.y;

        if (!isWithinBounds(currentY)) return;

        const diff = currentY - lastScrollY.current;

        let next = (translateY as any)._value - diff;

        if (next < -HEADER_HEIGHT) next = -HEADER_HEIGHT;
        if (next > 0) next = 0;

        translateY.setValue(next);
        lastScrollY.current = currentY;
      },
    },
  );

  const snapHeader = () => {
    const current = (translateY as any)._value;
    const shouldShow = current > -HEADER_HEIGHT / 2;

    Animated.spring(translateY, {
      toValue: shouldShow ? 0 : -HEADER_HEIGHT,
      useNativeDriver: true,
      bounciness: 0,
    }).start();
  };
  const router = useRouter();

  return (
    <View
      style={{ flex: 1, backgroundColor: colors.bg.muted }}
      onLayout={(e: LayoutChangeEvent) => {
        containerHeight.current = e.nativeEvent.layout.height;
      }}
    >
      <Animated.View
        style={[
          styles.header,
          {
            height: HEADER_HEIGHT,
            backgroundColor: colors.bg.elevated,
            transform: [{ translateY }],
            paddingTop: insets.top,
          },
        ]}
      >
        <View style={styles.logoContainer}>
          <Text
            variant="title"
            style={{
              color: colors.text.skillhive,
              paddingHorizontal: 20,
              fontSize: 25,
            }}
          >
            SkillHive
          </Text>
          <Image
            source={require("@/assets/images/skillhive.png")}
            style={[styles.logo, { marginHorizontal: 20 }]}
          />
        </View>
      </Animated.View>

      <Animated.ScrollView
        contentContainerStyle={{
          paddingTop: HEADER_HEIGHT,
          alignItems: "center",
          marginHorizontal: 5,
        }}
        onContentSizeChange={(_, h) => {
          contentHeight.current = h;
        }}
        style={{
          marginVertical: 10,
          marginHorizontal: 10,
          overflow: "visible",
          flex: 1,
        }}
        onScroll={onScroll}
        onScrollEndDrag={snapHeader}
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={snapHeader}
        scrollEventThrottle={16}
        bounces={true}
      >
        <Text onPress={() => router.push("../rooms/test")}>this it it</Text>
        <WorkRoomCard
          state="active"
          name="React & Frontend"
          tag="Web Dev"
          members={["Arjun K", "Rohit S", "Priya R"]}
          timerSeconds={1122}
          onJoin={() => {}}
        />
        <View style={{ height: 2000, width: "100%" }} />
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  logoContainer: {
    // backgroundColor: "#ffffff",
    flex: 1,
    alignItems: "center",
    width: "100%",
    justifyContent: "space-between",
    flexDirection: "row",
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    borderWidth: 1,
    borderColor: "#fffd01",
  },
});

export default Index;
