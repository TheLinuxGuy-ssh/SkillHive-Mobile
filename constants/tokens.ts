export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 56,
  giant: 72,
  screen: 100,
} as const;

export type SpacingToken = keyof typeof spacing;

// ─────────────────────────────────────────────────────────────────────────
// Radii — softer than before. Cards lean toward 18–22px, pills full,
// media has a generous 16 so images on FB/IG-style cards feel posted, not
// hard-cropped.
// ─────────────────────────────────────────────────────────────────────────
export const radii = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  base: 14,
  lg: 18,
  xl: 22,
  xxl: 28,
  pill: 999,
} as const;

// ─────────────────────────────────────────────────────────────────────────
// Typography — variable-weight system stack, tighter tracking on display
// sizes (Instagram aesthetic), generous line-height on body for long
// captions (Facebook aesthetic). Numeric weight strings stay consistent
// with React Native's TextStyle contract.
// ─────────────────────────────────────────────────────────────────────────
export const typography = {
  display: { size: 44, lineHeight: 50, letterSpacing: -1.4, weight: "800" },
  headline: { size: 30, lineHeight: 36, letterSpacing: -0.7, weight: "800" },
  title: { size: 22, lineHeight: 28, letterSpacing: -0.4, weight: "700" },
  subtitle: { size: 17, lineHeight: 22, letterSpacing: -0.1, weight: "700" },
  bodyLg: { size: 17, lineHeight: 24, letterSpacing: 0, weight: "400" },
  body: { size: 15, lineHeight: 22, letterSpacing: 0, weight: "400" },
  bodySm: { size: 13, lineHeight: 18, letterSpacing: 0.1, weight: "400" },
  label: { size: 13, lineHeight: 16, letterSpacing: 0.2, weight: "700" },
  caption: { size: 11, lineHeight: 14, letterSpacing: 0.3, weight: "600" },
} as const;

export type TypographyToken = keyof typeof typography;

