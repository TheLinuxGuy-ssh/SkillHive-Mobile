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
  email: string;
  username: string;
  displayname: string;
  bio: string;
  language: string;
  followers: number;
  following: number;
};

type ProfileContextValue = {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  updateField: (
    key: keyof Omit<Profile, "id">,
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

  useEffect(() => {
    isMounted.current = true;
    load();

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      // Only reload on actual sign in/out, not on every token refresh
      if (event === "SIGNED_IN") load();
      if (event === "SIGNED_OUT") {
        setProfile(null);
        setError(null);
      }
    });

    return () => {
      isMounted.current = false;
      listener.subscription.unsubscribe();
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
      .select("*")
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
      setProfile({ ...data, email: user.email ?? data.email ?? "" });
    }

    setLoading(false);
  };

  const create = async (id: string, email: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .insert({ id })
      .select()
      .single();

    if (!isMounted.current) return;
    if (error) {
      setError(error.message);
      return;
    }
    setProfile({ ...data, email });
  };

  const updateField = async (
    key: keyof Omit<Profile, "id">,
    value: string,
  ): Promise<boolean> => {
    if (!profile) return false;

    if (key === "email") {
      const { error } = await supabase.auth.updateUser({ email: value });
      if (error) {
        console.error(error.message);
        return false;
      }
      if (isMounted.current)
        setProfile((prev) => (prev ? { ...prev, email: value } : prev));
      return true;
    }

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
    if (isMounted.current)
      setProfile((prev) => (prev ? { ...prev, [key]: value } : prev));
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
