import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Gift, Sparkles, Check, Infinity as InfinityIcon, Bot } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useDisplayName } from "@/hooks/useDisplayName";
import { track } from "@/lib/track";
import {
  TRIAL_AI_TOTAL,
  TRIAL_DAYS,
  pullBusinessFromSupabase,
  saveBusinessAsync,
  shouldOfferTrial,
} from "./lib/state";

/**
 * The trial as a GIFT, not a granted default.
 *
 * The trial previously started silently at the gate — technically the same
 * seven days, but psychologically nothing. Something you are handed and choose
 * to accept is valued differently from something switched on for you, and the
 * moment of accepting is what makes the eventual expiry feel like a loss worth
 * paying to avoid.
 *
 * Design constraints from the brand system:
 *   - burgundy #5C1A2E is a TEXT/BORDER accent, never a large surface
 *   - gold #C9A84C carries celebration, and only on dark
 *   - the big surface is the dark card (#232323 -> #1C1C1E), as used elsewhere
 *
 * Declining is deliberately irreversible (Olegi's call) — so it gets a
 * confirmation step. An irreversible action one tap away is a trap.
 */
export default function TrialGift() {
  const { user } = useAuth();
  const { displayName } = useDisplayName();
  const navigate = useNavigate();

  // ELIGIBILITY GUARD.
  //
  // The route is reached through BusinessGate in normal use, but the page must
  // defend itself: anyone can type /path/business/gift. Without this, a user
  // who declined could come back and take it, and — worse — someone whose
  // trial had EXPIRED could restart it by revisiting the URL, indefinitely.
  //
  // Checked against the server copy of state, not local, so clearing
  // localStorage cannot fake eligibility.
  const [eligible, setEligible] = useState<boolean | null>(null);

  const [busy, setBusy] = useState(false);
  const [confirmDecline, setConfirmDecline] = useState(false);
  const [accepted, setAccepted] = useState(false);

  // Staged entrance. Each element waits its turn so the moment builds rather
  // than arriving all at once.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");

        // AUTHORITATIVE CHECK. shouldOfferTrial() reads business_state, which
        // the browser can write — so clearing trialStartedAt locally made the
        // page believe the user was eligible. has_claimed_trial() reads
        // trial_claims, a table the client cannot write at all.
        const { data: claimed } = await supabase.rpc("has_claimed_trial");
        if (cancelled) return;

        if (claimed === true) {
          // Their state was cleared but the server remembers. Repair the local
          // copy so the rest of the app stops believing a trial is available.
          await saveBusinessAsync(user.id, { trialOffered: true });
          setEligible(false);
          navigate("/path/business/home", { replace: true });
          return;
        }

        // Server says no claim on record — now the ordinary checks apply
        // (setup finished, not already paying).
        const st = await pullBusinessFromSupabase(user.id);
        if (cancelled) return;
        const ok = shouldOfferTrial(st);
        setEligible(ok);
        if (!ok) navigate("/path/business/home", { replace: true });
      } catch {
        // Cannot verify -> do not hand out a trial.
        if (!cancelled) {
          setEligible(false);
          navigate("/path/business/home", { replace: true });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [user, navigate]);

  const [stage, setStage] = useState(0);
  useEffect(() => {
    const timers = [
      window.setTimeout(() => setStage(1), 120),
      window.setTimeout(() => setStage(2), 520),
      window.setTimeout(() => setStage(3), 900),
      window.setTimeout(() => setStage(4), 1250),
    ];
    track("trial_gift_shown");
    return () => timers.forEach(window.clearTimeout);
  }, []);

  // Fixed sparkle positions — random per render would jitter on re-render.
  const sparkles = useMemo(
    () => [
      { l: "12%", t: "18%", d: "0s", s: 6 },
      { l: "84%", t: "22%", d: "0.4s", s: 8 },
      { l: "22%", t: "72%", d: "0.8s", s: 5 },
      { l: "78%", t: "68%", d: "0.2s", s: 7 },
      { l: "50%", t: "10%", d: "0.6s", s: 5 },
      { l: "8%", t: "48%", d: "1s", s: 6 },
      { l: "90%", t: "46%", d: "0.3s", s: 5 },
    ],
    [],
  );

  const finish = () => navigate("/path/business/home", { replace: true });

  // Nothing renders until the server confirms eligibility — otherwise the gift
  // would flash on screen for an ineligible user before redirecting.
  if (eligible !== true && !accepted) {
    return <div className="min-h-screen bg-[#F8F5F0]" />;
  }

  const accept = async () => {
    if (!user || busy) return;
    setBusy(true);
    try {
      // Re-check against the server, not local state — same reason as the
      // mount guard. This also closes the gap between mount and click.
      const { supabase: sb } = await import("@/integrations/supabase/client");
      const { data: alreadyClaimed } = await sb.rpc("has_claimed_trial");
      if (alreadyClaimed === true) {
        await saveBusinessAsync(user.id, { trialOffered: true });
        navigate("/path/business/home", { replace: true });
        return;
      }
      const fresh = await pullBusinessFromSupabase(user.id);
      if (!shouldOfferTrial(fresh)) {
        navigate("/path/business/home", { replace: true });
        return;
      }
      // claim_trial is the authority: it records the claim in a table the
      // client cannot write, so clearing localStorage or editing business_state
      // cannot produce a second trial. It also mirrors the flags into
      // business_state so existing client logic keeps working unchanged.
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: claim } = await supabase.rpc("claim_trial", { p_declined: false });
      if (claim && (claim as any).ok === false) {
        navigate("/path/business/home", { replace: true });
        return;
      }
      track("trial_accepted");
      setAccepted(true);
      window.setTimeout(finish, 1600);
    } catch {
      // Never trap the user on this screen over a failed write.
      finish();
    }
  };

  const decline = async () => {
    if (!user || busy) return;
    setBusy(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      await supabase.rpc("claim_trial", { p_declined: true });
      track("trial_declined");
    } catch {
      /* proceed regardless */
    }
    finish();
  };

  if (accepted) {
    return (
      <div className="min-h-screen bg-[#F8F5F0] grid place-items-center px-4">
        <div className="text-center animate-[giftPop_.5s_cubic-bezier(.2,.8,.2,1)_both]">
          <span className="inline-grid place-items-center w-20 h-20 rounded-full bg-[#5C1A2E] text-[#C9A84C]">
            <Check size={38} strokeWidth={2.5} />
          </span>
          <h1 className="ka text-2xl font-bold text-[#5C1A2E] mt-5">
            პრემიუმი გააქტიურებულია
          </h1>
          <p className="ka text-sm text-[#4A4A4A] mt-2">
            {TRIAL_DAYS} დღე შენია. ისიამოვნე.
          </p>
        </div>
        <style>{keyframes}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F5F0] flex items-center justify-center px-4 py-10 relative overflow-hidden">
      {/* ambient sparkles — behind the card, low opacity, gold */}
      {sparkles.map((sp, i) => (
        <span
          key={i}
          aria-hidden
          className="absolute rounded-full bg-[#C9A84C] pointer-events-none"
          style={{
            left: sp.l,
            top: sp.t,
            width: sp.s,
            height: sp.s,
            opacity: 0,
            animation: `sparkleFloat 3.2s ease-in-out ${sp.d} infinite`,
          }}
        />
      ))}

      <div className="w-full max-w-md relative">
        {/* the gift card */}
        <div
          className="rounded-3xl overflow-hidden shadow-[0_20px_60px_-20px_rgba(28,28,30,0.45)]"
          style={{
            opacity: stage >= 1 ? 1 : 0,
            transform: stage >= 1 ? "translateY(0) scale(1)" : "translateY(16px) scale(.97)",
            transition: "opacity .5s ease, transform .5s cubic-bezier(.2,.8,.2,1)",
          }}
        >
          {/* dark celebratory surface */}
          <div className="bg-gradient-to-br from-[#232323] to-[#161616] px-7 pt-9 pb-8 text-center relative">
            <span
              className="inline-grid place-items-center w-16 h-16 rounded-2xl bg-[#C9A84C] text-[#1C1C1E]"
              style={{
                opacity: stage >= 1 ? 1 : 0,
                transform: stage >= 1 ? "scale(1) rotate(0deg)" : "scale(.6) rotate(-12deg)",
                transition: "opacity .45s ease, transform .55s cubic-bezier(.2,1.3,.4,1)",
              }}
            >
              <Gift size={30} strokeWidth={2} />
            </span>

            <div
              style={{
                opacity: stage >= 2 ? 1 : 0,
                transform: stage >= 2 ? "translateY(0)" : "translateY(10px)",
                transition: "opacity .45s ease, transform .45s ease",
              }}
            >
              <p className="ka text-[11px] uppercase tracking-[0.2em] text-[#C9A84C] font-semibold mt-5">
                საჩუქარი
              </p>
              <h1 className="ka text-[26px] leading-tight font-bold text-[#F8F5F0] mt-2">
                {displayName ? `${displayName}, ` : ""}პირველი {TRIAL_DAYS} დღე
                <br />
                <span className="text-[#C9A84C]">პრემიუმია — ჩვენგან</span>
              </h1>
              <p className="ka text-[13px] text-[#F8F5F0]/70 mt-3 leading-relaxed">
                გვინდა ნახო, რისი შეთავაზება შეგვიძლია — ვალდებულების გარეშე.
              </p>
            </div>
          </div>

          {/* what they get */}
          <div
            className="bg-white px-7 py-6"
            style={{
              opacity: stage >= 3 ? 1 : 0,
              transform: stage >= 3 ? "translateY(0)" : "translateY(10px)",
              transition: "opacity .45s ease, transform .45s ease",
            }}
          >
            <Perk
              icon={<InfinityIcon size={16} strokeWidth={2.25} />}
              title="ულიმიტო ლექსიკის სესიები"
              sub={`${TRIAL_DAYS} დღის განმავლობაში — დღიური ლიმიტის გარეშე`}
            />
            <Perk
              icon={<Bot size={16} strokeWidth={2.25} />}
              title={`${TRIAL_AI_TOTAL} AI სესია`}
              sub="გასაუბრების სიმულაცია, დოკუმენტები, თვითპრეზენტაცია — პრემიუმში 7 ყოველ კვირას"
            />
            <Perk
              icon={<Sparkles size={16} strokeWidth={2.25} />}
              title="ყველა ფუნქცია ღიაა"
              sub="სცენარები, ლექსიკონი, სერია — ყველაფერი"
              last
            />

            <p className="ka text-[11px] text-[#8A8A8A] mt-5 leading-relaxed text-center">
              ბარათი არ გჭირდება. არაფერი ჩამოგეჭრება.
              <br />
              {TRIAL_DAYS} დღის შემდეგ ავტომატურად გადახვალ უფასო ვერსიაზე.
            </p>
          </div>
        </div>

        {/* actions */}
        <div
          className="mt-5"
          style={{
            opacity: stage >= 4 ? 1 : 0,
            transform: stage >= 4 ? "translateY(0)" : "translateY(8px)",
            transition: "opacity .4s ease, transform .4s ease",
          }}
        >
          {!confirmDecline ? (
            <>
              <button
                onClick={accept}
                disabled={busy}
                className="ka w-full h-14 rounded-2xl bg-[#5C1A2E] text-[#F8F5F0] text-[15px] font-bold inline-flex items-center justify-center gap-2 hover:bg-[#6B1F36] transition-colors disabled:opacity-60"
              >
                <Gift size={17} strokeWidth={2.25} />
                {busy ? "ირთვება..." : "მადლობა, ვიღებ"}
              </button>
              <button
                onClick={() => setConfirmDecline(true)}
                disabled={busy}
                className="ka w-full mt-3 h-11 text-[13px] text-[#8A8A8A] hover:text-[#5C1A2E] transition-colors"
              >
                არა, გმადლობთ — უფასო ვერსიით დავიწყებ
              </button>
            </>
          ) : (
            <div className="rounded-2xl border border-[#E4E2DF] bg-white p-5 text-center">
              <p className="ka text-sm text-[#1C1C1E] font-semibold">
                დარწმუნებული ხარ?
              </p>
              <p className="ka text-xs text-[#4A4A4A] mt-1.5 leading-relaxed">
                ეს შეთავაზება მხოლოდ ერთხელ ჩნდება — მოგვიანებით ვეღარ გაააქტიურებ.
              </p>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setConfirmDecline(false)}
                  disabled={busy}
                  className="ka flex-1 h-11 rounded-xl bg-[#5C1A2E] text-[#F8F5F0] text-[13px] font-bold"
                >
                  დავბრუნდე
                </button>
                <button
                  onClick={decline}
                  disabled={busy}
                  className="ka flex-1 h-11 rounded-xl border border-[#E4E2DF] text-[#4A4A4A] text-[13px] font-semibold"
                >
                  {busy ? "..." : "დიახ, გამოვტოვებ"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{keyframes}</style>
    </div>
  );
}

function Perk({
  icon,
  title,
  sub,
  last,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-start gap-3 ${last ? "" : "pb-4 mb-4 border-b border-[#F0EEEB]"}`}
    >
      <span className="shrink-0 w-9 h-9 rounded-xl bg-[#5C1A2E]/8 text-[#5C1A2E] grid place-items-center">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="ka text-[13px] font-bold text-[#1C1C1E]">{title}</p>
        <p className="ka text-[11px] text-[#4A4A4A] mt-0.5 leading-relaxed">{sub}</p>
      </div>
    </div>
  );
}

const keyframes = `
@keyframes sparkleFloat {
  0%   { opacity: 0; transform: translateY(6px) scale(.6); }
  35%  { opacity: .55; transform: translateY(-4px) scale(1); }
  70%  { opacity: .2; transform: translateY(-10px) scale(.9); }
  100% { opacity: 0; transform: translateY(-16px) scale(.6); }
}
@keyframes giftPop {
  0%   { opacity: 0; transform: scale(.85); }
  60%  { opacity: 1; transform: scale(1.04); }
  100% { opacity: 1; transform: scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
`;
