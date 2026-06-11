import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import BusinessShell, { BizCard } from "./BusinessShell";
import { BUSINESS_MODULES } from "./lib/state";

export default function BusinessModulesList() {
  return (
    <BusinessShell seo={{ title: "მოდულები — SpeakBusy", description: "ბიზნეს ინგლისურის მოდულები: ელ-ფოსტები, გასაუბრება, შეხვედრები და პროფესიული ლექსიკა.", path: "/path/business/modules" }}>
      <header className="mb-6">
        <p className="ka text-[11px] uppercase tracking-wider text-[#4A4A4A] font-semibold">
          ბიზნეს ინგლისური
        </p>
        <h1 className="ka text-2xl font-bold text-[#5C1A2E] mt-1">მოდულები</h1>
        <p className="ka text-sm text-[#4A4A4A] mt-2">
          აირჩიე მოდული და დაიწყე ვარჯიში.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {BUSINESS_MODULES.map((m) => {
          const Icon = m.icon;
          return (
            <Link key={m.slug} to={`/path/business/module/${m.slug}`} className="group">
              <BizCard className="h-full hover:border-[#5C1A2E]/50 transition-colors">
                <div className="flex items-start gap-3">
                  <span className="w-10 h-10 rounded-md bg-[#5C1A2E] text-[#F0EBE3] grid place-items-center shrink-0">
                    <Icon size={18} strokeWidth={2} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <h2 className="ka font-bold text-[#5C1A2E] text-base leading-snug">
                      {m.title}
                    </h2>
                    <p className="ka text-xs text-[#4A4A4A] mt-1 leading-relaxed">
                      {m.description}
                    </p>
                    <span className="ka inline-flex items-center gap-1 text-[11px] font-semibold text-[#5C1A2E] mt-3 group-hover:gap-1.5 transition-all">
                      გახსნა <ArrowRight size={12} strokeWidth={2.25} />
                    </span>
                  </div>
                </div>
              </BizCard>
            </Link>
          );
        })}
      </div>
    </BusinessShell>
  );
}
