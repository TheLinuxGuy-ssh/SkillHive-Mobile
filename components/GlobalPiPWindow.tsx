/**
 * GlobalPiPWindow.tsx
 *
 * Rendered directly inside RootLayout, above the <Stack>.
 * Reads from RoomSessionContext — no props needed.
 * Tap → calls exitPiP() which also navigates back to the room screen.
 *
 * Depends on: RoomSessionContext, @livekit/react-native, livekit-client
 */

import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  LiveKitRoom,
  TrackReference,
  useTracks,
  VideoTrack,
} from "@livekit/react-native";
import { Track } from "livekit-client";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import {
  PIP_W,
  PIP_H,
  useRoomSessionCtx,
} from "@/hooks/RoomSessionContext";

// ─────────────────────────────────────────────────────────────────────────────
// Shell — only mounts the LiveKitRoom wrapper when a room is active
// ─────────────────────────────────────────────────────────────────────────────

export function GlobalPiPWindow() {
  const { activeRoom, pipMode } = useRoomSessionCtx();

  if (!activeRoom || !pipMode) return null;

  // LiveKitRoom needs to already be connected (the room screen connected it).
  // We pass the same Room instance — LiveKit allows multiple UI trees on one Room.
  return (
    <LiveKitRoom
      serverUrl=""          // ignored — room already connected
      token={activeRoom.token}
      connect={false}       // do NOT reconnect — room screen owns the connection
      room={activeRoom.room}
    >
      <PiPWindowInner />
    </LiveKitRoom>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Inner — useTracks works here because we're inside a LiveKitRoom context
// ─────────────────────────────────────────────────────────────────────────────

const HEADER_H = 26;
const HALF_W   = PIP_W / 2;

function PiPWindowInner() {
  const {
    pipPos, pipScale, pipOpacity,
    pipDragHandlers, exitPiP,
    activeSpeakerIdentity, myIdentity,
    activeRoom,
  } = useRoomSessionCtx();

  const { colors } = useTheme();
  const router     = useRouter();
  const allTracks  = useTracks([Track.Source.Camera]);

  const myTrack = allTracks.find((t) => t.participant.identity === myIdentity);
  const speakerTrack = activeSpeakerIdentity
    ? allTracks.find((t) => t.participant.identity === activeSpeakerIdentity && t.participant.identity !== myIdentity)
    : allTracks.find((t) => t.participant.identity !== myIdentity);

  // Tap = exit PiP and go back to room screen
  function handleExpand() {
    exitPiP();
    if (activeRoom) router.push(`/rooms/${activeRoom.roomName}` as any);
  }

  return (
    <Animated.View
      style={[
        styles.shell,
        {
          transform: [
            { translateX: pipPos.x },
            { translateY: pipPos.y },
            { scale: pipScale },
          ],
          opacity:         pipOpacity,
          backgroundColor: colors.bg.canvas,
          borderColor:     colors.border.strong,
        },
      ]}
      {...pipDragHandlers.panHandlers}
    >
      {/* Video area */}
      <View style={styles.tiles}>
        <View style={[styles.tile, { width: speakerTrack ? HALF_W : PIP_W }]}>
          {speakerTrack
            ? <PiPTile trackRef={speakerTrack} width={speakerTrack ? HALF_W : PIP_W} height={PIP_H - HEADER_H} colors={colors} isSpeaking={speakerTrack.participant.isSpeaking} />
            : <AvatarPiP label="…" colors={colors} />}
        </View>
        {speakerTrack && myTrack && (
          <View style={[styles.tile, { width: HALF_W, borderLeftWidth: 1, borderLeftColor: colors.border.strong + "55" }]}>
            <PiPTile trackRef={myTrack} width={HALF_W} height={PIP_H - HEADER_H} colors={colors} isMe />
          </View>
        )}
      </View>

      {/* Footer bar */}
      <View style={[styles.header, { backgroundColor: colors.surface.primary + "ee", borderTopColor: colors.border.subtle }]}>
        <View style={styles.liveDot}>
          <View style={[styles.dot, { backgroundColor: colors.tint.danger }]} />
          <Text style={[styles.liveLabel, { color: colors.text.secondary }]}>LIVE</Text>
        </View>
        {activeSpeakerIdentity && activeSpeakerIdentity !== myIdentity && (
          <Text style={[styles.speakerLabel, { color: colors.tint.success }]} numberOfLines={1}>
            ◎ {activeSpeakerIdentity}
          </Text>
        )}
        <TouchableOpacity onPress={handleExpand} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="maximize-2" size={11} color={colors.text.tertiary} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PiPTile({ trackRef, width, height, colors, isMe, isSpeaking }: {
  trackRef: TrackReference; width: number; height: number;
  colors: any; isMe?: boolean; isSpeaking?: boolean;
}) {
  const camOn = trackRef.participant.isCameraEnabled && !!trackRef.publication?.track;
  return (
    <View style={{ width, height, backgroundColor: colors.surface.secondary }}>
      {camOn
        ? <VideoTrack trackRef={trackRef} style={styles.videoFill} mirror={isMe && Platform.OS === "ios"} />
        : <AvatarPiP label={trackRef.participant.identity.slice(0, 2).toUpperCase()} colors={colors} />}
      {isSpeaking && <View style={[styles.speakingRing, { borderColor: colors.tint.success }]} />}
      {isMe && (
        <View style={[styles.meBadge, { backgroundColor: colors.surface.raised + "cc" }]}>
          <Text style={[styles.meText, { color: colors.text.tertiary }]}>You</Text>
        </View>
      )}
    </View>
  );
}

function AvatarPiP({ label, colors }: { label: string; colors: any }) {
  return (
    <View style={[styles.avatar, { backgroundColor: colors.surface.raised }]}>
      <Text style={[styles.avatarText, { color: colors.text.secondary }]}>{label}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  shell: {
    position:      "absolute",
    width:         PIP_W,
    height:        PIP_H,
    borderRadius:  14,
    borderWidth:   1,
    overflow:      "hidden",
    zIndex:        9999,          // above everything in RootLayout
    elevation:     20,
    shadowColor:   "#000",
    shadowOffset:  { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius:  14,
  },
  tiles: {
    flexDirection: "row",
    flex:          1,
    overflow:      "hidden",
  },
  tile: {
    overflow: "hidden",
  },
  header: {
    height:            HEADER_H,
    flexDirection:     "row",
    alignItems:        "center",
    paddingHorizontal: 8,
    gap:               6,
    borderTopWidth:    0.5,
  },
  liveDot: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           4,
  },
  dot: {
    width:        5,
    height:       5,
    borderRadius: 2.5,
  },
  liveLabel: {
    fontSize:      8,
    fontWeight:    "800",
    letterSpacing: 0.8,
  },
  speakerLabel: {
    flex:       1,
    fontSize:   9,
    fontWeight: "600",
  },
  videoFill: {
    flex:   1,
    width:  "100%",
    height: "100%",
  },
  avatar: {
    flex:           1,
    alignItems:     "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize:   14,
    fontWeight: "700",
  },
  speakingRing: {
    position:     "absolute",
    top:          0,
    left:         0,
    right:        0,
    bottom:       0,
    borderWidth:  2,
  },
  meBadge: {
    position:          "absolute",
    bottom:            4,
    right:             4,
    borderRadius:      3,
    paddingHorizontal: 4,
    paddingVertical:   1,
  },
  meText: {
    fontSize:   8,
    fontWeight: "600",
  },
});