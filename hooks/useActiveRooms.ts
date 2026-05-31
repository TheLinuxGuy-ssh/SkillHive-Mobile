import { supabase } from "@/lib/supabase";
import { useEffect, useRef, useState } from "react";

export interface RoomParticipant {
  user_id: string;
  username: string;
  displayname: string;
  avatar: string | null;
}

export interface ActiveRoom {
  room_name: string;
  participant_count: number;
  started_at: string;
  session_started_at: string | null;
  participants: RoomParticipant[];
}

export function useActiveRooms() {
  const [rooms, setRooms] = useState<ActiveRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  async function fetchRooms() {
    const { data, error } = await supabase
      .from("active_rooms")
      .select("*")
      .order("started_at", { ascending: true });

    if (!mounted.current) return;
    if (!error && data) setRooms(data as ActiveRoom[]);
    setLoading(false);
  }

  useEffect(() => {
    mounted.current = true;

    // unique per mount so no stale channel collision
    const channelName = `room_participants_changes_${Date.now()}`;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted.current || !session) {
        setLoading(false);
        return;
      }

      fetchRooms();

      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "room_participants" },
          () => { fetchRooms(); },
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            poll = setInterval(fetchRooms, 10000);
          }
        });
    });

    return () => {
      mounted.current = false;
      if (channel) supabase.removeChannel(channel);
      if (poll) clearInterval(poll);
    };
  }, []);

  return { rooms, loading, refetch: fetchRooms };
}