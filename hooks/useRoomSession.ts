// hooks/useRoomSession.ts
import { computePhase, PhaseState } from "@/hooks/sessionPhase";
import { supabase } from "@/lib/supabase";
import { useCallback, useEffect, useRef, useState } from "react";

export function useRoomSession(roomName: string) {
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null);
  const [phaseState, setPhaseState] = useState<PhaseState>(computePhase(null));

  const startedAtRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTicking = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      setPhaseState(computePhase(startedAtRef.current));
    }, 1000);
  }, []);

  useEffect(() => {
    if (!roomName) return;

    // Fetch current value immediately (late joiners catch up in one round-trip)
    supabase
      .from("active_rooms")
      .select("session_started_at")
      .eq("room_name", roomName)
      .single()
      .then(({ data }) => {
        if (data?.session_started_at && !startedAtRef.current) {
          startedAtRef.current = data.session_started_at;
          setSessionStartedAt(data.session_started_at);
          setPhaseState(computePhase(data.session_started_at));
          startTicking();
        }
      });

    // Listen for the one-time write of session_started_at via Realtime
    const channel = supabase
      .channel(`room-session:${roomName}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_participants",
          filter: `room_name=eq.${roomName}`,
        },
        (payload) => {
          const ts: string | null =
            (payload.new as any)?.session_started_at ?? null;
          if (ts && !startedAtRef.current) {
            startedAtRef.current = ts;
            setSessionStartedAt(ts);
            setPhaseState(computePhase(ts));
            startTicking();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [roomName, startTicking]);

  return { phaseState, sessionStartedAt };
}
