import { useTheme } from "@/hooks/useTheme";
import { Feather } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface RoomLobbyProps {
  roomName: string;
  username: string;
  onJoin: (withCamera: boolean, isFrontCam: boolean) => void;
  onCancel: () => void;
}

type CameraFacing = "front" | "back";

export function RoomLobby({
  roomName,
  username,
  onJoin,
  onCancel,
}: RoomLobbyProps) {
  const { colors } = useTheme();

  const [permission, requestPermission] = useCameraPermissions();
  const [camOn, setCamOn] = useState(true);
  const [facing, setFacing] = useState<CameraFacing>("front");
  const [requesting, setRequesting] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  const showPreview = useMemo(
    () => camOn && !!permission?.granted,
    [camOn, permission?.granted]
  );

  const ensurePermission = useCallback(async () => {
    if (permission?.granted) return true;

    try {
      setRequesting(true);
      const res = await requestPermission();
      return res?.granted ?? false;
    } finally {
      setRequesting(false);
    }
  }, [permission, requestPermission]);

  const toggleCamera = useCallback(async () => {
    const next = !camOn;

    if (next) {
      const ok = await ensurePermission();
      if (!ok) return;
    }

    setCamOn(next);
  }, [camOn, ensurePermission]);

  const flipCamera = useCallback(() => {
    setIsSwitching(true);
    setFacing((f) => (f === "front" ? "back" : "front"));

    setTimeout(() => {
      setIsSwitching(false);
    }, 150);
  }, []);

  const initials = username.slice(0, 2).toUpperCase();

  if (!permission) {
    return (
      <SafeAreaView
        style={[styles.root, { backgroundColor: colors.bg.canvas }]}
      >
        <View style={styles.loadingWrap}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.bg.canvas }]}
      edges={["top", "bottom"]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border.subtle }]}>
        <TouchableOpacity onPress={onCancel} hitSlop={8}>
          <Feather name="x" size={20} color={colors.text.secondary} />
        </TouchableOpacity>

        <Text
          style={[styles.roomLabel, { color: colors.text.primary }]}
          numberOfLines={1}
        >
          {roomName}
        </Text>

        <View style={{ width: 20 }} />
      </View>

      {/* Camera */}
      <View style={styles.previewWrap}>
        {/* ALWAYS mounted camera (fixes flicker) */}
        <CameraView style={StyleSheet.absoluteFill} facing={facing} />

        {/* Overlay only */}
        {!showPreview && !isSwitching && (
          <View
            style={[
              StyleSheet.absoluteFill,
              styles.camOff,
              { backgroundColor: colors.surface.secondary },
            ]}
          >
            <View
              style={[
                styles.avatarCircle,
                { backgroundColor: colors.surface.raised },
              ]}
            >
              <Text
                style={[styles.avatarText, { color: colors.text.secondary }]}
              >
                {initials}
              </Text>
            </View>

            <Text
              style={[styles.camOffLabel, { color: colors.text.tertiary }]}
            >
              {!permission?.granted
                ? "Camera permission needed"
                : "Camera off"}
            </Text>

            {!permission?.granted && (
              <TouchableOpacity
                onPress={ensurePermission}
                style={[
                  styles.permissionBtn,
                  { backgroundColor: colors.tint.accent },
                ]}
              >
                <Text style={{ color: colors.bg.canvas, fontWeight: "600" }}>
                  {requesting ? "Requesting..." : "Enable Camera"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Mic badge */}
        <View style={styles.micBadge}>
          <Feather name="mic-off" size={12} color="#fff" />
          <Text style={styles.micBadgeText}>
            Mic locked until session starts
          </Text>
        </View>

        {/* Flip camera */}
        {showPreview && (
          <TouchableOpacity style={styles.flipBtn} onPress={flipCamera}>
            <Feather name="refresh-cw" size={16} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              {
                backgroundColor: camOn
                  ? colors.tint.accent + "18"
                  : colors.surface.secondary,
                borderColor: camOn
                  ? colors.tint.accent + "55"
                  : colors.border.subtle,
              },
            ]}
            onPress={toggleCamera}
            activeOpacity={0.8}
          >
            <Feather
              name={camOn ? "video" : "video-off"}
              size={18}
              color={camOn ? colors.tint.accent : colors.text.tertiary}
            />
            <Text
              style={[
                styles.toggleLabel,
                { color: camOn ? colors.tint.accent : colors.text.tertiary },
              ]}
            >
              {camOn ? "Camera on" : "Camera off"}
            </Text>
          </TouchableOpacity>

          <View
            style={[
              styles.toggleBtn,
              {
                backgroundColor: colors.surface.secondary,
                borderColor: colors.border.subtle,
                opacity: 0.5,
              },
            ]}
          >
            <Feather name="mic-off" size={18} color={colors.text.tertiary} />
            <Text
              style={[styles.toggleLabel, { color: colors.text.tertiary }]}
            >
              Mic locked
            </Text>
          </View>
        </View>

        <Text style={[styles.infoText, { color: colors.text.tertiary }]}>
          Microphone unlocks when the session starts. Camera is optional.
        </Text>

        <TouchableOpacity
          style={[styles.joinBtn, { backgroundColor: colors.tint.accent }]}
          onPress={() => onJoin(camOn, facing === "front")}
        >
          <Text style={[styles.joinBtnText, { color: colors.bg.canvas }]}>
            Join room
          </Text>
          <Feather name="arrow-right" size={18} color={colors.bg.canvas} />
        </TouchableOpacity>

        <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
          <Text style={[styles.cancelText, { color: colors.text.tertiary }]}>
            Cancel
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },

  roomLabel: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 12,
  },

  previewWrap: {
    flex: 1,
    margin: 20,
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#111",
  },

  camOff: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },

  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    fontSize: 28,
    fontWeight: "700",
  },

  camOffLabel: {
    fontSize: 13,
  },

  permissionBtn: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },

  micBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.55)",
  },

  micBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },

  flipBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
  },

  controls: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 14,
  },

  toggleRow: {
    flexDirection: "row",
    gap: 10,
  },

  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },

  toggleLabel: {
    fontSize: 13,
    fontWeight: "600",
  },

  infoText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },

  joinBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },

  joinBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },

  cancelBtn: {
    alignItems: "center",
    paddingVertical: 4,
  },

  cancelText: {
    fontSize: 13,
  },
});