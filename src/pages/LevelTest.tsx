import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Q = { q: string; options: string[]; correct: number };

const SELF_OPTIONS = [
  "თითქმის არაფერი ვიცი",
  "ცოტა მესმის, მაგრამ საუბარი მიჭირს",
  "მარტივ წინადადებებს ვამბობ",
  "ყოველდღიურ თემებზე საუბარი შემიძლია",
  "კარგად ვწერ და ვსაუბრობ",
];

const QUESTIONS: Q[] = [
  { q: "Choose: 'I ___ a student.'", options: ["am", "is", "are", "be"], correct: 0 },
  { q: "What is the Georgian for 'apple'?", options: ["ვაშლი", "მსხალი", "ქლიავი", "ატამი"], correct: 0 },
  { q: "Choose: 'She ___ to school every day.'", options: ["go", "goes", "going", "gone"], correct: 1 },
  { q: "Pick the correct sentence:", options: ["He don't like coffee.", "He doesn't likes coffee.", "He doesn't like coffee.", "He not like coffee."], correct: 2 },
  { q: "What does 'beautiful' mean?", options: ["ცუდი", "ლამაზი", "დიდი", "პატარა"], correct: 1 },
  { q: "Choose past tense of 'eat':", options: ["eated", "ate", "eaten", "eating"], correct: 1 },
  { q: "Choose: 'If I ___ rich, I would travel.'", options: ["am", "was", "were", "be"], correct: 2 },
  { q: "Pick the most natural:", options: ["I have been working here since five years.", "I have been working here for five years.", "I am working here since five years.", "I work here since five years."], correct: 1 },
];

type Level = "Beginner" | "Elementary" | "Pre-Intermediate" | "Intermediate" | "Upper-Intermediate" | "Advanced";
const LEVEL_RANK: Level[] = ["Beginner", "Elementary", "Pre-Intermediate", "Intermediate", "Upper-Intermediate", "Advanced"];

