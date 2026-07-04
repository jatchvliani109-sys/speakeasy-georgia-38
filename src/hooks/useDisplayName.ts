import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function useDisplayName() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [loaded, setLoaded] = useState<boolean>(false);

  useEffect(() => {
    if (!user) {
      setDisplayName("");
      setLoading(false);
      setLoaded(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const name = (data?.display_name ?? "").trim();
      setDisplayName(name);
      setLoaded(true);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const save = useCallback(
    async (raw: string) => {
      if (!user) return { ok: false as const, error: "no user" };
      const name = raw.trim().slice(0, 60);
      if (!name) return { ok: false as const, error: "empty" };
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: name })
        .eq("id", user.id);
      if (error) return { ok: false as const, error: error.message };
      setDisplayName(name);
      return { ok: true as const };
    },
    [user],
  );

  return { displayName, setDisplayName, save, loading, loaded };
}
