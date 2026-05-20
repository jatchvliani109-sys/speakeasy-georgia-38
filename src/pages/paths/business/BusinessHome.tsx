import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import BusinessShell, { BizCard, BizButton } from "./BusinessShell";
import {
  BUSINESS_MODULES,
  BusinessState,
  FIELD_LABELS,
  INTENSITY_LABELS,
  LEVEL_LABELS,
  PRIORITY_LABELS,
  loadBusiness,
} from "./lib/state";

export default function BusinessHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [s, setS] = useState<BusinessState | null>(null);

  useEffect(() => {
    if (!user) return;
    setS(loadBusiness(user.id));
  }, [user]);

  if (!s) return <BusinessShell><div className="ka text-[#5B6473]">იტვირთება...</div></BusinessShell>;
  const incomplete = !s.setupCompleted || !s.testCompleted || !s.plan;
  const plan = s.plan;


  return (
    <BusinessShell>
      <div className="mb-5">
        <h1 className="ka text-2xl font-bold text-[#1E2A44]">ბიზნეს ინგლისური</h1>
        <p className="ka text-sm text-[#5B6473] mt-1">
          ინგლისური უნივერსიტეტისთვის, სამსახურისთვის და პროფესიული კომუნიკაციისთვის.
        </p>
      </div>

      {incomplete && (
        <BizCard className="mb-4 border-l-4 border-l-[#C9A227] bg-[#FFFBEA]">
          <p className="ka text-sm text-[#1E2A44]">
            სრული პერსონალიზაციისთვის გირჩევთ დაასრულოთ Business setup და ტესტი.
          </p>
          <div className="mt-3 flex gap-2 flex-wrap">
            <BizButton onClick={() => navigate("/path/business/setup")}>Setup-ის დასრულება</BizButton>
            <BizButton variant="outline" onClick={() => navigate("/path/business/test")}>ტესტი</BizButton>
          </div>
        </BizCard>
      )}

      {plan && (<>


      {/* Recommended */}
      <BizCard className="mb-4 border-l-4 border-l-[#C9A227]">
        <p className="ka text-[11px] uppercase tracking-wider text-[#C9A227] font-semibold">
          დღევანდელი გაკვეთილი
        </p>
        <h2 className="ka text-lg font-bold text-[#1E2A44] mt-1">{plan.recommendedModuleTitle}</h2>
        <p className="ka text-xs text-[#5B6473] mt-1">
          არჩეულია შენი მთავარი მიზნის მიხედვით: {PRIORITY_LABELS[plan.mainGoal]}.
        </p>
        <p className="ka text-xs text-[#5B6473] mt-1">დაახლოებითი დრო: 10–15 წუთი</p>
        <div className="mt-4">
          <BizButton onClick={() => navigate(`/path/business/module/${plan.recommendedModule}`)}>
            გაკვეთილის დაწყება
          </BizButton>
        </div>
      </BizCard>

      {/* Plan summary */}
      <BizCard className="mb-4">
        <p className="ka text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold mb-2">
          შენი გეგმა
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Mini label="მთავარი მიზანი" value={PRIORITY_LABELS[plan.mainGoal]} />
          <Mini label="დონე" value={LEVEL_LABELS[plan.level]} />
          <Mini label="ინტენსივობა" value={INTENSITY_LABELS[plan.intensity]} />
          <Mini label="სფერო" value={FIELD_LABELS[plan.field]} />
        </div>
        <Link to="/path/business/plan" className="ka text-[11px] text-[#1E2A44] underline underline-offset-2 mt-3 inline-block">
          სრული გეგმის ნახვა
        </Link>
      </BizCard>

      {/* Modules */}
      <p className="ka text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold mb-2 px-1">
        მოდულები
      </p>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {BUSINESS_MODULES.map((m) => (
          <Link
            key={m.slug}
            to={`/path/business/module/${m.slug}`}
            className="bg-white border border-[#E7E2D5] rounded-2xl p-4 hover:border-[#1E2A44]/40 hover:shadow-sm transition-all"
          >
            <div className="text-xl mb-2">{m.icon}</div>
            <div className="ka font-semibold text-sm text-[#1E2A44]">{m.title}</div>
            <div className="ka text-[11px] text-[#5B6473] mt-1 line-clamp-2">{m.description}</div>
          </Link>
        ))}
      </div>

      {/* Progress preview */}
      <BizCard>
        <p className="ka text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold mb-3">
          პროგრესი
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Stat label="გაკვეთილები" value="0" />
          <Stat label="ბიზნეს სიტყვები" value="0" />
          <Stat label="გაუმჯობესებული იმეილები" value="0" />
          <Stat label="გასაუბრების პასუხები" value="0" />
        </div>
      </BizCard>
    </BusinessShell>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#FAF7F0] border border-[#E7E2D5] rounded-lg px-3 py-2">
      <div className="ka text-[10px] text-[#5B6473]">{label}</div>
      <div className="ka text-xs font-semibold text-[#1E2A44] mt-0.5">{value}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#FAF7F0] border border-[#E7E2D5] rounded-xl px-3 py-3">
      <div className="text-xl font-bold text-[#1E2A44]">{value}</div>
      <div className="ka text-[11px] text-[#5B6473] mt-0.5">{label}</div>
    </div>
  );
}
