import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

type Ctx = { session: Session | null; user: User | null; loading: boolean };
const AuthCtx = createContext<Ctx>({ session: null, user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<{ session: Session | null; loading: boolean }>({
    session: null,
    loading: true,
  });

  useEffect(() => {
    let active = true;
    const commitSession = (nextSession: Session | null) => {
      if (!active) return;
      setAuth((prev) => {
        const sameSession =
          prev.session?.access_token === nextSession?.access_token &&
          prev.session?.user?.id === nextSession?.user?.id;
        if (sameSession && !prev.loading) return prev;
        return { session: nextSession, loading: false };
      });
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      commitSession(s);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      commitSession(session);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({ session: auth.session, user: auth.session?.user ?? null, loading: auth.loading }),
    [auth.session, auth.loading],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
