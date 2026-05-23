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
  loadBusiness,
  saveBusiness,
} from "./lib/state";

export default function BusinessPlan() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [s, setS] = useState<BusinessState | null>(null);

  useEffect(() => {
    if (!user) return;
    const cur = loadBusiness(user.id);
    if (!cur.testCompleted) return navigate("/path/business/test", { replace: true });
    if (!cur.setupCompleted) return navigate("/path/business/setup", { replace: true });
    if (!cur.plan) {
      const plan = buildPlan(cur);
      if (plan) {
        const next = saveBusiness(user.id, { plan });
        setS(next);
        return;
      }
    }
    setS(cur);
  }, [user, navigate]);

  const plan = useMemo(() => s?.plan ?? null, [s]);
  if (!s || !plan) return <BusinessShell><div className="text-[#5B6473] ka">იტვირთება...</div></BusinessShell>;

  return (
    <BusinessShell>
      <div className="mb-6">
        <p className="ka text-[11px] uppercase tracking-wider text-[#C9A227] font-semibold">
          შენი გეგმა
        </p>
        <h1 className="ka text-2xl font-bold text-[#1E2A44] mt-1">შენი ბიზნეს ინგლისურის გეგმა</h1>
      </div>

      <BizCard className="mb-4">
        <Row label="მთავარი მიზანი" value={PRIORITY_LABELS[plan.mainGoal]} />
        <Row label="დონე" value={LEVEL_LABELS[plan.level]} />
        <Row label="ინტენსივობა" value={INTENSITY_LABELS[plan.intensity]} />
        <Row label="სფერო" value={FIELD_LABELS[plan.field]} />
      </BizCard>

      <BizCard className="mb-4">
        <p className="ka text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold">
          რეკომენდებული პირველი მოდული
        </p>
        <h3 className="ka text-lg font-bold text-[#1E2A44] mt-1">{plan.recommendedModuleTitle}</h3>
        <p className="ka text-xs text-[#5B6473] mt-1">შენი მიზნის შესაბამისად დავიწყოთ აქედან.</p>
      </BizCard>

      <BizCard className="mb-6">
        <p className="ka text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold mb-2">
          ყოველკვირეული ფოკუსი
        </p>
        <ul className="space-y-2">
          {plan.weeklyFocus.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-[#1E2A44]">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#C9A227] shrink-0" />
              <span className="ka">{f}</span>
            </li>
          ))}
        </ul>
      </BizCard>

      <BizButton className="w-full" onClick={() => navigate("/path/business/self-introduction", { replace: true })}>
        გეგმის დაწყება — პირველი ნაბიჯი
      </BizButton>
    </BusinessShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#E7E2D5] last:border-0">
      <span className="ka text-xs text-[#5B6473]">{label}</span>
      <span className="ka text-sm font-semibold text-[#1E2A44]">{value}</span>
    </div>
  );
}
