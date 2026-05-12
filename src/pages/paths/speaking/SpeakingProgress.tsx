import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SpeakingShell from "./components/SpeakingShell";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, Repeat2, Volume2, Drama, Flame } from "lucide-react";
import { loadSpeakingStats, type SpeakingStats } from "./lib/tracker";

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
  const [streak, setStreak] = useState<SpeakingStats | null>(null);
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

      setStreak(await loadSpeakingStats(user.id));
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

          {/* Streak overview */}
          <div className="sp-card p-5 flex items-center gap-3">
            <Flame className="w-6 h-6 text-[hsl(20_85%_55%)] shrink-0" />
            <div>
              <div className="text-xl font-extrabold sp-text leading-none">
                🔥 {streak?.currentStreak ?? 0} Day Speaking Streak
              </div>
              <div className="text-[11px] sp-text-soft mt-1">
                Longest Streak: {streak?.longestStreak ?? 0}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Stat Icon={MessageCircle} value={dailyLessons.length} label="საუბრის გაკვეთილი" />
            <Stat Icon={Repeat2} value={phrasesPracticed} label="ფრაზა გაიმეორე" />
            <Stat Icon={Volume2} value={pronCount} label="გამოთქმის ცდა" />
            <Stat Icon={Drama} value={roleplays.length} label="როლური საუბარი" />
          </div>

          {/* Recent practice */}
          <Section title="ბოლო ვარჯიში">
            {(() => {
              type RecentItem = { date: string; type: string; topic: string; meta?: string };
              const items: RecentItem[] = [];
              for (const l of lessons.slice(0, 10)) {
                const isRoleplay = (l.level ?? "").includes("roleplay");
                const summary = (l.summary as any) ?? {};
                const topic = summary?.plan?.title_ka || summary?.plan?.topic || "—";
                const phrases = Number(summary?.phrases_practiced) || 0;
                const corrections = Array.isArray(summary?.mistakes) ? summary.mistakes.length : 0;
                items.push({
                  date: l.created_at,
                  type: isRoleplay ? "Roleplay" : "Daily Speaking Lesson",
                  topic,
                  meta: isRoleplay
                    ? undefined
                    : `${phrases} phrases${corrections ? ` · ${corrections} corrections` : ""}`,
                });
              }
              for (const p of pron.slice(0, 5)) {
                items.push({
                  date: p.created_at,
                  type: "Pronunciation",
                  topic: p.target_phrase,
                  meta: `${p.score}%`,
                });
              }
              items.sort((a, b) => +new Date(b.date) - +new Date(a.date));
              const recent = items.slice(0, 5);
              if (recent.length === 0) return <Empty />;
              return (
                <ul className="space-y-3 text-sm">
                  {recent.map((it, i) => (
                    <li key={i} className="sp-text">
                      <div className="font-semibold">
                        {new Date(it.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} — {it.type} — <span className="ka">{it.topic}</span>
                      </div>
                      {it.meta && <div className="text-xs sp-text-muted">{it.meta}</div>}
                    </li>
                  ))}
                </ul>
              );
            })()}
          </Section>

          {/* Topics practiced */}
          <Section title="გავარჯიშებული თემები">
            {(() => {
              const map = new Map<string, { count: number; last: string }>();
              for (const l of lessons) {
                const t = (l.summary as any)?.plan?.title_ka || (l.summary as any)?.plan?.topic;
                if (!t) continue;
                const cur = map.get(t);
                if (cur) {
                  cur.count += 1;
                  if (l.created_at > cur.last) cur.last = l.created_at;
                } else {
                  map.set(t, { count: 1, last: l.created_at });
                }
              }
              const arr = Array.from(map.entries()).sort((a, b) => b[1].count - a[1].count).slice(0, 8);
              if (!arr.length) return <Empty />;
              return (
                <ul className="space-y-2 text-sm">
                  {arr.map(([topic, info]) => (
                    <li key={topic} className="flex items-center justify-between gap-3">
                      <span className="ka sp-text truncate">{topic}</span>
                      <span className="text-xs sp-text-muted shrink-0">
                        ×{info.count} · {new Date(info.last).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </li>
                  ))}
                </ul>
              );
            })()}
          </Section>

          {pronCount > 0 && (
            <Section title={`საშუალო ქულა: ${avgScore}%`}>
              <ul className="space-y-2 text-sm">
                {recentPron.map((p, i) => (
                  <li key={i} className="flex items-center justify-between gap-3">
                    <span className="sp-text truncate">{p.target_phrase}</span>
                    <span className={`font-extrabold shrink-0 ${
                      p.score >= 80 ? "text-emerald-600" : p.score >= 50 ? "text-amber-600" : "text-rose-600"
                    }`}>{p.score}%</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {needsPractice.length > 0 && (
            <Section title="საჭიროებს ვარჯიშს">
              <ul className="space-y-2 text-sm">
                {needsPractice.map((p, i) => (
                  <li key={i} className="flex items-center justify-between gap-3">
                    <span className="sp-text truncate">{p.phrase}</span>
                    <span className="text-xs sp-text-muted shrink-0">{p.score}%</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

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
