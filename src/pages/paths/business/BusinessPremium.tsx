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
            <button
              onClick={subscribe}
              disabled={busy}
              className="ka w-full py-3.5 rounded-xl bg-[#C9A84C] text-[#1C1C1E] text-[15px] font-bold hover:bg-[#D4B560] transition-colors disabled:opacity-60"
            >
              {busy ? "იხსნება..." : `გამოწერა · ${PRICE_GEL} ₾ / თვეში`}
            </button>

            {/* Subscription terms next to the button, not buried in a policy:
                price, frequency, that it renews automatically, and how to stop
                it. What a consumer is entitled to know BEFORE paying. */}
            <p className="ka text-[11px] text-[#F5F4F2]/70 mt-3 leading-relaxed">
              გადახდის შემდეგ პრემიუმი აქტიურდება მაშინვე. გამოწერა ავტომატურად
              განახლდება ყოველ თვეს, {PRICE_GEL} ლარად, სანამ არ გააუქმებ.
              გაუქმება ნებისმიერ დროს შეგიძლია პროფილის გვერდიდან.
            </p>
            <p className="ka text-[11px] text-[#F5F4F2]/50 mt-2 leading-relaxed">
              გადახდას ამუშავებს Flitt. ბარათის მონაცემები ჩვენთან არ ინახება.
            </p>
          </div>
        )}
      </div>

      {sub?.masked_card && (
        <BizCard className="mb-4">
          <p className="ka text-sm font-bold text-[#1C1C1E]">გამოწერა აქტიურია</p>
          <p className="ka text-[12px] text-[#4A4A4A] mt-1.5 leading-relaxed">
            ბარათი {sub.masked_card}
            {sub.current_period_end &&
              ` · შემდეგი გადახდა ${new Date(sub.current_period_end).toLocaleDateString("ka-GE")}`}
          </p>
          <a
            href="/profile"
            className="ka inline-block mt-3 text-[13px] text-[#5C1A2E] font-semibold underline underline-offset-4"
          >
            გამოწერის მართვა
          </a>
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
