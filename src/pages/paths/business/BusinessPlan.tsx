import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import BusinessShell, { BizCard, BizButton } from "./BusinessShell";
import {
  BusinessState,
  FIELD_LABELS,
  INTENSITY_LABELS,
  LEVEL_LABELS,
  PRIORITY_LABELS,
  buildPlan,
  pullBusinessFromSupabase,
  saveBusiness,
} from "./lib/state";

export default function BusinessPlan() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [s, setS] = useState<BusinessState | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    // Hard timeout: never let the user be stuck. After 10s, fall through to dashboard.
    const timeout = setTimeout(() => {
      if (cancelled) return;
      navigate("/path/business/home", { replace: true });
    }, 10000);

    (async () => {
      try {
        const cur = await Promise.race([
          pullBusinessFromSupabase(user.id),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
        ]);
        if (cancelled) return;
        if (!cur) {
          navigate("/path/business/home", { replace: true });
          return;
        }
        if (!cur.testCompleted) return navigate("/path/business/test", { replace: true });
        if (!cur.setupCompleted) return navigate("/path/business/setup", { replace: true });
        let state = cur;
        if (!state.plan) {
          const plan = buildPlan(state);
          if (plan) {
            state = saveBusiness(user.id, { plan });
          } else {
            // Missing inputs to build a plan — skip past gracefully.
            navigate("/path/business/home", { replace: true });
            return;
          }
        }
        setS(state);
      } catch {
        if (!cancelled) navigate("/path/business/home", { replace: true });
      } finally {
        clearTimeout(timeout);
      }
    })();
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [user, navigate]);


  const plan = useMemo(() => s?.plan ?? null, [s]);
  if (!s || !plan) return <BusinessShell><div className="text-[#4A4A4A] ka">იტვირთება...</div></BusinessShell>;

  return (
    <BusinessShell>
      <div className="mb-6">
        <p className="ka text-[11px] uppercase tracking-wider text-[#1C1C1E] font-semibold">
          შენი გეგმა
        </p>
        <h1 className="ka text-2xl font-bold text-[#5C1A2E] mt-1">შენი ბიზნეს ინგლისურის გეგმა</h1>
      </div>

      <BizCard className="mb-4">
        <Row label="მთავარი მიზნები" value={plan.mainGoals.map((g) => PRIORITY_LABELS[g]).join(", ")} />
        <Row label="დონე" value={LEVEL_LABELS[plan.level]} />
        <Row label="ინტენსივობა" value={INTENSITY_LABELS[plan.intensity]} />
        <Row label="სფეროები" value={plan.fields.map((f) => FIELD_LABELS[f]).join(", ")} />
      </BizCard>

      <BizCard className="mb-4">
        <p className="ka text-[11px] uppercase tracking-wider text-[#4A4A4A] font-semibold">
          რეკომენდებული პირველი მოდული
        </p>
        <h3 className="ka text-lg font-bold text-[#5C1A2E] mt-1">{plan.recommendedModuleTitle}</h3>
        <p className="ka text-xs text-[#4A4A4A] mt-1">შენი მიზნის შესაბამისად დავიწყოთ აქედან.</p>
      </BizCard>

      <BizCard className="mb-6">
        <p className="ka text-[11px] uppercase tracking-wider text-[#4A4A4A] font-semibold mb-2">
          ყოველკვირეული ფოკუსი
        </p>
        <ul className="space-y-2">
          {plan.weeklyFocus.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-[#5C1A2E]">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#1C1C1E] shrink-0" />
              <span className="ka">{f}</span>
            </li>
          ))}
        </ul>
      </BizCard>

      <BizButton className="w-full" onClick={() => navigate("/path/business/resume", { replace: true })}>
        გეგმის დაწყება — პირველი ნაბიჯი
      </BizButton>
    </BusinessShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#E4E2DF] last:border-0">
      <span className="ka text-xs text-[#4A4A4A]">{label}</span>
      <span className="ka text-sm font-semibold text-[#5C1A2E]">{value}</span>
    </div>
  );
}
