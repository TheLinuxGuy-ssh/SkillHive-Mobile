import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

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
  session_started_at: string | null; // ← only addition
  participants: RoomParticipant[];
}

export function useActiveRooms() {
  const [rooms, setRooms] = useState<ActiveRoom[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchRooms() {
    const { data, error } = await supabase
      .from("active_rooms")
      .select("*")
      .order("started_at", { ascending: true });
    if (!error && data) setRooms(data as ActiveRoom[]);
    setLoading(false);
  }

  useEffect(() => {
    fetchRooms();

    const channel = supabase
      .channel("room_participants_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_participants" },
        fetchRooms,
      )
      .subscribe();

    const poll = setInterval(fetchRooms, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, []);

  return { rooms, loading, refetch: fetchRooms };
}
