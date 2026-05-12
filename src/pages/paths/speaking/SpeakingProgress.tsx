import { useEffect, useState } from "react";
import SpeakingShell from "./components/SpeakingShell";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, Repeat2, Volume2, Drama } from "lucide-react";

type LessonRow = {
  id: string;
  level: string | null;
  summary: any;
  created_at: string;
};

type MistakeRow = {
  original_sentence: string;
  corrected_sentence: string;
};

type PronRow = {
  target_phrase: string;
  score: number;
  missing_words: string[] | null;
  created_at: string;
};

export default function SpeakingProgress() {
  const { user } = useAuth();
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [mistakes, setMistakes] = useState<MistakeRow[]>([]);
  const [pron, setPron] = useState<PronRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: ls } = await supabase
        .from("lessons")
        .select("id, level, summary, created_at")
        .eq("user_id", user.id)
        .eq("completed", true)
        .order("created_at", { ascending: false })
        .limit(50);
      const speaking = (ls ?? []).filter((l) => (l.level ?? "").startsWith("speaking"));
      setLessons(speaking);

      const lessonIds = speaking.map((l) => l.id);
      if (lessonIds.length) {
        const { data: ms } = await supabase
          .from("mistakes")
          .select("original_sentence, corrected_sentence")
          .in("lesson_id", lessonIds)
          .limit(20);
        setMistakes(ms ?? []);
      }

      const { data: pr } = await supabase
        .from("pronunciation_attempts")
        .select("target_phrase, score, missing_words, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      setPron((pr ?? []) as PronRow[]);

      setLoading(false);
    })();
  }, [user]);

  const dailyLessons = lessons.filter((l) => !(l.level ?? "").includes("roleplay"));
  const roleplays = lessons.filter((l) => (l.level ?? "").includes("roleplay"));
  const phrasesPracticed = dailyLessons.reduce(
    (sum, l) => sum + (Number(l.summary?.phrases_practiced) || 0),
    0,
  );
  const recentTopics = lessons
    .map((l) => l.summary?.plan?.title_ka)
    .filter(Boolean)
    .slice(0, 5) as string[];

  const pronCount = pron.length;
  const avgScore = pron.length
    ? Math.round(pron.reduce((s, p) => s + (p.score || 0), 0) / pron.length)
    : 0;
  const recentPron = pron.slice(0, 5);
  // Phrases needing practice: low score or has missing words, dedup latest by phrase
  const needsPractice: { phrase: string; score: number }[] = [];
  const seen = new Set<string>();
  for (const p of pron) {
    if (seen.has(p.target_phrase)) continue;
    if (p.score < 75 || (p.missing_words && p.missing_words.length > 0)) {
      needsPractice.push({ phrase: p.target_phrase, score: p.score });
      seen.add(p.target_phrase);
    }
    if (needsPractice.length >= 5) break;
  }

  return (
    <SpeakingShell>
      <PageHeader title="ჩემი საუბრის ზრდა" backTo="/path/speaking" />
      {loading ? (
        <p className="text-center py-12 sp-text-muted ka">იტვირთება...</p>
      ) : (
        <div className="space-y-6 max-w-3xl mx-auto">
          <div>
            <span className="sp-eyebrow ka">პროგრესი</span>
            <h2 className="text-2xl font-extrabold ka sp-text mt-2 leading-snug">
              შენი საუბრის გზა
            </h2>
            <p className="text-sm sp-text-muted ka mt-1.5">
              ცოტ-ცოტა ყოველდღე — სწორედ ეს გვაძლევს შედეგს.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Stat Icon={MessageCircle} value={dailyLessons.length} label="საუბრის გაკვეთილი" />
            <Stat Icon={Repeat2} value={phrasesPracticed} label="ფრაზა გაიმეორე" />
            <Stat Icon={Volume2} value={pronCount} label="გამოთქმის ვარჯიში" />
            <Stat Icon={Drama} value={roleplays.length} label="როლური საუბარი" />
          </div>

          <Section title="ბოლო თემები">
            {recentTopics.length === 0 ? (
              <Empty />
            ) : (
              <ul className="space-y-2 text-sm">
                {recentTopics.map((t, i) => (
                  <li key={i} className="ka sp-text flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-[hsl(175_70%_38%)]" />
                    {t}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="გავრცელებული შეცდომები">
            {mistakes.length === 0 ? (
              <Empty />
            ) : (
              <ul className="space-y-3 text-sm">
                {mistakes.slice(0, 5).map((m, i) => (
                  <li key={i} className="pb-3 last:pb-0 sp-rule first:border-t-0 pt-3 first:pt-0">
                    <div className="line-through sp-text-soft">{m.original_sentence}</div>
                    <div className="font-semibold sp-text mt-0.5">→ {m.corrected_sentence}</div>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      )}
    </SpeakingShell>
  );
}

function Stat({ Icon, value, label }: { Icon: React.ComponentType<{ className?: string }>; value: number; label: string }) {
  return (
    <div className="sp-card p-4">
      <div className="w-9 h-9 rounded-lg sp-chip-teal flex items-center justify-center">
        <Icon className="w-4.5 h-4.5" />
      </div>
      <div className="text-3xl font-extrabold mt-3 sp-text leading-none">{value}</div>
      <div className="text-xs sp-text-muted ka mt-1.5">{label}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="sp-card p-5">
      <div className="font-bold ka mb-3 sp-text text-[15px]">{title}</div>
      {children}
    </div>
  );
}

function Empty() {
  return <div className="text-sm sp-text-soft ka">ჯერ არ გაქვს დაწყებული.</div>;
}
