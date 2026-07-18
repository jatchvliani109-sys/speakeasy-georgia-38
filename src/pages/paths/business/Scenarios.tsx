// src/pages/paths/business/Scenarios.tsx
// -----------------------------------------------------------------------------
// SCENARIOS — the browse-and-learn surface for the vocab-first pivot.
// Data comes entirely from vocabContext.ts (pre-generated, zero AI cost).
// Flow: pick a category → pick a scenario → scene setup, words with audio,
// collocations, a realistic EN+KA dialogue → practice CTA that opens a
// vocab session scoped to this scenario's words.
// -----------------------------------------------------------------------------
import { useState } from "react";
import { Link } from "react-router-dom";
import BusinessShell, { BizCard, BizButton } from "./BusinessShell";
import { ReadAloudButton } from "@/components/ReadAloudButton";
import { findWord } from "./lib/vocabBank";
import {
  CATEGORY_LABELS_KA,
  SITUATION_CLUSTERS,
  availableCategories,
  getContext,
  type ScenarioCategory,
  type SituationCluster,
} from "./lib/vocabContext";

export default function Scenarios() {
  const [category, setCategory] = useState<ScenarioCategory | null>(null);
  const [scenario, setScenario] = useState<SituationCluster | null>(null);

  const visible = category
    ? SITUATION_CLUSTERS.filter((c) => c.category === category)
    : SITUATION_CLUSTERS;

  return (
    <BusinessShell back={{ to: "/path/business/home", label: "SpeakBusy" }}>
      {!scenario && (
        <>
          <div className="mb-4">
            <h1 className="ka text-2xl font-bold text-[#5C1A2E]">სცენარები</h1>
            <p className="ka text-sm text-[#4A4A4A] mt-1">
              ისწავლე სიტყვები რეალურ სამუშაო სიტუაციებში — შეხვედრები, იმეილები, გასაუბრება და სხვა.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <button
              type="button"
              onClick={() => setCategory(null)}
              className={`ka text-xs px-3 py-1.5 rounded-full border font-semibold transition-colors
                ${category === null
                  ? "bg-[#232323] text-[#F5F4F2] border-[#5C1A2E]"
                  : "bg-white text-[#4A4A4A] border-[#E4E2DF] hover:border-[#C9A84C]"}`}
            >
              ყველა
            </button>
            {availableCategories().map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`ka text-xs px-3 py-1.5 rounded-full border font-semibold transition-colors
                  ${category === cat
                    ? "bg-[#232323] text-[#F5F4F2] border-[#5C1A2E]"
                    : "bg-white text-[#4A4A4A] border-[#E4E2DF] hover:border-[#C9A84C]"}`}
              >
                {CATEGORY_LABELS_KA[cat]}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {visible.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setScenario(c)}
                className="w-full text-left bg-white border border-[#E4E2DF] rounded-2xl p-4 shadow-sm hover:border-[#C9A84C] transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="ka text-[10px] uppercase tracking-wider text-[#C9A84C] font-bold">
                      {CATEGORY_LABELS_KA[c.category]}
                    </p>
                    <h2 className="ka text-base font-bold text-[#5C1A2E] mt-0.5">{c.titleKa}</h2>
                    <p className="text-xs text-[#4A4A4A] mt-0.5">{c.titleEn}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="ka text-[11px] text-[#4A4A4A]">{c.wordKeys.length} სიტყვა</p>
                    <p className="text-[#5C1A2E] text-lg leading-none mt-1">→</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {scenario && (
        <>
          <button
            type="button"
            onClick={() => setScenario(null)}
            className="ka text-xs text-[#4A4A4A] font-semibold mb-3 hover:text-[#5C1A2E] transition-colors"
          >
            ← ყველა სცენარი
          </button>

          {/* Scene setup */}
          <div className="rounded-3xl p-6 text-[#F5F4F2] bg-gradient-to-br from-[#232323] to-[#1C1C1E] shadow-lg">
            <p className="ka text-[10px] uppercase tracking-wider text-[#C9A84C] font-bold">
              {CATEGORY_LABELS_KA[scenario.category]}
            </p>
            <h1 className="ka text-2xl font-bold mt-1">{scenario.titleKa}</h1>
            <p className="text-sm text-[#F5F4F2]/80 mt-0.5">{scenario.titleEn}</p>
            <p className="ka text-sm leading-relaxed mt-3 text-[#F5F4F2]/95">{scenario.scenarioKa}</p>
          </div>

          {/* Words */}
          <BizCard className="mt-4">
            <p className="ka text-[11px] uppercase tracking-wider text-[#1C1C1E] font-semibold">
              სიტყვები ({scenario.wordKeys.length})
            </p>
            <ul className="mt-2 divide-y divide-[#EFEEEC]">
              {scenario.wordKeys.map((key) => {
                const w = findWord(key);
                if (!w) return null;
                const ctx = getContext(key);
                return (
                  <li key={key} className="py-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-sm font-bold text-[#5C1A2E]">{w.en}</span>
                        <span className="ka text-xs text-[#4A4A4A] ml-2">{w.ka}</span>
                      </div>
                      <ReadAloudButton text={w.en} storageKey={w.key} size="md" />
                    </div>
                    {ctx && ctx.collocations.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {ctx.collocations.slice(0, 2).map((c) => (
                          <span
                            key={c.en}
                            title={c.ka}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-[#C9A84C]/15 border border-[#C9A84C]/30 text-[#5C1A2E] font-medium"
                          >
                            {c.en}
                          </span>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </BizCard>

          {/* Dialogue */}
          <BizCard className="mt-4">
            <p className="ka text-[11px] uppercase tracking-wider text-[#1C1C1E] font-semibold">
              დიალოგი
            </p>
            <div className="mt-2 space-y-3">
              {scenario.dialogue.map((line, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="shrink-0 mt-0.5">
                    <ReadAloudButton text={line.en} storageKey={`dlg-${scenario.id}-${i}`} size="md" />
                  </div>
                  <div className="min-w-0">
                    <p className="ka text-[11px] font-bold text-[#C9A84C]">{line.speaker}</p>
                    <p className="text-sm text-[#5C1A2E] leading-snug">{line.en}</p>
                    <p className="ka text-xs text-[#4A4A4A] mt-0.5 leading-snug">{line.ka}</p>
                  </div>
                </div>
              ))}
            </div>
          </BizCard>

          {/* Situation paragraph */}
          <BizCard className="mt-4">
            <p className="ka text-[11px] uppercase tracking-wider text-[#1C1C1E] font-semibold">
              სიტუაცია
            </p>
            <p className="text-sm text-[#5C1A2E] leading-relaxed mt-2">{scenario.paragraphEn}</p>
            <p className="ka text-xs text-[#4A4A4A] leading-relaxed mt-2">{scenario.paragraphKa}</p>
          </BizCard>

          {/* Practice CTA */}
          <div className="mt-5 mb-2 text-center">
            <Link to={`/path/business/vocabulary?scenario=${scenario.id}`} className="block">
              <BizButton>ივარჯიშე ამ სიტყვებზე →</BizButton>
            </Link>
          </div>
        </>
      )}
    </BusinessShell>
  );
}
