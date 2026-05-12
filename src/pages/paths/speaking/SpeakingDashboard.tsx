import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PathSwitcher from "@/components/PathSwitcher";
import SpeakingShell from "./components/SpeakingShell";
import { Headphones, Drama, LineChart, ArrowRight, Flame, CheckCircle2, Clock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { loadSpeakingStats, type SpeakingStats } from "./lib/tracker";
import { getEncouragementKa, dailySeed } from "./lib/encouragement";

const SIDE_PATHS = [
  { to: "/path/speaking/pronunciation", Icon: Headphones, title_ka: "მოსმენა და გამეორება", desc_ka: "მოკლე ფრაზები" },
  { to: "/path/speaking/roleplay", Icon: Drama, title_ka: "რეალური სიტუაციები", desc_ka: "დიალოგები" },
  { to: "/path/speaking/progress", Icon: LineChart, title_ka: "ჩემი პროგრესი", desc_ka: "ისტორია და სტატისტიკა" },
];

function localDateString(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type DashStats = {
  lessonsCompleted: number;
  phrasesPracticed: number;
  pronAttempts: number;
  todayLesson: {
    topic: string | null;
    phrases: number;
    prompts: number;
    corrections: number;
  } | null;
  hasUnfinishedLesson: boolean;
};

export default function SpeakingDashboard() {
  const { user } = useAuth();
  const [streak, setStreak] = useState<SpeakingStats | null>(null);
  const [stats, setStats] = useState<DashStats | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [streakRes, lessonsRes, pronRes] = await Promise.all([
        loadSpeakingStats(user.id),
        supabase
          .from("lessons")
          .select("id, level, summary, completed, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("pronunciation_attempts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
      ]);
      setStreak(streakRes);
      const lessons = (lessonsRes.data ?? []).filter((l) => (l.level ?? "").startsWith("speaking"));
      const dailyLessons = lessons.filter((l) => !(l.level ?? "").includes("roleplay"));
      const completed = dailyLessons.filter((l) => l.completed);
      const phrasesPracticed = completed.reduce(
        (sum, l) => sum + (Number((l.summary as any)?.phrases_practiced) || 0),
        0,
      );
      const today = localDateString();
      const todayDone = completed.find((l) => localDateString(new Date(l.created_at)) === today);
      const todayLesson = todayDone
        ? {
            topic: (todayDone.summary as any)?.plan?.title_ka ?? null,
            phrases: Number((todayDone.summary as any)?.phrases_practiced) || 0,
            prompts: Number((todayDone.summary as any)?.voice_prompts_completed) || 0,
            corrections: ((todayDone.summary as any)?.mistakes ?? []).length || 0,
          }
        : null;
      const hasUnfinishedLesson = dailyLessons.some((l) => !l.completed);
      setStats({
        lessonsCompleted: completed.length,
        phrasesPracticed,
        pronAttempts: pronRes.count ?? 0,
        todayLesson,
        hasUnfinishedLesson,
      });
    })();
  }, [user]);

  const todayDone = !!stats?.todayLesson;

  return (
    <SpeakingShell>
      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Header */}
        <header className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold ka sp-text leading-tight">საუბრის პრაქტიკა</h1>
            <p className="text-sm sp-text-muted ka mt-1">ივარჯიშე ინგლისურად ყოველდღე.</p>
          </div>
          <PathSwitcher />
        </header>

        {/* Today card */}
        <section className="sp-card p-5">
          {todayDone ? (
            <>
              <div className="flex items-center gap-2 text-[hsl(175_70%_30%)]">
                <CheckCircle2 className="w-5 h-5" />
                <div className="font-bold ka text-[15px]">დღეს გაკვეთილი შესრულებულია</div>
              </div>
              <p className="ka text-sm sp-text mt-2">{getEncouragementKa(dailySeed())}</p>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {stats?.todayLesson?.topic && (
                  <div className="col-span-2 flex justify-between">
                    <dt className="sp-text-muted ka">თემა</dt>
                    <dd className="font-semibold sp-text truncate ml-2">{stats.todayLesson.topic}</dd>
                  </div>
                )}
                <Row label_ka="ფრაზები" value={stats?.todayLesson?.phrases ?? 0} />
                <Row label_ka="მცდელობები" value={stats?.todayLesson?.prompts ?? 0} />
                <Row label_ka="გასწორებები" value={stats?.todayLesson?.corrections ?? 0} />
              </dl>
              <div className="flex gap-2 mt-5">
                <Link
                  to="/path/speaking/daily"
                  className="sp-btn-primary inline-flex items-center justify-center gap-2 rounded-xl h-11 px-5 text-sm font-bold ka flex-1"
                >
                  ივარჯიშე კიდევ
                </Link>
                <Link
                  to="/path/speaking/daily?next=1"
                  className="inline-flex items-center justify-center gap-2 rounded-xl h-11 px-5 text-sm font-bold ka border border-[hsl(220_22%_88%)] sp-text hover:bg-[hsl(40_40%_96%)]"
                >
                  შემდეგი თემა
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 sp-text">
                <Clock className="w-5 h-5 text-[hsl(175_70%_38%)]" />
                <div className="font-bold ka text-[15px]">დღევანდელი გაკვეთილი მზადაა</div>
              </div>
              <div className="mt-3 text-xs sp-text-muted ka">~ 7 წუთი · 4 ფრაზა · 3 კითხვა</div>
              <Link
                to="/path/speaking/daily"
                className="sp-btn-primary mt-5 inline-flex items-center justify-center gap-2 rounded-xl h-11 px-5 text-sm font-bold ka w-full"
              >
                {stats?.hasUnfinishedLesson ? "გაკვეთილის გაგრძელება" : "გაკვეთილის დაწყება"}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </>
          )}
        </section>

        {/* Compact stats */}
        <section className="grid grid-cols-4 gap-2">
          <Stat label={<span className="inline-flex items-center gap-1"><Flame className="w-3 h-3" />Streak</span>} value={`${streak?.currentStreak ?? 0}`} />
          <Stat label="Lessons" value={stats?.lessonsCompleted ?? 0} />
          <Stat label="Phrases" value={stats?.phrasesPracticed ?? 0} />
          <Stat label="Attempts" value={stats?.pronAttempts ?? 0} />
        </section>

        {/* Other practice */}
        <section>
          <h3 className="text-xs font-bold ka sp-text-muted uppercase tracking-wider mb-2">სხვა ვარჯიშები</h3>
          <div className="sp-card divide-y divide-[hsl(220_22%_92%)] overflow-hidden">
            {SIDE_PATHS.map((p) => (
              <Link
                key={p.to}
                to={p.to}
                className="flex items-center gap-3 px-4 py-3 hover:bg-[hsl(40_40%_96%)] transition-colors"
              >
                <div className="w-9 h-9 rounded-lg sp-chip-teal flex items-center justify-center shrink-0">
                  <p.Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold ka sp-text text-sm">{p.title_ka}</div>
                  <div className="text-[11px] sp-text-muted ka">{p.desc_ka}</div>
                </div>
                <ArrowRight className="w-4 h-4 sp-text-soft" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </SpeakingShell>
  );
}

function Stat({ label, value }: { label: React.ReactNode; value: number | string }) {
  return (
    <div className="rounded-xl bg-[hsl(40_45%_96%)] border border-[hsl(40_30%_88%)] py-2.5 text-center">
      <div className="text-lg font-extrabold sp-text leading-none">{value}</div>
      <div className="text-[10px] sp-text-muted mt-1">{label}</div>
    </div>
  );
}

function Row({ label_ka, value }: { label_ka: string; value: number }) {
  return (
    <div className="flex justify-between">
      <dt className="sp-text-muted ka">{label_ka}</dt>
      <dd className="font-semibold sp-text">{value}</dd>
    </div>
  );
}
