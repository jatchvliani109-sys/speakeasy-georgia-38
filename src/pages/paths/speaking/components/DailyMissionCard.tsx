import { Link } from "react-router-dom";
import { ArrowRight, Clock, Sparkles, Target } from "lucide-react";
import { DailyMission, TIER_LABEL_KA } from "../lib/progression";
import { scenarioById } from "../lib/scenarios";

export default function DailyMissionCard({
  mission, doneToday, tomorrow,
}: {
  mission: DailyMission | null;
  doneToday: boolean;
  tomorrow?: DailyMission | null;
}) {
  if (!mission) {
    return (
      <section className="sp-card-hero p-6">
        <div className="text-[10px] font-semibold tracking-[0.22em] uppercase opacity-80">
          დღევანდელი მისია
        </div>
        <p className="ka text-sm mt-2 opacity-90">იტვირთება...</p>
      </section>
    );
  }
  const s = scenarioById(mission.scenarioId);
  const Icon = s?.Icon ?? Target;

  if (doneToday) {
    const tIcon = tomorrow ? scenarioById(tomorrow.scenarioId)?.Icon ?? Target : Target;
    const TomorrowIcon = tIcon;
    return (
      <section className="sp-card-hero p-6">
        <div className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.22em] uppercase opacity-80">
          <Sparkles className="w-3.5 h-3.5" /> დღევანდელი მისია დასრულდა
        </div>
        <h2 className="ka text-xl font-extrabold mt-2 leading-snug">
          შესანიშნავი ვარჯიში დღეს!
        </h2>
        {tomorrow && (
          <div className="mt-4 rounded-xl p-3 border border-[hsl(33_60%_28%)]/60 bg-[hsl(31_53%_18%)]/60">
            <div className="text-[10px] uppercase tracking-wider opacity-80 ka">ხვალ</div>
            <div className="mt-1 flex items-center gap-2">
              <TomorrowIcon className="w-4 h-4" />
              <span className="font-bold text-sm">{scenarioById(tomorrow.scenarioId)?.title_en}</span>
              <span className="ml-auto text-[11px] opacity-80 ka">
                {TIER_LABEL_KA[tomorrow.tier]}
              </span>
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="sp-card-hero p-6">
      <div className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.22em] uppercase opacity-80">
        <Target className="w-3.5 h-3.5" /> დღევანდელი მისია
      </div>
      <div className="mt-3 flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-[hsl(41_100%_55%)] text-[hsl(31_53%_12%)] flex items-center justify-center shrink-0">
          <Icon className="w-6 h-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="ka text-lg sm:text-xl font-extrabold leading-snug">
            {s?.title_en ?? mission.scenarioId}
          </h2>
          <div className="text-[12px] ka opacity-85 mt-0.5">{mission.reason_ka}</div>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-[hsl(41_100%_47%)] text-[hsl(31_53%_12%)] ka">
              {TIER_LABEL_KA[mission.tier]}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] opacity-85 ka">
              <Clock className="w-3 h-3" /> ~{mission.estimated_min} წუთი
            </span>
          </div>
        </div>
      </div>
      <Link
        to={`/path/speaking/call?scenario=${mission.scenarioId}&tier=${mission.tier}`}
        className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl h-11 px-5 text-sm font-bold ka w-full bg-[hsl(41_100%_47%)] hover:bg-[hsl(41_100%_43%)] text-[hsl(31_53%_12%)] transition-colors"
      >
        დაწყება
        <ArrowRight className="w-4 h-4" />
      </Link>
    </section>
  );
}
