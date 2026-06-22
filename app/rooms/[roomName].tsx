import { RoomLobby } from "@/components/roomLobby";
import { useProfile } from "@/hooks/profileContext";
import { useRoomPresence } from "@/hooks/useRoomPresence";
import { useRoomSession } from "@/hooks/useRoomSession";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/lib/supabase";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import {
  LiveKitRoom,
  registerGlobals,
  TrackReference,
  useLocalParticipant,
  useTracks,
  VideoTrack,
} from "@livekit/react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Participant,
  Room,
  RoomEvent,
  RoomOptions,
  Track,
  VideoPresets,
} from "livekit-client";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// ─── PiP hook (lives at hooks/usePipMode.ts) ─────────────────────────────────
import { PIP_H, PIP_W, usePipMode } from "@/hooks/usePipMode";

registerGlobals();

const LIVEKIT_URL    = "wss://rooms.skillhiive.com";
const TOKEN_ENDPOINT = "https://api.skillhivelabs.com/getToken";
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const SIDEBAR_W = Math.min(300, SCREEN_W * 0.78);
const MONO = Platform.OS === "ios" ? "Menlo" : "monospace";

// ── Active-speaker debounce: wait this long before promoting a new speaker ───
const SPEAKER_DEBOUNCE_MS = 800;

type CubicleState =
  | { status: "idle" }
  | { status: "requesting"; targetIdentity: string }
  | { status: "incoming";   fromIdentity: string; cubicleRoomName: string }
  | { status: "active";     partnerIdentity: string; cubicleRoomName: string };

type GridLayout = {
  type: "single" | "grid" | "asymmetric";
  cols: number; rows: number; tileW: number; tileH: number;
};

function computeGrid(count: number, W: number, H: number): GridLayout {
  if (count <= 1) return { type: "single",     cols: 1, rows: 1, tileW: W,     tileH: H     };
  if (count === 2) return { type: "grid",       cols: 1, rows: 2, tileW: W,     tileH: H / 2 };
  if (count === 3) return { type: "asymmetric", cols: 2, rows: 2, tileW: W / 2, tileH: H / 2 };
  if (count === 4) return { type: "grid",       cols: 2, rows: 2, tileW: W / 2, tileH: H / 2 };
  if (count === 5) return { type: "asymmetric", cols: 3, rows: 2, tileW: W / 3, tileH: H / 2 };
  return                   { type: "grid",       cols: 2, rows: 3, tileW: W / 2, tileH: H / 3 };
}

const TILES_PER_PAGE = 6;
function initials(name: string) { return name.slice(0, 2).toUpperCase(); }

interface AudioDevice { id: string; name: string; }
function useAudioDevices() {
  const [devices]  = useState<AudioDevice[]>([{ id: "speaker", name: "Speaker" }, { id: "earpiece", name: "Earpiece" }]);
  const [activeId, setActiveId] = useState("speaker");
  const active = devices.find((d) => d.id === activeId) ?? devices[0];
  return { devices, active, selectDevice: setActiveId };
}

// ─────────────────────────────────────────────────────────────────────────────
// RoomScreen
// ─────────────────────────────────────────────────────────────────────────────

export default function RoomScreen() {
  const { roomName } = useLocalSearchParams<{ roomName: string }>();
  const { profile }  = useProfile();
  const router       = useRouter();
  const { colors }   = useTheme();

  const [lobbyDone,         setLobbyDone]         = useState(false);
  const [joinWithCam,       setJoinWithCam]        = useState(true);
  const [joinWithFrontCam,  setJoinWithFrontCam]   = useState(true);

  // ── Never-re-render refs ──────────────────────────────────────────────────
  const intentionalLeaveRef     = useRef(false);
  const connectedRef            = useRef(false);
  const micEnabledRef           = useRef(false);
  const camEnabledRef           = useRef(false);
  const syncRef                 = useRef<(() => void) | null>(null);
  const roomRef                 = useRef<Room | null>(null);
  const cubicleRoomRef          = useRef<Room | null>(null);
  const cubicleChannelRef       = useRef<any>(null);
  const sidebarOpenRef          = useRef(false);
  const cubicleJoinCancelledRef = useRef(false);
  const cubicleRef              = useRef<CubicleState>({ status: "idle" });
  const shownCubicleAlertRef    = useRef<string | null>(null);
  const prevPhaseRef            = useRef<string>("waiting");

  // ── State ─────────────────────────────────────────────────────────────────
  const [token,           setToken]           = useState<string | null>(null);
  const [livekitReady,    setLivekitReady]    = useState(false);
  const [loading,         setLoading]         = useState(true);
  const [participants,    setParticipants]    = useState<Participant[]>([]);
  const [micEnabled,      setMicEnabled]      = useState(false);
  const [camEnabled,      setCamEnabled]      = useState(false);
  const [isFrontCam,      setIsFrontCam]      = useState(true);
  const [sidebarOpen,     setSidebarOpen]     = useState(false);
  const [focusedIdentity, setFocusedIdentity] = useState<string | null>(null);
  const [camOffSet,       setCamOffSet]       = useState<Set<string>>(new Set());
  const [cubicle,         setCubicle]         = useState<CubicleState>({ status: "idle" });
  const [cubicleToken,    setCubicleToken]    = useState<string | null>(null);
  const [cubicleSet,      setCubicleSet]      = useState<Set<string>>(new Set());
  const [gridSize,        setGridSize]        = useState({ w: SCREEN_W, h: SCREEN_H * 0.72 });

  // ── PiP ───────────────────────────────────────────────────────────────────
  const pip = usePipMode();

  // Flip fade
  const [flipFading,  setFlipFading]  = useState(false);
  const flipFadeAnim  = useRef(new Animated.Value(0)).current;

  const sidebarX       = useRef(new Animated.Value(SIDEBAR_W)).current;
  const sidebarOpacity = useRef(new Animated.Value(0)).current;
  const { devices, active: activeDevice, selectDevice } = useAudioDevices();

  useEffect(() => { cubicleRef.current = cubicle; }, [cubicle]);

  // ── Presence & session ────────────────────────────────────────────────────
  useRoomPresence(roomName, () => {
    Alert.alert("Couldn't join room", "Please try again.", [{
      text: "OK", onPress: () => {
        intentionalLeaveRef.current = true;
        setTimeout(() => { if (router.canGoBack()) router.back(); else router.replace("/main"); }, 100);
      },
    }]);
  });
  const { phaseState } = useRoomSession(roomName ?? "");

  useEffect(() => {
    if (prevPhaseRef.current === "break" && phaseState.phase === "focus") {
      const lp = roomRef.current?.localParticipant;
      if (lp) {
        lp.setMicrophoneEnabled(false).then(() => {
          micEnabledRef.current = lp.isMicrophoneEnabled;
          setMicEnabled(lp.isMicrophoneEnabled);
        }).catch(() => {});
      }
    }
    prevPhaseRef.current = phaseState.phase;
  }, [phaseState.phase]);

  // ── Sidebar ───────────────────────────────────────────────────────────────
  const EDGE     = 28;
  const SWIPE_T  = 40;

  const edgePan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: (e)     => !sidebarOpenRef.current && e.nativeEvent.pageX > SCREEN_W - EDGE,
    onMoveShouldSetPanResponder:  (e, gs) => !sidebarOpenRef.current && gs.dx < -8 && e.nativeEvent.pageX > SCREEN_W - EDGE * 4,
    onPanResponderMove:   (_, gs) => { if (sidebarOpenRef.current) return; sidebarX.setValue(Math.max(0, SIDEBAR_W + gs.dx)); sidebarOpacity.setValue(1 - Math.max(0, SIDEBAR_W + gs.dx) / SIDEBAR_W); },
    onPanResponderRelease:(_, gs) => { if (sidebarOpenRef.current) return; gs.dx < -SWIPE_T ? commitOpen() : commitClose(); },
  })).current;

  const sidePan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder:  (_, gs) => sidebarOpenRef.current && gs.dx > 8 && Math.abs(gs.dy) < Math.abs(gs.dx),
    onPanResponderMove:   (_, gs) => { if (!sidebarOpenRef.current) return; sidebarX.setValue(Math.max(0, gs.dx)); sidebarOpacity.setValue(1 - Math.max(0, gs.dx) / SIDEBAR_W); },
    onPanResponderRelease:(_, gs) => { if (!sidebarOpenRef.current) return; gs.dx > SWIPE_T ? commitClose() : commitOpen(); },
  })).current;

  function commitOpen() {
    sidebarOpenRef.current = true; setSidebarOpen(true);
    Animated.parallel([
      Animated.spring(sidebarX,       { toValue: 0,        useNativeDriver: true, tension: 80, friction: 14 }),
      Animated.timing(sidebarOpacity, { toValue: 1,        useNativeDriver: true, duration: 180 }),
    ]).start();
  }
  function commitClose() {
    sidebarOpenRef.current = false;
    Animated.parallel([
      Animated.spring(sidebarX,       { toValue: SIDEBAR_W, useNativeDriver: true, tension: 80, friction: 14 }),
      Animated.timing(sidebarOpacity, { toValue: 0,         useNativeDriver: true, duration: 160 }),
    ]).start(() => setSidebarOpen(false));
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => { if (lobbyDone) init(); }, [lobbyDone]);

  async function init() {
    try {
      await requestPermissions();
      await fetchToken();
      setLivekitReady(true);
    } catch (e: any) {
      Alert.alert("Setup error", e.message);
    } finally {
      setLoading(false);
    }
  }

  async function requestPermissions() {
    if (Platform.OS !== "android") return;
    const r = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.CAMERA,
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    ]);
    if (r[PermissionsAndroid.PERMISSIONS.CAMERA] !== "granted" || r[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] !== "granted")
      throw new Error("Camera/mic permissions denied");
  }

