import React, { useEffect, useRef } from "react";
import {
  LayoutRectangle,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import Icon from "react-native-vector-icons/FontAwesome6";

const tabs = [
  { name: "index", label: "Home", icon: "house" },
  { name: "about", label: "Learn", icon: "brain" },
  { name: "chat", label: "Chat", icon: "comments" },
  { name: "profile", label: "Profile", icon: "user" },
];

export const LinkNav = ({ state, navigation }: any) => {
  const layouts = useRef<LayoutRectangle[]>([]);

  const translateX = useSharedValue(0);
  const width = useSharedValue(0);

  const movePill = (index: number) => {
    const layout = layouts.current[index];
    if (!layout) return;

    translateX.value = withSpring(layout.x, {
      damping: 218,
      stiffness: 4020,
    });

    width.value = withSpring(layout.width, {
      damping: 20,
      stiffness: 220,
    });
  };

  useEffect(() => {
    const activeRoute = state.routes[state.index]?.name;

    const activeIndex = tabs.findIndex((t) => t.name === activeRoute);

    if (activeIndex !== -1) {
      movePill(activeIndex);
    }
  }, [state.index]);

  useEffect(() => {
    movePill(0);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    width: width.value,
  }));

  return (
    <View style={styles.nav}>
      <View style={styles.container}>
        <Animated.View style={[styles.pill, animatedStyle]} />

        {tabs.map((tab, i) => {
          const isFocused = state.routes[state.index]?.name === tab.name;

          return (
            <Pressable
              key={tab.name}
              onPress={() => navigation.navigate(tab.name)}
              onLayout={(e) => {
                layouts.current[i] = e.nativeEvent.layout;
              }}
              style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
            >
              <Animated.View style={styles.inner}>
                <Icon
                  name={tab.icon}
                  size={18}
                  solid
                  color={isFocused ? "#000" : "#fff"}
                  style={styles.icon}
                />
                <Animated.View style={[{ height: isFocused ? 0 : "auto" }]}>
                  <Text
                    style={[
                      styles.text,
                      { color: isFocused ? "#000" : "#fff" },
                      {
                        transform: [{ scale: isFocused ? 0 : 1 }],
                      },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </Animated.View>
              </Animated.View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 10,
    width: "100%",
    alignItems: "center",
  },
  nav: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    bottom: 15,
    zIndex: 999,
    margin: 10,
    elevation: 10,
  },
  container: {
    flex: 1,
    width: "auto",
    flexDirection: "row",
    borderRadius: 30,
    padding: 2,
    justifyContent: "space-evenly",
    backgroundColor: "#000000",
    paddingHorizontal: 5,
  },
  tab: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    zIndex: 2,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  pressed: { transform: [{ scale: 0.92 }] },
  inner: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 18,
    flex: 11,
  },
  icon: { fontSize: 24 },
  text: { fontSize: 10, marginTop: 4, fontWeight: "500" },
  pill: {
    position: "absolute",
    height: "90%",
    backgroundColor: "#fffd01",
    borderRadius: 24,
    left: 0,
    top: 5,
  },
});
