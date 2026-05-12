import { useEffect, useState } from "react";
import SpeakingShell from "./components/SpeakingShell";
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
    <SpeakingShell>
      <PageHeader title="ჩემი საუბრის პროგრესი" backTo="/path/speaking" />
      {loading ? (
        <p className="text-center py-12 sp-text-muted ka">იტვირთება...</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Stat emoji="💬" value={dailyLessons.length} label="საუბრის გაკვეთილი" tone="purple" />
            <Stat emoji="🗣️" value={phrasesPracticed} label="ფრაზა გაიმეორე" tone="blue" />
            <Stat emoji="🔊" value={pronCount} label="გამოთქმის ვარჯიში" tone="teal" />
            <Stat emoji="🎭" value={roleplays.length} label="როლური საუბარი" tone="indigo" />
          </div>

          <Section title="ბოლო თემები">
            {recentTopics.length === 0 ? (
              <Empty />
            ) : (
              <ul className="space-y-1 text-sm">
                {recentTopics.map((t, i) => (
                  <li key={i} className="ka sp-text">• {t}</li>
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
                    <div className="line-through sp-text-muted">{m.original_sentence}</div>
                    <div className="font-semibold sp-text">→ {m.corrected_sentence}</div>
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

const TONE: Record<string, string> = {
  purple: "from-purple-500/30 to-purple-500/0",
  blue: "from-blue-500/30 to-blue-500/0",
  teal: "from-teal-400/30 to-teal-400/0",
  indigo: "from-indigo-500/30 to-indigo-500/0",
};

function Stat({ emoji, value, label, tone = "purple" }: { emoji: string; value: number; label: string; tone?: string }) {
  return (
    <div className={`sp-card p-4 relative overflow-hidden`}>
      <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full bg-gradient-to-br ${TONE[tone]} blur-xl`} />
      <div className="relative">
        <div className="text-2xl">{emoji}</div>
        <div className="text-2xl font-extrabold mt-1 sp-text">{value}</div>
        <div className="text-xs sp-text-muted ka">{label}</div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="sp-card p-4">
      <div className="font-bold ka mb-2 sp-text">{title}</div>
      {children}
    </div>
  );
}

function Empty() {
  return <div className="text-sm sp-text-muted ka">ჯერ არ გაქვს დაწყებული.</div>;
}