// ─────────────────────────────────────────────────────────────────────────
// Motion — Instagram-style snappy spring on likes, iOS-native page slides,
// minimal ambient motion. Same primitives as before; values retuned for
// shorter durations.
// ─────────────────────────────────────────────────────────────────────────
export const motion = {
  duration: {
    instant: 80,
    fast: 140,
    base: 200,
    slow: 300,
    deliberate: 460,
  },
  spring: {
    /** Crisp tap feedback (button press, like bounce). */
    snappy: { damping: 16, stiffness: 360, mass: 0.5 },
    /** Default UI movement (page transitions, tab indicator). */
    gentle: { damping: 22, stiffness: 220, mass: 0.9 },
    /** Bouncy emphasis (heart pop on double-tap). */
    bouncy: { damping: 10, stiffness: 200, mass: 0.7 },
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────
// Brand palette — sunset coral + magenta + sky messenger.
// ─────────────────────────────────────────────────────────────────────────
const brand = {
  /** Primary action / heart fill / story ring start. */
  primary: "#fffd01",
  coral: "#fffd01",
  coralStrong: "#fffd01",
  coralSoft: "#FB7185",
  /** Story ring end / new-post pulse. */
  magenta: "#fffd01",
  /** Sunset accent for gradient stops between coral and magenta. */
  peach: "#FB923C",
  /** Communications blue — links, mentions, send button on chat. */
  sky: "#1B7CE8",
  skySoft: "#60A5FA",
  warning: "#F59E0B",
  danger: "#DC2626",
  success: "#10B981",
} as const;

/**
 * Story-ring gradient stops — Instagram-style three-color sweep, kept
 * consistent across light/dark so the unviewed-story signal reads
 * identically in both themes.
 */
export const storyRingGradient = [
  brand.peach,
  brand.coral,
  brand.magenta,
] as const;

// ─────────────────────────────────────────────────────────────────────────
// Semantic palette contract.
// ─────────────────────────────────────────────────────────────────────────
export interface ColorPalette {
  bg: { canvas: string; elevated: string; muted: string, primary: string, accentDim: string };
  navbar: { text: string; activeText: string };
  surface: {
    primary: string;
    skillhive: string;
    secondary: string;
    raised: string;
    sunken: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    inverse: string;
    onTint: string;
    black: string;
    white: string;
    skillhive: string;
  };
  border: { subtle: string; strong: string; focus: string; primary: string, default: string };
  tint: {
    primary: string;
    primaryStrong: string;
    primarySoft: string;
    accent: string;
    success: string;
    warning: string;
    danger: string;
  };
  overlay: { scrim: string; glassTint: string; press: string };
  brand: typeof brand;
  /** Bubble surfaces for chat — separated so we can match other-party bubbles to the platform's chat aesthetic. */
  chat: {
    incomingBg: string;
    incomingText: string;
    outgoingBg: string;
    outgoingText: string;
    timestamp: string;
  };
}

export const lightPalette: ColorPalette = {
  navbar: {
    text: "#000000",
    activeText: "#000000",
  },
  bg: {
    canvas: "#FFFFFF",
    elevated: "#FFFFFF",
    muted: "#F4F4F6",
    primary: "#ffffff",
    accentDim: "#fdf8e7"
  },
  surface: {
    primary: "#FFFFFF",
    skillhive: "#e9a422",
    secondary: "#F6F6F8",
    raised: "#FFFFFF",
    sunken: "#EFEFF3",
  },
  text: {
    primary: "#0F0F12",
    secondary: "#5A5A66",
    tertiary: "#94949F",
    inverse: "#FFFFFF",
    onTint: "#FFFFFF",
    black: "#000000",
    white: "#ffffff",
    skillhive: "#e9a422",
  },
  border: {
    subtle: "rgba(15,15,18,0.07)",
    strong: "rgba(15,15,18,0.14)",
    focus: brand.coral,
    primary: "#e9a422",
    default: "#e0e0e0"
  },
  tint: {
    primary: brand.coral,
    primaryStrong: brand.coralStrong,
    primarySoft: brand.coralSoft,
    accent: brand.sky,
    success: brand.success,
    warning: brand.warning,
    danger: brand.danger,
  },
  overlay: {
    scrim: "rgba(10,10,14,0.45)",
    glassTint: "rgba(255,255,255,0.72)",
    press: "rgba(15,15,18,0.06)",
  },
  brand,
  chat: {
    incomingBg: "#F1F1F5",
    incomingText: "#0F0F12",
    outgoingBg: brand.coral,
    outgoingText: "#FFFFFF",
    timestamp: "#94949F",
  },
};

export const darkPalette: ColorPalette = {
  navbar: {
    text: "#ffffff",
    activeText: "#000000",
  },
  bg: {
    canvas: "#1f1f1f",
    elevated: "#0e0e121c",
    muted: "#15151B",
    primary: "#0A0A0A",
    accentDim: "#24280B"
  },
  surface: {
    primary: "#0E0E12",
    skillhive: "#FFFD01",
    secondary: "#15151B",
    raised: "#1B1B22",
    sunken: "#08080B",
  },
  text: {
    primary: "#F5F5F8",
    secondary: "#B6B6C0",
    tertiary: "#76767F",
    inverse: "#0F0F12",
    onTint: "#FFFFFF",
    black: "#000000",
    white: "#ffffff",
    skillhive: "#fffd01",
  },
  border: {
    subtle: "rgba(255,255,255,0.08)",
    strong: "rgba(255,255,255,0.18)",
    focus: brand.coralSoft,
    primary: "#fffd01",
    default: "#343434"
  },
  tint: {
    primary: brand.coral,
    primaryStrong: brand.coralStrong,
    primarySoft: brand.coralSoft,
    accent: brand.skySoft,
    success: brand.success,
    warning: brand.warning,
    danger: brand.danger,
  },
  overlay: {
    scrim: "rgba(0,0,0,0.7)",
    glassTint: "rgba(20,20,26,0.6)",
    press: "rgba(255,255,255,0.06)",
  },
  brand,
  chat: {
    incomingBg: "#1B1B22",
    incomingText: "#F5F5F8",
    outgoingBg: brand.coral,
    outgoingText: "#FFFFFF",
    timestamp: "#76767F",
  },
};

// ─────────────────────────────────────────────────────────────────────────
// Elevation — shadows are softer (FB/IG do not lean on heavy shadows).
// ─────────────────────────────────────────────────────────────────────────
export const elevation = {
  none: {
    shadowOpacity: 0,
    elevation: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
  sm: {
    shadowOpacity: 0.06,
    elevation: 2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  md: {
    shadowOpacity: 0.1,
    elevation: 4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  lg: {
    shadowOpacity: 0.16,
    elevation: 10,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
  },
} as const;

export type ElevationToken = keyof typeof elevation;
