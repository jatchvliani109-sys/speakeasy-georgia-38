import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import BusinessShell, { BizCard, BizButton } from "./BusinessShell";
import { ReadAloudButton } from "@/components/ReadAloudButton";
import {
  ingestExternalPhrases,
  loadProgress,
  progressToWord,
  sourceLabelKa,
  upsertProgress,
  type ProgressRow,
} from "./lib/vocabEngine";

type Filter = "all" | "difficult" | "mastered" | "field" | "external";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "ყველა" },
  { id: "difficult", label: "რთული" },
  { id: "mastered", label: "დაძლეული" },
  { id: "field", label: "სფეროს მიხედვით" },
  { id: "external", label: "სხვა მოდულებიდან" },
];

const LABELS = [
  { id: "easy", emoji: "🟢", label: "ადვილი" },
  { id: "okay", emoji: "🟡", label: "საშუალო" },
  { id: "difficult", emoji: "🔴", label: "რთული" },
] as const;

export default function VocabularyNotebook() {
  const { user } = useAuth();
  const [rows, setRows] = useState<ProgressRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      let p = await loadProgress(user.id);
      p = await ingestExternalPhrases(user.id, p);
      if (cancelled) return;
      setRows(p);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const setLabel = async (row: ProgressRow, label: string | null) => {
    if (!user) return;
    const updated = { ...row, manual_label: label };
    setRows((rs) => rs.map((r) => (r.word_key === row.word_key ? updated : r)));
    await upsertProgress(user.id, [updated]);
  };

  const filtered = useMemo(() => {
    let list = rows;
    if (filter === "difficult") {
      list = list.filter((r) => r.manual_label === "difficult" || r.wrong_count > r.correct_count);
    } else if (filter === "mastered") {
      list = list.filter((r) => r.confidence >= 4 || r.manual_label === "easy");
    } else if (filter === "field") {
      list = list.filter((r) => r.source === "field");
    } else if (filter === "external") {
      list = list.filter((r) => ["email", "interview", "meeting"].includes(r.source));
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((r) => {
        const w = progressToWord(r);
        if (!w) return false;
        return w.en.toLowerCase().includes(q) || w.ka.toLowerCase().includes(q);
      });
    }
    return list.sort((a, b) => a.confidence - b.confidence);
  }, [rows, filter, query]);

  const counts = useMemo(() => {
    const difficult = rows.filter((r) => r.manual_label === "difficult" || r.wrong_count > r.correct_count).length;
    const mastered = rows.filter((r) => r.confidence >= 4 || r.manual_label === "easy").length;
    return { total: rows.length, difficult, mastered };
  }, [rows]);

  return (
    <BusinessShell back={{ to: "/path/business/module/vocabulary", label: "ბიზნეს ლექსიკა" }}>
      <header className="mb-4">
        <p className="ka text-[11px] uppercase tracking-wider text-[#C9A227] font-semibold">
          ჩემი რვეული
        </p>
        <h1 className="ka text-2xl font-bold text-[#1E2A44] mt-1">ჩემი სიტყვები</h1>
      </header>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <Stat label="სულ" value={counts.total} />
        <Stat label="დაძლეული" value={counts.mastered} />
        <Stat label="რთული" value={counts.difficult} accent="amber" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 -mx-1 px-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`ka shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition border
              ${filter === f.id
                ? "bg-[#1E2A44] text-[#F7F1E3] border-[#1E2A44]"
                : "bg-white text-[#1E2A44] border-[#E7E2D5] hover:bg-[#FAF7F0]"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="relative mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ძებნა..."
          className="ka w-full pl-9 pr-3 py-3 rounded-xl bg-white border border-[#E7E2D5] text-sm text-[#1E2A44] placeholder:text-[#9CA3AF] outline-none focus:border-[#1E2A44] transition"
        />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5B6473]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
        </svg>
      </div>

      {loading ? (
        <BizCard><p className="ka text-sm text-[#5B6473]">იტვირთება...</p></BizCard>
      ) : filtered.length === 0 ? (
        <BizCard className="text-center py-8">
          <p className="ka text-sm text-[#5B6473]">ცარიელია — დაიწყე ერთი სესია სიტყვების დასამატებლად.</p>
        </BizCard>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => {
            const w = progressToWord(r);
            if (!w) return null;
            return (
              <div key={r.word_key} className="bg-white border border-[#E7E2D5] rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-[#1E2A44]">{w.en}</h3>
                      <ReadAloudButton text={w.en} size="sm" />
                    </div>
                    <p className="ka text-xs text-[#5B6473] mt-0.5">{w.ka}</p>
                    {w.pronunciation && (
                      <p className="ka text-[10px] text-[#C9A227] font-mono mt-0.5">[{w.pronunciation}]</p>
                    )}
                  </div>
                  <ConfidenceDot c={r.confidence} />
                </div>
                {w.explanationKa && (
                  <p className="ka text-xs text-[#374151] mt-2">{w.explanationKa}</p>
                )}
                {w.exampleEn && (
                  <p className="text-xs text-[#1E2A44] italic mt-2">"{w.exampleEn}"</p>
                )}
                <div className="mt-3 pt-3 border-t border-[#F0EBDD] flex items-center justify-between gap-2">
                  <p className="ka text-[10px] text-[#5B6473]">
                    წყარო: {sourceLabelKa(r.source)}
                  </p>
                  <div className="flex gap-1">
                    {LABELS.map((l) => (
                      <button
                        key={l.id}
                        onClick={() => setLabel(r, r.manual_label === l.id ? null : l.id)}
                        title={l.label}
                        className={`text-base w-7 h-7 grid place-items-center rounded-md border transition
                          ${r.manual_label === l.id ? "border-[#1E2A44] bg-[#FAF7F0]" : "border-transparent hover:border-[#E7E2D5]"}`}
                      >
                        {l.emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </BusinessShell>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: "amber" }) {
  return (
    <div className={`bg-white border rounded-xl p-3 text-center ${accent === "amber" ? "border-amber-200" : "border-[#E7E2D5]"}`}>
      <p className={`text-xl font-bold ${accent === "amber" ? "text-amber-700" : "text-[#1E2A44]"}`}>{value}</p>
      <p className="ka text-[10px] text-[#5B6473] uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  );
}

function ConfidenceDot({ c }: { c: number }) {
  const colors = ["#E7E2D5", "#FDE68A", "#FCD34D", "#86EFAC", "#34D399", "#10B981"];
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <div className="w-2 h-2 rounded-full" style={{ background: colors[Math.min(5, c)] }} />
      <span className="text-[10px] text-[#5B6473] font-mono">{c}/5</span>
    </div>
  );
}
