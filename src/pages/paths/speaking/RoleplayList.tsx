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

const LEVEL_CHIP: Record<Scenario["level"], string> = {
  Beginner: "sp-chip-teal",
  Elementary: "sp-chip-blue",
  Intermediate: "sp-chip-navy",
};

export default function RoleplayList() {
  const groups: Scenario["level"][] = ["Beginner", "Elementary", "Intermediate"];
  return (
    <SpeakingShell>
      <PageHeader title="რეალური სიტუაციები" backTo="/path/speaking" />
      <div className="space-y-8 max-w-3xl mx-auto">
        <div>
          <span className="sp-eyebrow ka">როლური სცენარები</span>
          <h2 className="text-2xl font-extrabold ka sp-text mt-2 leading-snug">
            ივარჯიშე ცხოვრებისეულ დიალოგებში
          </h2>
          <p className="text-sm sp-text-muted ka mt-1.5">
            აირჩიე სცენარი — შეხვდი ტურისტს, შეუკვეთე ყავა ან ისაუბრე გასაუბრებაზე.
          </p>
        </div>

        {groups.map((lvl) => {
          const items = SCENARIOS.filter((s) => s.level === lvl);
          if (!items.length) return null;
          return (
            <section key={lvl} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ka ${LEVEL_CHIP[lvl]}`}>
                  {LEVEL_LABEL[lvl]}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {items.map((s) => (
                  <Link
                    key={s.id}
                    to={`/path/speaking/roleplay/${s.id}`}
                    className="sp-card p-4 sm:p-5 flex flex-col gap-3 hover:border-[hsl(175_50%_60%)] hover:-translate-y-0.5 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl sp-chip-teal flex items-center justify-center text-2xl shrink-0">
                        {s.emoji}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold ka sp-text text-[15px] leading-snug">{s.title_ka}</div>
                        <div className="text-xs sp-text-muted ka mt-1 leading-relaxed">{s.description_ka}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-1 pt-3 sp-rule">
                      <span className="text-xs ka sp-text-soft">დაწყება</span>
                      <ArrowRight className="w-4 h-4 sp-text-soft" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </SpeakingShell>
  );
}
