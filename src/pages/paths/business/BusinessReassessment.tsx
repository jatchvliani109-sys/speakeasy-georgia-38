import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import BusinessShell, { BizCard, BizButton } from "./BusinessShell";
import {
  BusinessLevel,
  LEVEL_LABELS,
  pullBusinessFromSupabase,
  saveBusiness,
} from "./lib/state";
import {
  REASSESSMENT_TESTS,
  ReassessmentTest,
  maxMcqScore,
  pickNextTestVersion,
} from "./lib/reassessmentTests";

const LEVEL_RANK: Record<BusinessLevel, number> = {
  business_beginner: 1,
  business_elementary: 2,
  business_intermediate: 3,
  business_advanced: 4,
};

function levelFromPercent(pct: number): BusinessLevel {
  if (pct >= 85) return "business_advanced";
  if (pct >= 70) return "business_intermediate";
  if (pct >= 50) return "business_elementary";
  return "business_beginner";
}

const AREA_LABELS_KA: Record<string, string> = {
  emails: "იმეილები",
  interview_meeting: "გასაუბრება / შეხვედრები",
  vocabulary: "ლექსიკა",
  mixed: "ბიზნეს სცენარები",
};

export default function BusinessReassessment() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState<ReassessmentTest | null>(null);
  const [levelBefore, setLevelBefore] = useState<BusinessLevel | null>(null);

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<(number | string | null)[]>([]);

  const [done, setDone] = useState(false);
  const [resultLevel, setResultLevel] = useState<BusinessLevel | null>(null);
  const [resultPct, setResultPct] = useState(0);
  const [weakAreas, setWeakAreas] = useState<string[]>([]);

  // Pick next test version on mount.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const cur = await pullBusinessFromSupabase(user.id);
      const { data: last } = await supabase
        .from("business_reassessments")
        .select("test_version")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      const next = pickNextTestVersion((last?.test_version as number | null) ?? null);
      const t = REASSESSMENT_TESTS.find((x) => x.version === next) || REASSESSMENT_TESTS[0];
      setTest(t);
      setAnswers(Array(t.questions.length).fill(null));
      setLevelBefore(cur.level ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const total = test?.questions.length ?? 0;
  const q = test?.questions[idx];
  const a = answers[idx];

  const isOpen = q?.type === "open";
  const canNext = isOpen ? true : typeof a === "number";

  const submit = async () => {
    if (!test || !user) return;
    let raw = 0;
    // weak-area tracking
    const areaTotals: Record<string, { earned: number; max: number }> = {};
    test.questions.forEach((qq, i) => {
      if (qq.type !== "mcq") return;
      const area = qq.area;
      areaTotals[area] = areaTotals[area] || { earned: 0, max: 0 };
      areaTotals[area].max += qq.weight;
      if (answers[i] === qq.correct) {
        raw += qq.weight;
        areaTotals[area].earned += qq.weight;
      }
    });
    const maxScore = maxMcqScore(test);
    let pct = (raw / maxScore) * 100;

    // Optional open answer = small upward-only bonus toward higher level
    const openIdx = test.questions.findIndex((x) => x.type === "open");
    const openAns = openIdx >= 0 ? answers[openIdx] : null;
    let openText: string | null = null;
    if (typeof openAns === "string" && openAns.trim()) {
      openText = openAns.trim();
      const words = openText.split(/\s+/).filter(Boolean).length;
      if (words >= 25) pct = Math.min(100, pct + 6);
      else if (words >= 12) pct = Math.min(100, pct + 3);
    }

    const newLevel = levelFromPercent(pct);
    const pctRounded = Math.round(pct);

    // weak areas = under 60% in that area
    const weak = Object.entries(areaTotals)
      .filter(([, v]) => v.max > 0 && v.earned / v.max < 0.6)
      .map(([k]) => AREA_LABELS_KA[k] || k);

    setResultLevel(newLevel);
    setResultPct(pctRounded);
    setWeakAreas(weak);
    setDone(true);

    // Persist
    try {
      await supabase.from("business_reassessments").insert({
        user_id: user.id,
        test_version: test.version,
        score_pct: pctRounded,
        level_before: levelBefore,
        level_after: newLevel,
        answers: answers as any,
        open_text: openText,
      });
    } catch {}

    // Save new level — always update; preserves all other progress.
    saveBusiness(user.id, { level: newLevel });
  };

  if (loading || !test) {
    return (
      <BusinessShell>
        <div className="ka text-[#4A4A4A]">იტვირთება...</div>
      </BusinessShell>
    );
  }

  if (done && resultLevel) {
    const beforeRank = levelBefore ? LEVEL_RANK[levelBefore] : 0;
    const afterRank = LEVEL_RANK[resultLevel];
    const changed = beforeRank !== afterRank;
    const went = afterRank - beforeRank;

    let title = "";
    let blurb = "";
    if (!levelBefore) {
      title = `შენი დონე: ${LEVEL_LABELS[resultLevel]}`;
      blurb = "კარგი დასაწყისია — განაგრძე ვარჯიში და მომდევნო შეფასებაზე დავინახავთ შენს პროგრესს.";
    } else if (went > 0) {
      title = `შენი დონე გაიზარდა: ${LEVEL_LABELS[levelBefore]} → ${LEVEL_LABELS[resultLevel]}`;
      blurb =
        "შესანიშნავი შედეგია. შემდეგი სესიები ავტომატურად მოერგება ახალ დონეს — გელოდება უფრო ნუანსირებული მასალა.";
    } else if (went < 0) {
      title = `შენი დონე: ${LEVEL_LABELS[resultLevel]}`;
      blurb =
        "ზოგჯერ ეს ხდება — შენი წინა პროგრესი, სიტყვები და ფრაზები სრულად შენახულია. განაგრძე ვარჯიში, შემდეგი შეფასება მალე გაბრუნებს ფორმაში.";
    } else {
      title = `შენი დონე იგივე დარჩა: ${LEVEL_LABELS[resultLevel]} — განაგრძე ვარჯიში!`;
      blurb = "კარგ გზაზე ხარ. ცოტა მეტი ვარჯიში სუსტ სფეროებზე და მომდევნო შეფასებაზე გადახვალ ზევით.";
    }

    return (
      <BusinessShell>
        <BizCard className={changed && went > 0 ? "border-l-4 border-l-[#5A8A6A] bg-[#F0F7F2]" : ""}>
          <p className="ka text-[11px] uppercase tracking-wider text-[#1C1C1E] font-semibold">
            შედეგი · ტესტი #{test.version}
          </p>
          <h1 className="ka text-2xl font-bold text-[#5C1A2E] mt-1">{title}</h1>
          <p className="text-sm text-[#4A4A4A] mt-1">Score: {resultPct}%</p>
          <p className="ka text-sm text-[#1C1C1E] mt-4 leading-relaxed">{blurb}</p>

          {weakAreas.length > 0 && went <= 0 && (
            <div className="mt-4 p-3 rounded-xl bg-[#F5F4F2] border border-[#F0E8D8]">
              <p className="ka text-[11px] uppercase tracking-wider text-[#1C1C1E] font-semibold">
                სფეროები სამუშაოდ
              </p>
              <p className="ka text-sm text-[#5C1A2E] mt-1">{weakAreas.join(" · ")}</p>
              <p className="ka text-[11px] text-[#4A4A4A] mt-1">
                გირჩევთ შესაბამის მოდულში დამატებითი სესიების გაკეთებას.
              </p>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            <BizButton onClick={() => navigate("/path/business/home", { replace: true })}>
              დაბრუნება
            </BizButton>
          </div>
        </BizCard>
      </BusinessShell>
    );
  }

  return (
    <BusinessShell>
      <div className="mb-6">
        <p className="ka text-[11px] uppercase tracking-wider text-[#1C1C1E] font-semibold">
          კითხვა {idx + 1} / {total}
          {q?.type === "mcq" && (
            <span className="ml-2 text-[#4A4A4A] normal-case tracking-normal">
              · {q.weight} pt
            </span>
          )}
        </p>
        <h1 className="ka text-2xl font-bold text-[#5C1A2E] mt-1">დონის შეფასება</h1>
        <p className="ka text-sm text-[#4A4A4A] mt-1">
          12 კითხვა + არასავალდებულო წერითი დავალება. შენი წინა პროგრესი დაცულია.
        </p>
      </div>

      <BizCard>
        {q?.promptKa && <p className="ka text-xs text-[#4A4A4A] mb-1">{q.promptKa}</p>}
        <p className="text-[#5C1A2E] font-semibold">{q?.prompt}</p>

        {q?.type === "mcq" ? (
          <div className="space-y-2 mt-4">
            {q.options.map((opt, i) => {
              const on = a === i;
              return (
                <button
                  key={i}
                  onClick={() =>
                    setAnswers((p) => p.map((v, j) => (j === idx ? i : v)))
                  }
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ${
                    on
                      ? "border-[#5C1A2E] bg-[#5C1A2E]/5 text-[#5C1A2E]"
                      : "border-[#E4E2DF] hover:border-[#5C1A2E]/40 text-[#1C1C1E]"
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        ) : (
          <>
            <textarea
              value={typeof a === "string" ? a : ""}
              onChange={(e) =>
                setAnswers((p) => p.map((v, j) => (j === idx ? e.target.value : v)))
              }
              rows={5}
              placeholder="Write your answer in English... (optional)"
              className="mt-4 w-full px-4 py-3 rounded-xl border border-[#E4E2DF] focus:border-[#5C1A2E] outline-none text-sm bg-white"
            />
            <p className="ka text-xs text-[#4A4A4A] mt-2">
              ეს კითხვა არასავალდებულოა — შეგიძლია გამოტოვო.
            </p>
          </>
        )}

        <div className="flex items-center justify-between mt-6">
          <BizButton
            variant="ghost"
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
          >
            უკან
          </BizButton>
          {idx < total - 1 ? (
            <BizButton
              onClick={() => setIdx((i) => Math.min(total - 1, i + 1))}
              disabled={!canNext}
            >
              შემდეგი
            </BizButton>
          ) : (
            <BizButton onClick={submit}>დასრულება</BizButton>
          )}
        </div>
      </BizCard>
    </BusinessShell>
  );
}
