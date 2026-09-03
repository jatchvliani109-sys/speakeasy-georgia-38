// src/pages/paths/business/BusinessPremium.tsx
// -----------------------------------------------------------------------------
// PREMIUM (MOCK) — placeholder paywall until real payments launch.
// The unlock button just flips `mockPro` in the business state blob so the
// premium experience (unlimited vocab + real interviews) can be felt end to
// end. When the ინდ. მეწარმე registration completes, the unlock button gets
// replaced by the real payment flow; everything else on this page stays.
// -----------------------------------------------------------------------------
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Star } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import BusinessShell, { BizCard, BizButton } from "./BusinessShell";
import { pullBusinessFromSupabase, saveBusinessAsync } from "./lib/state";

// Priced against measured cost: ~4.7c per AI interview, 7/week worst case
// ≈ 5 GEL/month, plus ~5% payment fees. 13.99 keeps a healthy margin even for
// a maximum-usage subscriber, and testers consistently read 8.99 as too low
// for a career-advancement product.
const PRICE_GEL = "13.99";

const FEATURES: { titleKa: string; subKa: string }[] = [
  { titleKa: "ულიმიტო ლექსიკის სესიები", subKa: "იმდენი სესია დღეში, რამდენიც გინდა — ლიმიტის გარეშე" },
  { titleKa: "AI სესიები — კვირაში 7", subKa: "გასაუბრებები, დოკუმენტები და თვითპრეზენტაცია. უფასო ვერსიაში AI არ არის; საცდელ კვირაში — 3 ჯამში" },
  { titleKa: "ყველაფერი უფასო ვერსიიდან", subKa: "დღიური სესია, სცენარები, ბლოკნოტი და \"Streak\" — რჩება" },
];

