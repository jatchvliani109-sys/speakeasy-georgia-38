import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PathSwitcher from "@/components/PathSwitcher";
import SpeakingShell from "./components/SpeakingShell";
import { Mic, Headphones, Drama, LineChart, ArrowRight, Clock, Target, Flame } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { loadSpeakingStats, type SpeakingStats } from "./lib/tracker";

type SidePath = {
  to: string;
  Icon: React.ComponentType<{ className?: string }>;
  title_ka: string;
  desc_ka: string;
};

const SIDE_PATHS: SidePath[] = [
  {
    to: "/path/speaking/pronunciation",
    Icon: Headphones,
    title_ka: "მოუსმინე და გაიმეორე",
    desc_ka: "მოკლე ფრაზები სწორი გამოთქმისთვის.",
  },
  {
    to: "/path/speaking/roleplay",
    Icon: Drama,
    title_ka: "რეალური სიტუაციები",
    desc_ka: "ივარჯიშე ცხოვრებისეულ დიალოგებში.",
  },
  {
    to: "/path/speaking/progress",
    Icon: LineChart,
    title_ka: "ჩემი საუბრის ზრდა",
    desc_ka: "ნახე რას ისწავლე ბოლო დღეებში.",
  },
];

type DashStats = {
  lessonsCompleted: number;
  phrasesPracticed: number;
  pronAttempts: number;
  roleplaysCompleted: number;
  lastTopic: string | null;
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
      const completed = lessons.filter((l) => l.completed);
      const dailyCompleted = completed.filter((l) => !(l.level ?? "").includes("roleplay"));
      const roleplaysCompleted = completed.filter((l) => (l.level ?? "").includes("roleplay")).length;
      const phrasesPracticed = dailyCompleted.reduce(
        (sum, l) => sum + (Number((l.summary as any)?.phrases_practiced) || 0),
        0,
      );
      const lastTopic = (completed[0]?.summary as any)?.plan?.title_ka ?? null;
      const hasUnfinishedLesson = lessons.some((l) => !l.completed && !(l.level ?? "").includes("roleplay"));
      setStats({
        lessonsCompleted: dailyCompleted.length,
        phrasesPracticed,
        pronAttempts: pronRes.count ?? 0,
        roleplaysCompleted,
        lastTopic,
        hasUnfinishedLesson,
      });
    })();
  }, [user]);

  const continueLabel = stats?.hasUnfinishedLesson
    ? "Continue Lesson"
    : streak?.practicedToday
      ? "Practice more"
      : "Start Today's Speaking Lesson";

  return (
    <SpeakingShell>
      <div className="space-y-8 max-w-3xl mx-auto">
        {/* Section header */}
        <header className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <span className="sp-eyebrow ka">საუბრის ვარჯიში</span>
            <h1 className="text-[26px] sm:text-3xl font-extrabold mt-2 ka sp-text leading-tight">
              ისაუბრე ინგლისურად — ყოველდღე ცოტა.
            </h1>
            <p className="text-sm sp-text-muted ka mt-2 max-w-md">
              შენი პირადი მწვრთნელი ქართველი დამწყებებისთვის. მოკლე გაკვეთილები, რეალური დიალოგები და ნაზი გასწორებები.
            </p>
          </div>
          <PathSwitcher />
        </header>

        {/* Speaking progress snapshot */}
        {user && (
          <section className="sp-card p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-[hsl(20_85%_55%)]" />
              <div>
                <div className="text-2xl font-extrabold sp-text leading-none">
                  🔥 {streak?.currentStreak ?? 0} Day Speaking Streak
                </div>
                <div className="text-[11px] sp-text-soft mt-1">
                  Longest: {streak?.longestStreak ?? 0}
                  {streak?.practicedToday && <> · <span className="text-[hsl(175_70%_38%)] font-semibold ka">დღეს ნავარჯიშები</span></>}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 text-center">
              <MiniStat label_ka="გაკვეთილი" value={stats?.lessonsCompleted ?? 0} />
              <MiniStat label_ka="ფრაზა" value={stats?.phrasesPracticed ?? 0} />
              <MiniStat label_ka="გამოთქმის ცდა" value={stats?.pronAttempts ?? 0} />
              <MiniStat label_ka="როლი" value={stats?.roleplaysCompleted ?? 0} />
            </div>
            {stats?.lastTopic && (
              <div className="mt-4 text-xs sp-text-muted ka">
                ბოლო თემა: <span className="font-semibold sp-text">{stats.lastTopic}</span>
              </div>
            )}
            <Link
              to="/path/speaking/daily"
              className="sp-btn-primary mt-5 inline-flex items-center justify-center gap-2 rounded-xl h-11 px-5 text-sm font-bold"
            >
              {continueLabel}
              <ArrowRight className="w-4 h-4" />
            </Link>
            {streak?.practicedToday && (
              <div className="mt-3 text-xs ka text-[hsl(175_70%_30%)]">
                ✅ Today's speaking practice completed — Nice work, you kept your Streak alive.
              </div>
            )}
          </section>
        )}

        {/* Today's mission — the one premium block */}
        <section className="sp-card-hero p-6 sm:p-7 relative overflow-hidden">
          <div className="flex items-center justify-between gap-2 mb-4">
            <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider ka text-[hsl(175_60%_75%)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(175_70%_55%)] animate-pulse" />
              დღევანდელი მისია
            </span>
            <span className="text-[11px] ka sp-text-muted">~ 7 წუთი</span>
          </div>
          <h2 className="text-2xl sm:text-[26px] font-extrabold ka sp-text leading-snug">
            ისწავლე საუბარი ყოველდღიურ თემაზე
          </h2>
          <p className="text-sm sp-text-muted ka mt-2 max-w-md">
            4 ახალი ფრაზა, ხმოვანი გამეორება და 3 მოკლე კითხვა AI მწვრთნელისგან.
          </p>

          <div className="flex flex-wrap gap-4 mt-5 text-[13px]">
            <span className="inline-flex items-center gap-1.5 sp-text-muted ka">
              <Target className="w-3.5 h-3.5 text-[hsl(175_70%_55%)]" /> 4 ფრაზა
            </span>
            <span className="inline-flex items-center gap-1.5 sp-text-muted ka">
              <Mic className="w-3.5 h-3.5 text-[hsl(175_70%_55%)]" /> ხმოვანი ვარჯიში
            </span>
            <span className="inline-flex items-center gap-1.5 sp-text-muted ka">
              <Clock className="w-3.5 h-3.5 text-[hsl(175_70%_55%)]" /> 3 კითხვა
            </span>
          </div>

          <Link
            to="/path/speaking/daily"
            className="sp-btn-teal mt-6 inline-flex items-center justify-center gap-2 rounded-xl h-12 px-6 text-[15px] font-bold ka"
          >
            მისიის დაწყება
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>

        {/* Practice areas — editorial list, not a card grid */}
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h3 className="text-base font-bold ka sp-text">სხვა ვარჯიშები</h3>
            <span className="text-xs sp-text-soft ka">აირჩიე შენი რიტმი</span>
          </div>
          <div className="sp-card divide-y divide-[hsl(220_22%_92%)] overflow-hidden">
            {SIDE_PATHS.map((p) => (
              <Link
                key={p.to}
                to={p.to}
                className="flex items-center gap-4 px-5 py-4 hover:bg-[hsl(40_40%_96%)] transition-colors"
              >
                <div className="w-11 h-11 rounded-xl sp-chip-teal flex items-center justify-center shrink-0">
                  <p.Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold ka sp-text text-[15px]">{p.title_ka}</div>
                  <div className="text-xs sp-text-muted ka mt-0.5">{p.desc_ka}</div>
                </div>
                <ArrowRight className="w-4 h-4 sp-text-soft" />
              </Link>
            ))}
          </div>
        </section>

        {/* Soft footer note — local feel */}
        <p className="text-xs sp-text-soft ka text-center pt-2">
          შექმნილია ქართველებისთვის · ისაუბრე თამამად, ნელ-ნელა გამოგივა.
        </p>
      </div>
    </SpeakingShell>
  );
}

function MiniStat({ label_ka, value }: { label_ka: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-[hsl(40_45%_96%)] border border-[hsl(40_30%_88%)] py-3">
      <div className="text-xl font-extrabold sp-text leading-none">{value}</div>
      <div className="text-[10px] sp-text-muted ka mt-1">{label_ka}</div>
    </div>
  );
}
