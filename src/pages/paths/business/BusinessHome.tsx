import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import BusinessShell, { BizCard, BizButton } from "./BusinessShell";
import PathSwitcher from "@/components/PathSwitcher";
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
      <header className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h1 className="ka text-2xl font-bold text-[#1E2A44]">ბიზნეს ინგლისური</h1>
          <p className="ka text-sm text-[#5B6473] mt-1">
            ინგლისური უნივერსიტეტისთვის, სამსახურისთვის და პროფესიული კომუნიკაციისთვის.
          </p>
        </div>
        <PathSwitcher />
      </header>


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

      {/* Level badge */}
      <BizCard className="mb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="ka text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold">შენი დონე</p>
            <p className="ka text-lg font-bold text-[#1E2A44] mt-0.5">{LEVEL_LABELS[plan.level]}</p>
            <p className="ka text-xs text-[#5B6473] mt-0.5">მთავარი მიზნები: {plan.mainGoals.map((g) => PRIORITY_LABELS[g]).join(", ")}</p>
          </div>
          <Link to="/path/business/test" className="ka text-[11px] text-[#1E2A44] underline underline-offset-2">
            თავიდან ჩაბარება
          </Link>
        </div>
      </BizCard>

      {/* Recommended next lessons (level-aware) */}
      <p className="ka text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold mb-2 px-1">
        რეკომენდებული გაკვეთილები შენი დონისთვის
      </p>
      <div className="space-y-2 mb-4">
        {recommendedForLevel(plan.level, plan.mainGoals[0]).map((r) => (
          <Link
            key={r.to}
            to={r.to}
            className="block bg-white border border-[#E7E2D5] rounded-2xl p-4 hover:border-[#1E2A44]/40 hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="ka text-[11px] uppercase tracking-wider text-[#C9A227] font-semibold">{r.tag}</p>
                <p className="ka font-bold text-[#1E2A44] mt-0.5">{r.title}</p>
                <p className="ka text-xs text-[#5B6473] mt-1">{r.subtitle}</p>
              </div>
              <span className="text-[#1E2A44] text-lg">→</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Plan summary */}
      <BizCard className="mb-4">
        <p className="ka text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold mb-2">
          შენი გეგმა
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Mini label="მთავარი მიზნები" value={plan.mainGoals.map((g) => PRIORITY_LABELS[g]).join(", ")} />
          <Mini label="დონე" value={LEVEL_LABELS[plan.level]} />
          <Mini label="ინტენსივობა" value={INTENSITY_LABELS[plan.intensity]} />
          <Mini label="სფეროები" value={plan.fields.map((f) => FIELD_LABELS[f]).join(", ")} />
        </div>
        <Link to="/path/business/plan" className="ka text-[11px] text-[#1E2A44] underline underline-offset-2 mt-3 inline-block">
          სრული გეგმის ნახვა
        </Link>
      </BizCard>

      {/* Starter task: Professional Self-Introduction */}
      {!s.businessSelfIntroductionCompleted ? (
        <BizCard className="mb-4 border-l-4 border-l-[#1E2A44]">
          <p className="ka text-[11px] uppercase tracking-wider text-[#C9A227] font-semibold">პირველი ნაბიჯი</p>
          <h3 className="ka text-lg font-bold text-[#1E2A44] mt-1">დაასრულე პირველი ნაბიჯი</h3>
          <p className="ka text-sm text-[#374151] mt-2">
            შექმენი შენი პროფესიული წარდგენა, სანამ ბიზნეს ინგლისურის მოდულებზე გადახვალ.
          </p>
          <div className="mt-3">
            <BizButton onClick={() => navigate("/path/business/self-introduction")}>წარდგენის შექმნა</BizButton>
          </div>
        </BizCard>
      ) : (
        <BizCard className="mb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="ka text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold">პირველი ნაბიჯი</p>
              <h3 className="ka text-base font-bold text-[#1E2A44] mt-0.5">პროფესიული წარდგენა მზადაა</h3>
              <p className="ka text-xs text-[#5B6473] mt-1">შენახული წარდგენა შეგიძლია ნებისმიერ დროს შეცვალო.</p>
            </div>
            <Link to="/path/business/self-introduction" className="ka text-xs text-[#1E2A44] underline underline-offset-2 shrink-0">
              ნახვა / რედაქტირება
            </Link>
          </div>
        </BizCard>
      )}

      {/* Modules */}
      <p className="ka text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold mb-2 px-1">
        მოდულები
      </p>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {BUSINESS_MODULES.map((m) => {
          const to = `/path/business/module/${m.slug}`;
          return (
            <Link
              key={m.slug}
              to={to}
              className="bg-white border border-[#E7E2D5] rounded-2xl p-4 hover:border-[#1E2A44]/40 hover:shadow-sm transition-all"
            >
              <div className="text-xl mb-2">{m.icon}</div>
              <div className="ka font-semibold text-sm text-[#1E2A44]">{m.title}</div>
              <div className="ka text-[11px] text-[#5B6473] mt-1 line-clamp-2">{m.description}</div>
            </Link>
          );
        })}
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
      </>)}
    </BusinessShell>
  );
}

type Rec = { to: string; tag: string; title: string; subtitle: string };
function recommendedForLevel(level: string, _goal: string): Rec[] {
  const vocab = { to: "/path/business/module/vocabulary", tag: "ლექსიკა", title: "ბიზნეს ლექსიკა", subtitle: "სიტყვები მაგალითებითა და ქართული ახსნებით." };
  const emails = { to: "/path/business/module/emails", tag: "წერა", title: "მარტივი იმეილის ფრაზები", subtitle: "თავაზიანი გახსნა, მოთხოვნა, დასკვნა." };
  const interview = { to: "/path/business/module/interview", tag: "გასაუბრება", title: "გასაუბრების პასუხები", subtitle: "ივარჯიშე გავრცელებულ კითხვებზე." };
  const meetings = { to: "/path/business/module/meetings", tag: "შეხვედრები", title: "შეხვედრების ფრაზები", subtitle: "გამოთქვი აზრი და დასვი კითხვა პროფესიულად." };
  const presentations = { to: "/path/business/module/presentations", tag: "პრეზენტაცია", title: "პრეზენტაციის სტრუქტურა", subtitle: "გახსნა, მონაცემები, დასკვნა." };
  if (level === "business_beginner") return [vocab, emails, interview];
  if (level === "business_elementary") return [emails, vocab, interview];
  if (level === "business_intermediate") return [interview, emails, meetings];
  return [interview, presentations, meetings];
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