export default function BusinessPremium() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isPro, setIsPro] = useState<boolean | null>(null);
  // Real subscription, from the subscriptions table. mockPro remains only as a
  // development switch; this is the record that matters once payments are live.
  const [sub, setSub] = useState<{
    status: string;
    masked_card: string | null;
    current_period_end: string | null;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const s = await pullBusinessFromSupabase(user.id);
      if (!cancelled) setIsPro(s?.mockPro === true);
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data } = await supabase
          .from("subscriptions" as any)
          .select("status, masked_card, current_period_end")
          .maybeSingle();
        if (!cancelled && data) setSub(data as any);
      } catch { /* table may not exist yet in older environments */ }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const unlock = async () => {
    if (!user || busy) return;
    setBusy(true);
    try {
      // Awaited remote write: pages that pull from Supabase right after
      // (vocab, interview) must see the flag immediately, not stale state.
      await saveBusinessAsync(user.id, { mockPro: true });
      setIsPro(true);
      toast.success("პრემიუმი ჩართულია ⭐");
    } finally {
      setBusy(false);
    }
  };

  // ── TEMPORARY PAYMENT TEST ────────────────────────────────────────────────
  // Calls flitt-subscribe and shows the raw response on screen, so the Flitt
  // signature can be verified without touching the browser console.
  // DELETE this block, its state, and the panel in the render once payments work.
  const [testResult, setTestResult] = useState<string>("");
  const [testing, setTesting] = useState(false);

  const runPaymentTest = async (mode: "simple" | "subscription" | "probe") => {
    if (testing) return;
    setTesting(true);
    setTestResult("იგზავნება...");
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase.functions.invoke("flitt-subscribe", { body: { mode } });

      if (error) {
        // functions.invoke hides the response body on non-2xx; dig it out,
        // because Flitt's error detail is the whole point of this test.
        let detail = "";
        try { detail = JSON.stringify(await (error as any).context?.json?.(), null, 2); }
        catch { detail = String(error.message ?? error); }
        setTestResult("ERROR:\n" + detail);
      } else {
        setTestResult(JSON.stringify(data, null, 2));
      }
    } catch (e: any) {
      setTestResult("EXCEPTION:\n" + String(e?.message ?? e));
    } finally {
      setTesting(false);
    }
  };
  // ── END TEMPORARY ─────────────────────────────────────────────────────────

  /** Starts a real subscription: creates the order and hands the user to Flitt. */
  const subscribe = async () => {
    if (!user || busy) return;
    setBusy(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase.functions.invoke("flitt-subscribe", { body: {} });
      if (error) throw error;
      if (data?.checkout_url) {
        // Card details are entered on Flitt's page, never here.
        window.location.href = data.checkout_url;
        return;
      }
      toast.error(data?.error ?? "გადახდის გვერდი ვერ გაიხსნა");
    } catch (e: any) {
      toast.error(e?.message ?? "შეცდომა");
    } finally {
      setBusy(false);
    }
  };

  /** Cancels at Flitt and removes the saved card. */
  const cancelSubscription = async () => {
    if (!user || busy) return;
    if (!confirm("დარწმუნებული ხარ? შენახული ბარათი წაიშლება და გამოწერა აღარ განახლდება.")) return;
    setBusy(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase.functions.invoke("flitt-cancel", { body: {} });
      if (error) throw error;
      setSub((p) => (p ? { ...p, status: "cancelled", masked_card: null } : p));
      toast.success("გამოწერა გაუქმდა და ბარათი წაიშალა");
    } catch (e: any) {
      toast.error(e?.message ?? "გაუქმება ვერ მოხერხდა");
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!user || busy) return;
    setBusy(true);
    try {
      await saveBusinessAsync(user.id, { mockPro: false });
      setIsPro(false);
      toast("პრემიუმი გამორთულია");
    } finally {
      setBusy(false);
    }
  };

  return (
    <BusinessShell back={{ to: "/path/business/home", label: "SpeakBusy" }}>
      {/* ── TEMPORARY PAYMENT TEST PANEL — delete once payments work ── */}
      <div className="mb-4 rounded-xl border-2 border-dashed border-[#C0392B]/40 bg-[#FFF8F7] p-4">
        <p className="text-[11px] uppercase tracking-wider text-[#C0392B] font-bold">
          TEST ONLY — remove before launch
        </p>
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => runPaymentTest("simple")}
            disabled={testing}
            className="px-3 py-2 rounded-lg bg-[#C0392B] text-white text-xs font-bold disabled:opacity-50"
          >
            {testing ? "..." : "1. Test simple payment"}
          </button>
          <button
            onClick={() => runPaymentTest("subscription")}
            disabled={testing}
            className="px-3 py-2 rounded-lg bg-[#1C1C1E] text-white text-xs font-bold disabled:opacity-50"
          >
            2. Test subscription
          </button>
          <button
            onClick={() => runPaymentTest("probe")}
            disabled={testing}
            className="px-3 py-2 rounded-lg bg-[#5C1A2E] text-white text-xs font-bold disabled:opacity-50"
          >
            3. Probe signature
          </button>
        </div>
        {testResult && (
          <>
            <pre className="mt-3 text-[10px] leading-relaxed bg-white border border-[#E4E2DF] rounded-lg p-3 overflow-auto max-h-72 whitespace-pre-wrap break-all">
              {testResult}
            </pre>
            <button
              onClick={() => navigator.clipboard?.writeText(testResult)}
              className="mt-2 text-[11px] text-[#5C1A2E] underline"
            >
              copy result
            </button>
          </>
        )}
      </div>

      <div className="mb-4">
        <h1 className="ka text-2xl font-bold text-[#5C1A2E] inline-flex items-center gap-2">
          <Star size={22} className="text-[#C9A84C] fill-[#C9A84C]" /> პრემიუმი
        </h1>
        <p className="ka text-sm text-[#4A4A4A] mt-1">
          ერთი ფასი. ყველაფერი ხელმისაწვდომი.
        </p>
      </div>

      {/* Offer card */}
      <div className="rounded-2xl overflow-hidden border border-[#C9A84C]/40 bg-gradient-to-br from-[#232323] to-[#161616] text-[#F5F4F2] p-6 mb-4">
        <p className="text-3xl font-bold">
          {PRICE_GEL} <span className="ka text-base font-semibold text-[#F5F4F2]/80">ლარი / თვეში</span>
        </p>
        <div className="mt-5 space-y-3">
          {FEATURES.map((f) => (
            <div key={f.titleKa} className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-[#C9A84C] text-[#5C1A2E] grid place-items-center shrink-0 mt-0.5">
                <Check size={13} strokeWidth={3} />
              </span>
              <div>
                <p className="ka text-sm font-semibold">{f.titleKa}</p>
                <p className="ka text-[12px] text-[#F5F4F2]/70">{f.subKa}</p>
              </div>
            </div>
          ))}
        </div>

        {isPro === true ? (
          <div className="mt-6">
            <p className="ka text-sm font-semibold text-[#C9A84C]">✓ პრემიუმი აქტიურია</p>
          </div>
        ) : (
          <div className="mt-6">
            <BizButton onClick={unlock} disabled={busy || isPro === null}>
              {busy ? "..." : "განბლოკვა ⭐"}
            </BizButton>
            <p className="ka text-[11px] text-[#F5F4F2]/60 mt-2">
              სატესტო რეჟიმი — გადახდა ჯერ არ არის საჭირო. გამოშვებისას აქ
              რეალური გადახდა იქნება, 7-დღიანი უფასო პერიოდით.
            </p>
          </div>
        )}
      </div>

      {/* SAVED CARD MANAGEMENT
          Shown whenever a card is stored. Flitt require evidence that a user can
          see their saved card and remove it themselves, and consumer law expects
          cancellation to be as easy as subscribing. */}
      {sub?.masked_card && (
        <BizCard className="mb-4">
          <p className="ka text-sm text-[#1C1C1E] font-bold mb-1">შენახული ბარათი</p>
          <p className="ka text-[12px] text-[#4A4A4A] mb-3">
            ბარათის სრული მონაცემები ჩვენთან არ ინახება. გადახდას ამუშავებს Flitt.
          </p>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-[#E4E2DF] bg-[#F8F5F0] px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-9 h-6 rounded bg-[#1C1C1E] text-[#F8F5F0] text-[9px] font-bold grid place-items-center shrink-0">
                CARD
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#1C1C1E] tabular-nums truncate">
                  {sub.masked_card}
                </p>
                {sub.current_period_end && (
                  <p className="ka text-[11px] text-[#4A4A4A]">
                    შემდეგი გადახდა:{" "}
                    {new Date(sub.current_period_end).toLocaleDateString("ka-GE")}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={cancelSubscription}
              disabled={busy}
              className="ka shrink-0 px-3 py-2 rounded-lg border border-[#C0392B]/40 text-[#C0392B] text-xs font-bold hover:bg-[#C0392B]/5 transition-colors disabled:opacity-50"
            >
              {busy ? "..." : "ბარათის წაშლა"}
            </button>
          </div>

          <p className="ka text-[11px] text-[#8A8A8A] mt-3 leading-relaxed">
            ბარათის წაშლისას გამოწერა უქმდება და ავტომატური გადახდა წყდება.
            პრემიუმით სარგებლობ უკვე გადახდილი პერიოდის ბოლომდე.
          </p>
        </BizCard>
      )}

      {sub && sub.status === "cancelled" && !sub.masked_card && (
        <BizCard className="mb-4">
          <p className="ka text-sm font-bold text-[#1C1C1E]">გამოწერა გაუქმებულია</p>
          <p className="ka text-[12px] text-[#4A4A4A] mt-1.5 leading-relaxed">
            შენახული ბარათი წაშლილია და ავტომატური გადახდა აღარ მოხდება.
            {sub.current_period_end &&
              ` პრემიუმი აქტიურია ${new Date(sub.current_period_end).toLocaleDateString("ka-GE")}-მდე.`}
          </p>
        </BizCard>
      )}

      {isPro === true && (
        <BizCard>
          <p className="ka text-sm text-[#1C1C1E] font-semibold mb-1">მართვა</p>
          <p className="ka text-[12px] text-[#4A4A4A] mb-3">
            ეს სატესტო ვერსიაა — შეგიძლია ნებისმიერ დროს გამორთო.
          </p>
          <button
            onClick={cancel}
            disabled={busy}
            className="ka text-sm font-semibold text-[#5C1A2E] underline underline-offset-4 disabled:opacity-50"
          >
            პრემიუმის გამორთვა
          </button>
        </BizCard>
      )}
    </BusinessShell>
  );
}
