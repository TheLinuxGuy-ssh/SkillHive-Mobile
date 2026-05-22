import EditFieldModal from "@/components/ui/EditFieldModal";
import { Text } from "@/components/ui/Text";
import { WorkRoomCard } from "@/components/ui/WorkRoomCard";
import { computePhase } from "@/hooks/sessionPhase";
import { useActiveRooms } from "@/hooks/useActiveRooms";
import { useTheme } from "@/hooks/useTheme";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const LOGO_SIZE = 50;

// ─── Index ──────────────────────────────────────────────────────────────────

const Index = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const HEADER_HEIGHT = LOGO_SIZE + insets.top + 20;

  const { rooms, loading } = useActiveRooms();

  // Room name state
  const [sheetVisible, setSheetVisible] = useState(false);
  const [roomName, setRoomName] = useState("");

  const scrollY = useRef(new Animated.Value(0)).current;

  const translateY = useRef(new Animated.Value(0)).current;
  const translateYValue = useRef(0);

  const lastScrollY = useRef(0);
  const contentHeight = useRef(0);
  const containerHeight = useRef(0);

  // Safely track animated value
  useEffect(() => {
    const id = translateY.addListener(({ value }) => {
      translateYValue.current = value;
    });

    return () => {
      translateY.removeListener(id);
    };
  }, [translateY]);

  const isWithinBounds = (y: number) =>
    y >= 0 && y <= contentHeight.current - containerHeight.current;

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: true,
      listener: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const currentY = e.nativeEvent.contentOffset.y;

        if (!isWithinBounds(currentY)) return;

        const diff = currentY - lastScrollY.current;

        let next = translateYValue.current - diff;

        if (next < -HEADER_HEIGHT) {
          next = -HEADER_HEIGHT;
        }

        if (next > 0) {
          next = 0;
        }

        translateY.setValue(next);

        lastScrollY.current = currentY;
      },
    },
  );

  const snapHeader = () => {
    const current = translateYValue.current;

    Animated.spring(translateY, {
      toValue: current > -HEADER_HEIGHT / 2 ? 0 : -HEADER_HEIGHT,
      useNativeDriver: true,
      bounciness: 0,
    }).start();
  };

  function handleOpenSheet() {
    setRoomName("");
    setSheetVisible(true);
  }

  function handleCloseSheet() {
    setSheetVisible(false);
    setRoomName("");
  }

  function handleStartSession() {
    const trimmed = roomName.trim();

    if (!trimmed) return;

    setSheetVisible(false);
    setRoomName("");

    router.push({
      pathname: "/rooms/[roomName]",
      params: { roomName: trimmed },
    });
  }

  function handleJoinRoom(name: string) {
    router.push({
      pathname: "/rooms/[roomName]",
      params: { roomName: name },
    });
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg.muted,
      }}
      onLayout={(e: LayoutChangeEvent) => {
        containerHeight.current = e.nativeEvent.layout.height;
      }}
    >
      <Animated.ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 10,
          paddingHorizontal: 14,
          gap: 12,
        }}
        onContentSizeChange={(_, h) => {
          contentHeight.current = h;
        }}
        onScroll={onScroll}
        onScrollEndDrag={snapHeader}
        onMomentumScrollEnd={snapHeader}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        bounces
      >
        {/* Section header */}
        <View style={styles.sectionHeader}>
          <Text
            variant="subtitle"
            style={{
              color: colors.text.primary,
            }}
          >
            Work Rooms
          </Text>

          <View style={styles.sectionRight}>
            {rooms.length > 0 && (
              <View
                style={[
                  styles.countChip,
                  {
                    backgroundColor: colors.surface.skillhive + "22",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.countText,
                    {
                      color: colors.text.skillhive,
                    },
                  ]}
                >
                  {rooms.length} live
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.createBtn,
                {
                  backgroundColor: colors.surface.skillhive,
                  borderColor: colors.border.primary,
                },
              ]}
              onPress={handleOpenSheet}
              activeOpacity={0.8}
            >
              <Text style={styles.createBtnText}>+ New Room</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Loading */}
        {loading && (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.text.skillhive} />
          </View>
        )}

        {/* Empty state */}
        {!loading && rooms.length === 0 && (
          <WorkRoomCard
            state="empty"
            name="No rooms yet"
            tag="Be the first"
            onStart={handleOpenSheet}
            timerSeconds={0}
            breakSeconds={0}
          />
        )}

        {/* Live rooms */}
        {!loading &&
          rooms.map((room) => {
            const phase = computePhase(room.session_started_at);
            const memberNames = room.participants.map(
              (p) => p.displayname || p.username,
            );

            return (
              <WorkRoomCard
                key={room.room_name}
                state={
                  phase.phase === "focus"
                    ? "active"
                    : phase.phase === "break"
                      ? "break"
                      : "empty"
                }
                name={room.room_name}
                tag={`${room.participant_count} joined`}
                members={memberNames}
                timerSeconds={
                  phase.phase === "focus" ? phase.remainingSeconds : 0
                }
                breakSeconds={
                  phase.phase === "break" ? phase.remainingSeconds : 0
                }
                onJoin={() => handleJoinRoom(room.room_name)}
              />
            );
          })}
      </Animated.ScrollView>

      {/* Create room sheet */}
      <EditFieldModal
        visible={sheetVisible}
        titlePlaceholder=""
        title="Room Name"
        btnText="Create"
        value={roomName}
        onChange={setRoomName}
        onClose={handleCloseSheet}
        onSave={handleStartSession}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },

  sectionRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  countChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },

  countText: {
    fontSize: 12,
    fontWeight: "700",
  },

  createBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },

  createBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#000000",
  },

  centered: {
    paddingVertical: 48,
    alignItems: "center",
  },
});

export default Index;