async function fetchToken() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("No active session");
  if (!profile?.username) return;

  // Safely construct and encode the query params
  const params = new URLSearchParams({
    room: roomName,
    username: profile.username
  });

  const res = await fetch(`${TOKEN_ENDPOINT}?${params.toString()}`, { 
    headers: { 
      Authorization: `Bearer ${session.access_token}` 
    } 
  });
  
  if (!res.ok) throw new Error(`Token server error: ${res.status}`);
  const data = await res.json();
  setToken(data.token);
}


  async function fetchCubicleToken(cubicleRoomName: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("No active session");
    const res  = await fetch(`${TOKEN_ENDPOINT}?room=${cubicleRoomName}&username=${profile?.username}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
    if (!res.ok) throw new Error(`Cubicle token error: ${res.status}`);
    const data = await res.json();
    if (!data.token) throw new Error("No cubicle token received");
    return data.token as string;
  }

  // ── Cubicle signalling ────────────────────────────────────────────────────
  useEffect(() => {
    if (!roomName || !profile?.username) return;
    const ch = supabase.channel(`cubicle-signals:${roomName}`);

    ch.on("broadcast", { event: "cubicle-request" }, ({ payload }) => {
      if (payload.targetIdentity !== profile.username) return;
      if (cubicleRef.current.status !== "idle") return;
      setCubicle({ status: "incoming", fromIdentity: payload.fromIdentity, cubicleRoomName: payload.cubicleRoomName });
    });
    ch.on("broadcast", { event: "cubicle-accept" }, ({ payload }) => {
      if (payload.targetIdentity !== profile.username) return;
      if (cubicleRef.current.status !== "requesting") return;
      joinCubicleRoom(payload.cubicleRoomName, payload.fromIdentity);
    });
    ch.on("broadcast", { event: "cubicle-decline" }, ({ payload }) => {
      if (payload.targetIdentity !== profile.username) return;
      cubicleJoinCancelledRef.current = true;
      setCubicle({ status: "idle" });
      Alert.alert("Cubicle declined", `${payload.fromIdentity} declined your request.`);
    });
    ch.on("broadcast", { event: "cubicle-end" }, ({ payload }) => {
      if (payload.targetIdentity !== profile.username) return;
      endCubicleLocal(payload.fromIdentity);
    });

    ch.subscribe();
    cubicleChannelRef.current = ch;
    return () => { supabase.removeChannel(ch); cubicleChannelRef.current = null; };
  }, [roomName, profile?.username]);

  async function sendCubicleRequest(targetIdentity: string) {
    if (!profile?.username) return;
    if (cubicleRef.current.status !== "idle") { Alert.alert("Already in a cubicle", "End your current cubicle first."); return; }
    const cubicleRoomName = `cubicle-${[profile.username, targetIdentity].sort().join("-")}-${Date.now()}`;
    cubicleJoinCancelledRef.current = false;
    setCubicle({ status: "requesting", targetIdentity });
    setCubicleSet((p) => new Set(p).add(profile.username!).add(targetIdentity));
    await cubicleChannelRef.current?.send({ type: "broadcast", event: "cubicle-request", payload: { fromIdentity: profile.username, targetIdentity, cubicleRoomName } });
  }

  async function acceptCubicle() {
    const cur = cubicleRef.current; if (cur.status !== "incoming") return;
    const { fromIdentity, cubicleRoomName } = cur;
    cubicleJoinCancelledRef.current = false;
    await cubicleChannelRef.current?.send({ type: "broadcast", event: "cubicle-accept", payload: { fromIdentity: profile?.username, targetIdentity: fromIdentity, cubicleRoomName } });
    joinCubicleRoom(cubicleRoomName, fromIdentity);
  }

  async function declineCubicle() {
    const cur = cubicleRef.current; if (cur.status !== "incoming") return;
    const { fromIdentity } = cur;
    cubicleJoinCancelledRef.current = true;
    await cubicleChannelRef.current?.send({ type: "broadcast", event: "cubicle-decline", payload: { fromIdentity: profile?.username, targetIdentity: fromIdentity } });
    setCubicle({ status: "idle" });
    setCubicleSet((p) => { const s = new Set(p); s.delete(profile?.username ?? ""); s.delete(fromIdentity); return s; });
  }

  async function joinCubicleRoom(cubicleRoomName: string, partnerIdentity: string) {
    try {
      await roomRef.current?.localParticipant.setMicrophoneEnabled(false);
      await roomRef.current?.localParticipant.setCameraEnabled(false);
      const cToken = await fetchCubicleToken(cubicleRoomName);
      if (cubicleJoinCancelledRef.current) {
        await roomRef.current?.localParticipant.setMicrophoneEnabled(micEnabledRef.current);
        await roomRef.current?.localParticipant.setCameraEnabled(camEnabledRef.current);
        return;
      }
      setCubicleToken(cToken);
      setCubicle({ status: "active", partnerIdentity, cubicleRoomName });
      setCubicleSet((p) => new Set(p).add(profile?.username ?? "").add(partnerIdentity));
    } catch (e: any) {
      Alert.alert("Cubicle error", e.message);
      setCubicle({ status: "idle" });
      await roomRef.current?.localParticipant.setMicrophoneEnabled(micEnabledRef.current);
      await roomRef.current?.localParticipant.setCameraEnabled(camEnabledRef.current);
    }
  }

  async function endCubicle() {
    const cur = cubicleRef.current; if (cur.status !== "active") return;
    await cubicleChannelRef.current?.send({ type: "broadcast", event: "cubicle-end", payload: { fromIdentity: profile?.username, targetIdentity: cur.partnerIdentity } });
    endCubicleLocal(cur.partnerIdentity);
  }

  async function endCubicleLocal(partnerIdentity: string) {
    const cub = cubicleRoomRef.current; cubicleRoomRef.current = null;
    if (cub) await cub.disconnect();
    setCubicleToken(null);
    setCubicle({ status: "idle" });
    setCubicleSet((p) => { const s = new Set(p); s.delete(profile?.username ?? ""); s.delete(partnerIdentity); return s; });
    const main = roomRef.current;
    if (main && main.state === "connected") {
      await main.localParticipant.setMicrophoneEnabled(micEnabledRef.current);
      await main.localParticipant.setCameraEnabled(camEnabledRef.current);
      micEnabledRef.current = main.localParticipant.isMicrophoneEnabled;
      camEnabledRef.current = main.localParticipant.isCameraEnabled;
      setMicEnabled(micEnabledRef.current);
      setCamEnabled(camEnabledRef.current);
    }
  }

  // ── Stable room instances ─────────────────────────────────────────────────
  const room = useMemo(() => {
    const r = new Room({ adaptiveStream: true, dynacast: true, videoCaptureDefaults: { resolution: VideoPresets.h720, facingMode: "user" } } as RoomOptions);
    roomRef.current = r; return r;
  }, []);

  const cubicleRoom = useMemo(() => {
    if (cubicle.status !== "active" || !cubicleToken) return null;
    const r = new Room({ adaptiveStream: true, dynacast: true, videoCaptureDefaults: { resolution: VideoPresets.h720, facingMode: "user" } } as RoomOptions);
    cubicleRoomRef.current = r; return r;
  }, [cubicleToken]);

  // ── handleConnected ───────────────────────────────────────────────────────
  const handleConnected = useCallback(async () => {
    if (connectedRef.current) return;
    connectedRef.current = true;

    const r = roomRef.current; if (!r) return;

    const sync = () => {
      const rm = roomRef.current; if (!rm) return;
      const all: Participant[] = [rm.localParticipant, ...Array.from(rm.remoteParticipants.values())];
      setParticipants(all);
      const off = new Set<string>();
      all.forEach((p) => { if (!p.isCameraEnabled || !p.getTrackPublication(Track.Source.Camera)?.track) off.add(p.identity); });
      setCamOffSet(off);
      micEnabledRef.current = rm.localParticipant.isMicrophoneEnabled;
      camEnabledRef.current = rm.localParticipant.isCameraEnabled;
      setMicEnabled(micEnabledRef.current);
      setCamEnabled(camEnabledRef.current);
    };
    syncRef.current = sync;

    r.on(RoomEvent.ParticipantConnected,    sync);
    r.on(RoomEvent.ParticipantDisconnected, sync);
    r.on(RoomEvent.TrackMuted,              sync);
    r.on(RoomEvent.TrackUnmuted,            sync);
    r.on(RoomEvent.LocalTrackPublished,     sync);
    r.on(RoomEvent.LocalTrackUnpublished,   sync);
    r.on(RoomEvent.TrackSubscribed,         sync);
    r.on(RoomEvent.TrackUnsubscribed,       sync);

    const lp = r.localParticipant;
    try {
      await lp.setMicrophoneEnabled(false);
      if (joinWithCam) {
        await lp.setCameraEnabled(true, { facingMode: joinWithFrontCam ? "user" : "environment" } as any);
        setIsFrontCam(joinWithFrontCam);
      } else {
        await lp.setCameraEnabled(false);
      }
    } catch {}

    micEnabledRef.current = lp.isMicrophoneEnabled;
    camEnabledRef.current = lp.isCameraEnabled;
    setMicEnabled(micEnabledRef.current);
    setCamEnabled(camEnabledRef.current);

    if (Platform.OS === "android") r.once(RoomEvent.LocalTrackPublished, sync);
    else sync();
  }, [joinWithCam, joinWithFrontCam]);

  const handleDisconnected = useCallback(() => {
    connectedRef.current = false;
    if (intentionalLeaveRef.current) return;
    setTimeout(() => { if (router.canGoBack()) router.back(); else router.replace("/main"); }, 100);
  }, []);

  // ── Mic / cam ─────────────────────────────────────────────────────────────
  async function toggleMic() {
    if (cubicleRef.current.status === "active") return;
    if (!phaseState.micAllowed) {
      const m = Math.floor(phaseState.remainingSeconds / 60), s = phaseState.remainingSeconds % 60;
      Alert.alert("Mic locked during focus", `Mics unlock in ${m}m ${s}s when the break starts.`);
      return;
    }
    const lp = roomRef.current?.localParticipant; if (!lp) return;
    try { await lp.setMicrophoneEnabled(!micEnabledRef.current); } catch {}
    micEnabledRef.current = lp.isMicrophoneEnabled;
    setMicEnabled(lp.isMicrophoneEnabled);
  }

  async function toggleCam() {
    if (cubicleRef.current.status === "active") return;
    const lp = roomRef.current?.localParticipant; if (!lp) return;
    try { await lp.setCameraEnabled(!camEnabledRef.current); } catch {}
    const actual = lp.isCameraEnabled;
    camEnabledRef.current = actual; setCamEnabled(actual);
    if (lp.identity) setCamOffSet((p) => { const s = new Set(p); actual ? s.delete(lp.identity) : s.add(lp.identity); return s; });
  }

  async function flipCamera() {
    const lp = roomRef.current?.localParticipant; if (!lp) return;
    const nextFront = !isFrontCam;
    setFlipFading(true);
    await new Promise<void>((res) => {
      Animated.timing(flipFadeAnim, { toValue: 1, duration: 120, useNativeDriver: true }).start(() => res());
    });
    try {
      const pub = lp.getTrackPublication(Track.Source.Camera);
      if (pub?.track) await lp.unpublishTrack(pub.track);
      await lp.setCameraEnabled(true, { facingMode: nextFront ? "user" : "environment" } as any);
      setIsFrontCam(nextFront);
      camEnabledRef.current = lp.isCameraEnabled;
      setCamEnabled(lp.isCameraEnabled);
    } catch (e: any) {
      Alert.alert("Camera flip failed", e.message);
    }
    const r = roomRef.current;
    if (r) {
      await new Promise<void>((res) => {
        const done = () => { r.off(RoomEvent.LocalTrackPublished, done); res(); };
        r.once(RoomEvent.LocalTrackPublished, done);
        setTimeout(() => { r.off(RoomEvent.LocalTrackPublished, done); res(); }, 1500);
      });
    }
    await new Promise((res) => setTimeout(res, 80));
    Animated.timing(flipFadeAnim, { toValue: 0, duration: 180, useNativeDriver: true })
      .start(() => setFlipFading(false));
  }

  function showOutputPicker() {
    const opts = [...devices.map((d) => d.name), "Cancel"];
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions({ title: "Audio Output", options: opts, cancelButtonIndex: opts.length - 1 }, (i) => { if (i < devices.length) selectDevice(devices[i].id); });
    } else {
      Alert.alert("Audio Output", "Select output device", [...devices.map((d) => ({ text: d.id === activeDevice.id ? `✓  ${d.name}` : d.name, onPress: () => selectDevice(d.id) })), { text: "Cancel", style: "cancel" }]);
    }
  }

  async function leave() {
    intentionalLeaveRef.current = true;
    if (cubicleRef.current.status === "active") await endCubicle();
    const sync = syncRef.current; const r = roomRef.current;
    if (sync && r) {
      r.off(RoomEvent.ParticipantConnected,    sync); r.off(RoomEvent.ParticipantDisconnected, sync);
      r.off(RoomEvent.TrackMuted,              sync); r.off(RoomEvent.TrackUnmuted,            sync);
      r.off(RoomEvent.LocalTrackPublished,     sync); r.off(RoomEvent.LocalTrackUnpublished,   sync);
      r.off(RoomEvent.TrackSubscribed,         sync); r.off(RoomEvent.TrackUnsubscribed,       sync);
      syncRef.current = null;
    }
    await r?.disconnect();
    await new Promise((res) => setTimeout(res, 300));
    if (router.canGoBack()) router.back(); else router.replace("/main");
  }

  const focusParticipant   = useCallback((id: string) => setFocusedIdentity(id), []);
  const unfocusParticipant = useCallback(() => setFocusedIdentity(null), []);

  useEffect(() => {
    if (cubicle.status !== "incoming") { shownCubicleAlertRef.current = null; return; }
    const key = cubicle.fromIdentity;
    if (shownCubicleAlertRef.current === key) return;
    shownCubicleAlertRef.current = key;
    Alert.alert("Cubicle Request", `${cubicle.fromIdentity} wants to open a private cubicle with you.`, [
      { text: "Decline", style: "destructive", onPress: declineCubicle },
      { text: "Accept",  onPress: acceptCubicle },
    ]);
  }, [cubicle.status]);

  // ── Lobby ─────────────────────────────────────────────────────────────────
  if (!lobbyDone) {
    return (
      <RoomLobby
        roomName={roomName ?? "Room"}
        username={profile?.username ?? ""}
        onJoin={(withCam, isFront) => {
          setJoinWithCam(withCam);
          setJoinWithFrontCam(isFront ?? true);
          setLobbyDone(true);
          init();
        }}
        onCancel={() => {
          intentionalLeaveRef.current = true;
          if (router.canGoBack()) router.back(); else router.replace("/main");
        }}
      />
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.loader, { backgroundColor: colors.bg.canvas }]} edges={["top", "bottom"]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.bg.canvas} />
        <ActivityIndicator size="large" color={colors.tint.accent} />
        <Text style={[styles.loaderText, { color: colors.text.secondary }]}>Joining room…</Text>
      </SafeAreaView>
    );
  }

  if (!token || !livekitReady) {
    return (
      <SafeAreaView style={[styles.loader, { backgroundColor: colors.bg.canvas }]} edges={["top", "bottom"]}>
        <Text style={[styles.loaderText, { color: colors.text.secondary }]}>Failed to get token</Text>
      </SafeAreaView>
    );
  }

  // ── Full-screen room UI (shown inside LiveKitRoom regardless of PiP mode) ─
  const roomUI = (
    <View style={[styles.root, { backgroundColor: colors.bg.canvas }]} {...edgePan.panHandlers}>
      {/* ── Drag handle — swipe down to enter PiP ── */}
      <View style={styles.pipHandleHitArea} {...pip.swipeDownPan.panHandlers}>
        <View style={[styles.pipHandle, { backgroundColor: colors.border.subtle }]} />
      </View>

      <SafeAreaView edges={["top"]} style={[styles.topBarWrap, { backgroundColor: colors.surface.primary, borderBottomColor: colors.border.subtle }]}>
        <TopBar
          roomName={roomName ?? "Room"} participantCount={participants.length}
          onParticipants={commitOpen} focusedIdentity={focusedIdentity} onUnfocus={unfocusParticipant}
          colors={colors} inCubicle={cubicle.status === "active"}
          cubiclePartner={cubicle.status === "active" ? cubicle.partnerIdentity : null}
          onEndCubicle={endCubicle} sessionPhase={phaseState.phase} sessionRemainingSeconds={phaseState.remainingSeconds}
          onMinimise={pip.enterPip}
        />
      </SafeAreaView>

      <View style={styles.gridWrap} onLayout={(e) => { const { width, height } = e.nativeEvent.layout; setGridSize({ w: width, h: height }); }}>
        <ConferenceView
          focusedIdentity={focusedIdentity} onFocus={focusParticipant} onUnfocus={unfocusParticipant}
          camOffSet={camOffSet} cubicleSet={cubicleSet} gridW={gridSize.w} gridH={gridSize.h}
          colors={colors} onDoubleTap={sendCubicleRequest} myIdentity={profile?.username ?? ""}
          flipFadeAnim={flipFadeAnim} flipFading={flipFading}
          isPip={false}
        />
      </View>

      <SafeAreaView edges={["bottom"]} style={[styles.ctrlWrap, { backgroundColor: colors.surface.primary, borderTopColor: colors.border.subtle }]}>
        <ControlBar
          micEnabled={micEnabled} camEnabled={camEnabled} isFrontCam={isFrontCam} outputLabel={activeDevice.name}
          onMic={toggleMic} onCam={toggleCam} onFlip={flipCamera} onOutput={showOutputPicker} onLeave={leave}
          colors={colors} lockedForCubicle={cubicle.status === "active"} sessionPhase={phaseState.phase}
          focusRemainingSeconds={phaseState.phase === "focus" ? phaseState.remainingSeconds : 0}
        />
      </SafeAreaView>

      <Animated.View style={[styles.scrim, { opacity: sidebarOpacity }]} pointerEvents={sidebarOpen ? "auto" : "none"}>
        <Pressable style={StyleSheet.absoluteFill} onPress={commitClose} />
      </Animated.View>
      <Animated.View style={[styles.sidebarShell, { transform: [{ translateX: sidebarX }] }]} {...sidePan.panHandlers}>
        <ParticipantsSidebar participants={participants} cubicleSet={cubicleSet} onClose={commitClose} colors={colors} />
      </Animated.View>
    </View>
  );

  return (
    <>
      <LiveKitRoom serverUrl={LIVEKIT_URL} token={token} connect room={room}
        onConnected={handleConnected} onDisconnected={handleDisconnected}
      >
        <StatusBar barStyle="light-content" backgroundColor={colors.bg.canvas} />

        {/* ── Full-screen mode ── */}
        {!pip.isPip && roomUI}

        {/* ── PiP card — rendered outside full-screen, floats above everything ── */}
        {pip.isPip && (
          <Animated.View
            style={[
              styles.pipCard,
              {
                width: PIP_W,
                height: PIP_H,
                transform: [
                  { translateX: pip.pipAnim.x },
                  { translateY: pip.pipAnim.y },
                  { scale: pip.pipScale },
                ],
              },
            ]}
            {...pip.pipDragPan.panHandlers}
          >
            {/* Tap anywhere on pip card → restore full screen */}
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={pip.exitPip}
            />

            {/* Mini grid — active speaker only in PiP */}
            <View style={[styles.pipInner, { borderColor: colors.border.strong }]}>
              <ConferenceView
                focusedIdentity={focusedIdentity} onFocus={focusParticipant} onUnfocus={unfocusParticipant}
                camOffSet={camOffSet} cubicleSet={cubicleSet} gridW={PIP_W} gridH={PIP_H - 32}
                colors={colors} onDoubleTap={() => {}} myIdentity={profile?.username ?? ""}
                flipFadeAnim={flipFadeAnim} flipFading={flipFading}
                isPip={true}
              />

              {/* PiP chrome bar at bottom */}
              <View style={[styles.pipBar, { backgroundColor: colors.surface.primary + "ee" }]}>
                <View style={[styles.pipLiveDot, { backgroundColor: colors.tint.danger }]} />
                <Text style={[styles.pipRoomName, { color: colors.text.primary }]} numberOfLines={1}>
                  {roomName}
                </Text>
                <TouchableOpacity onPress={pip.exitPip} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Feather name="maximize-2" size={13} color={colors.text.secondary} />
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        )}
      </LiveKitRoom>

      {cubicle.status === "active" && cubicleToken && cubicleRoom && (
        <LiveKitRoom serverUrl={LIVEKIT_URL} token={cubicleToken} connect audio video room={cubicleRoom}
          onConnected={() => {}}
          onDisconnected={() => {
            if (cubicleRoomRef.current !== null) return;
            const cur = cubicleRef.current;
            endCubicleLocal(cur.status === "active" ? cur.partnerIdentity : "");
          }}
          onError={(e) => Alert.alert("Cubicle error", e?.message ?? "Unknown")}
        >
          <CubicleOverlay partnerIdentity={cubicle.partnerIdentity} onEnd={endCubicle} colors={colors} />
        </LiveKitRoom>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CubicleOverlay  (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

function CubicleOverlay({ partnerIdentity, onEnd, colors }: { partnerIdentity: string; onEnd: () => void; colors: any }) {
  const allTracks = useTracks([Track.Source.Camera]);
  const { localParticipant }  = useLocalParticipant();
  const [elapsed,       setElapsed]       = useState(0);
  const [myTrackRef,    setMyTrackRef]    = useState<TrackReference | null>(null);
  const [myTrackSid,    setMyTrackSid]    = useState<string | null>(null);
  const [partnerReady,  setPartnerReady]  = useState(false);
  const lpRef           = useRef(localParticipant);
  const partnerReadyRef = useRef(false);

  useEffect(() => { lpRef.current = localParticipant; }, [localParticipant]);
  useEffect(() => { const iv = setInterval(() => setElapsed((n) => n + 1), 1000); return () => clearInterval(iv); }, []);

  useEffect(() => {
    if (!localParticipant) return;
    function sync() {
      const lp = lpRef.current; if (!lp) return;
      const pub = lp.getTrackPublication(Track.Source.Camera);
      if (pub?.track && pub.trackSid) {
        const ref: TrackReference = { participant: lp, publication: pub, source: Track.Source.Camera };
        setMyTrackSid((prev) => { if (prev !== pub.trackSid) { setMyTrackRef(ref); return pub.trackSid ?? null; } return prev; });
      } else { setMyTrackRef(null); setMyTrackSid(null); }
    }
    sync();
    localParticipant.on("trackPublished", sync); localParticipant.on("trackUnpublished", sync);
    localParticipant.on("localTrackPublished", sync); localParticipant.on("trackSubscribed", sync);
    return () => {
      localParticipant.off("trackPublished", sync); localParticipant.off("trackUnpublished", sync);
      localParticipant.off("localTrackPublished", sync); localParticipant.off("trackSubscribed", sync);
    };
  }, [localParticipant]);

  useEffect(() => {
    const lp = lpRef.current; if (!lp) return;
    const pub = lp.getTrackPublication(Track.Source.Camera);
    if (pub?.track && pub.trackSid && pub.trackSid !== myTrackSid) {
      setMyTrackRef({ participant: lp, publication: pub, source: Track.Source.Camera });
      setMyTrackSid(pub.trackSid ?? null);
    }
  }, [allTracks]);

  const partnerTrack = allTracks.find((t) => t.participant.identity === partnerIdentity);
  useEffect(() => {
    if (partnerTrack && !partnerReadyRef.current) {
      const t = setTimeout(() => { partnerReadyRef.current = true; setPartnerReady(true); }, Platform.OS === "android" ? 600 : 0);
      return () => clearTimeout(t);
    }
    if (!partnerTrack) { partnerReadyRef.current = false; setPartnerReady(false); }
  }, [partnerTrack]);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <View style={styles.cubicleOverlay}>
      <View style={styles.cubicleBg} />
      <View style={styles.cubicleContainer}>
        <View style={[styles.cubicleHeader, { backgroundColor: colors.surface.raised, borderBottomColor: colors.border.subtle }]}>
          <View style={[styles.cubicleBadge, { backgroundColor: colors.tint.accent + "22", borderColor: colors.tint.accent + "55" }]}>
            <Text style={[styles.cubicleBadgeText, { color: colors.tint.accent }]}>⬡ cubicle</Text>
          </View>
          <Text style={[styles.cubicleTimer, { color: colors.text.secondary, fontFamily: MONO }]}>{mm}:{ss}</Text>
          <TouchableOpacity style={[styles.cubicleEndBtn, { backgroundColor: colors.tint.danger }]} onPress={onEnd} activeOpacity={0.8}>
            <Text style={styles.cubicleEndText}>End</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.cubicleMainVideo}>
          {myTrackRef && myTrackSid && (
            <View style={[styles.cubiclePip, { borderColor: localParticipant?.isSpeaking ? colors.tint.success : colors.border.subtle }]}>
              <VideoTrack key={myTrackSid} trackRef={myTrackRef} style={styles.videoFill} mirror={Platform.OS === "ios"} />
            </View>
          )}
          <View style={[styles.cubiclePartnerVideo, { opacity: partnerReady ? 1 : 0 }]}>
            {partnerTrack && <VideoTrack key={partnerTrack.publication.trackSid} trackRef={partnerTrack} style={styles.videoFill} />}
          </View>
          {!partnerReady && (
            <View style={[styles.cubicleAvatarFallback, { backgroundColor: colors.surface.secondary }]}>
              <View style={[styles.camOffAvatar, { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surface.raised }]}>
                <Text style={[styles.camOffAvatarText, { fontSize: 28, color: colors.text.secondary }]}>{initials(partnerIdentity)}</Text>
              </View>
              <Text style={[styles.camOffName, { color: colors.text.secondary, fontSize: 15 }]}>Waiting for {partnerIdentity}…</Text>
            </View>
          )}
          <View style={styles.tileOverlay} />
          <View style={styles.tileBottom}>
            <View style={[styles.tileAvatar, { backgroundColor: colors.tint.accent }]}>
              <Text style={styles.tileAvatarText}>{initials(partnerIdentity)}</Text>
            </View>
            <Text style={[styles.tileName, { color: colors.text.inverse }]} numberOfLines={1}>{partnerIdentity}</Text>
            {partnerTrack?.participant.isSpeaking && <SpeakingBars color={colors.tint.success} />}
          </View>
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TopBar  — added onMinimise prop
// ─────────────────────────────────────────────────────────────────────────────

function TopBar({ roomName, participantCount, onParticipants, focusedIdentity, onUnfocus, colors, inCubicle, cubiclePartner, onEndCubicle, sessionPhase, sessionRemainingSeconds, onMinimise }: {
  roomName: string; participantCount: number; onParticipants: () => void; focusedIdentity: string | null; onUnfocus: () => void; colors: any;
  inCubicle: boolean; cubiclePartner: string | null; onEndCubicle: () => void; sessionPhase: "waiting" | "focus" | "break"; sessionRemainingSeconds: number;
  onMinimise: () => void;
}) {
  const phaseColor = sessionPhase === "break" ? colors.tint.success : sessionPhase === "focus" ? colors.tint.accent : colors.text.tertiary;
  const phaseLabel = sessionPhase === "focus" ? "Focus" : sessionPhase === "break" ? "Break" : null;
  const pM = Math.floor(sessionRemainingSeconds / 60), pS = sessionRemainingSeconds % 60;
  return (
    <View style={styles.topBar}>
      <View style={styles.topLeft}>
        {focusedIdentity ? (
          <TouchableOpacity style={[styles.focusBadge, { backgroundColor: colors.tint.skillhive + "22", borderColor: colors.tint.accent + "55" }]} onPress={onUnfocus} activeOpacity={0.75}>
            <Feather name="minimize-2" size={11} color={colors.tint.accent} />
            <Text style={[styles.focusBadgeText, { color: colors.tint.accent }]}>Focused: {focusedIdentity}</Text>
            <Text style={[styles.focusBadgeClose, { color: colors.tint.accent }]}>✕</Text>
          </TouchableOpacity>
        ) : (
          <Text style={[styles.roomName, { color: colors.text.primary }]} numberOfLines={1}>{roomName}</Text>
        )}
      </View>
      {phaseLabel && (
        <View style={[styles.phaseBadge, { backgroundColor: colors.bg.accentDim, borderColor: colors.surface.skillhive }]}>
          <Text style={[styles.phaseBadgeText, { color: colors.text.skillhive, fontFamily: MONO }]}>{phaseLabel} {String(pM).padStart(2, "0")}:{String(pS).padStart(2, "0")}</Text>
        </View>
      )}
      <View style={styles.topRight}>
        {/* ── Minimise to PiP ── */}
        {/* <TouchableOpacity
          style={[styles.participantsBtn, { backgroundColor: colors.surface.secondary, borderColor: colors.border.subtle }]}
          onPress={onMinimise}
          activeOpacity={0.72}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="minus" size={15} color={colors.text.primary} />
        </TouchableOpacity> */}
        <TouchableOpacity style={[styles.participantsBtn, { backgroundColor: colors.surface.secondary, borderColor: colors.border.subtle }]} onPress={onParticipants} activeOpacity={0.72}>
          <Feather name="users" size={15} color={colors.text.primary} />
          <Text style={[styles.participantsBtnCount, { color: colors.text.primary }]}>{participantCount}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ConferenceView — added isPip prop + active speaker auto-sort
// ─────────────────────────────────────────────────────────────────────────────

function ConferenceView({ focusedIdentity, onFocus, onUnfocus, camOffSet, cubicleSet, gridW, gridH, colors, onDoubleTap, myIdentity, flipFadeAnim, flipFading, isPip }: {
  focusedIdentity: string | null; onFocus: (id: string) => void; onUnfocus: () => void;
  camOffSet: Set<string>; cubicleSet: Set<string>; gridW: number; gridH: number;
  colors: any; onDoubleTap: (id: string) => void; myIdentity: string;
  flipFadeAnim: Animated.Value; flipFading: boolean;
  isPip: boolean;
}) {
  const rawTracks  = useTracks([Track.Source.Camera]);
  const [activePage, setActivePage] = useState(0);
  const pageScrollRef = useRef<ScrollView>(null);

  // ── Active-speaker sort ───────────────────────────────────────────────────
  // Debounced: we only promote a new speaker after SPEAKER_DEBOUNCE_MS of
  // continuous speaking, preventing rapid thrash during normal conversation.
  const [topIdentity, setTopIdentity] = useState<string | null>(null);
  const debounceRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speakingRef   = useRef<string | null>(null);

  useEffect(() => {
    const speaking = rawTracks.find(
      (t) => t.participant.isSpeaking && t.participant.identity !== myIdentity
    );
    const id = speaking?.participant.identity ?? null;

    if (id === speakingRef.current) return; // same speaker, nothing to do
    speakingRef.current = id;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (id) {
      debounceRef.current = setTimeout(() => setTopIdentity(id), SPEAKER_DEBOUNCE_MS);
    } else {
      // No one speaking → keep current top for 2 s then reset
      debounceRef.current = setTimeout(() => setTopIdentity(null), 2000);
    }
  }, [rawTracks.map((t) => `${t.participant.identity}:${t.participant.isSpeaking}`).join(",")]);

  // Sort: active speaker first, then my own track, then rest alphabetically
  const tracks = useMemo(() => {
    const sorted = [...rawTracks].sort((a, b) => {
      const aId = a.participant.identity, bId = b.participant.identity;
      if (aId === topIdentity) return -1;
      if (bId === topIdentity) return  1;
      if (aId === myIdentity)  return -1;
      if (bId === myIdentity)  return  1;
      return aId.localeCompare(bId);
    });
    // In PiP we only render the top 2 tracks for performance
    return isPip ? sorted.slice(0, 2) : sorted;
  }, [rawTracks, topIdentity, myIdentity, isPip]);

  useEffect(() => {
    const total = Math.ceil(Math.max(tracks.length, 1) / TILES_PER_PAGE);
    if (activePage >= total) setActivePage(0);
  }, [tracks.length]);

  const tp = (ref: TrackReference) => ({
    trackRef: ref, isCamOff: camOffSet.has(ref.participant.identity),
    inCubicle: cubicleSet.has(ref.participant.identity), onFocus, onUnfocus,
    isFocused: false, borderRadius: 0, colors, onDoubleTap,
    isMe: ref.participant.identity === myIdentity,
    flipFadeAnim: ref.participant.identity === myIdentity ? flipFadeAnim : null,
    flipFading:   ref.participant.identity === myIdentity ? flipFading   : false,
  });

  if (tracks.length === 0) {
    if (isPip) return (
      <View style={[{ flex: 1, alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ color: colors.text.tertiary, fontSize: 11 }}>Waiting…</Text>
      </View>
    );
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyIcon,  { color: colors.surface.raised }]}>⬡</Text>
        <Text style={[styles.emptyTitle, { color: colors.text.secondary }]}>Waiting for participants</Text>
        <Text style={[styles.emptySub,   { color: colors.text.tertiary  }]}>Share the room name to invite others</Text>
      </View>
    );
  }

  // ── PiP mode: simple 2-up layout, no interaction chrome ──────────────────
  if (isPip) {
    const tH = gridH / Math.min(tracks.length, 2);
    return (
      <View style={{ width: gridW, height: gridH }}>
        {tracks.map((r) => (
          <ParticipantTile key={r.participant.identity} {...tp(r)} width={gridW} height={tH} borderRadius={0} />
        ))}
      </View>
    );
  }

  // ── Full mode (unchanged layout logic) ───────────────────────────────────
  if (focusedIdentity) {
    const ft = tracks.find((t) => t.participant.identity === focusedIdentity);
    const ot = tracks.filter((t) => t.participant.identity !== focusedIdentity);
    const SH = 110, STW = 80;
    return (
      <View style={{ flex: 1, width: gridW, height: gridH }}>
        <View style={{ flex: 1 }}>
          {ft ? <ParticipantTile key={`f-${ft.participant.identity}`} {...tp(ft)} width={gridW} height={gridH - (ot.length > 0 ? SH : 0)} isFocused />
              : <AvatarTile identity={focusedIdentity} width={gridW} height={gridH - (ot.length > 0 ? SH : 0)} isFocused inCubicle={cubicleSet.has(focusedIdentity)} onFocus={onFocus} onUnfocus={onUnfocus} borderRadius={0} colors={colors} onDoubleTap={onDoubleTap} isMe={focusedIdentity === myIdentity} />}
        </View>
        {ot.length > 0 && (
          <ScrollView horizontal style={{ height: SH, backgroundColor: colors.bg.canvas }} contentContainerStyle={{ paddingHorizontal: 6, gap: 4, alignItems: "center" }} showsHorizontalScrollIndicator={false}>
            {ot.map((ref) => <ParticipantTile key={`s-${ref.participant.identity}`} {...tp(ref)} width={STW} height={SH - 12} borderRadius={8} />)}
          </ScrollView>
        )}
      </View>
    );
  }

  if (tracks.length <= 6) {
    const L = computeGrid(tracks.length, gridW, gridH);
    if (tracks.length === 3) {
      const hH = gridH / 2, hW = gridW / 2;
      return <View style={{ width: gridW, height: gridH }}><ParticipantTile {...tp(tracks[0])} width={gridW} height={hH} /><View style={{ flexDirection: "row" }}>{tracks.slice(1).map((r) => <ParticipantTile key={r.participant.identity} {...tp(r)} width={hW} height={hH} />)}</View></View>;
    }
    if (tracks.length === 5) {
      const hH = gridH / 2, hW = gridW / 2, tW = gridW / 3;
      return <View style={{ width: gridW, height: gridH }}><View style={{ flexDirection: "row" }}>{tracks.slice(0, 2).map((r) => <ParticipantTile key={r.participant.identity} {...tp(r)} width={hW} height={hH} />)}</View><View style={{ flexDirection: "row" }}>{tracks.slice(2).map((r) => <ParticipantTile key={r.participant.identity} {...tp(r)} width={tW} height={hH} />)}</View></View>;
    }
    return <View style={{ width: gridW, height: gridH, flexDirection: "row", flexWrap: "wrap" }}>{tracks.map((r) => <ParticipantTile key={r.participant.identity} {...tp(r)} width={L.tileW} height={L.tileH} />)}</View>;
  }

  const pages: (typeof tracks)[] = [];
  for (let i = 0; i < tracks.length; i += TILES_PER_PAGE) pages.push(tracks.slice(i, i + TILES_PER_PAGE));
  const DH = 28, pgH = gridH - DH;

  return (
    <View style={{ width: gridW, height: gridH }}>
      <ScrollView ref={pageScrollRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => setActivePage(Math.round(e.nativeEvent.contentOffset.x / gridW))}
        style={{ width: gridW, height: pgH }} contentContainerStyle={{ height: pgH }}>
        {pages.map((pt, pi) => {
          const pl = computeGrid(pt.length, gridW, pgH);
          if (pt.length === 3) { const hH = pgH / 2, hW = gridW / 2; return <View key={pi} style={{ width: gridW, height: pgH }}><ParticipantTile {...tp(pt[0])} width={gridW} height={hH} /><View style={{ flexDirection: "row" }}>{pt.slice(1).map((r) => <ParticipantTile key={r.participant.identity} {...tp(r)} width={hW} height={hH} />)}</View></View>; }
          if (pt.length === 5) { const hH = pgH / 2, hW = gridW / 2, tW = gridW / 3; return <View key={pi} style={{ width: gridW, height: pgH }}><View style={{ flexDirection: "row" }}>{pt.slice(0, 2).map((r) => <ParticipantTile key={r.participant.identity} {...tp(r)} width={hW} height={hH} />)}</View><View style={{ flexDirection: "row" }}>{pt.slice(2).map((r) => <ParticipantTile key={r.participant.identity} {...tp(r)} width={tW} height={hH} />)}</View></View>; }
          return <View key={pi} style={{ width: gridW, height: pgH, flexDirection: "row", flexWrap: "wrap" }}>{pt.map((r) => <ParticipantTile key={r.participant.identity} {...tp(r)} width={pl.tileW} height={pl.tileH} />)}</View>;
        })}
      </ScrollView>
      <View style={styles.pageDots}>
        {pages.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => { pageScrollRef.current?.scrollTo({ x: i * gridW, animated: true }); setActivePage(i); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <View style={[styles.pageDot, { backgroundColor: i === activePage ? colors.tint.accent : colors.border.subtle, width: i === activePage ? 18 : 7 }]} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ParticipantTile  (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

function ParticipantTile({ trackRef, width, height, isCamOff, inCubicle, onFocus, onUnfocus, isFocused, borderRadius, colors, onDoubleTap, isMe, flipFadeAnim, flipFading }: {
  trackRef: TrackReference; width: number; height: number; isCamOff: boolean; inCubicle: boolean;
  onFocus: (id: string) => void; onUnfocus: () => void; isFocused: boolean; borderRadius: number;
  colors: any; onDoubleTap: (id: string) => void; isMe: boolean;
  flipFadeAnim?: Animated.Value | null; flipFading?: boolean;
}) {
  const { participant: p } = trackRef;
  const isSpeaking = p.isSpeaking, isMuted = !p.isMicrophoneEnabled;
  const [menuVisible, setMenuVisible] = useState(false);
  const lastTap = useRef<number>(0);

  function handleTap() {
    const now = Date.now();
    if (now - lastTap.current < 300) { if (!isMe) onDoubleTap(p.identity); lastTap.current = 0; }
    else lastTap.current = now;
  }

  return (
    <TouchableOpacity activeOpacity={1} onPress={handleTap} style={[styles.tile, {
      width, height, borderRadius, backgroundColor: colors.surface.primary,
      borderColor: inCubicle ? colors.tint.accent : isSpeaking ? colors.tint.success : isFocused ? colors.tint.accent : colors.border.subtle,
      borderWidth: inCubicle || isSpeaking || isFocused ? 2 : 1, opacity: inCubicle && !isMe ? 0.5 : 1,
    }]}>
      <View style={StyleSheet.absoluteFill}><VideoTrack trackRef={trackRef} style={styles.videoFill} /></View>
      {inCubicle && <View style={[styles.cubicleTileBadge, { backgroundColor: colors.tint.accent + "cc" }]}><Text style={styles.cubicleTileBadgeText}>⬡ cubicle</Text></View>}
      {isCamOff && (
        <View style={[StyleSheet.absoluteFill, styles.camOffOverlay, { backgroundColor: colors.bg.muted }]}>
          <View style={[styles.camOffAvatar, { width: height * 0.32, height: height * 0.32, borderRadius: height * 0.16, backgroundColor: colors.surface.raised }]}>
            <Text style={[styles.camOffAvatarText, { fontSize: height * 0.12, color: colors.text.secondary }]}>{initials(p.identity)}</Text>
          </View>
          <Text style={[styles.camOffName, { fontSize: Math.max(10, height * 0.065), color: colors.text.secondary }]} numberOfLines={1}>{p.identity}</Text>
          <View style={[styles.camOffBadge, { backgroundColor: colors.tint.danger + "20" }]}>
            <Feather name="video-off" size={10} color={colors.tint.danger} />
            <Text style={[styles.camOffBadgeText, { color: colors.tint.danger }]}>Camera off</Text>
          </View>
        </View>
      )}
      {!isCamOff && <View style={styles.tileOverlay} />}
      <View style={styles.tileBottom}>
        {!isCamOff && (
          <View style={styles.PersonTile}>
            <View style={[styles.tileAvatar, { backgroundColor: colors.tint.accent }]}><Text style={styles.tileAvatarText}>{initials(p.identity)}</Text></View>
            <Text style={[styles.tileName, { color: colors.text.white }]} numberOfLines={1}>{p.identity}</Text>
          </View>
        )}
        {isMuted    && <View style={[styles.mutedPill,  { backgroundColor: colors.tint.danger + "20" }]}><Text style={[styles.mutedPillText,  { color: colors.tint.danger  }]}>MIC OFF</Text></View>}
        {isSpeaking && <SpeakingBars color={colors.tint.success} />}
      </View>
      <TouchableOpacity style={styles.tileMenuBtn} onPress={() => setMenuVisible(true)} activeOpacity={0.75} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <View style={styles.tileMenuDots}><View style={styles.dot} /><View style={styles.dot} /><View style={styles.dot} /></View>
      </TouchableOpacity>
      <TileMenu visible={menuVisible} identity={p.identity} isFocused={isFocused}
        onClose={() => setMenuVisible(false)}
        onFocus={() => { setMenuVisible(false); onFocus(p.identity); }}
        onUnfocus={() => { setMenuVisible(false); onUnfocus(); }}
        onCubicle={!isMe ? () => { setMenuVisible(false); onDoubleTap(p.identity); } : undefined}
        colors={colors}
      />
      {flipFading && flipFadeAnim && (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "#000", opacity: flipFadeAnim, zIndex: 99 }]} />
      )}
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AvatarTile  (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

function AvatarTile({ identity, width, height, isFocused, inCubicle, onFocus, onUnfocus, borderRadius, colors, onDoubleTap, isMe }: {
  identity: string; width: number; height: number; isFocused: boolean; inCubicle: boolean;
  onFocus: (id: string) => void; onUnfocus: () => void; borderRadius: number; colors: any;
  onDoubleTap: (id: string) => void; isMe: boolean;
}) {
  const [menuVisible, setMenuVisible] = useState(false);
  const lastTap = useRef<number>(0);
  function handleTap() {
    const now = Date.now();
    if (now - lastTap.current < 300) { if (!isMe) onDoubleTap(identity); lastTap.current = 0; }
    else lastTap.current = now;
  }
  return (
    <TouchableOpacity activeOpacity={1} onPress={handleTap} style={[styles.tile, {
      width, height, borderRadius, backgroundColor: colors.surface.secondary,
      borderColor: inCubicle || isFocused ? colors.tint.accent : colors.border.subtle,
      borderWidth: inCubicle || isFocused ? 2 : 1, opacity: inCubicle && !isMe ? 0.5 : 1,
    }]}>
      {inCubicle && <View style={[styles.cubicleTileBadge, { backgroundColor: colors.tint.accent + "cc" }]}><Text style={styles.cubicleTileBadgeText}>⬡ cubicle</Text></View>}
      <View style={[StyleSheet.absoluteFill, styles.camOffOverlay]}>
        <View style={[styles.camOffAvatar, { width: height * 0.32, height: height * 0.32, borderRadius: height * 0.16, backgroundColor: colors.surface.raised }]}>
          <Text style={[styles.camOffAvatarText, { fontSize: height * 0.12, color: colors.text.secondary }]}>{initials(identity)}</Text>
        </View>
        <Text style={[styles.camOffName, { fontSize: Math.max(10, height * 0.065), color: colors.text.secondary }]}>{identity}</Text>
      </View>
      <TouchableOpacity style={styles.tileMenuBtn} onPress={() => setMenuVisible(true)} activeOpacity={0.75} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <View style={styles.tileMenuDots}><View style={styles.dot} /><View style={styles.dot} /><View style={styles.dot} /></View>
      </TouchableOpacity>
      <TileMenu visible={menuVisible} identity={identity} isFocused={isFocused}
        onClose={() => setMenuVisible(false)}
        onFocus={() => { setMenuVisible(false); onFocus(identity); }}
        onUnfocus={() => { setMenuVisible(false); onUnfocus(); }}
        onCubicle={!isMe ? () => { setMenuVisible(false); onDoubleTap(identity); } : undefined}
        colors={colors}
      />
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TileMenu  (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

function TileMenu({ visible, identity, isFocused, onClose, onFocus, onUnfocus, onCubicle, colors }: {
  visible: boolean; identity: string; isFocused: boolean; onClose: () => void;
  onFocus: () => void; onUnfocus: () => void; onCubicle?: () => void; colors: any;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={[styles.menuBackdrop, { backgroundColor: colors.overlay.scrim }]} onPress={onClose}>
        <View style={[styles.menuSheet, { backgroundColor: colors.surface.raised, borderColor: colors.border.strong }]}>
          <View style={styles.menuHeader}>
            <View style={[styles.menuAvatar, { backgroundColor: colors.tint.accent }]}><Text style={styles.menuAvatarText}>{initials(identity)}</Text></View>
            <Text style={[styles.menuTitle, { color: colors.text.primary }]} numberOfLines={1}>{identity}</Text>
          </View>
          <View style={[styles.menuDivider, { backgroundColor: colors.border.subtle }]} />
          {!isFocused ? (
            <TouchableOpacity style={styles.menuItem} onPress={onFocus} activeOpacity={0.75}>
              <View style={[styles.menuItemIcon, { backgroundColor: colors.tint.accent + "22" }]}><Feather name="maximize-2" size={16} color={colors.tint.accent} /></View>
              <View style={styles.menuItemText}><Text style={[styles.menuItemLabel, { color: colors.text.primary }]}>Focus</Text><Text style={[styles.menuItemSub, { color: colors.text.tertiary }]}>Pin this participant full screen</Text></View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.menuItem} onPress={onUnfocus} activeOpacity={0.75}>
              <View style={[styles.menuItemIcon, { backgroundColor: colors.tint.success + "22" }]}><Feather name="minimize-2" size={16} color={colors.tint.success} /></View>
              <View style={styles.menuItemText}><Text style={[styles.menuItemLabel, { color: colors.text.primary }]}>Unfocus</Text><Text style={[styles.menuItemSub, { color: colors.text.tertiary }]}>Return to grid view</Text></View>
            </TouchableOpacity>
          )}
          {onCubicle && (
            <TouchableOpacity style={styles.menuItem} onPress={onCubicle} activeOpacity={0.75}>
              <View style={[styles.menuItemIcon, { backgroundColor: colors.tint.accent + "22" }]}><Feather name="radio" size={16} color={colors.tint.accent} /></View>
              <View style={styles.menuItemText}><Text style={[styles.menuItemLabel, { color: colors.text.primary }]}>Open Cubicle</Text><Text style={[styles.menuItemSub, { color: colors.text.tertiary }]}>Private space with {identity}</Text></View>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.menuItem, styles.menuItemCancel, { borderTopColor: colors.border.subtle }]} onPress={onClose} activeOpacity={0.75}>
            <Text style={[styles.menuCancelText, { color: colors.text.secondary }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

function SpeakingBars({ color }: { color: string }) {
  return <View style={styles.bars}><View style={[styles.bar, { height: 8, backgroundColor: color }]} /><View style={[styles.bar, { height: 14, backgroundColor: color }]} /><View style={[styles.bar, { height: 8, backgroundColor: color }]} /></View>;
}

// ─────────────────────────────────────────────────────────────────────────────
// ParticipantsSidebar  (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

function ParticipantsSidebar({ participants, cubicleSet, onClose, colors }: { participants: Participant[]; cubicleSet: Set<string>; onClose: () => void; colors: any }) {
  return (
    <View style={[styles.sidebar, { backgroundColor: colors.surface.primary, borderLeftColor: colors.border.subtle }]}>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: colors.surface.primary }}>
        <View style={styles.sidebarHeader}>
          <Text style={[styles.sidebarTitle, { color: colors.text.primary }]}>Participants</Text>
          <View style={[styles.sidebarCountChip, { backgroundColor: colors.tint.accent + "22" }]}><Text style={[styles.sidebarCountText, { color: colors.tint.accent }]}>{participants.length}</Text></View>
          <TouchableOpacity style={[styles.sidebarCloseBtn, { backgroundColor: colors.surface.secondary }]} onPress={onClose} activeOpacity={0.7}><Text style={[styles.sidebarCloseIcon, { color: colors.text.secondary }]}>✕</Text></TouchableOpacity>
        </View>
      </SafeAreaView>
      <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {participants.map((p, idx) => {
          const speaking = p.isSpeaking, muted = !p.isMicrophoneEnabled, inCubicle = cubicleSet.has(p.identity);
          return (
            <View key={p.identity} style={[styles.pRow, { borderBottomColor: colors.border.subtle }]}>
              <View style={[styles.pAvatar, { backgroundColor: colors.tint.accent, borderColor: speaking ? colors.tint.success : "transparent" }]}><Text style={styles.pAvatarText}>{initials(p.identity)}</Text></View>
              <View style={styles.pInfo}>
                <Text style={[styles.pName, { color: colors.text.primary }]} numberOfLines={1}>{p.identity}{idx === 0 ? "  (You)" : ""}</Text>
                <Text style={[styles.pStatus, { color: colors.text.tertiary }]}>{inCubicle ? "In cubicle" : speaking ? "Speaking…" : "In meeting"}</Text>
              </View>
              <View style={[styles.pBadge, { backgroundColor: inCubicle ? colors.tint.accent + "20" : muted ? colors.tint.danger + "20" : colors.tint.success + "20" }]}>
                <Text style={[styles.pBadgeText, { color: inCubicle ? colors.tint.accent : muted ? colors.tint.danger : colors.tint.success }]}>{inCubicle ? "CUBICLE" : muted ? "MUTED" : "LIVE"}</Text>
              </View>
            </View>
          );
        })}
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ControlBar  (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

function ControlBar({ micEnabled, camEnabled, isFrontCam, outputLabel, onMic, onCam, onFlip, onOutput, onLeave, colors, lockedForCubicle, sessionPhase, focusRemainingSeconds }: {
  micEnabled: boolean; camEnabled: boolean; isFrontCam: boolean; outputLabel: string;
  onMic: () => void; onCam: () => void; onFlip: () => void; onOutput: () => void; onLeave: () => void;
  colors: any; lockedForCubicle: boolean; sessionPhase: "waiting" | "focus" | "break"; focusRemainingSeconds: number;
}) {
  const micLocked = lockedForCubicle || sessionPhase === "focus";
  const m = Math.floor(focusRemainingSeconds / 60), s = focusRemainingSeconds % 60;
  return (
    <View style={styles.controlBar}>
      <CtrlBtn label={micEnabled ? "Mute" : "Unmute"} sublabel={sessionPhase === "focus" ? `${m}m ${String(s).padStart(2, "0")}s` : sessionPhase === "break" ? "mic open" : undefined} onPress={onMic} state={micLocked ? "off" : micEnabled ? "on" : "off"} icon={<Feather name={micEnabled ? "mic" : "mic-off"} />} colors={colors} disabled={micLocked} />
      <CtrlBtn icon={<Feather name={camEnabled ? "video" : "video-off"} />} label={camEnabled ? "Stop Video" : "Start Video"} onPress={onCam} state={lockedForCubicle ? "off" : camEnabled ? "on" : "off"} colors={colors} disabled={lockedForCubicle} />
      <CtrlBtn icon={<MaterialIcons name="flip-camera-ios" />} label={isFrontCam ? "Rear Cam" : "Front Cam"} onPress={onFlip} state="on" colors={colors} />
      <CtrlBtn icon={<Feather name="volume-2" />} label={outputLabel} onPress={onOutput} state="on" colors={colors} />
      <CtrlBtn icon="✕" label="End" onPress={onLeave} state="danger" colors={colors} />
    </View>
  );
}

function CtrlBtn({ icon, label, sublabel, onPress, state, colors, disabled }: {
  icon: React.ReactNode; label: string; sublabel?: string; onPress: () => void; state: "on" | "off" | "danger"; colors: any; disabled?: boolean;
}) {
  const circleBg  = state === "off" ? colors.tint.danger + "20" : state === "danger" ? colors.tint.danger : colors.surface.secondary;
  const circleBdr = state === "off" ? colors.tint.danger + "45" : state === "danger" ? colors.tint.danger : colors.border.subtle;
  const iconClr   = state === "off" ? colors.tint.danger : state === "danger" ? colors.text.inverse : colors.text.primary;
  const lblClr    = state === "off" || state === "danger" ? colors.tint.danger : colors.text.secondary;
  return (
    <TouchableOpacity style={[styles.ctrlBtn, disabled && { opacity: 0.4 }]} onPress={onPress} activeOpacity={0.72} disabled={disabled}>
      <View style={[styles.ctrlCircle, { backgroundColor: circleBg, borderColor: circleBdr }]}><Text style={[styles.ctrlIcon, { color: iconClr }]}>{icon}</Text></View>
      {sublabel && <Text style={[styles.ctrlSublabel, { color: colors.text.tertiary }]}>{sublabel}</Text>}
      <Text style={[styles.ctrlLabel, { color: lblClr }]} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:                 { flex: 1 },
  loader:               { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 },
  loaderText:           { fontSize: 15, fontWeight: "500" },

  // ── PiP drag handle (invisible hit area above the top bar) ───────────────
  pipHandleHitArea:     { alignItems: "center", paddingVertical: 8, zIndex: 5 },
  pipHandle:            { width: 36, height: 4, borderRadius: 2 },

  // ── Floating PiP card ────────────────────────────────────────────────────
  pipCard:              { position: "absolute", zIndex: 50, borderRadius: 14, overflow: "hidden",
                          shadowColor: "#000", shadowOpacity: 0.45, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 12 },
  pipInner:             { flex: 1, borderRadius: 14, overflow: "hidden", borderWidth: 1.5 },
  pipBar:               { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center",
                          paddingHorizontal: 10, paddingVertical: 6, gap: 6, height: 32 },
  pipLiveDot:           { width: 6, height: 6, borderRadius: 3 },
  pipRoomName:          { flex: 1, fontSize: 10, fontWeight: "600" },

  topBarWrap:           { borderBottomWidth: 1 },
  topBar:               { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 11 },
  topLeft:              { flexDirection: "row", alignItems: "center", gap: 9, flex: 1, overflow: "hidden" },
  roomName:             { fontSize: 15, fontWeight: "600", flexShrink: 1 },
  focusBadge:           { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 0.5, borderRadius: 0, paddingHorizontal: 9, paddingVertical: 5, flexShrink: 1 },
  focusBadgeText:       { fontSize: 12, fontWeight: "600", flexShrink: 1 },
  focusBadgeClose:      { fontSize: 11, fontWeight: "700" },
  phaseBadge:           { borderWidth: 0.5, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4, marginHorizontal: 6 },
  phaseBadgeText:       { fontSize: 11, fontWeight: "700" },
  topRight:             { flexDirection: "row", alignItems: "center", gap: 8, flex: 1, justifyContent: "flex-end" },
  participantsBtn:      { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 8, paddingHorizontal: 11, paddingVertical: 7, borderWidth: 0.5 },
  participantsBtnCount: { fontSize: 13, fontWeight: "700" },
  gridWrap:             { flex: 1 },
  empty:                { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  emptyIcon:            { fontSize: 44, marginBottom: 4 },
  emptyTitle:           { fontSize: 17, fontWeight: "600" },
  emptySub:             { fontSize: 13 },
  tile:                 { overflow: "hidden" },
  tileOverlay:          { position: "absolute", bottom: 0, left: 0, right: 0, height: 32 },
  PersonTile:           { flexDirection: "row", backgroundColor: "rgba(0,0,0,0.4)", paddingHorizontal: 6, paddingVertical: 4, borderWidth: 0.5, borderColor: "#7e7e7e", alignItems: "center", borderRadius: 5 },
  tileBottom:           { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", paddingHorizontal: 9, paddingVertical: 8, gap: 6 },
  tileAvatar:           { width: 22, height: 22, marginRight: 5, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  tileAvatarText:       { color: "#fff", fontSize: 9, fontWeight: "700" },
  tileName:             { fontSize: 12, fontWeight: "500", marginRight: "auto" },
  mutedPill:            { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  mutedPillText:        { fontSize: 8, fontWeight: "700", letterSpacing: 0.4 },
  bars:                 { flexDirection: "row", alignItems: "flex-end", gap: 2 },
  bar:                  { width: 3, borderRadius: 2 },
  camOffOverlay:        { alignItems: "center", justifyContent: "center", gap: 8 },
  camOffAvatar:         { alignItems: "center", justifyContent: "center" },
  camOffAvatarText:     { fontWeight: "700" },
  camOffName:           { fontWeight: "600", maxWidth: "80%" },
  camOffBadge:          { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 5, paddingHorizontal: 8, paddingVertical: 4 },
  camOffBadgeText:      { fontSize: 10, fontWeight: "700" },
  tileMenuBtn:          { position: "absolute", top: 8, right: 8, backgroundColor: "rgba(0,0,0,0.45)", borderRadius: 6, padding: 6 },
  tileMenuDots:         { gap: 3, alignItems: "center" },
  dot:                  { width: 3, height: 3, borderRadius: 1.5, backgroundColor: "#fff" },
  menuBackdrop:         { flex: 1, justifyContent: "flex-end" },
  menuSheet:            { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, paddingBottom: 28, overflow: "hidden" },
  menuHeader:           { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 18 },
  menuAvatar:           { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  menuAvatarText:       { color: "#fff", fontSize: 14, fontWeight: "700" },
  menuTitle:            { fontSize: 16, fontWeight: "700", flex: 1 },
  menuDivider:          { height: 1, marginBottom: 6 },
  menuItem:             { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, paddingVertical: 15 },
  menuItemCancel:       { marginTop: 6, borderTopWidth: 1 },
  menuItemIcon:         { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  menuItemText:         { flex: 1, gap: 2 },
  menuItemLabel:        { fontSize: 15, fontWeight: "600" },
  menuItemSub:          { fontSize: 12 },
  menuCancelText:       { fontSize: 15, fontWeight: "500", textAlign: "center", flex: 1 },
  scrim:                { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 },
  sidebarShell:         { position: "absolute", top: 0, bottom: 0, right: 0, width: SIDEBAR_W, zIndex: 20 },
  sidebar:              { flex: 1, borderLeftWidth: 1 },
  sidebarHeader:        { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 16, gap: 10 },
  sidebarTitle:         { fontSize: 17, fontWeight: "700", flex: 1 },
  sidebarCountChip:     { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3 },
  sidebarCountText:     { fontSize: 12, fontWeight: "700" },
  sidebarCloseBtn:      { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  sidebarCloseIcon:     { fontSize: 14, fontWeight: "600" },
  divider:              { height: 1 },
  pRow:                 { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 13, gap: 12, borderBottomWidth: 0.5 },
  pAvatar:              { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  pAvatarText:          { color: "#fff", fontSize: 14, fontWeight: "700" },
  pInfo:                { flex: 1, gap: 2 },
  pName:                { fontSize: 14, fontWeight: "600" },
  pStatus:              { fontSize: 12 },
  pBadge:               { borderRadius: 5, paddingHorizontal: 8, paddingVertical: 4 },
  pBadgeText:           { fontSize: 10, fontWeight: "700", letterSpacing: 0.3 },
  ctrlWrap:             { borderTopWidth: 1 },
  controlBar:           { flexDirection: "row", justifyContent: "space-around", paddingTop: 14, paddingBottom: 0, paddingHorizontal: 4 },
  ctrlBtn:              { alignItems: "center", gap: 5, minWidth: 56, maxWidth: 68 },
  ctrlCircle:           { width: 52, height: 52, borderRadius: 0, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  ctrlIcon:             { fontSize: 18, includeFontPadding: false },
  ctrlSublabel:         { fontSize: 9, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: -3 },
  ctrlLabel:            { fontSize: 11, fontWeight: "500", textAlign: "center" },
  cubicleOverlay:       { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 30, justifyContent: "flex-end" },
  cubicleBg:            { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.75)" },
  cubicleContainer:     { height: SCREEN_H * 0.6, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden", backgroundColor: "#000" },
  cubicleHeader:        { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, gap: 10, zIndex: 2 },
  cubicleBadge:         { flexDirection: "row", alignItems: "center", borderWidth: 0.5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  cubicleBadgeText:     { fontSize: 11, fontWeight: "700", fontFamily: MONO },
  cubicleTimer:         { flex: 1, textAlign: "center", fontSize: 13 },
  cubicleEndBtn:        { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  cubicleEndText:       { color: "#fff", fontSize: 13, fontWeight: "700" },
  cubicleMainVideo:     { flex: 1, backgroundColor: "#000" },
  cubiclePartnerVideo:  { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 },
  cubicleAvatarFallback:{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 2, alignItems: "center", justifyContent: "center", gap: 12 },
  cubiclePip:           { position: "absolute", bottom: 16, right: 16, width: 90, height: 130, borderRadius: 12, borderWidth: 2, zIndex: 5 },
  videoFill:            { flex: 1, width: "100%", height: "100%" },
  cubicleTileBadge:     { position: "absolute", top: 8, left: 8, zIndex: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  cubicleTileBadgeText: { color: "#fff", fontSize: 9, fontWeight: "700", fontFamily: MONO },
  pageDots:             { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, height: 28 },
  pageDot:              { height: 7, borderRadius: 3.5 },
});