import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PathSwitcher from "@/components/PathSwitcher";
import SpeakingShell from "./components/SpeakingShell";
import { Headphones, Drama, LineChart, ArrowRight, CheckCircle2, Award } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { getEncouragementKa, dailySeed } from "./lib/encouragement";
import { useSpeakingProgress } from "./lib/useSpeakingProgress";
import DailyMissionCard from "./components/DailyMissionCard";
import ScenarioProgressMap from "./components/ScenarioProgressMap";


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
  const [stats, setStats] = useState<DashStats | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [lessonsRes, pronRes] = await Promise.all([
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
        {/* Header with CEFR */}
        <SpeakingHeader />

        {/* Daily Mission — most prominent */}
        <DailyMissionSection todayDone={todayDone} />

        {/* Today's quick recap if practiced */}
        {todayDone && stats?.todayLesson && (
          <section className="sp-card p-4">
            <div className="flex items-center gap-2 text-[hsl(33_75%_28%)] mb-2">
              <CheckCircle2 className="w-4 h-4" />
              <div className="font-semibold ka text-[13px]">დღეს უკვე ივარჯიშე</div>
            </div>
            <p className="ka text-sm sp-text">{getEncouragementKa(dailySeed())}</p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
              {stats?.todayLesson?.topic && (
                <div className="col-span-2 flex justify-between">
                  <dt className="sp-text-muted ka">თემა</dt>
                  <dd className="font-semibold sp-text truncate ml-2">{stats.todayLesson.topic}</dd>
                </div>
              )}
              <Row label_ka="ფრაზები" value={stats?.todayLesson?.phrases ?? 0} />
              <Row label_ka="მცდელობები" value={stats?.todayLesson?.prompts ?? 0} />
            </dl>
          </section>
        )}

        {/* Progression map preview */}
        <ProgressMapSection />

        {/* Compact stats */}
        <section className="grid grid-cols-3 gap-2">
          <Stat label="Lessons" value={stats?.lessonsCompleted ?? 0} />
          <Stat label="Phrases" value={stats?.phrasesPracticed ?? 0} />
          <Stat label="Attempts" value={stats?.pronAttempts ?? 0} />
        </section>


        {/* Other practice */}
        <section>
          <h3 className="text-xs font-bold ka sp-text-muted uppercase tracking-wider mb-2">სხვა ვარჯიშები</h3>
          <div className="sp-card divide-y divide-[hsl(38_55%_84%)] overflow-hidden">
            {SIDE_PATHS.map((p) => (
              <Link
                key={p.to}
                to={p.to}
                className="flex items-center gap-3 px-4 py-3 hover:bg-[hsl(40_91%_92%)] transition-colors"
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
    <div className="rounded-xl bg-[hsl(40_91%_93%)] border border-[hsl(38_55%_82%)] py-2.5 text-center">
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
