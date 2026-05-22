// utils/sessionPhase.ts

export const FOCUS_MS = 1 * 60 * 1000; // 50 min
export const BREAK_MS = 1 * 60 * 1000; // 10 min
export const CYCLE_MS = FOCUS_MS + BREAK_MS;

export type SessionPhase = "waiting" | "focus" | "break";

export interface PhaseState {
  phase: SessionPhase;
  remainingSeconds: number;
  progress: number;
  micAllowed: boolean;
}

export function computePhase(
  session_started_at: string | null,
  now = Date.now(),
): PhaseState {
  if (!session_started_at) {
    return {
      phase: "waiting",
      remainingSeconds: 0,
      progress: 0,
      micAllowed: false,
    };
  }

  const elapsed = now - new Date(session_started_at).getTime();
  const pos = elapsed % CYCLE_MS;

  if (pos < FOCUS_MS) {
    return {
      phase: "focus",
      remainingSeconds: Math.ceil((FOCUS_MS - pos) / 1000),
      progress: pos / FOCUS_MS,
      micAllowed: false,
    };
  }

  return {
    phase: "break",
    remainingSeconds: Math.ceil((CYCLE_MS - pos) / 1000),
    progress: (pos - FOCUS_MS) / BREAK_MS,
    micAllowed: true,
  };
}
