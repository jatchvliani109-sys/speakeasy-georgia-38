import { useParams } from "react-router-dom";
import BusinessShell, { BizCard } from "./BusinessShell";
import { BUSINESS_MODULES } from "./lib/state";

import InterviewModule from "./InterviewModule";
import VocabularyModule from "./VocabularyModule";

export default function BusinessModule() {
  const { slug } = useParams();
  const mod = BUSINESS_MODULES.find((m) => m.slug === slug);

  
  if (slug === "interview") return <InterviewModule />;
  if (slug === "vocabulary") return <VocabularyModule />;

  if (!mod) {
    return (
      <BusinessShell back={{ to: "/path/business/home", label: "უკან დაბრუნება" }}>
        <BizCard>
          <p className="ka text-wine">მოდული ვერ მოიძებნა.</p>
        </BizCard>
      </BusinessShell>
    );
  }

  const Icon = mod.icon;
  return (
    <BusinessShell back={{ to: "/path/business/home", label: "SpeakBusy" }}>
      <div className="mb-5 flex items-start gap-3">
        <span className="w-10 h-10 rounded-md bg-panel-soft text-on-dark grid place-items-center shrink-0">
          <Icon size={18} strokeWidth={2} />
        </span>
        <div>
          <h1 className="ka text-2xl font-bold text-wine">{mod.title}</h1>
          <p className="ka text-sm text-ink-muted mt-1">{mod.description}</p>
        </div>
      </div>
      <BizCard>
        <p className="ka text-[11px] uppercase tracking-wider text-ink font-semibold">
          მალე დაემატება
        </p>
        <h2 className="ka text-base font-bold text-wine mt-1">Coming next</h2>
        <p className="ka text-sm text-ink-muted mt-2">
          ეს მოდული ამჟამად მზადდება.
        </p>
      </BizCard>
    </BusinessShell>
  );
}
