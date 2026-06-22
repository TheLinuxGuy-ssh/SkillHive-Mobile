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
      .order("started_at", { ascending: false });

    if (!mounted.current) return;
    if (!error && data) setRooms(data as ActiveRoom[]);
    setLoading(false);
  }

  useEffect(() => {
    mounted.current = true;
    const channelName = `room_changes_${Date.now()}`;
    let channels: ReturnType<typeof supabase.channel>[] = [];
    let poll: ReturnType<typeof setInterval> | null = null;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted.current || !session) {
        setLoading(false);
        return;
      }

      fetchRooms();

      // Listen to room_participants changes
      const participantsChannel = supabase
        .channel(`${channelName}_participants`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "room_participants" },
          () => fetchRooms()
        )
        .subscribe();

      channels.push(participantsChannel);

      // ALSO listen to rooms table for new rooms or session starts
      const roomsChannel = supabase
        .channel(`${channelName}_rooms`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "rooms" },
          () => fetchRooms()
        )
        .subscribe();

      channels.push(roomsChannel);

      // Fallback polling (more aggressive)
      poll = setInterval(fetchRooms, 5000); // 5 seconds instead of 10
    });

    return () => {
      mounted.current = false;
      channels.forEach((ch) => supabase.removeChannel(ch));
      if (poll) clearInterval(poll);
    };
  }, []);

  return { rooms, loading, refetch: fetchRooms };
}