// Stage: 0 = self-assessment, 1..N = quiz questions, N+1 = writing, then result
function evaluateWriting(text: string): { cap: Level; words: number; englishRatio: number; sentences: number; quality: number } {
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  const englishWords = words.filter((w) => /^[A-Za-z][A-Za-z'.,!?-]*$/.test(w));
  const englishRatio = words.length ? englishWords.length / words.length : 0;
  const sentences = trimmed.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.split(/\s+/).filter(Boolean).length >= 3).length;

  // Heuristic grammar quality: capitalized starts, presence of basic verbs/articles, avg sentence length
  const lower = " " + trimmed.toLowerCase() + " ";
  const hasArticles = /\b(a|an|the)\b/.test(lower);
  const hasBeVerb = /\b(am|is|are|was|were|be|been|being)\b/.test(lower);
  const hasAuxOrModal = /\b(have|has|had|do|does|did|will|would|can|could|should|might|must)\b/.test(lower);
  const properCaps = sentences > 0 && /^[A-Z]/.test(trimmed);
  const avgLen = sentences > 0 ? englishWords.length / sentences : englishWords.length;
  let quality = 0;
  if (hasArticles) quality++;
  if (hasBeVerb) quality++;
  if (hasAuxOrModal) quality++;
  if (properCaps) quality++;
  if (avgLen >= 5) quality++;
  if (avgLen >= 8) quality++;

  let cap: Level = "Beginner";
  if (englishWords.length < 5 || englishRatio < 0.6) cap = "Beginner";
  else if (sentences < 1 || quality <= 1) cap = "Beginner";
  else if (sentences <= 2 && quality <= 2) cap = "Elementary";
  else if (sentences <= 2 && quality <= 4) cap = "Pre-Intermediate";
  else if (sentences >= 2 && quality >= 3 && quality <= 4) cap = "Intermediate";
  else if (sentences >= 2 && quality >= 5 && englishWords.length >= 18) cap = "Upper-Intermediate";
  if (sentences >= 3 && quality >= 6 && englishWords.length >= 25 && englishRatio >= 0.9) cap = "Advanced";

  return { cap, words: englishWords.length, englishRatio, sentences, quality };
}

function combineLevel(self: number, quizScore: number, quizTotal: number, writingCap: Level): Level {
  // self: 0..4, quiz ratio 0..1
  const quizRatio = quizScore / quizTotal;
  let quizLevel: Level = "Beginner";
  if (quizRatio >= 0.9) quizLevel = "Upper-Intermediate";
  else if (quizRatio >= 0.75) quizLevel = "Intermediate";
  else if (quizRatio >= 0.6) quizLevel = "Pre-Intermediate";
  else if (quizRatio >= 0.4) quizLevel = "Elementary";

  let selfLevel: Level = "Beginner";
  if (self === 4) selfLevel = "Upper-Intermediate";
  else if (self === 3) selfLevel = "Intermediate";
  else if (self === 2) selfLevel = "Pre-Intermediate";
  else if (self === 1) selfLevel = "Elementary";

  // Weighted average rank
  const avgRank = Math.round(
    (LEVEL_RANK.indexOf(selfLevel) * 0.25 +
      LEVEL_RANK.indexOf(quizLevel) * 0.35 +
      LEVEL_RANK.indexOf(writingCap) * 0.4) /
      1
  );
  let estimated = LEVEL_RANK[Math.max(0, Math.min(LEVEL_RANK.length - 1, avgRank))];

  // Writing acts as cap
  if (LEVEL_RANK.indexOf(estimated) > LEVEL_RANK.indexOf(writingCap)) estimated = writingCap;
  return estimated;
}

export default function LevelTest() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stage, setStage] = useState<"self" | "quiz" | "writing" | "done">("self");
  const [selfIdx, setSelfIdx] = useState<number | null>(null);
  const [qIdx, setQIdx] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(QUESTIONS.length).fill(null));
  const [writing, setWriting] = useState("");
  const [result, setResult] = useState<{ level: Level; score: number } | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (selfIdx === null) return;
    const trimmed = writing.trim();
    if (!trimmed) {
      toast.error("გთხოვ დაწერე მინიმუმ 1 წინადადება, რომ უკეთ შევაფასოთ შენი საწყისი დონე.");
      return;
    }
    let score = 0;
    QUESTIONS.forEach((qq, idx) => { if (qq.correct === answers[idx]) score++; });
    const w = evaluateWriting(trimmed);
    const level = combineLevel(selfIdx, score, QUESTIONS.length, w.cap);
    setResult({ level, score });
    if (!user) return;
    setSaving(true);
    await supabase.from("level_test_results").insert({
      user_id: user.id,
      score,
      total: QUESTIONS.length,
      level,
      answers: { selfAssessmentLevel: selfIdx, placementQuizScore: score, quizAnswers: answers, writingSample: trimmed, writingEval: w, estimatedStartingLevel: level } as any,
    });
    await supabase.from("profiles").update({ english_level: level, level_test_completed: true }).eq("id", user.id);
    setSaving(false);
    setStage("done");
  };

  if (stage === "done" && result) {
    return (
      <Layout>
        <div className="py-12 text-center">
          <div className="text-6xl mb-4">🎯</div>
          <h1 className="text-2xl font-bold mb-2 ka">შენი შედეგი</h1>
          <p className="text-sm text-muted-foreground ka mt-2">სავარაუდო საწყისი დონე:</p>
          <div className="text-4xl font-extrabold text-primary my-3">{result.level}</div>
          <p className="text-sm text-muted-foreground ka">ქულა: {result.score} / {QUESTIONS.length}</p>
          <div className="text-left bg-muted/40 rounded-2xl p-4 mt-6 space-y-2">
            <p className="text-sm ka">ეს დონე შეირჩა შენი თვითშეფასების, ტესტის პასუხებისა და მოკლე წერითი პასუხის მიხედვით.</p>
            <p className="text-sm ka text-muted-foreground">AI მასწავლებელი შენს პასუხებსა და გაკვეთილებზე დაყრდნობით დონეს ნელ-ნელა დააზუსტებს.</p>
          </div>
          <Button variant="hero" size="xl" className="w-full ka mt-6" onClick={() => navigate("/learning-path")} disabled={saving}>
            გაგრძელება →
          </Button>
        </div>
      </Layout>
    );
  }

  if (stage === "self") {
    return (
      <Layout>
        <div className="py-4">
          <p className="text-xs text-muted-foreground ka mb-1">საწყისი დონის შეფასება</p>
          <h2 className="text-xl font-bold mb-2 ka">როგორ შეაფასებ შენს ინგლისურს?</h2>
          <p className="text-sm text-muted-foreground ka mb-6">აირჩიე ვარიანტი, რომელიც ყველაზე ახლოსაა შენთან.</p>
          <div className="grid gap-3">
            {SELF_OPTIONS.map((opt, idx) => (
              <Button
                key={opt}
                variant={selfIdx === idx ? "hero" : "soft"}
                size="lg"
                className="w-full justify-start text-left ka whitespace-normal h-auto py-3"
                onClick={() => { setSelfIdx(idx); setStage("quiz"); }}
              >
                {idx + 1}. {opt}
              </Button>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (stage === "quiz") {
    const q = QUESTIONS[qIdx];
    const pick = (val: number) => {
      const next = [...answers]; next[qIdx] = val; setAnswers(next);
      if (qIdx < QUESTIONS.length - 1) setQIdx(qIdx + 1);
      else setStage("writing");
    };
    return (
      <Layout>
        <div className="py-4">
          <p className="text-xs text-muted-foreground ka mb-2">საწყისი დონის შეფასება</p>
          <div className="flex gap-1.5 mb-6">
            {QUESTIONS.map((_, idx) => (
              <div key={idx} className={cn("flex-1 h-2 rounded-full", idx <= qIdx ? "bg-primary" : "bg-muted")} />
            ))}
          </div>
          <p className="text-sm text-muted-foreground mb-2 ka">კითხვა {qIdx + 1} / {QUESTIONS.length}</p>
          <h2 className="text-xl font-bold mb-6">{q.q}</h2>
          <div className="grid gap-3">
            {q.options.map((o, idx) => (
              <Button key={o} variant="soft" size="lg" className="w-full justify-start text-left" onClick={() => pick(idx)}>
                {o}
              </Button>
            ))}
          </div>
          {qIdx > 0 && <Button variant="ghost" className="w-full mt-6 ka" onClick={() => setQIdx(qIdx - 1)}>← უკან</Button>}
        </div>
      </Layout>
    );
  }

  // writing stage
  return (
    <Layout>
      <div className="py-4">
        <p className="text-xs text-muted-foreground ka mb-1">საწყისი დონის შეფასება</p>
        <h2 className="text-xl font-bold mb-2 ka">დაწერე 2–3 წინადადება ინგლისურად შენს შესახებ.</h2>
        <p className="text-sm text-muted-foreground mb-4">მაგალითი: "My name is Nino. I am from Georgia. I like music."</p>
        <Textarea
          className="min-h-32 rounded-2xl text-base"
          placeholder="My name is..."
          value={writing}
          onChange={(e) => setWriting(e.target.value)}
        />
        <Button variant="hero" size="lg" className="w-full mt-4 ka" onClick={submit} disabled={saving}>
          დასრულება
        </Button>
        <Button variant="ghost" className="w-full mt-2 ka" onClick={() => setStage("quiz")}>← უკან</Button>
      </div>
    </Layout>
  );
}
