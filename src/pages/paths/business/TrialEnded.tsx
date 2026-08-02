import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Sparkles, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useDisplayName } from "@/hooks/useDisplayName";
import { track } from "@/lib/track";
import { loadProgress } from "./lib/vocabEngine";
import { TRIAL_DAYS, saveBusinessAsync } from "./lib/state";

/**
 * The end of the trial.
 *
 * This is the conversion moment the gift screen was built to set up — the point
 * where the seven days they accepted run out. Two deliberate choices:
 *
 *  1. It LEADS WITH WHAT THEY ACHIEVED, not with what they are losing. A wall
 *     that opens with "your trial has ended, pay now" reads as a toll gate. The
 *     same information after "you learned 84 words in 7 days" reads as an offer
 *     to keep something they built.
 *
 *  2. NOBODY IS LOCKED OUT. The free tier is real and stays. The copy says so
 *     plainly, because a false sense of losing everything produces resentment,
 *     not subscriptions — and the honest version is more persuasive anyway.
 *
 * Shown once, then flagged via trialEndSeen.
 */
export default function TrialEnded() {
  const { user } = useAuth();
  const { displayName } = useDisplayName();
  const navigate = useNavigate();

  const [words, setWords] = useState<number | null>(null);
  const [known, setKnown] = useState(0);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    track("trial_ended_shown");
    const timers = [
      window.setTimeout(() => setStage(1), 100),
      window.setTimeout(() => setStage(2), 500),
      window.setTimeout(() => setStage(3), 850),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, []);

  // What they actually did during the trial — the whole point of the screen.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await loadProgress(user.id);
        if (cancelled) return;
        setWords(rows.length);
        setKnown(rows.filter((r: any) => (r.confidence ?? 0) >= 3).length);
      } catch {
        if (!cancelled) setWords(0);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  /** Mark as seen so the farewell never reappears, then move on. */
  const dismiss = async (to: string) => {
    if (user) {
      try { await saveBusinessAsync(user.id, { trialEndSeen: true }); } catch { /* proceed */ }
    }
    navigate(to, { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#F8F5F0] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div
          className="rounded-3xl overflow-hidden shadow-[0_20px_60px_-20px_rgba(28,28,30,0.35)]"
          style={{
            opacity: stage >= 1 ? 1 : 0,
            transform: stage >= 1 ? "translateY(0)" : "translateY(14px)",
            transition: "opacity .5s ease, transform .5s cubic-bezier(.2,.8,.2,1)",
          }}
        >
          {/* Achievement first. */}
          <div className="bg-gradient-to-br from-[#232323] to-[#161616] px-7 pt-9 pb-8 text-center">
            <span className="inline-grid place-items-center w-14 h-14 rounded-2xl bg-[#C9A84C] text-[#1C1C1E]">
              <Sparkles size={26} strokeWidth={2} />
            </span>
            <p className="ka text-[11px] uppercase tracking-[0.2em] text-[#C9A84C] font-semibold mt-5">
              {TRIAL_DAYS} დღე დასრულდა
            </p>
            <h1 className="ka text-[24px] leading-tight font-bold text-[#F8F5F0] mt-2">
              {displayName ? `${displayName}, ` : ""}კარგი შედეგია
            </h1>

            <div className="flex items-center justify-center gap-8 mt-6">
              <div>
                <p className="text-3xl font-extrabold text-[#C9A84C] tabular-nums">
                  {words === null ? "—" : words}
                </p>
                <p className="ka text-[11px] text-[#F8F5F0]/60 mt-1">სიტყვა დაიწყე</p>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div>
                <p className="text-3xl font-extrabold text-[#C9A84C] tabular-nums">{known}</p>
                <p className="ka text-[11px] text-[#F8F5F0]/60 mt-1">უკვე იცი</p>
              </div>
            </div>
          </div>

          {/* Then the offer — and the reassurance. */}
          <div
            className="bg-white px-7 py-6"
            style={{
              opacity: stage >= 2 ? 1 : 0,
              transform: stage >= 2 ? "translateY(0)" : "translateY(8px)",
              transition: "opacity .45s ease, transform .45s ease",
            }}
          >
            <p className="ka text-sm text-[#1C1C1E] leading-relaxed">
              პრემიუმის ვადა ამოიწურა. <b>შენი პროგრესი არსად წასულა</b> — ყველა ნასწავლი
              სიტყვა, სერია და ლექსიკონი შენთან რჩება.
            </p>
            <p className="ka text-sm text-[#4A4A4A] leading-relaxed mt-3">
              უფასო ვერსიით აგრძელებ ყოველდღიურ სესიებს. თუ გინდა ულიმიტო სესიები და
              კვირაში 7 AI სესია, პრემიუმი ისევ ხელმისაწვდომია.
            </p>
          </div>
        </div>

        <div
          className="mt-5"
          style={{
            opacity: stage >= 3 ? 1 : 0,
            transform: stage >= 3 ? "translateY(0)" : "translateY(8px)",
            transition: "opacity .4s ease, transform .4s ease",
          }}
        >
          <button
            onClick={() => { track("trial_end_upgrade_clicked"); dismiss("/path/business/premium"); }}
            className="ka w-full h-14 rounded-2xl bg-[#5C1A2E] text-[#F8F5F0] text-[15px] font-bold inline-flex items-center justify-center gap-2 hover:bg-[#6B1F36] transition-colors"
          >
            პრემიუმის შენარჩუნება
            <ArrowRight size={17} strokeWidth={2.25} />
          </button>
          <button
            onClick={() => { track("trial_end_continue_free"); dismiss("/path/business/home"); }}
            className="ka w-full mt-3 h-12 text-[13px] text-[#4A4A4A] hover:text-[#5C1A2E] transition-colors inline-flex items-center justify-center gap-1.5"
          >
            <Check size={14} strokeWidth={2.25} />
            უფასო ვერსიით გავაგრძელებ
          </button>
        </div>
      </div>
    </div>
  );
}
