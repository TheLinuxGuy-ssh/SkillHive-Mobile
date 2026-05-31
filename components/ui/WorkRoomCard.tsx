import { useTheme } from "@/hooks/useTheme";
import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { Colors } from "react-native/Libraries/NewAppScreen";

export type RoomState = "active" | "break" | "empty";

export interface WorkRoomCardProps {
  state: RoomState;
  name: string;
  tag: string;
  members?: string[];
  phaseStartedAt?: number;    // ← add this
  phaseDurationMs?: number;   // ← add this
  timerSeconds?: number;
  breakSeconds?: number;
  onJoin?: () => void;
  onStart?: () => void;
  style?: ViewStyle;
}

const COLORS = {
  card: "#12131A",
  border: "#222433",
  text: "#F3F5FF",
  muted: "#8A90A8",
  faint: "#5D637B",

  // focus → red/ember — caution, high effort
  active: "#FF4D4D",
  activeSoft: "rgba(255,77,77,0.10)",

  // break → orange — warm, ease off
  break: "#FFB86B",
  breakSoft: "rgba(255,184,107,0.10)",

  success: "#7CF0B2",
};

// ─── Countdown ───────────────────────────────────────────────────────────────
// FIX: snapshot initialSeconds once on mount so progress never resets.
// We only re-snapshot if initialSeconds changes by more than 5s (prop refresh
// from server) to avoid thrashing mid-session.

