import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import {
  pullBusinessFromSupabase,
  saveBusinessAsync,
  shouldOfferTrial,
  shouldShowTrialEnd,
} from "./lib/state";

export default function BusinessGate() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const s = await pullBusinessFromSupabase(user.id);
      if (cancelled) return;

      // SUBSCRIPTION EXPIRY.
      //
      // Premium access lives in business_state.mockPro, which the payment
      // callback sets. Nothing would ever unset it, so a cancelled or lapsed
      // subscription would keep full access forever. Checked on entry rather
      // than by a scheduled job: it costs one query and cannot silently fail.
      if (s.mockPro === true) {
        try {
          const { supabase } = await import("@/integrations/supabase/client");
          const { data: sub } = await supabase
            .from("subscriptions" as any)
            .select("status, current_period_end")
            .maybeSingle();
          const ended =
            sub &&
            (sub as any).current_period_end &&
            new Date((sub as any).current_period_end) < new Date();
          if (ended) {
            await saveBusinessAsync(user.id, { mockPro: false });
            s.mockPro = false;
          }
        } catch { /* no subscriptions table yet: leave access as-is */ }
      }


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
      // The gift is offered once, immediately after setup, before the dashboard.
      else if (shouldOfferTrial(s)) navigate("/path/business/gift", { replace: true });
      // Trial ran out and they have not been told yet.
      else if (shouldShowTrialEnd(s)) navigate("/path/business/trial-ended", { replace: true });
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
