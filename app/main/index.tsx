import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetTextInput,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Text } from "@/components/ui/Text";
import { WorkRoomCard } from "@/components/ui/WorkRoomCard";
import { computePhase, FOCUS_MS, BREAK_MS, CYCLE_MS } from "@/hooks/sessionPhase";
import { useActiveRooms } from "@/hooks/useActiveRooms";
import { useTheme } from "@/hooks/useTheme";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
import { ScreenWithHeader } from "@/components/ScreenWithHeader";

const LOGO_SIZE = 50;

const Index = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const HEADER_HEIGHT = LOGO_SIZE + insets.top + 20;
  const { rooms, loading } = useActiveRooms();

  const [roomName, setRoomName] = useState("");

  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = ["30%"];

  const scrollY = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const translateYValue = useRef(0);
  const lastScrollY = useRef(0);
  const contentHeight = useRef(0);
  const containerHeight = useRef(0);

  useEffect(() => {
    const id = translateY.addListener(({ value }) => {
      translateYValue.current = value;
    });
    return () => translateY.removeListener(id);
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
        if (next < -HEADER_HEIGHT) next = -HEADER_HEIGHT;
        if (next > 0) next = 0;
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

  // ── FIX 1: present() not expand() — present() is the correct
  // BottomSheetModal API and starts from dismissed state
  const handleOpenSheet = useCallback(() => {
    setRoomName("");
    bottomSheetRef.current?.present();
  }, []);

  const handleCloseSheet = useCallback(() => {
    bottomSheetRef.current?.dismiss();
  }, []);

  function handleStartSession() {
    const trimmed = roomName.trim();
    if (!trimmed) return;
    handleCloseSheet();
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

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        opacity={0.6}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    [],
  );

  return (

    <View
      style={{ flex: 1, backgroundColor: colors.bg.muted }}
      onLayout={(e: LayoutChangeEvent) => {
        containerHeight.current = e.nativeEvent.layout.height;
      }}
    >
      <Animated.ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 10, paddingHorizontal: 14, gap: 12 }}
        onContentSizeChange={(_, h) => { contentHeight.current = h; }}
        onScroll={onScroll}
        onScrollEndDrag={snapHeader}
        onMomentumScrollEnd={snapHeader}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        bounces
      >
        {/* Section header */}
        <View style={styles.sectionHeader}>
          <Text variant="subtitle" style={{ color: colors.text.primary }}>
            Work Rooms
          </Text>

          <View style={styles.sectionRight}>
            {rooms.length > 0 && (
              <View style={[styles.countChip, { backgroundColor: colors.surface.skillhive + "22" }]}>
                <Text style={[styles.countText, { color: colors.text.skillhive }]}>
                  {rooms.length} live
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.createBtn, { backgroundColor: colors.bg.accentDim, borderColor: colors.border.primary }]}
              onPress={handleOpenSheet}
              activeOpacity={0.8}
            >
              <Text style={[styles.createBtnText, { color: colors.text.skillhive }]}>+ New Room</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading && (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.text.skillhive} />
          </View>
        )}

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

        {!loading && rooms.map((room) => {
  const phase = computePhase(room.session_started_at);
  const memberNames = room.participants.map(
    (p) => p.displayname || p.username,
  );
 
  const sessionStartMs = room.session_started_at
    ? new Date(room.session_started_at).getTime()
    : undefined;
 
  // Derive phaseStartedAt from the session start + cycle position
  // so the card knows exactly when the current focus/break phase began
  const elapsed = sessionStartMs ? Date.now() - sessionStartMs : 0;
  const posInCycle = elapsed % CYCLE_MS;
  const phaseStartedAt = sessionStartMs
    ? Date.now() - posInCycle + (phase.phase === "break" ? FOCUS_MS : 0)
    : undefined;
 
  // Correct: Date.now() - posInCycle = when this cycle started
  // For focus phase: that's when focus started
  // For break phase: add FOCUS_MS to get when break started
 
  const phaseDurationMs = phase.phase === "focus" ? FOCUS_MS : BREAK_MS;
 
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
      phaseStartedAt={phaseStartedAt}
      onJoin={() => handleJoinRoom(room.room_name)} 
      phaseDurationMs={phaseDurationMs}
    />
  );
})}
      </Animated.ScrollView>

      {/* ── Bottom Sheet ── */}
      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        enablePanDownToClose
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        onDismiss={() => setRoomName("")}
        backdropComponent={renderBackdrop}
        backgroundStyle={{
          backgroundColor: colors.bg.muted,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
        }}
        handleIndicatorStyle={{ backgroundColor: "#3a322c" }}
      >
        <BottomSheetView style={styles.sheetContent}>
          <Text variant="subtitle" style={{ color: colors.text.primary, marginBottom: 16 }}>
            Name your room
          </Text>

          <BottomSheetTextInput
            value={roomName}
            onChangeText={setRoomName}
            autoFocus
            placeholder="e.g. deep work, thesis grind…"
            placeholderTextColor={colors.text.secondary}
            returnKeyType="done"
            onSubmitEditing={handleStartSession}
            style={[styles.input, {
              borderColor: colors.border.primary,
              color: colors.text.primary,
              backgroundColor: "#0b0c04",
            }]}
          />

          <TouchableOpacity
            style={[styles.createBtn, {
              backgroundColor: "#24280B",
              borderColor: colors.border.primary,
              alignSelf: "flex-end",
            }]}
            activeOpacity={0.8}
            onPress={handleStartSession}
          >
            <Text style={[styles.createBtnText, { color: colors.text.skillhive }]}>
              Create
            </Text>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  );
};

export default Index;

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
    borderRadius: 1,
    borderWidth: 1,
  },
  createBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  centered: {
    paddingVertical: 48,
    alignItems: "center",
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  input: {
    borderWidth: 1,
    borderRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 20,
    fontSize: 14,
  },
});