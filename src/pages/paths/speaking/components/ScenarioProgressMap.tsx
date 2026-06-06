import { Link } from "react-router-dom";
import { CheckCircle2, Lock } from "lucide-react";
import { SCENARIOS } from "../lib/scenarios";
import { isTierCompleted, isTierUnlocked, ProgressMap, TIERS, TIER_LABEL_KA } from "../lib/progression";

export default function ScenarioProgressMap({
  map,
  compact = false,
}: {
  map: ProgressMap;
  compact?: boolean;
}) {
  const list = compact ? SCENARIOS.slice(0, 6) : SCENARIOS;
  return (
    <div className="sp-card divide-y divide-[hsl(38_55%_88%)] overflow-hidden">
      {list.map((s) => {
        const Icon = s.Icon;
        return (
          <div key={s.id} className="flex items-center gap-3 px-4 py-3">
            <div className="w-9 h-9 rounded-lg sp-chip-teal flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold ka sp-text text-sm truncate">{s.title_en}</div>
              {!compact && (
                <div className="text-[11px] sp-text-muted ka truncate">{s.desc_ka}</div>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {TIERS.map((t) => {
                const done = isTierCompleted(map, s.id, t);
                const unlocked = isTierUnlocked(map, s.id, t);
                return (
                  <TierDot key={t} tier={t} done={done} unlocked={unlocked} />
                );
              })}
            </div>
            <Link
              to={`/path/speaking/call?scenario=${s.id}`}
              className="text-[11px] font-semibold text-[hsl(33_69%_45%)] hover:underline shrink-0 ka"
            >
              გახსნა
            </Link>
          </div>
        );
      })}
      {compact && SCENARIOS.length > list.length && (
        <Link
          to="/path/speaking/progress"
          className="block px-4 py-3 text-center text-xs font-semibold sp-text-muted ka hover:bg-[hsl(40_91%_93%)]"
        >
          ყველა ({SCENARIOS.length}) ნახვა →
        </Link>
      )}
    </div>
  );
}

function TierDot({ tier, done, unlocked }: { tier: string; done: boolean; unlocked: boolean }) {
  const title = TIER_LABEL_KA[tier as keyof typeof TIER_LABEL_KA];
  if (done) {
    return (
      <span
        title={`${title} ✓`}
        className="w-5 h-5 rounded-full bg-[hsl(33_69%_45%)] text-[hsl(40_91%_96%)] inline-flex items-center justify-center"
      >
        <CheckCircle2 className="w-3.5 h-3.5" />
      </span>
    );
  }
  if (!unlocked) {
    return (
      <span
        title={`${title} (დაბლოკილია)`}
        className="w-5 h-5 rounded-full bg-[hsl(38_25%_88%)] text-[hsl(30_15%_55%)] inline-flex items-center justify-center"
      >
        <Lock className="w-3 h-3" />
      </span>
    );
  }
  return (
    <span
      title={title}
      className="w-5 h-5 rounded-full border-2 border-[hsl(38_70%_72%)] bg-[hsl(40_91%_93%)] inline-block"
    />
  );
}
