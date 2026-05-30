import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import BusinessShell, { BizCard, BizButton } from "./BusinessShell";
import { ReadAloudButton } from "@/components/ReadAloudButton";
import {
  applyAnswer,
  buildQuiz,
  emptyProgressFor,
  ingestExternalPhrases,
  loadProgress,
  planSession,
  progressToWord,
  type ProgressRow,
  type QuizQuestion,
  upsertProgress,
} from "./lib/vocabEngine";
import { pullBusinessFromSupabase, type BusinessState } from "./lib/state";
import type { VocabWord } from "./lib/vocabBank";

type Stage = "intro" | "cards" | "quiz" | "results" | "empty";

const PRACTICE_TARGET = 6;

export default function VocabularyModule() {
  const { user } = useAuth();
  const [stage, setStage] = useState<Stage>("intro");
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [state, setState] = useState<BusinessState | null>(null);
  const [newWords, setNewWords] = useState<VocabWord[]>([]);
  const [reviewKeys, setReviewKeys] = useState<string[]>([]);
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [cardIdx, setCardIdx] = useState(0);
  const [qIdx, setQIdx] = useState(0);
  const [answers, setAnswers] = useState<{ wordKey: string; correct: boolean }[]>([]);
  const [selected, setSelected] = useState<string | number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [totalVocab, setTotalVocab] = useState(0);
  const [lastResults, setLastResults] = useState<{
    answers: { wordKey: string; correct: boolean }[];
    newWords: VocabWord[];
  } | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const s = await pullBusinessFromSupabase(user.id);
      if (cancelled) return;
      setState(s);
      let p = await loadProgress(user.id);
      p = await ingestExternalPhrases(user.id, p);
      if (cancelled) return;
      const plan = planSession(p, s.field || [], s.mainPriority || []);
      setProgress(p);
      setTotalVocab(p.length);
      setNewWords(plan.newWords);
      setReviewKeys(plan.reviewKeys);
      if (!plan.newWords.length && !plan.reviewKeys.length) {
        setStage("empty");
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const startSession = () => {
    const q = buildQuiz(newWords, reviewKeys);
    setQuiz(q);
    setCardIdx(0);
    setQIdx(0);
    setAnswers([]);
    setSelected(null);
    setRevealed(false);
    setStage(newWords.length ? "cards" : "quiz");
  };

  // CARDS
  const onNextCard = () => {
    if (cardIdx + 1 < newWords.length) setCardIdx((i) => i + 1);
    else setStage("quiz");
  };

  // QUIZ
  const currentQ = quiz[qIdx];
  const submitAnswer = () => {
    if (selected === null || revealed) return;
    const correct = checkAnswer(currentQ, selected);
    setRevealed(true);
    if ("wordKey" in currentQ) {
      setAnswers((a) => [...a, { wordKey: currentQ.wordKey, correct }]);
    }
  };
  const nextQ = () => {
    if (qIdx + 1 < quiz.length) {
      setQIdx((i) => i + 1);
      setSelected(null);
      setRevealed(false);
    } else {
      finishSession();
    }
  };

  const finishSession = async () => {
    if (!user) return;
    // Aggregate per word
    const perWord = new Map<string, boolean[]>();
    answers.forEach((a) => {
      const arr = perWord.get(a.wordKey) || [];
      arr.push(a.correct);
      perWord.set(a.wordKey, arr);
    });

    const updated: ProgressRow[] = [];
    for (const [wordKey, results] of perWord.entries()) {
      const existing = progress.find((p) => p.word_key === wordKey);
      let row =
        existing ||
        (() => {
          const isNew = newWords.find((w) => w.key === wordKey);
          if (isNew) return emptyProgressFor(isNew);
          return null;
        })();
      if (!row) continue;
      results.forEach((c) => {
        row = applyAnswer(row!, c);
      });
      updated.push(row);
    }
    await upsertProgress(user.id, updated);
    // Update local progress + total vocab counter
    const newProgress = [...progress];
    updated.forEach((row) => {
      const idx = newProgress.findIndex((p) => p.word_key === row.word_key);
      if (idx >= 0) newProgress[idx] = row;
      else newProgress.push(row);
    });
    setProgress(newProgress);
    setTotalVocab(newProgress.length);

    // Save session
    const score = answers.filter((a) => a.correct).length;
    const { supabase } = await import("@/integrations/supabase/client");
    await supabase.from("business_vocab_sessions").insert({
      user_id: user.id,
      score,
      total: answers.length,
      new_words: newWords.length,
      review_words: reviewKeys.length,
      completed: true,
      completed_at: new Date().toISOString(),
      session_data: {
        wordKeys: newWords.map((w) => w.key),
        answers,
      },
    });

    setLastResults({ answers, newWords });
    setStage("results");
  };

  const startPracticeMore = () => {
    const src = lastResults || { answers, newWords };
    // Build a quick review pool: words user got wrong + lowest-confidence words
    const wrongKeys = Array.from(
      new Set(src.answers.filter((a) => !a.correct).map((a) => a.wordKey)),
    );
    const wrongWords = wrongKeys
      .map((k) => src.newWords.find((w) => w.key === k) || progressToWord(progress.find((p) => p.word_key === k) as ProgressRow))
      .filter(Boolean) as VocabWord[];

    let pool: VocabWord[] = [...wrongWords];
    if (pool.length < PRACTICE_TARGET) {
      const lowConf = [...progress]
        .filter((p) => !pool.find((w) => w.key === p.word_key))
        .sort((a, b) => a.confidence - b.confidence)
        .map((p) => progressToWord(p))
        .filter(Boolean) as VocabWord[];
      pool = [...pool, ...lowConf].slice(0, PRACTICE_TARGET);
    }
    if (!pool.length) return;

    const reviewKeysNew = pool.map((w) => w.key);
    setNewWords([]);
    setReviewKeys(reviewKeysNew);
    setQuiz(buildQuiz([], reviewKeysNew));
    setQIdx(0);
    setAnswers([]);
    setSelected(null);
    setRevealed(false);
    setStage("quiz");
  };

  if (loading) {
    return (
      <BusinessShell back={{ to: "/path/business/home", label: "ბიზნეს ინგლისური" }}>
        <BizCard><p className="ka text-sm text-[#5B6473]">იტვირთება...</p></BizCard>
      </BusinessShell>
    );
  }

  return (
    <BusinessShell back={{ to: "/path/business/home", label: "ბიზნეს ინგლისური" }}>
      <header className="mb-5">
        <p className="ka text-[11px] uppercase tracking-wider text-[#C9A227] font-semibold">
          ბიზნეს ლექსიკა
        </p>
        <h1 className="ka text-2xl font-bold text-[#1E2A44] mt-1">
          {stage === "results" ? "სესია დასრულდა" : "დღევანდელი სიტყვები"}
        </h1>
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <Link to="/path/business/vocabulary/notebook" className="ka text-xs text-[#1E2A44] underline underline-offset-2">
            📔 ჩემი რვეული
          </Link>
        </div>
      </header>

      {stage === "intro" && (
        <IntroCard
          newWords={newWords}
          reviewCount={reviewKeys.length}
          onStart={startSession}
        />
      )}

      {stage === "empty" && (
        <BizCard className="text-center py-10">
          <div className="mx-auto w-14 h-14 rounded-full bg-[#FAF7F0] border border-[#E7E2D5] grid place-items-center text-2xl">
            🎉
          </div>
          <h3 className="ka text-lg font-bold text-[#1E2A44] mt-3">დღევანდელი სიტყვები მზად არ არის</h3>
          <p className="ka text-sm text-[#5B6473] mt-2 max-w-sm mx-auto">
            ყველა მიმდინარე სიტყვა შესწავლილია. შემოამოწმე ხვალ ან გადახედე რვეულს.
          </p>
          <div className="mt-5">
            <Link to="/path/business/vocabulary/notebook">
              <BizButton>რვეულის ნახვა →</BizButton>
            </Link>
          </div>
        </BizCard>
      )}

      {stage === "cards" && newWords[cardIdx] && (
        <>
          <ProgressBar value={cardIdx + 1} total={newWords.length} label={`ახალი სიტყვა ${cardIdx + 1}/${newWords.length}`} />
          <WordCard word={newWords[cardIdx]} />
          <div className="mt-4 flex justify-end">
            <BizButton onClick={onNextCard}>
              {cardIdx + 1 < newWords.length ? "შემდეგი →" : "ქვიზის დაწყება →"}
            </BizButton>
          </div>
        </>
      )}

      {stage === "quiz" && currentQ && (
        <>
          <ProgressBar value={qIdx + 1} total={quiz.length} label={`კითხვა ${qIdx + 1}/${quiz.length}`} />
          <QuestionCard
            q={currentQ}
            selected={selected}
            revealed={revealed}
            setSelected={setSelected}
          />
          <div className="mt-4 flex justify-end">
            {!revealed ? (
              <BizButton onClick={submitAnswer} disabled={selected === null}>
                შემოწმება
              </BizButton>
            ) : (
              <BizButton onClick={nextQ}>
                {qIdx + 1 < quiz.length ? "შემდეგი →" : "შედეგი →"}
              </BizButton>
            )}
          </div>
        </>
      )}

      {stage === "results" && lastResults && (
        <Results
          answers={lastResults.answers}
          newWords={lastResults.newWords}
          reviewCount={reviewKeys.length}
          totalVocab={totalVocab}
          canPracticeMore={lastResults.answers.some((a) => !a.correct) || progress.length > 0}
          onPracticeMore={startPracticeMore}
        />
      )}
    </BusinessShell>
  );
}

function IntroCard({
  newWords,
  reviewCount,
  onStart,
}: { newWords: VocabWord[]; reviewCount: number; onStart: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1E2A44] to-[#15203A] text-[#F7F1E3] p-6 shadow-[0_12px_32px_-12px_rgba(30,42,68,0.45)]">
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[#C9A227]/15 blur-2xl pointer-events-none" />
      <div className="relative">
        <p className="ka text-[10px] uppercase tracking-wider bg-[#C9A227]/20 text-[#F2D680] px-2 py-1 rounded-md font-semibold inline-block">
          დღევანდელი სესია
        </p>
        <h2 className="ka text-xl font-bold mt-3 leading-snug">
          {newWords.length} ახალი სიტყვა · {reviewCount} გასამეორებელი
        </h2>
        <p className="ka text-sm text-[#F7F1E3]/80 mt-2 leading-relaxed">
          ჯერ ვისწავლი ახალ სიტყვებს ბარათების სახით. შემდეგ — მოკლე ქვიზი ნასწავლის შესამოწმებლად.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Mini label="ბარათები" value={`${newWords.length}`} />
          <Mini label="გასამეორებელი" value={`${reviewCount}`} />
          <Mini label="დრო" value="~5 წთ" />
        </div>
        <button
          onClick={onStart}
          className="ka mt-5 inline-flex items-center justify-center gap-2 bg-[#C9A227] text-[#1E2A44] hover:bg-[#D8B547] transition-colors px-5 py-3 rounded-xl font-bold text-sm w-full"
        >
          დაწყება →
        </button>
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#F7F1E3]/10 rounded-lg px-3 py-2">
      <p className="ka text-[10px] text-[#F7F1E3]/70 uppercase tracking-wider">{label}</p>
      <p className="text-base font-bold text-[#F7F1E3] mt-0.5">{value}</p>
    </div>
  );
}

function ProgressBar({ value, total, label }: { value: number; total: number; label: string }) {
  const pct = Math.round((value / total) * 100);
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1.5">
        <p className="ka text-[11px] text-[#5B6473] font-semibold uppercase tracking-wider">{label}</p>
        <p className="text-[11px] text-[#5B6473] font-mono">{pct}%</p>
      </div>
      <div className="h-1.5 bg-[#E7E2D5] rounded-full overflow-hidden">
        <div className="h-full bg-[#1E2A44] transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function WordCard({ word }: { word: VocabWord }) {
  return (
    <div className="bg-white border border-[#E7E2D5] rounded-3xl p-6 shadow-[0_2px_4px_rgba(30,42,68,0.04),0_12px_32px_-12px_rgba(30,42,68,0.15)] animate-[bizFade_.35s_ease-out_both]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-3xl font-bold text-[#1E2A44] tracking-tight">{word.en}</h2>
          <p className="ka text-base text-[#5B6473] mt-1">{word.ka}</p>
          {word.pronunciation && (
            <p className="ka text-xs text-[#C9A227] font-mono mt-1">[{word.pronunciation}]</p>
          )}
        </div>
        <ReadAloudButton text={word.en} size="md" />
      </div>

      <p className="ka text-sm text-[#374151] mt-4 leading-relaxed">{word.explanationKa}</p>

      <div className="mt-4 space-y-2">
        <div className="p-3 rounded-xl bg-[#FAF7F0] border border-[#E7E2D5]">
          <p className="text-sm text-[#1E2A44]">"{word.exampleEn}"</p>
          <p className="ka text-xs text-[#5B6473] mt-1">{word.exampleKa}</p>
        </div>
        {word.example2En && (
          <div className="p-3 rounded-xl bg-[#FAF7F0] border border-[#E7E2D5]">
            <p className="text-sm text-[#1E2A44]">"{word.example2En}"</p>
            <p className="ka text-xs text-[#5B6473] mt-1">{word.example2Ka}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function checkAnswer(q: QuizQuestion, selected: string | number): boolean {
  switch (q.type) {
    case "mc_meaning":
      return selected === q.correctKa;
    case "tr_en_to_ka":
      return selected === q.correct;
    case "tr_ka_to_en":
      return selected === q.correct;
    case "fill_blank":
      return selected === q.correct;
    case "true_false":
      return (selected === "true") === q.isCorrect;
    case "sentence_correct":
    case "georgian_mistake":
      return selected === q.correctIndex;
  }
}

function QuestionCard({
  q,
  selected,
  revealed,
  setSelected,
}: {
  q: QuizQuestion;
  selected: string | number | null;
  revealed: boolean;
  setSelected: (v: string | number) => void;
}) {
  const renderChoices = (
    choices: (string | { label: string; value: string | number })[],
    correctValue: string | number,
  ) => (
    <div className="grid gap-2 mt-4">
      {choices.map((c, i) => {
        const value = typeof c === "string" ? c : c.value;
        const label = typeof c === "string" ? c : c.label;
        const isSelected = selected === value;
        const isCorrect = revealed && value === correctValue;
        const isWrongPick = revealed && isSelected && !isCorrect;
        return (
          <button
            key={i}
            disabled={revealed}
            onClick={() => setSelected(value)}
            className={`text-left px-4 py-3 rounded-xl border text-sm transition-all
              ${isCorrect ? "border-emerald-500 bg-emerald-50 text-emerald-900" : ""}
              ${isWrongPick ? "border-red-400 bg-red-50 text-red-900" : ""}
              ${!revealed && isSelected ? "border-[#1E2A44] bg-[#FAF7F0] text-[#1E2A44]" : ""}
              ${!revealed && !isSelected ? "border-[#E7E2D5] bg-white text-[#1E2A44] hover:bg-[#FAF7F0]" : ""}
              ${revealed && !isCorrect && !isWrongPick ? "border-[#E7E2D5] bg-white text-[#5B6473] opacity-60" : ""}
            `}
          >
            <span className={typeof label === "string" && label.match(/[ა-ჰ]/) ? "ka" : ""}>{label}</span>
          </button>
        );
      })}
    </div>
  );

  switch (q.type) {
    case "mc_meaning":
      return (
        <div className="bg-white border border-[#E7E2D5] rounded-3xl p-6 shadow-sm animate-[bizFade_.3s_ease-out_both]">
          <p className="ka text-xs text-[#5B6473] uppercase tracking-wider font-semibold">აირჩიე სწორი თარგმანი</p>
          <div className="mt-3 flex items-center gap-2">
            <h3 className="text-2xl font-bold text-[#1E2A44]">{q.en}</h3>
            <ReadAloudButton text={q.en} size="sm" />
          </div>
          {renderChoices(q.choices, q.correctKa)}
        </div>
      );
    case "tr_en_to_ka":
      return (
        <div className="bg-white border border-[#E7E2D5] rounded-3xl p-6 shadow-sm animate-[bizFade_.3s_ease-out_both]">
          <p className="ka text-xs text-[#5B6473] uppercase tracking-wider font-semibold">English → ქართული</p>
          <h3 className="text-2xl font-bold text-[#1E2A44] mt-3">{q.en}</h3>
          {renderChoices(q.choices, q.correct)}
        </div>
      );
    case "tr_ka_to_en":
      return (
        <div className="bg-white border border-[#E7E2D5] rounded-3xl p-6 shadow-sm animate-[bizFade_.3s_ease-out_both]">
          <p className="ka text-xs text-[#5B6473] uppercase tracking-wider font-semibold">ქართული → English</p>
          <h3 className="ka text-2xl font-bold text-[#1E2A44] mt-3">{q.ka}</h3>
          {renderChoices(q.choices, q.correct)}
        </div>
      );
    case "fill_blank":
      return (
        <div className="bg-white border border-[#E7E2D5] rounded-3xl p-6 shadow-sm animate-[bizFade_.3s_ease-out_both]">
          <p className="ka text-xs text-[#5B6473] uppercase tracking-wider font-semibold">შეავსე ცარიელი ადგილი</p>
          <p className="text-lg text-[#1E2A44] mt-3 leading-relaxed">{q.sentence}</p>
          <p className="ka text-xs text-[#5B6473] mt-1">{q.ka}</p>
          {renderChoices(q.choices, q.correct)}
        </div>
      );
    case "true_false":
      return (
        <div className="bg-white border border-[#E7E2D5] rounded-3xl p-6 shadow-sm animate-[bizFade_.3s_ease-out_both]">
          <p className="ka text-xs text-[#5B6473] uppercase tracking-wider font-semibold">სწორი თუ არასწორი თარგმანი?</p>
          <div className="mt-3 p-4 rounded-xl bg-[#FAF7F0] border border-[#E7E2D5]">
            <p className="text-xl font-bold text-[#1E2A44]">{q.en}</p>
            <p className="ka text-base text-[#5B6473] mt-1">= {q.ka}</p>
          </div>
          {renderChoices(
            [
              { label: "სწორი", value: "true" },
              { label: "არასწორი", value: "false" },
            ],
            q.isCorrect ? "true" : "false",
          )}
        </div>
      );
    case "sentence_correct":
      return (
        <div className="bg-white border border-[#E7E2D5] rounded-3xl p-6 shadow-sm animate-[bizFade_.3s_ease-out_both]">
          <p className="ka text-sm text-[#1E2A44]">{q.promptKa}</p>
          {renderChoices(
            q.choices.map((c, i) => ({ label: c, value: i })),
            q.correctIndex,
          )}
        </div>
      );
    case "georgian_mistake":
      return (
        <div className="bg-white border border-[#E7E2D5] rounded-3xl p-6 shadow-sm animate-[bizFade_.3s_ease-out_both]">
          <p className="ka text-[11px] uppercase tracking-wider text-[#C9A227] font-semibold">გავრცელებული შეცდომა</p>
          <p className="ka text-sm text-[#1E2A44] mt-2">{q.promptKa}</p>
          {renderChoices(
            q.choices.map((c, i) => ({ label: c, value: i })),
            q.correctIndex,
          )}
          {revealed && (
            <p className="ka text-xs text-[#5B6473] mt-3 italic">💡 {q.explanationKa}</p>
          )}
        </div>
      );
  }
}

function Results({
  answers,
  newWords,
  onAgain,
}: {
  answers: { wordKey: string; correct: boolean }[];
  newWords: VocabWord[];
  onAgain: () => void;
}) {
  const total = answers.length;
  const correct = answers.filter((a) => a.correct).length;
  const pct = total ? Math.round((correct / total) * 100) : 0;

  // Aggregate per word
  const perWord = new Map<string, { c: number; w: number }>();
  answers.forEach((a) => {
    const cur = perWord.get(a.wordKey) || { c: 0, w: 0 };
    if (a.correct) cur.c++;
    else cur.w++;
    perWord.set(a.wordKey, cur);
  });

  const mastered = newWords.filter((w) => {
    const s = perWord.get(w.key);
    return s && s.c > s.w;
  });
  const needsReview = newWords.filter((w) => {
    const s = perWord.get(w.key);
    return s && s.w >= s.c;
  });

  const message =
    pct >= 90 ? "შესანიშნავია — ძალიან კარგად!" :
    pct >= 70 ? "კარგი მუშაობაა. გააგრძელე ასე!" :
    pct >= 50 ? "კარგი დასაწყისია — გავიმეოროთ ცოტა მეტი." :
                "მთავარია სცადე — ხვალ უფრო ადვილი იქნება.";

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1E2A44] to-[#15203A] text-[#F7F1E3] p-6 text-center">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[#C9A227]/15 blur-2xl pointer-events-none" />
        <div className="relative">
          <p className="ka text-[11px] uppercase tracking-wider text-[#F2D680] font-semibold">დღევანდელი შედეგი</p>
          <p className="text-6xl font-bold mt-2">{pct}%</p>
          <p className="ka text-sm text-[#F7F1E3]/80 mt-2">{correct} / {total} სწორი პასუხი</p>
          <p className="ka text-sm text-[#F2D680] mt-3 font-semibold">{message}</p>
        </div>
      </div>

      {mastered.length > 0 && (
        <BizCard>
          <p className="ka text-[11px] uppercase tracking-wider text-emerald-700 font-semibold">
            დაძლეული სიტყვები
          </p>
          <ul className="mt-2 space-y-1.5">
            {mastered.map((w) => (
              <li key={w.key} className="flex items-baseline justify-between">
                <span className="text-sm font-semibold text-[#1E2A44]">{w.en}</span>
                <span className="ka text-xs text-[#5B6473]">{w.ka}</span>
              </li>
            ))}
          </ul>
        </BizCard>
      )}

      {needsReview.length > 0 && (
        <BizCard>
          <p className="ka text-[11px] uppercase tracking-wider text-amber-700 font-semibold">
            გასამეორებელი სიტყვები
          </p>
          <ul className="mt-2 space-y-1.5">
            {needsReview.map((w) => (
              <li key={w.key} className="flex items-baseline justify-between">
                <span className="text-sm font-semibold text-[#1E2A44]">{w.en}</span>
                <span className="ka text-xs text-[#5B6473]">{w.ka}</span>
              </li>
            ))}
          </ul>
        </BizCard>
      )}

      <div className="flex gap-2">
        <Link to="/path/business/home" className="flex-1">
          <BizButton variant="outline" className="w-full">დაბრუნება</BizButton>
        </Link>
        <Link to="/path/business/vocabulary/notebook" className="flex-1">
          <BizButton className="w-full">რვეული →</BizButton>
        </Link>
      </div>
    </div>
  );
}
