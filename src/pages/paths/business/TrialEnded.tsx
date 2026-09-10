import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, BookOpen, Brain, Flame } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useDisplayName } from "@/hooks/useDisplayName";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/track";
import {
  pullBusinessFromSupabase,
  saveBusinessAsync,
  shouldShowTrialEnd,
} from "./lib/state";

/**
 * Trial ended screen.
 *
 * Shown once after the 7-day gift expires. Leads with what the user kept,
 * then offers premium. Marks trialEndSeen so the gate does not redirect back.
 */
export default function TrialEnded() {
  const { user } = useAuth();
  const { displayName } = useDisplayName();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ words: 0, percent: 0 });

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const st = await pullBusinessFromSupabase(user.id);
      if (cancelled) return;

      // Guard: only someone whose trial just ended should land here.
      if (!shouldShowTrialEnd(st)) {
        navigate("/path/business/home", { replace: true });
        return;
      }

      // Mark the farewell as shown so BusinessGate stops routing here.
      await saveBusinessAsync(user.id, { trialEndSeen: true });

      // Best-effort stats from progress table.
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { count } = await (supabase as any)
          .from("vocabulary_progress")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "learned");
        const learned = count ?? 0;
        setStats({
          words: learned,
          percent: Math.min(Math.round((learned / 1500) * 1000) / 10, 100),
        });
      } catch {
        // Stats are decorative; do not block the screen.
      } finally {
        setLoading(false);
      }

      track("trial_ended_shown");
    })();
    return () => { cancelled = true; };
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <span className="ka text-sm text-ink-muted">იტვირთება...</span>
      </div>
    );
  }

  const greeting = displayName ? `${displayName}, ` : "";

  return (
    <div className="min-h-screen bg-cream px-4 py-8 md:py-12">
      <div className="max-w-md mx-auto">
        <div className="bg-panel rounded-2xl p-6 md:p-8 text-on-dark shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
              <Crown className="w-5 h-5 text-gold" />
            </div>
            <span className="text-sm font-medium text-gold tracking-wide uppercase">
              საცდელი პერიოდი დასრულდა
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold mb-3">
            {greeting}7 დღე დასრულდა
          </h1>

          <p className="text-on-dark-muted leading-relaxed mb-6">
            პრემიუმის საცდელი პერიოდი ამოიწურა. შენი პროგრესი არსად წასულა — ყველა ნასწავლი სიტყვა, streak-ი და ლექსიკონი შენთან რჩება.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-cream/10 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-gold">{stats.words}</p>
              <p className="text-xs text-on-dark-muted/80 mt-1">სიტყვა დაიწყე</p>
            </div>
            <div className="bg-cream/10 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-gold">{stats.percent}%</p>
              <p className="text-xs text-on-dark-muted/80 mt-1">ლექსიკა დაფარულია</p>
            </div>
          </div>

          <div className="space-y-3 mb-8">
            <div className="flex items-start gap-3">
              <BookOpen className="w-5 h-5 text-gold mt-0.5 shrink-0" />
              <p className="text-sm text-on-dark-muted">ულიმიტო სესიები და ლექსიკონი</p>
            </div>
            <div className="flex items-start gap-3">
              <Brain className="w-5 h-5 text-gold mt-0.5 shrink-0" />
              <p className="text-sm text-on-dark-muted">კვირაში 7 AI სესია</p>
            </div>
            <div className="flex items-start gap-3">
              <Flame className="w-5 h-5 text-gold mt-0.5 shrink-0" />
              <p className="text-sm text-on-dark-muted">გასაუბრების სიმულაცია</p>
            </div>
          </div>

          <Button
            onClick={() => {
              track("trial_end_upgrade_clicked", { source: "trial_ended" });
              navigate("/path/business/premium");
            }}
            className="w-full h-12 bg-gold hover:bg-gold-deep text-ink font-bold rounded-full text-base"
          >
            პრემიუმის ნახვა — 13.99 ლარი/თვე
          </Button>

          <button
            onClick={() => navigate("/path/business/home", { replace: true })}
            className="w-full mt-4 text-sm text-on-dark-muted/70 hover:text-on-dark transition-colors"
          >
            უფასო ვერსიით გაგრძელება
          </button>
        </div>
      </div>
    </div>
  );
}
