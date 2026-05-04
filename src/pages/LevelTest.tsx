import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Q = { q: string; options?: string[]; correct?: number; type?: "open" };

const QUESTIONS: Q[] = [
  { q: "Choose: 'I ___ a student.'", options: ["am", "is", "are", "be"], correct: 0 },
  { q: "What is the Georgian for 'apple'?", options: ["ვაშლი", "მსხალი", "ქლიავი", "ატამი"], correct: 0 },
  { q: "Choose: 'She ___ to school every day.'", options: ["go", "goes", "going", "gone"], correct: 1 },
  { q: "Pick the correct sentence:", options: ["He don't like coffee.", "He doesn't likes coffee.", "He doesn't like coffee.", "He not like coffee."], correct: 2 },
  { q: "What does 'beautiful' mean?", options: ["ცუდი", "ლამაზი", "დიდი", "პატარა"], correct: 1 },
  { q: "Choose past tense of 'eat':", options: ["eated", "ate", "eaten", "eating"], correct: 1 },
  { q: "Choose: 'If I ___ rich, I would travel.'", options: ["am", "was", "were", "be"], correct: 2 },
  { q: "Pick the most natural:", options: ["I have been working here since five years.", "I have been working here for five years.", "I am working here since five years.", "I work here since five years."], correct: 1 },
  { q: "Write a short self-introduction in English (1-2 sentences):", type: "open" },
];

export default function LevelTest() {
  const { user } = useAuth();
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<(number | string | null)[]>(Array(QUESTIONS.length).fill(null));
  const [done, setDone] = useState<{ level: string; score: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const q = QUESTIONS[i];

  const submit = async (final: (number | string | null)[]) => {
    let score = 0;
    QUESTIONS.forEach((qq, idx) => {
      if (qq.type === "open") {
        const a = final[idx] as string;
        if (a && a.trim().split(/\s+/).length >= 4) score += 1;
      } else if (qq.correct === final[idx]) score += 1;
    });
    let level: "Beginner" | "Elementary" | "Intermediate" | "Advanced" = "Beginner";
    if (score >= 8) level = "Advanced";
    else if (score >= 6) level = "Intermediate";
    else if (score >= 3) level = "Elementary";
    setDone({ level, score });
    if (!user) return;
    setSaving(true);
    await supabase.from("level_test_results").insert({ user_id: user.id, score, total: QUESTIONS.length, level, answers: final as any });
    await supabase.from("profiles").update({ english_level: level, level_test_completed: true }).eq("id", user.id);
    setSaving(false);
  };

  const pick = (val: number | string) => {
    const next = [...answers];
    next[i] = val;
    setAnswers(next);
    if (q.type !== "open" && i < QUESTIONS.length - 1) setI(i + 1);
  };

  if (done) {
    return (
      <Layout>
        <div className="py-12 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold mb-2 ka">შენი დონე</h1>
          <div className="text-5xl font-extrabold bg-clip-text text-transparent gradient-hero my-4">{done.level}</div>
          <p className="text-muted-foreground mb-8 ka">ქულა: {done.score} / {QUESTIONS.length}</p>
          <Button variant="hero" size="xl" className="w-full ka" onClick={() => navigate("/dashboard")} disabled={saving}>
            დაწყება →
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="py-4">
        <div className="flex gap-1.5 mb-6">
          {QUESTIONS.map((_, idx) => (
            <div key={idx} className={cn("flex-1 h-2 rounded-full", idx <= i ? "bg-primary" : "bg-muted")} />
          ))}
        </div>
        <p className="text-sm text-muted-foreground mb-2 ka">კითხვა {i + 1} / {QUESTIONS.length}</p>
        <h2 className="text-xl font-bold mb-6">{q.q}</h2>
        {q.type === "open" ? (
          <>
            <Textarea
              className="min-h-32 rounded-2xl text-base"
              placeholder="Hi, my name is..."
              value={(answers[i] as string) ?? ""}
              onChange={(e) => { const n = [...answers]; n[i] = e.target.value; setAnswers(n); }}
            />
            <Button variant="hero" size="lg" className="w-full mt-4 ka" onClick={() => submit(answers)}>დასრულება</Button>
          </>
        ) : (
          <div className="grid gap-3">
            {q.options!.map((o, idx) => (
              <Button key={o} variant="soft" size="lg" className="w-full justify-start text-left" onClick={() => pick(idx)}>
                {o}
              </Button>
            ))}
          </div>
        )}
        {i > 0 && <Button variant="ghost" className="w-full mt-6 ka" onClick={() => setI(i - 1)}>← უკან</Button>}
      </div>
    </Layout>
  );
}
