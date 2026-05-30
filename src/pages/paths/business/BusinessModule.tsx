import { useParams } from "react-router-dom";
import BusinessShell, { BizCard } from "./BusinessShell";
import { BUSINESS_MODULES } from "./lib/state";
import EmailsModule from "./EmailsModule";
import InterviewModule from "./InterviewModule";
import MeetingsModule from "./MeetingsModule";
import VocabularyModule from "./VocabularyModule";

export default function BusinessModule() {
  const { slug } = useParams();
  const mod = BUSINESS_MODULES.find((m) => m.slug === slug);

  if (slug === "emails") return <EmailsModule />;
  if (slug === "interview") return <InterviewModule />;
  if (slug === "meetings") return <MeetingsModule />;
  if (slug === "vocabulary") return <VocabularyModule />;

  if (!mod) {
    return (
      <BusinessShell back={{ to: "/path/business/home", label: "უკან დაბრუნება" }}>
        <BizCard>
          <p className="ka text-[#1E2A44]">მოდული ვერ მოიძებნა.</p>
        </BizCard>
      </BusinessShell>
    );
  }

  return (
    <BusinessShell back={{ to: "/path/business/home", label: "ბიზნეს ინგლისური" }}>
      <div className="mb-5">
        <div className="text-2xl mb-2">{mod.icon}</div>
        <h1 className="ka text-2xl font-bold text-[#1E2A44]">{mod.title}</h1>
        <p className="ka text-sm text-[#5B6473] mt-1">{mod.description}</p>
      </div>
      <BizCard>
        <p className="ka text-[11px] uppercase tracking-wider text-[#C9A227] font-semibold">
          მალე დაემატება
        </p>
        <h3 className="ka text-base font-bold text-[#1E2A44] mt-1">Coming next</h3>
        <p className="ka text-sm text-[#5B6473] mt-2">
          ეს მოდული ამჟამად მზადდება.
        </p>
      </BizCard>
    </BusinessShell>
  );
}
