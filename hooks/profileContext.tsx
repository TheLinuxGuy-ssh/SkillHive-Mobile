import { supabase } from "@/lib/supabase";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type Profile = {
  id: string;
  username: string | null;
  avatar: string | null;
  banner: string | null;
  bio: string | null;
  displayname: string;
  created_at: string;
  email: string;
};

type ProfileContextValue = {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  updateField: (
    key: keyof Omit<Profile, "id" | "created_at" | "email">,
    value: string,
  ) => Promise<boolean>;
  reload: () => Promise<void>;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export const ProfileProvider = ({ children }: { children: ReactNode }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    isMounted.current = true;
    load();

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") load();
      if (event === "SIGNED_OUT") {
        setProfile(null);
        setError(null);
        // Cleanup subscriptions on sign out
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
    });

    return () => {
      isMounted.current = false;
      listener.subscription.unsubscribe();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, []);

  const load = async () => {
    if (!isMounted.current) return;
    setLoading(true);
    setError(null);

    const [
      {
        data: { session },
        error: sessionErr,
      },
      {
        data: { user },
        error: userErr,
      },
    ] = await Promise.all([
      supabase.auth.getSession(),
      supabase.auth.getUser(),
    ]);

    if (!isMounted.current) return;

    if (sessionErr || !session || userErr || !user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const { data, error: fetchErr } = await supabase
      .from("profiles")
      .select(
        "id, username, avatar, banner, bio, displayname, created_at",
      )
      .eq("id", user.id)
      .single();

    if (!isMounted.current) return;

    if (fetchErr) {
      if (fetchErr.code === "PGRST116") {
        await create(user.id, user.email ?? "");
      } else {
        setError(fetchErr.message);
      }
    } else {
      setProfile({ ...data, email: user.email ?? "" });
      // Setup real-time subscription AFTER profile loads
      setupRealtimeSubscription(user.id);
    }

    setLoading(false);
  };

  const setupRealtimeSubscription = (userId: string) => {
    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`profile_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          if (isMounted.current) {
            // Refetch to ensure we have latest data
            load();
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          // Also set up polling as fallback (every 30s)
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = setInterval(() => {
            if (isMounted.current) load();
          }, 30000);
        }
      });

    channelRef.current = channel;
  };

  const create = async (id: string, email: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .insert({ id, displayname: email.split("@")[0] })
      .select(
        "id, username, avatar, banner, bio, displayname, created_at",
      )
      .single();

    if (!isMounted.current) return;

    if (error) {
      setError(error.message);
      return;
    }

    setProfile({ ...data, email });
    // Subscribe after profile is created
    setupRealtimeSubscription(id);
  };

  const updateField = async (
    key: keyof Omit<Profile, "id" | "created_at" | "email">,
    value: string,
  ): Promise<boolean> => {
    if (!profile) return false;

    const { error } = await supabase
      .from("profiles")
      .update({ [key]: value })
      .eq("id", profile.id)
      .select()
      .single();

    if (error) {
      console.error(error.message);
      return false;
    }

    if (isMounted.current) {
      setProfile((prev) => (prev ? { ...prev, [key]: value } : prev));
    }

    return true;
  };

  return (
    <ProfileContext.Provider
      value={{ profile, loading, error, updateField, reload: load }}
    >
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = (): ProfileContextValue => {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used inside ProfileProvider");
  return ctx;
};