function useCountdown(initialSeconds: number) {
  const snapshotRef = useRef(initialSeconds);
  const [seconds, setSeconds] = useState(initialSeconds);

  // Accept server refreshes that differ significantly, ignore small drift
  useEffect(() => {
    if (Math.abs(initialSeconds - snapshotRef.current) > 5) {
      snapshotRef.current = initialSeconds;
      setSeconds(initialSeconds);
    }
  }, [initialSeconds]);

  useEffect(() => {
    const id = setInterval(() => {
      setSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, []); // intentionally empty — runs once per mount

  const progress = useMemo(() => {
    if (!snapshotRef.current) return 0;
    return seconds / snapshotRef.current;
  }, [seconds]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return { formatted: `${mm}:${ss}`, progress };
}

// ─── Pulse Dot ───────────────────────────────────────────────────────────────

function PulseDot({ color }: { color: string }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.18, duration: 650, easing: Easing.ease, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1,    duration: 650, easing: Easing.ease, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  return (
    <Animated.View style={[styles.dot, { backgroundColor: color, transform: [{ scale }] }]} />
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ progress, color }: { progress: number; color: string }) {
  const anim = useRef(new Animated.Value(progress)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: progress,
      duration: 800,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const width = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["4%", "100%"],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.progressTrack}>
      <Animated.View style={[styles.progressFill, { width, backgroundColor: color }]} />
    </View>
  );
}

// ─── Avatar Stack ─────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  ["#30204D", "#C8A5FF"],
  ["#1E3550", "#8BC2FF"],
  ["#173B33", "#84F1C3"],
  ["#493221", "#FFC58A"],
];

function AvatarStack({ names }: { names: string[] }) {
  const visible = names.slice(0, 3);
  const overflow = names.length - 3;

  return (
    <View style={styles.avatarRow}>
      {visible.map((name, i) => {
        const initials = name.split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase();
        const [bg, color] = AVATAR_COLORS[i % AVATAR_COLORS.length];
        return (
          <View
            key={`${name}-${i}`}
            style={[styles.avatar, { backgroundColor: bg, marginLeft: i === 0 ? 0 : -8, zIndex: visible.length - i }]}
          >
            <Text style={[styles.avatarText, { color }]}>{initials}</Text>
          </View>
        );
      })}
      {overflow > 0 && (
        <View style={[styles.avatar, styles.overflowAvatar, { marginLeft: -8 }]}>
          <Text style={styles.overflowText}>+{overflow}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Tag ──────────────────────────────────────────────────────────────────────

function Tag({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <View style={[styles.tag, { backgroundColor: bg }]}>
      <Text style={[styles.tagText, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────

function Button({ label, onPress, filled, color }: {
  label: string; onPress?: () => void; filled?: boolean; color: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: filled ? color : "transparent",
          borderColor: filled ? color : "rgba(255,255,255,0.08)",
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <Text style={[styles.buttonText, { color: filled ? "#000" : color }]}>
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Card Shell ───────────────────────────────────────────────────────────────

function Card({ children, style, accentColor }: {
  children: React.ReactNode; style?: ViewStyle; accentColor?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, accentColor ? { borderColor: colors.surface.skillhive, backgroundColor: colors.bg.elevated } : { borderColor: colors.border.strong, borderWidth: 0 }, style]}>
      {children}
    </View>
  );
}

// ─── Active Card ──────────────────────────────────────────────────────────────

const ActiveCard = memo(function ActiveCard({
  name, tag, members = [], timerSeconds = 1500, onJoin, style,
}: WorkRoomCardProps) {
  const { formatted, progress } = useCountdown(timerSeconds);

  return (
    <Card style={style} accentColor={COLORS.active}>
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{name}</Text>
          <View style={styles.tagsRow}>
            <Tag label={tag}      color={COLORS.active}  bg={COLORS.activeSoft} />
            <Tag label="focus"    color={COLORS.active}  bg={COLORS.activeSoft} />
          </View>
        </View>
        <Button label="Join" onPress={onJoin} filled color={COLORS.active} />
      </View>

      <View style={styles.sessionRow}>
        <View style={styles.sessionInfo}>
          <View style={styles.sessionTop}>
            <PulseDot color={COLORS.active} />
            <Text style={styles.sessionLabel}>Focus session</Text>
            <Text style={styles.sessionTime}>{formatted}</Text>
          </View>
          <ProgressBar progress={progress} color={COLORS.active} />
        </View>
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.peopleBlock}>
          <AvatarStack names={members} />
          <Text style={styles.meta}>{members.length} working</Text>
        </View>
      </View>
    </Card>
  );
});

// ─── Break Card ───────────────────────────────────────────────────────────────

const BreakCard = memo(function BreakCard({
  name, tag, members = [], breakSeconds = 300, onJoin, style,
}: WorkRoomCardProps) {
  const { formatted, progress } = useCountdown(breakSeconds);

  return (
    <Card style={style} accentColor={COLORS.break}>
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{name}</Text>
          <View style={styles.tagsRow}>
            <Tag label={tag}    color={COLORS.break} bg={COLORS.breakSoft} />
            <Tag label="break"  color={COLORS.break} bg={COLORS.breakSoft} />
          </View>
        </View>
        <Button label="Join" onPress={onJoin} color={COLORS.break} />
      </View>

      <View style={styles.sessionRow}>
        <View style={styles.sessionInfo}>
          <View style={styles.sessionTop}>
            <PulseDot color={COLORS.break} />
            <Text style={styles.sessionLabel}>Break</Text>
            <Text style={styles.sessionTime}>{formatted}</Text>
          </View>
          <ProgressBar progress={progress} color={COLORS.break} />
        </View>
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.peopleBlock}>
          <AvatarStack names={members} />
          <Text style={styles.meta}>{members.length} here</Text>
        </View>
      </View>
    </Card>
  );
});

// ─── Empty Card ───────────────────────────────────────────────────────────────

const EmptyCard = memo(function EmptyCard({ name, tag, onStart, style }: WorkRoomCardProps) {
  return (
    <Card style={style}>
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: "#A1A6BD" }]} numberOfLines={1}>{name}</Text>
          <View style={styles.tagsRow}>
            <Tag label={tag} color={COLORS.muted} bg="rgba(255,255,255,0.04)" />
          </View>
        </View>
      </View>
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyTitle}>Nobody's here yet</Text>
        <Text style={styles.emptyText}>Start a focus session and invite others in.</Text>
      </View>
    </Card>
  );
});

// ─── Export ───────────────────────────────────────────────────────────────────

export function WorkRoomCard(props: WorkRoomCardProps) {
  if (props.state === "active") return <ActiveCard {...props} />;
  if (props.state === "break")  return <BreakCard  {...props} />;
  return <EmptyCard {...props} />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 14,
  },
  title: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  tagsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  tagText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sessionRow: {
    marginBottom: 16,
  },
  sessionInfo: {
    gap: 8,
  },
  sessionTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  sessionLabel: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 8,
  },
  sessionTime: {
    marginLeft: "auto",
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  progressTrack: {
    height: 7,
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  peopleBlock: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.card,
  },
  avatarText: {
    fontSize: 9,
    fontWeight: "800",
  },
  overflowAvatar: {
    backgroundColor: "#272B3C",
  },
  overflowText: {
    color: "#B7BDD3",
    fontSize: 9,
    fontWeight: "800",
  },
  meta: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "500",
    marginHorizontal: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  button: {
    minWidth: 72,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: "700",
  },
  emptyWrap: {
    paddingTop: 2,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
});