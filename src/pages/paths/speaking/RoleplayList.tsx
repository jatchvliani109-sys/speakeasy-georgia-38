import { Link } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import SpeakingShell from "./components/SpeakingShell";
import { SCENARIOS, Scenario } from "./data";
import { ArrowRight } from "lucide-react";

const LEVEL_LABEL: Record<Scenario["level"], string> = {
  Beginner: "დამწყები",
  Elementary: "საშუალო-დამწყები",
  Intermediate: "საშუალო",
};

const LEVEL_COLOR: Record<Scenario["level"], string> = {
  Beginner: "bg-teal-400/20 text-teal-200 border-teal-300/30",
  Elementary: "bg-blue-500/20 text-blue-200 border-blue-300/30",
  Intermediate: "bg-purple-500/20 text-purple-200 border-purple-300/30",
};

export default function RoleplayList() {
  const groups: Scenario["level"][] = ["Beginner", "Elementary", "Intermediate"];
  return (
    <SpeakingShell>
      <PageHeader title="როლური საუბარი" backTo="/path/speaking" />
      <div className="space-y-6">
        <p className="text-sm sp-text-muted ka">
          აირჩიე სცენარი და ივარჯიშე რეალურ სიტუაციაში AI პარტნიორთან.
        </p>
        {groups.map((lvl) => {
          const items = SCENARIOS.filter((s) => s.level === lvl);
          if (!items.length) return null;
          return (
            <div key={lvl} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ka border ${LEVEL_COLOR[lvl]}`}>
                  {LEVEL_LABEL[lvl]}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {items.map((s) => (
                  <Link
                    key={s.id}
                    to={`/path/speaking/roleplay/${s.id}`}
                    className="sp-card p-4 flex flex-col gap-3 transition-smooth hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-15px_hsl(265_90%_50%_/_0.6)]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/40 to-blue-500/40 border border-white/10 flex items-center justify-center text-3xl">
                        {s.emoji}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold ka sp-text">{s.title_ka}</div>
                        <div className="text-xs sp-text-muted ka mt-1">{s.description_ka}</div>
                        <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold ka border ${LEVEL_COLOR[s.level]}`}>
                          {LEVEL_LABEL[s.level]}
                        </span>
                      </div>
                    </div>
                    <div className="sp-btn-primary mt-auto inline-flex items-center justify-center gap-2 rounded-xl h-11 px-4 text-sm font-semibold ka">
                      დაწყება <ArrowRight className="w-4 h-4" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </SpeakingShell>
  );
}
