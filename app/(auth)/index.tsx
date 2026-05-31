import { Text } from "@/components/ui/Text";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect } from "react";
import { Dimensions, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, {
  Circle,
  Defs,
  Line,
  Rect,
  Stop,
  LinearGradient as SvgLinearGradient,
} from "react-native-svg";

// ─── Design tokens ───────────────────────────────────────────────────────────
const VOID = "#0A0A0A";
const SURFACE = "#0A0A0A";
const PANEL = "#111111";
const BORDER = "#1E1E1E";
const TEXT_PRIMARY = "#F0F0EE";
const TEXT_SECONDARY = "#7a6f65";
const TEXT_MUTED = "#F0F0EE";
const ACCENT = "#FFFD01";
const ACCENT_DIM = "#24280B";
const ACCENT_GLOW = "rgba(232, 255, 71, 0.05)";

const { width: SW } = Dimensions.get("window");

// ─── HUD Ring ────────────────────────────────────────────────────────────────
const RING_SIZE = 228;
const RING_CENTER = RING_SIZE / 2;
const RING_R = 96;
const TICK_R_INNER = 102;
const TICK_R_OUTER = 110;
const CIRCUMFERENCE = 2 * Math.PI * RING_R;

// Generate tick marks
const TICK_COUNT = 60;
const ticks = Array.from({ length: TICK_COUNT }, (_, i) => {
  const angle = (i / TICK_COUNT) * 2 * Math.PI - Math.PI / 2;
  const isMajor = i % 5 === 0;
  const r0 = isMajor ? TICK_R_INNER - 4 : TICK_R_INNER;
  const r1 = isMajor ? TICK_R_OUTER + 2 : TICK_R_OUTER;
  return {
    x1: RING_CENTER + r0 * Math.cos(angle),
    y1: RING_CENTER + r0 * Math.sin(angle),
    x2: RING_CENTER + r1 * Math.cos(angle),
    y2: RING_CENTER + r1 * Math.sin(angle),
    isMajor,
  };
});

// Particle positions (static, rendered via SVG)
const PARTICLES = Array.from({ length: 28 }, (_, i) => {
  const seed = (i * 137.508) % 360;
  const angle = (seed / 360) * 2 * Math.PI;
  const radius = 42 + (i % 7) * 8;
  return {
    cx: RING_CENTER + radius * Math.cos(angle),
    cy: RING_CENTER + radius * Math.sin(angle),
    r: i % 3 === 0 ? 1.2 : 0.7,
  };
});

function DotGridBackground() {
  const dots = [];

  const spacing = 20;
  const cols = Math.ceil(Dimensions.get("window").width / spacing);
  const rows = 50;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      dots.push(
        <Circle
          key={`${x}-${y}`}
          cx={x * spacing + spacing / 2}
          cy={y * spacing + spacing / 2}
          r={0.5}
          fill="#ffffff91"
          opacity={0.9}
        />
      );
    }
  }

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      <Svg
        width="100%"
        height="100%"
        style={StyleSheet.absoluteFillObject}
      >
        {dots}
      </Svg>
    </View>
  );
}

