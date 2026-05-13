import React, { useMemo } from "react";
import { FlatList, Platform, StyleSheet, Text, View } from "react-native";

import { useLocalSearchParams } from "expo-router";

import {
  LiveKitRoom,
  registerGlobals,
  TrackReference,
  useTracks,
  VideoTrack,
} from "@livekit/react-native";

import { Room, Track, VideoCodec, VideoPresets } from "livekit-client";

registerGlobals();

const LIVEKIT_URL =
  Platform.OS === "android"
    ? "ws://192.168.1.50:7880"
    : "ws://192.168.1.50:7880"; // IMPORTANT: don't use localhost on phone

// 🔴 PASTE YOUR GENERATED TOKEN HERE
const TOKEN =
  "eyJhbGciOiJIUzI1NiJ9.eyJ2aWRlbyI6eyJyb29tSm9pbiI6dHJ1ZSwicm9vbSI6InRlc3QifSwiaXNzIjoiZGV2a2V5IiwiZXhwIjoxNzc4NzA1MTAxLCJuYmYiOjE3Nzg2ODM1MDEsInN1YiI6Im1vYmlsZS11c2VyIn0.SkQ7EDtHiPFh3VEC01wyWjr0QF1xbBS-1Bx1o6VaD30";

export default function RoomScreen() {
  const { roomName } = useLocalSearchParams();

  const room = useMemo(() => {
    return new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: {
        resolution: VideoPresets.h720,
      },
      publishDefaults: {
        videoCodec: "h264" as VideoCodec,
      },
    });
  }, []);

  return (
    <LiveKitRoom
      serverUrl={LIVEKIT_URL}
      token={TOKEN}
      connect={true}
      audio={true}
      video={true}
      room={room}
      onConnected={() => console.log("CONNECTED")}
      onDisconnected={() => console.log("DISCONNECTED")}
      onError={(e) => console.log("ERROR", e)}
    >
      <View style={styles.container}>
        <ConferenceView />
      </View>
    </LiveKitRoom>
  );
}

function ConferenceView() {
  const tracks = useTracks([Track.Source.Camera]);

  if (tracks.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={{ color: "white" }}>Waiting for participants...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={tracks}
      keyExtractor={(item) =>
        `${item.participant.identity}-${item.publication.trackSid}`
      }
      renderItem={({ item }) => <ParticipantTile trackRef={item} />}
    />
  );
}

function ParticipantTile({ trackRef }: { trackRef: TrackReference }) {
  return (
    <View style={styles.tile}>
      <VideoTrack trackRef={trackRef} style={styles.video} />
      <Text style={styles.name}>{trackRef.participant.identity}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  tile: {
    height: 300,
    margin: 10,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#111",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  name: {
    position: "absolute",
    bottom: 10,
    left: 10,
    color: "#fff",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
});
