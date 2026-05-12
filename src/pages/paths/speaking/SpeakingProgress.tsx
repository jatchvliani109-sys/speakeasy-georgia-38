import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

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

export default function SpeakingProgress() {
  const { user } = useAuth();
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [mistakes, setMistakes] = useState<MistakeRow[]>([]);
  const [pronCount, setPronCount] = useState(0);
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

      try {
        const raw = localStorage.getItem(`speaking:pronunciation:${user.id}`);
        if (raw) {
          const obj = JSON.parse(raw) as Record<string, boolean>;
          setPronCount(Object.values(obj).filter(Boolean).length);
        }
      } catch {}

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

  return (
    <Layout>
      <PageHeader title="ჩემი საუბრის პროგრესი" backTo="/path/speaking" />
      {loading ? (
        <p className="text-center py-12 text-muted-foreground ka">იტვირთება...</p>
      ) : (
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <Stat emoji="💬" value={dailyLessons.length} label="საუბრის გაკვეთილი" />
            <Stat emoji="🗣️" value={phrasesPracticed} label="ფრაზა გაიმეორე" />
            <Stat emoji="🔊" value={pronCount} label="გამოთქმის ვარჯიში" />
            <Stat emoji="🎭" value={roleplays.length} label="როლური საუბარი" />
          </div>

          <Section title="ბოლო თემები">
            {recentTopics.length === 0 ? (
              <Empty />
            ) : (
              <ul className="space-y-1 text-sm">
                {recentTopics.map((t, i) => (
                  <li key={i} className="ka">• {t}</li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="გავრცელებული შეცდომები">
            {mistakes.length === 0 ? (
              <Empty />
            ) : (
              <ul className="space-y-2 text-sm">
                {mistakes.slice(0, 5).map((m, i) => (
                  <li key={i}>
                    <div className="line-through text-muted-foreground">{m.original_sentence}</div>
                    <div className="font-semibold">→ {m.corrected_sentence}</div>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      )}
    </Layout>
  );
}

function Stat({ emoji, value, label }: { emoji: string; value: number; label: string }) {
  return (
    <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-400/30 shadow-card">
      <div className="text-2xl">{emoji}</div>
      <div className="text-2xl font-extrabold mt-1">{value}</div>
      <div className="text-xs text-muted-foreground ka">{label}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-2xl bg-card border border-border shadow-card">
      <div className="font-bold ka mb-2">{title}</div>
      {children}
    </div>
  );
}

function Empty() {
  return <div className="text-sm text-muted-foreground ka">ჯერ არ გაქვს დაწყებული.</div>;
}
