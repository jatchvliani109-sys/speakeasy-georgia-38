import { useParams } from "react-router-dom";
import BusinessShell, { BizCard } from "./BusinessShell";
import { BUSINESS_MODULES } from "./lib/state";
import EmailsModule from "./EmailsModule";
import InterviewModule from "./InterviewModule";
import VocabularyModule from "./VocabularyModule";

export default function BusinessModule() {
  const { slug } = useParams();
  const mod = BUSINESS_MODULES.find((m) => m.slug === slug);

  if (slug === "emails") return <EmailsModule />;
  if (slug === "interview") return <InterviewModule />;
  if (slug === "vocabulary") return <VocabularyModule />;

  if (!mod) {
    return (
      <BusinessShell back={{ to: "/path/business/home", label: "უკან დაბრუნება" }}>
        <BizCard>
          <p className="ka text-[#5C1A2E]">მოდული ვერ მოიძებნა.</p>
        </BizCard>
      </BusinessShell>
    );
  }

  const Icon = mod.icon;
  return (
    <BusinessShell back={{ to: "/path/business/home", label: "ბიზნეს ინგლისური" }}>
      <div className="mb-5 flex items-start gap-3">
        <span className="w-10 h-10 rounded-md bg-[#5C1A2E] text-[#F0EBE3] grid place-items-center shrink-0">
          <Icon size={18} strokeWidth={2} />
        </span>
        <div>
          <h1 className="ka text-2xl font-bold text-[#5C1A2E]">{mod.title}</h1>
          <p className="ka text-sm text-[#4A4A4A] mt-1">{mod.description}</p>
        </div>
      </div>
      <BizCard>
        <p className="ka text-[11px] uppercase tracking-wider text-[#1C1C1E] font-semibold">
          მალე დაემატება
        </p>
        <h2 className="ka text-base font-bold text-[#5C1A2E] mt-1">Coming next</h2>
        <p className="ka text-sm text-[#4A4A4A] mt-2">
          ეს მოდული ამჟამად მზადდება.
        </p>
      </BizCard>
    </BusinessShell>
  );
}
