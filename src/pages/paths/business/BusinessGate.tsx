import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { ensureTrialStarted, pullBusinessFromSupabase } from "./lib/state";

export default function BusinessGate() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const s = await pullBusinessFromSupabase(user.id);
      if (cancelled) return;

      // Start the 7-day premium trial on first arrival. Idempotent: it only
      // writes trialStartedAt if it is absent, so passing through the gate
      // again — or after the trial expires — never restarts it.
      ensureTrialStarted(user.id, s);
      // ONBOARDING GATE — deliberately short.
      //
      // This used to force six screens before a user could reach the app:
      // test -> setup(name + 3 steps) -> plan -> resume -> self-intro -> home.
      // That asks for a lot of investment before showing any value, from
      // someone who arrived to learn vocabulary and has not yet seen a word.
      //
      // Now only setup is required (name + field, with the rest defaultable),
      // and the placement test is skippable. Plan, resume and self-introduction
      // are all reachable from the dashboard, so deferring them orphans nothing.
      if (!s.setupCompleted) navigate("/path/business/setup", { replace: true });
      else navigate("/path/business/home", { replace: true });
    })();
    return () => { cancelled = true; };
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center text-[#4A4A4A]">
      <span className="ka text-sm">იტვირთება...</span>
    </div>
  );
}
