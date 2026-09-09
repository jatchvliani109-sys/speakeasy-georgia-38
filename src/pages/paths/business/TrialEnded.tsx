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
        const { count } = await supabase
          .from("vocabulary_progress" as any)
          .select("*", { count: "exact", head: true })
          .eq("user_id" as any, user.id)
          .eq("status" as any, "learned");
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
      <div className="min-h-screen flex items-center justify-center bg-[#F8F5F0]">
        <span className="ka text-sm text-[#4A4A4A]">იტვირთება...</span>
      </div>
    );
  }

  const greeting = displayName ? `${displayName}, ` : "";

  return (
    <div className="min-h-screen bg-[#F8F5F0] px-4 py-8 md:py-12">
      <div className="max-w-md mx-auto">
        <div className="bg-[#1C1C1E] rounded-2xl p-6 md:p-8 text-[#F8F5F0] shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-[#C9A84C]/20 flex items-center justify-center">
              <Crown className="w-5 h-5 text-[#C9A84C]" />
            </div>
            <span className="text-sm font-medium text-[#C9A84C] tracking-wide uppercase">
              საცდელი პერიოდი დასრულდა
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold mb-3">
            {greeting}7 დღე დასრულდა
          </h1>

          <p className="text-[#E4E2DF] leading-relaxed mb-6">
            პრემიუმის საცდელი პერიოდი ამოიწურა. შენი პროგრესი არსად წასულა — ყველა ნასწავლი სიტყვა, streak-ი და ლექსიკონი შენთან რჩება.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-[#F8F5F0]/10 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-[#C9A84C]">{stats.words}</p>
              <p className="text-xs text-[#E4E2DF]/80 mt-1">სიტყვა დაიწყე</p>
            </div>
            <div className="bg-[#F8F5F0]/10 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-[#C9A84C]">{stats.percent}%</p>
              <p className="text-xs text-[#E4E2DF]/80 mt-1">ლექსიკა დაფარულია</p>
            </div>
          </div>

          <div className="space-y-3 mb-8">
            <div className="flex items-start gap-3">
              <BookOpen className="w-5 h-5 text-[#C9A84C] mt-0.5 shrink-0" />
              <p className="text-sm text-[#E4E2DF]">ულიმიტო სესიები და ლექსიკონი</p>
            </div>
            <div className="flex items-start gap-3">
              <Brain className="w-5 h-5 text-[#C9A84C] mt-0.5 shrink-0" />
              <p className="text-sm text-[#E4E2DF]">კვირაში 7 AI სესია</p>
            </div>
            <div className="flex items-start gap-3">
              <Flame className="w-5 h-5 text-[#C9A84C] mt-0.5 shrink-0" />
              <p className="text-sm text-[#E4E2DF]">გასაუბრების სიმულაცია</p>
            </div>
          </div>

          <Button
            onClick={() => {
              track("premium_cta_clicked", { source: "trial_ended" });
              navigate("/path/business/premium");
            }}
            className="w-full h-12 bg-[#C9A84C] hover:bg-[#B89A3E] text-[#1C1C1E] font-bold rounded-full text-base"
          >
            პრემიუმის ნახვა — 13.99 ლარი/თვე
          </Button>

          <button
            onClick={() => navigate("/path/business/home", { replace: true })}
            className="w-full mt-4 text-sm text-[#E4E2DF]/70 hover:text-[#F8F5F0] transition-colors"
          >
            უფასო ვერსიით გაგრძელება
          </button>
        </div>
      </div>
    </div>
  );
}