function HudRing({
  progress,
  rotation,
}: {
  progress: SharedValue<number>;
  rotation: SharedValue<number>;
}) {
  const AnimatedSvg = Animated.createAnimatedComponent(Svg);

  const svgStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
    transformrev: [{ rotate: `-${rotation.value}deg` }],
  }));


  const arcStyle = useAnimatedStyle(() => ({
      transform: [{ rotate: `-${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={[{ width: RING_SIZE, height: RING_SIZE }, svgStyle]}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        <Defs>
          <SvgLinearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={ACCENT} stopOpacity="1" />
            <Stop offset="60%" stopColor="#B0FF00" stopOpacity="0.9" />
            <Stop offset="100%" stopColor={ACCENT} stopOpacity="0.4" />
          </SvgLinearGradient>
        </Defs>

        {/* Outer tick ring */}
        {ticks.map((t, i) => (
          <Line
            key={i}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke={t.isMajor ? "#2A2A28" : "#1A1A18"}
            strokeWidth={t.isMajor ? 1.5 : 0.8}
          />
        ))}

        {/* Base track ring */}
        <Circle
          cx={RING_CENTER}
          cy={RING_CENTER}
          r={RING_R}
          fill="#0e0e0e90"
          stroke="#1A1A18"
          strokeWidth={1.5}
        />

        {/* Inner structural ring */}
        <Circle
          cx={RING_CENTER}
          cy={RING_CENTER}
          r={72}
          fill="none"
          stroke="#161614"
          strokeWidth={0.8}
        />

        {/* Innermost breathing ring */}
        <Circle
          cx={RING_CENTER}
          cy={RING_CENTER}
          r={52}
          fill="none"
          stroke="#111110"
          strokeWidth={0.6}
        />

        {/* Particles */}
        {PARTICLES.map((p, i) => (
          <Circle
            key={i}
            cx={p.cx}
            cy={p.cy}
            r={p.r}
            fill={i % 5 === 0 ? ACCENT : TEXT_MUTED}
            opacity={i % 5 === 0 ? 0.7 : 0.3}
          />
        ))}

        {/* Progress arc — rendered as a full accent arc during animation via SVG directly */}
        <Circle
          cx={RING_CENTER}
          cy={RING_CENTER}
          r={RING_R}
          fill="none"
          stroke="url(#arcGrad)"
          strokeWidth={2}
          strokeDasharray={`${CIRCUMFERENCE * 0.72} ${CIRCUMFERENCE * 0.28}`}
          strokeLinecap="round"
          strokeDashoffset={CIRCUMFERENCE * 0.05}
          transform={`rotate(-90 ${RING_CENTER} ${RING_CENTER})`}
          opacity={0.5}
        />

        {/* Accent dot at arc head */}
        {(() => {
          const angle = (0.72 - 0.05 / (2 * Math.PI)) * 2 * Math.PI - Math.PI / 2;
          const dotX = RING_CENTER + RING_R * Math.cos(angle);
          const dotY = RING_CENTER + RING_R * Math.sin(angle);
          return (
            <Circle cx={dotX} cy={dotY} transform={`rotate(85 ${RING_CENTER} ${RING_CENTER})`} r={3.5} fill={ACCENT} opacity={1} />
          );
        })()}

        {/* Cross-hair lines */}
        <Line
          x1={RING_CENTER - 12}
          y1={RING_CENTER}
          x2={RING_CENTER - 4}
          y2={RING_CENTER}
          stroke={TEXT_MUTED}
          strokeWidth={0.8}
        />
        <Line
          x1={RING_CENTER + 4}
          y1={RING_CENTER}
          x2={RING_CENTER + 12}
          y2={RING_CENTER}
          stroke={TEXT_MUTED}
          strokeWidth={0.8}
        />
        <Line
          x1={RING_CENTER}
          y1={RING_CENTER - 12}
          x2={RING_CENTER}
          y2={RING_CENTER - 4}
          stroke={TEXT_MUTED}
          strokeWidth={0.8}
        />
        <Line
          x1={RING_CENTER}
          y1={RING_CENTER + 4}
          x2={RING_CENTER}
          y2={RING_CENTER + 12}
          stroke={TEXT_MUTED}
          strokeWidth={0.8}
        />

        {/* Center dot */}
        <Circle cx={RING_CENTER} cy={RING_CENTER} r={2.5} fill={ACCENT} opacity={0.9} />

        {/* Corner bracket marks */}
        {[
          { x: 20, y: 20, d: "M20 36 L20 20 L36 20" },
          { x: RING_SIZE - 20, y: 20, d: `M${RING_SIZE - 36} 20 L${RING_SIZE - 20} 20 L${RING_SIZE - 20} 36` },
          { x: 20, y: RING_SIZE - 20, d: `M20 ${RING_SIZE - 36} L20 ${RING_SIZE - 20} L36 ${RING_SIZE - 20}` },
          { x: RING_SIZE - 20, y: RING_SIZE - 20, d: `M${RING_SIZE - 36} ${RING_SIZE - 20} L${RING_SIZE - 20} ${RING_SIZE - 20} L${RING_SIZE - 20} ${RING_SIZE - 36}` },
        ].map((b, i) => (
          <Animated.View key={i} style={{ position: "absolute" }}>
            {/* Using SVG path for brackets */}
          </Animated.View>
        ))}
      </Svg>
    </Animated.View>
  );
}

// ─── Scanline grain overlay ───────────────────────────────────────────────────
function ScanlineOverlay() {
  const LINE_HEIGHT = 3;
  const lineCount = Math.ceil(900 / LINE_HEIGHT);
  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFillObject}
    >
      <Svg
        width="100%"
        height="100%"
        style={StyleSheet.absoluteFillObject}
        preserveAspectRatio="none"
      >
        {Array.from({ length: 200 }, (_, i) => (
          <Rect
            key={i}
            x={0}
            y={i * LINE_HEIGHT * 3}
            width="100%"
            height={1}
            fill="#000000"
            opacity={0.06}
          />
        ))}
      </Svg>
    </View>
  );
}

// ─── Boot sequence label component ───────────────────────────────────────────
function BootLabel({
  label,
  value,
  delay,
  accent = false,
  orange = false,
  white = false
}: {
  label: string;
  value: string;
  delay: number;
  accent?: boolean;
  orange?: boolean;
  white?: boolean;
}) {
  const fade = useSharedValue(0);
  const x = useSharedValue(-8);

  useEffect(() => {
    fade.value = withDelay(delay, withTiming(1, { duration: 300 }));
    x.value = withDelay(delay, withTiming(0, { duration: 300, easing: Easing.out(Easing.quad) }));
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ translateX: x.value }],
  }));

  return (
    <Animated.View style={[styles.bootRow, style]}>
      <Text style={styles.bootLabel}>{label}</Text>
      <Text style={[styles.bootValue, accent && { color: ACCENT }, orange && { color: "#ffbf60" }, white && { color: "#ffffff"  }]}>{value}</Text>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function WelcomeScreen() {
  const router = useRouter();

  // Animation values
  const masterFade = useSharedValue(0);
  const heroY = useSharedValue(16);
  const ringRotation = useSharedValue(0);
  const ringProgress = useSharedValue(0);
  const titleFade = useSharedValue(0);
  const titleY = useSharedValue(20);
  const taglineFade = useSharedValue(0);
  const ctaFade = useSharedValue(0);
  const ctaY = useSharedValue(16);
  const ctaScale = useSharedValue(1);
  const accentPulse = useSharedValue(1);
  const cornerBrackets = useSharedValue(0);
  const statusLine = useSharedValue(0);

  useEffect(() => {
    // Phase 0 — base fade in
    masterFade.value = withTiming(1, { duration: 200 });

    // Phase 1 — ring appears and rotates
    heroY.value = withDelay(100, withSpring(0, { damping: 20, stiffness: 180, mass: 0.8 }));
    ringRotation.value = withRepeat(
      withTiming(360, { duration: 32000, easing: Easing.linear }),
      -1,
      false,
    );
    cornerBrackets.value = withDelay(200, withTiming(1, { duration: 400 }));

    // Phase 2 — title
    titleFade.value = withDelay(500, withTiming(1, { duration: 400 }));
    titleY.value = withDelay(500, withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) }));

    // Phase 3 — tagline
    taglineFade.value = withDelay(800, withTiming(1, { duration: 400 }));
    statusLine.value = withDelay(900, withTiming(1, { duration: 600 }));

    // Phase 4 — CTA
    ctaFade.value = withDelay(1100, withTiming(1, { duration: 400 }));
    ctaY.value = withDelay(1100, withSpring(0, { damping: 22, stiffness: 200 }));

    // Accent pulse
    accentPulse.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, []);

  const masterStyle = useAnimatedStyle(() => ({ opacity: masterFade.value }));
  const heroStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: heroY.value }],
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleFade.value,
    transform: [{ translateY: titleY.value }],
  }));
  const taglineStyle = useAnimatedStyle(() => ({ opacity: taglineFade.value }));
  const ctaContainerStyle = useAnimatedStyle(() => ({
    opacity: ctaFade.value,
    transform: [{ translateY: ctaY.value }],
  }));
  const ctaStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ctaScale.value }],
  }));
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: accentPulse.value }],
  }));
  const statusLineStyle = useAnimatedStyle(() => ({
    width: `${statusLine.value * 48}%` as any,
  }));

  const onPressIn = useCallback(() => {
    ctaScale.value = withSpring(0.97, { damping: 20, stiffness: 400, mass: 0.4 });
  }, []);
  const onPressOut = useCallback(() => {
    ctaScale.value = withSpring(1, { damping: 20, stiffness: 400, mass: 0.4 });
  }, []);

  const onContinue = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    setTimeout(() => router.push("/(auth)/sign-in"), 60);
  }, [router]);

  return (
    <View style={styles.root}>
      {/* Void background with radial depth */}
      <DotGridBackground />
      <View style={styles.bgDepth} />

      {/* Scanlines */}
      <ScanlineOverlay />

      {/* Horizontal grid lines */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.gridLines]}>
        {[0.22, 0.44, 0.66, 0.88].map((pct, i) => (
          <View
            key={i}
            style={[styles.gridLine, { top: `${pct * 100}%` as any }]}
          />
        ))}
      </View>

      <Animated.View style={[styles.fill, masterStyle]}>
        <SafeAreaView style={styles.fill} edges={["top", "bottom"]}>
          {/* ── STATUS BAR ── */}
          <View style={styles.statusBar}>
            {/* <Text style={styles.statusText}>SKILLHIIVE</Text> */}
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>BETA TESTING</Text>
          </View>

          {/* ── HERO ZONE ── */}
          <View style={styles.heroZone}>
            <Animated.View style={[styles.ringWrapper, heroStyle]}>
              {/* Ambient glow behind ring */}
              <Animated.View style={[styles.ringGlow, pulseStyle]} />

              {/* The HUD ring */}
              <HudRing progress={ringProgress} rotation={ringRotation} />

              {/* Logo / wordmark in center */}
              <View style={styles.ringCenter}>
                <Image source={require("@/assets/images/skillhive.png")} style={{ width: 100, height: 100 }} />
              </View>
            </Animated.View>

            {/* Boot readout labels — HUD data */}
            <View style={styles.hudLabels}>
              <BootLabel label="BUILD " value="PRECISION" delay={600} accent />
              <BootLabel label="NETWORK" value="PRESENCE" delay={720} white />
              <BootLabel label="EVOLVE" value="MOMENTUM" delay={840} orange />
            </View>
          </View>

          {/* ── COPY ZONE ── */}
          <View style={styles.copyZone}>
            {/* Accent rule */}
            <Animated.View style={[styles.accentRule, statusLineStyle]} />
            <Animated.View style={[styles.titleBlock, titleStyle]}>
              <Text style={styles.wordmark}>SkillHiive</Text>
            </Animated.View>


            <Animated.View style={[taglineStyle,{ justifyContent: "center",
    alignItems: "center" }]}>
              <Text style={styles.tagline}>Keep up or get left behind.</Text>
            </Animated.View>
          </View>

          {/* ── CTA ZONE ── */}
          <Animated.View style={[styles.ctaZone, ctaContainerStyle]}>
            <Animated.View style={ctaStyle}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Get started"
                onPress={onContinue}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                style={styles.ctaButton}
              >
                {/* Left bracket */}
                <Text style={styles.ctaBracket}>[</Text>
                <Text style={styles.ctaLabel}>GET STARTED</Text>
                {/* Arrow */}
                <View style={styles.ctaArrowWrapper}>
                  <View style={styles.ctaArrowLine} />
                  <View style={styles.ctaArrowHead} />
                </View>
                {/* Right bracket */}
                <Text style={styles.ctaBracket}>]</Text>
              </Pressable>
            </Animated.View>

            <Text style={styles.legalText}>
              By continuing you accept our Terms & Privacy Policy
            </Text>
          </Animated.View>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: VOID,
  },
  fill: {
    flex: 1,
  },
  bgDepth: {
    ...StyleSheet.absoluteFillObject,
    // Radial depth simulation via a centered lighter region
    backgroundColor: SURFACE,
    // React Native doesn't support radial gradients natively; use LinearGradient below if needed
    opacity: 0.5,
  },
  gridLines: {
    opacity: 1,
  },
  gridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: BORDER,
    opacity: 0.5,
  },

  // Status bar
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    // justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 8,
    gap: 8,
    textAlign: "center"
  },
  statusText: {
    fontFamily: "SpaceMono", // monospace — fallback to system mono
    fontSize: 9,
    letterSpacing: 2.5,
    color: TEXT_MUTED,
  },
  statusDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: ACCENT,
    opacity: 0.8,
  },

  // Hero
  heroZone: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 8,
  },
  ringWrapper: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  ringGlow: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: ACCENT,
    opacity: 0.04,
  },
  ringCenter: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  logoMark: {
    fontFamily: "SpaceMono",
    fontSize: 28,
    fontWeight: "700",
    color: TEXT_PRIMARY,
    letterSpacing: 4,
  },

  // HUD labels
  hudLabels: {
    marginTop: 20,
    width: "100%",
    paddingHorizontal: 48,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  bootRow: {
    alignItems: "center",
    gap: 4,
  },
  bootLabel: {
    fontFamily: "SpaceMono",
    fontSize: 8,
    letterSpacing: 2,
    color: TEXT_MUTED,
  },
  bootValue: {
    fontFamily: "SpaceMono",
    fontSize: 9,
    letterSpacing: 1.5,
    color: TEXT_SECONDARY,
    fontWeight: "600",
  },

  // Copy
  copyZone: {
    paddingHorizontal: 28,
    paddingBottom: 24,
    gap: 10,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 50
  },
  accentRule: {
    height: 1,
    backgroundColor: ACCENT,
    marginBottom: 24,
  },
  titleBlock: {
    gap: 2,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000000"
  },
  wordmark: {
    fontSize: 54,
    fontWeight: "800",
    color: TEXT_PRIMARY,
    letterSpacing: 0.25,
    lineHeight: 58,
        justifyContent: "center",
    alignItems: "center",
    // Condensed editorial feel
    includeFontPadding: false,
  },
  tagline: {
    fontSize: 14,
    fontWeight: "400",
    color: TEXT_SECONDARY,
    letterSpacing: 0.2,
    lineHeight: 20,
    flexDirection: "row",
  },

  // CTA
  ctaZone: {
    paddingHorizontal: 28,
    paddingBottom: 20,
    gap: 14,
  },
  ctaButton: {
    height: 52,
    borderWidth: 1,
    borderColor: ACCENT,
    borderRadius: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: ACCENT_DIM,
  },
  ctaBracket: {
    fontFamily: "SpaceMono",
    fontSize: 18,
    color: ACCENT,
    opacity: 0.5,
    fontWeight: "300",
  },
  ctaLabel: {
    fontFamily: "SpaceMono",
    fontSize: 12,
    fontWeight: "700",
    color: ACCENT,
    letterSpacing: 3.5,
  },
  ctaArrowWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
  },
  ctaArrowLine: {
    width: 16,
    height: 1,
    backgroundColor: ACCENT,
    opacity: 0.6,
  },
  ctaArrowHead: {
    width: 0,
    height: 0,
    borderTopWidth: 4,
    borderBottomWidth: 4,
    borderLeftWidth: 6,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: ACCENT,
    opacity: 0.6,
  },
  legalText: {
    fontSize: 10,
    letterSpacing: 0.2,
    color: TEXT_MUTED,
    textAlign: "center",
    lineHeight: 15,
  },
});