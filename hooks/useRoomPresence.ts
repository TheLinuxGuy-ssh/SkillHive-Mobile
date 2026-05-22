import { supabase } from "@/lib/supabase";
import { useEffect, useRef } from "react";

export function useRoomPresence(
  roomName: string | undefined,
  onJoinFailed?: () => void,
) {
  const participantId = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const joinedRef = useRef(false);
  const sessionTriggeredRef = useRef(false); // ← new: prevent double-write

  useEffect(() => {
    if (!roomName) return;

    async function join() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) {
          onJoinFailed?.();
          return;
        }

        userIdRef.current = user.id;

        await supabase
          .from("room_participants")
          .delete()
          .eq("user_id", user.id)
          .eq("room_name", roomName);

        const { data, error: insertError } = await supabase
          .from("room_participants")
          .insert({
            room_name: roomName,
            user_id: user.id,
            joined_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (insertError || !data) {
          onJoinFailed?.();
          return;
        }

        const { data: verify, error: verifyError } = await supabase
          .from("room_participants")
          .select("id")
          .eq("id", data.id)
          .single();
        if (verifyError || !verify) {
          onJoinFailed?.();
          return;
        }

        participantId.current = data.id;
        joinedRef.current = true;

        if (!sessionTriggeredRef.current) {
          const { count } = await supabase
            .from("room_participants")
            .select("id", { count: "exact", head: true })
            .eq("room_name", roomName);

          if ((count ?? 0) >= 0) {
            sessionTriggeredRef.current = true;
            const { data, error } = await supabase.rpc(
              "start_room_session_if_not_started",
              {
                p_room_name: roomName,
              },
            );

            console.log("RPC data:", data);
            console.log("RPC error:", error);
          }
        }
        // ── END NEW ──
      } catch (err) {
        console.error("join failed", err);
        onJoinFailed?.();
      }
    }

    async function leave() {
      if (!joinedRef.current || !userIdRef.current) return;
      if (participantId.current) {
        const { error } = await supabase
          .from("room_participants")
          .delete()
          .eq("id", participantId.current);
        if (error) {
          await supabase
            .from("room_participants")
            .delete()
            .eq("user_id", userIdRef.current)
            .eq("room_name", roomName);
        }
      } else {
        await supabase
          .from("room_participants")
          .delete()
          .eq("user_id", userIdRef.current)
          .eq("room_name", roomName);
      }
      participantId.current = null;
      userIdRef.current = null;
      joinedRef.current = false;
    }

    let heartbeat: ReturnType<typeof setInterval> | null = null;

    join().then(() => {
      if (joinedRef.current) {
        heartbeat = setInterval(async () => {
          if (!participantId.current || !joinedRef.current) return;
          await supabase
            .from("room_participants")
            .update({ last_seen: new Date().toISOString() })
            .eq("id", participantId.current);
        }, 30000);
      }
    });

    return () => {
      if (heartbeat) clearInterval(heartbeat);
      leave();
    };
  }, [roomName]);
}
