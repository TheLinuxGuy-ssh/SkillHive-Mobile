/**
 * RoomSessionContext.tsx
 *
 * Lifted LiveKit room state that lives at the root layout level.
 * This survives navigation between /rooms/[roomName] and /main,
 * which is what enables true PiP across routes.
 *
 * Usage:
 *   - Wrap RootLayout children with <RoomSessionProvider>
 *   - rooms/[roomName].tsx calls useRoomSession().joinRoom(...)
 *   - RootLayout renders <GlobalPiPWindow /> which floats above the Stack
 *   - Tapping the PiP calls router.push('/rooms/[roomName]') to restore
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { Animated, Platform } from "react-native";
import {
  Room,
  RoomEvent,
  RoomOptions,
  Track,
  VideoPresets,
  Participant,
} from "livekit-client";

// ── Types ────────────────────────────────────────────────────────────────────

export type RoomPhaseState = {
  phase: "waiting" | "focus" | "break";
  remainingSeconds: number;
  micAllowed: boolean;
};

export type ActiveRoomInfo = {
  roomName: string;
  token: string;
  room: Room;
};

type RoomSessionCtx = {
  // current active room (null when not in a call)
  activeRoom: ActiveRoomInfo | null;

  // PiP state
  pipMode: boolean;
  enterPiP: () => void;
  exitPiP: () => void;

  // Animated values for the pip window (stable refs)
  pipPos: Animated.ValueXY;
  pipScale: Animated.Value;
  pipOpacity: Animated.Value;
  pipDragHandlers: any;          // PanResponder handlers
  swipeDy: Animated.Value;       // rubber-band for swipe-down gesture
  swipeDownHandlers: any;        // PanResponder handlers for topbar swipe

  // Participants snapshot (kept in sync by room screen)
  participants: Participant[];
  setParticipants: (p: Participant[]) => void;

  // Active speaker identity (set by ConferenceView)
  activeSpeakerIdentity: string | null;
  setActiveSpeakerIdentity: (id: string | null) => void;

  // My identity
  myIdentity: string;
  setMyIdentity: (id: string) => void;

  // Lifecycle
  registerRoom: (info: ActiveRoomInfo) => void;
  unregisterRoom: () => void;
};

// ── PiP geometry ─────────────────────────────────────────────────────────────

import { Dimensions, Easing, PanResponder } from "react-native";

const { width: SW, height: SH } = Dimensions.get("window");
export const PIP_W = 180;
export const PIP_H = 130;
const SAFE   = 12;
const TOP_Y  = SAFE + 54;
const BOT_Y  = SH - PIP_H - SAFE - 90;

const CORNERS = {
  topRight:    { x: SW - PIP_W - SAFE, y: TOP_Y },
  topLeft:     { x: SAFE,              y: TOP_Y },
  bottomRight: { x: SW - PIP_W - SAFE, y: BOT_Y },
  bottomLeft:  { x: SAFE,              y: BOT_Y },
};

function nearestCorner(x: number, y: number) {
  let best = CORNERS.topRight, bestD = Infinity;
  for (const pos of Object.values(CORNERS)) {
    const d = Math.hypot(pos.x - x, pos.y - y);
    if (d < bestD) { bestD = d; best = pos; }
  }
  return best;
}

// ── Context ──────────────────────────────────────────────────────────────────

const Ctx = createContext<RoomSessionCtx | null>(null);

export function useRoomSessionCtx() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useRoomSessionCtx must be inside RoomSessionProvider");
  return c;
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function RoomSessionProvider({ children }: { children: React.ReactNode }) {
  const [activeRoom,             setActiveRoom]             = useState<ActiveRoomInfo | null>(null);
  const [pipMode,                setPipMode]                = useState(false);
  const [participants,           setParticipants]           = useState<Participant[]>([]);
  const [activeSpeakerIdentity,  setActiveSpeakerIdentity]  = useState<string | null>(null);
  const [myIdentity,             setMyIdentity]             = useState("");

  // Stable animated values — never recreated
  const pipPos     = useRef(new Animated.ValueXY(CORNERS.topRight)).current;
  const pipScale   = useRef(new Animated.Value(0)).current;
  const pipOpacity = useRef(new Animated.Value(0)).current;
  const swipeDy    = useRef(new Animated.Value(0)).current;

  const pipModeRef  = useRef(false);
  const dragBase    = useRef(CORNERS.topRight);

  // ── Enter / exit PiP ──────────────────────────────────────────────────────
  const enterPiP = useCallback(() => {
    pipPos.setValue(CORNERS.topRight);
    pipModeRef.current = true;
    setPipMode(true);
    Animated.parallel([
      Animated.spring(pipScale,   { toValue: 1, useNativeDriver: true, tension: 90, friction: 12 }),
      Animated.timing(pipOpacity, { toValue: 1, useNativeDriver: true, duration: 200, easing: Easing.out(Easing.quad) }),
    ]).start();
  }, [pipScale, pipOpacity, pipPos]);

  const exitPiP = useCallback(() => {
    pipModeRef.current = false;
    Animated.parallel([
      Animated.spring(pipScale,   { toValue: 0, useNativeDriver: true, tension: 90, friction: 12 }),
      Animated.timing(pipOpacity, { toValue: 0, useNativeDriver: true, duration: 180 }),
    ]).start(() => setPipMode(false));
  }, [pipScale, pipOpacity]);

  // ── Swipe-down → PiP (attach to top-bar area in room screen) ─────────────
  const swipeDownHandlers = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder:       () => false,
      onMoveShouldSetPanResponder: (_, gs) =>
        !pipModeRef.current && gs.dy > 10 && Math.abs(gs.dy) > Math.abs(gs.dx) * 1.5,
      onPanResponderGrant: () => { swipeDy.setValue(0); },
      onPanResponderMove:  (_, gs) => { if (gs.dy > 0) swipeDy.setValue(gs.dy); },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 80 || gs.vy > 0.4) {
          swipeDy.setValue(0);
          enterPiP();
        } else {
          Animated.spring(swipeDy, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
        }
      },
    })
  ).current;

  // ── PiP window drag (attach to PiPWindow) ─────────────────────────────────
  const pipDragHandlers = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        const cur = (pipPos as any).__getValue() as { x: number; y: number };
        dragBase.current = { x: cur.x, y: cur.y };
        pipPos.stopAnimation();
        pipPos.setOffset(dragBase.current);
        pipPos.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pipPos.x, dy: pipPos.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, gs) => {
        pipPos.flattenOffset();
        const cur = (pipPos as any).__getValue() as { x: number; y: number };
        // Tap — tiny movement
        if (Math.abs(gs.dx) < 6 && Math.abs(gs.dy) < 6 && gs.vx < 0.2) {
          exitPiP();
          return;
        }
        // Snap to nearest corner
        const snap = nearestCorner(cur.x, cur.y);
        Animated.spring(pipPos, { toValue: snap, useNativeDriver: false, tension: 100, friction: 14 })
          .start(() => { dragBase.current = snap; });
      },
    })
  ).current;

  // ── Room lifecycle ─────────────────────────────────────────────────────────
  const registerRoom   = useCallback((info: ActiveRoomInfo) => setActiveRoom(info), []);
  const unregisterRoom = useCallback(() => {
    setActiveRoom(null);
    setPipMode(false);
    pipModeRef.current = false;
    pipScale.setValue(0);
    pipOpacity.setValue(0);
    setParticipants([]);
    setActiveSpeakerIdentity(null);
  }, [pipScale, pipOpacity]);

  const value = useMemo<RoomSessionCtx>(() => ({
    activeRoom,
    pipMode, enterPiP, exitPiP,
    pipPos, pipScale, pipOpacity,
    pipDragHandlers, swipeDy, swipeDownHandlers,
    participants, setParticipants,
    activeSpeakerIdentity, setActiveSpeakerIdentity,
    myIdentity, setMyIdentity,
    registerRoom, unregisterRoom,
  }), [
    activeRoom,
    pipMode, enterPiP, exitPiP,
    participants, activeSpeakerIdentity, myIdentity,
    registerRoom, unregisterRoom,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}