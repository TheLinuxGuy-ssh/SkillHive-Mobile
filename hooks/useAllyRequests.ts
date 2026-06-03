import { useProfile } from "@/hooks/profileContext";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

export type AllyRequest = {
  id: string;
  requester_id: string;
  created_at: string;
  requester: {
    displayname: string;
    username: string | null;
    avatar: string | null;
  };
};

export function useAllyRequests() {
  const { profile } = useProfile();
  const [requests, setRequests] = useState<AllyRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;
    fetchRequests();

    // realtime — fires when someone sends you a request
    const channel = supabase
      .channel("ally-requests")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "allies",
          filter: `receiver_id=eq.${profile.id}`,
        },
        () => fetchRequests()
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "allies",
          filter: `receiver_id=eq.${profile.id}`,
        },
        () => fetchRequests()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile?.id]);

  async function fetchRequests() {
    if (!profile?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("allies")
      .select(`
        id,
        requester_id,
        created_at,
        requester:profiles!allies_requester_id_fkey (
          displayname, username, avatar
        )
      `)
      .eq("receiver_id", profile.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    setRequests((data as any) ?? []);
    setLoading(false);
  }

  async function accept(requesterId: string) {
    await supabase
      .from("allies")
      .update({ status: "accepted" })
      .eq("requester_id", requesterId)
      .eq("receiver_id", profile!.id);
    await fetchRequests();
  }

  async function decline(requesterId: string) {
    await supabase
      .from("allies")
      .delete()
      .eq("requester_id", requesterId)
      .eq("receiver_id", profile!.id);
    await fetchRequests();
  }

  return { requests, loading, accept, decline };
}