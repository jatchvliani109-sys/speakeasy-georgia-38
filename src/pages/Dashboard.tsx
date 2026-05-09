import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Mic, BookOpen, AlertCircle, CheckCircle2, Flame, Star, Sparkles } from "lucide-react";

const TODAY_TOPIC_BY_LEVEL: Record<string, string[]> = {
  Beginner: ["Family", "Food", "School", "Colors", "Daily routine", "Hobbies", "Animals"],
  Elementary: ["Weekend plans", "My city", "Free time", "Ordering food", "Travel basics"],
  Intermediate: ["Opinions", "Storytelling", "Job interview", "Movies & books"],
  Advanced: ["Debate", "Cultural discussion", "Current events", "Presenting ideas"],
};

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function Dashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [todayLesson, setTodayLesson] = useState<any>(null);
  const [todayWords, setTodayWords] = useState(0);
  const [todayMistakes, setTodayMistakes] = useState(0);
  const [totalLessons, setTotalLessons] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (!prof) return;
      setProfile(prof);
      if (!prof.onboarding_completed) { navigate("/onboarding"); return; }
      if (!prof.level_test_completed) { navigate("/level-test"); return; }

      const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
      const iso = startOfDay.toISOString();

      const [lessons, todayLessons, todayVocab, todayMis] = await Promise.all([
        supabase.from("lessons").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("completed", true),
        supabase.from("lessons").select("id, summary, created_at").eq("user_id", user.id).eq("completed", true).gte("created_at", iso).order("created_at", { ascending: false }).limit(1),
        supabase.from("vocabulary").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", iso),
        supabase.from("mistakes").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", iso),
      ]);
      setTotalLessons(lessons.count ?? 0);
      setTodayLesson(todayLessons.data?.[0] ?? null);
      setTodayWords(todayVocab.count ?? 0);
      setTodayMistakes(todayMis.count ?? 0);
    })();
  }, [user, navigate]);

  const suggestedTopic = useMemo(() => {
    const pool = TODAY_TOPIC_BY_LEVEL[profile?.english_level] ?? TODAY_TOPIC_BY_LEVEL.Beginner;
    // stable per-day suggestion
    const day = new Date().getDate();
    return pool[day % pool.length];
  }, [profile?.english_level]);

  const completedToday = !!todayLesson;
  const lastTopic = todayLesson?.summary?.plan?.title_ka || todayLesson?.summary?.plan?.title_en;
  // Compute live streak: if last activity is older than yesterday, the streak is broken
  const liveStreak = (() => {
    const stored = profile?.streak ?? 0;
    if (!profile?.last_activity) return 0;
    const [ly, lm, ld] = String(profile.last_activity).slice(0, 10).split("-").map(Number);
    const last = new Date(ly, (lm || 1) - 1, ld || 1);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diff = Math.round((today.getTime() - last.getTime()) / 86400000);
    if (diff <= 1) return stored;
    return 0;
  })();
  const longest = Math.max((profile as any)?.longest_streak ?? 0, liveStreak);

  return (
    <Layout>
      <div className="py-2 space-y-5">
        <div>
          <p className="text-muted-foreground ka">კეთილი იყოს თქვენი მობრძანება 👋</p>
          <h1 className="text-2xl font-extrabold mt-1 ka">{profile?.display_name ?? "მოსწავლე"}</h1>
        </div>

        {/* Level + streak strip */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl gradient-hero text-primary-foreground shadow-warm">
            <div className="flex items-center gap-2 text-sm opacity-90 ka"><Star className="w-4 h-4" /> შენი დონე</div>
            <div className="text-2xl font-extrabold mt-1">{profile?.english_level ?? "—"}</div>
          </div>
          <div className="p-4 rounded-2xl bg-card border border-border shadow-card">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Flame className="w-4 h-4 text-accent" /> Streak</div>
            <div className="text-2xl font-extrabold mt-1">🔥 {liveStreak} Day{liveStreak === 1 ? "" : "s"}</div>
            {longest > 0 && <div className="text-[11px] text-muted-foreground mt-0.5">Longest: {longest}</div>}
          </div>
        </div>

        {/* Today card */}
        {completedToday ? (
          <div className="p-5 rounded-3xl bg-card border-2 border-success/40 shadow-card">
            <div className="flex items-center gap-2 text-success font-bold ka">
              <CheckCircle2 className="w-5 h-5" /> დღევანდელი გაკვეთილი დასრულებულია
            </div>
            {lastTopic && <div className="mt-2 ka text-sm text-muted-foreground">თემა: <span className="font-semibold text-foreground">{lastTopic}</span></div>}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="p-3 rounded-xl bg-secondary/60 text-center">
                <div className="text-xl font-extrabold">+{todayWords}</div>
                <div className="text-[11px] text-muted-foreground ka">ახალი სიტყვა</div>
              </div>
              <div className="p-3 rounded-xl bg-secondary/60 text-center">
                <div className="text-xl font-extrabold">+{todayMistakes}</div>
                <div className="text-[11px] text-muted-foreground ka">გასწორებული</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <Button asChild variant="hero" size="lg" className="w-full ka">
                <Link to="/lesson"><Mic /> კიდევ ვივარჯიშო</Link>
              </Button>
              <Button asChild variant="soft" size="lg" className="w-full ka">
                <Link to={`/summary/${todayLesson.id}`}>შეჯამება</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-5 rounded-3xl gradient-card border-2 border-primary/30 shadow-card">
            <div className="flex items-center gap-2 text-primary font-bold ka">
              <Sparkles className="w-5 h-5" /> დღევანდელი გაკვეთილი
            </div>
            <div className="mt-1 ka text-sm text-muted-foreground">შემოთავაზებული თემა: <span className="font-semibold text-foreground">{suggestedTopic}</span></div>
            <Button asChild variant="hero" size="xl" className="w-full ka mt-4">
              <Link to="/lesson"><Mic /> გაკვეთილის დაწყება</Link>
            </Button>
          </div>
        )}

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2">
          <Stat label="გაკვეთილი" value={totalLessons} />
          <Link to="/vocabulary"><Stat label="ჩემი სიტყვები" icon={BookOpen} actionable /></Link>
          <Link to="/mistakes"><Stat label="ჩემი შეცდომები" icon={AlertCircle} actionable /></Link>
        </div>

        <Button asChild variant="ghost" size="sm" className="w-full ka">
          <Link to="/progress">სრული პროგრესი →</Link>
        </Button>
      </div>
    </Layout>
  );
}

function Stat({ label, value, icon: Icon, actionable }: { label: string; value?: any; icon?: any; actionable?: boolean }) {
  return (
    <div className={`p-3 rounded-2xl border text-center h-full ${actionable ? "bg-card border-border hover:border-primary/40 transition-colors" : "bg-card border-border"}`}>
      {Icon ? <Icon className="w-5 h-5 mx-auto text-primary" /> : <div className="text-xl font-extrabold">{value}</div>}
      <div className="text-[11px] text-muted-foreground mt-1 ka">{label}</div>
    </div>
  );
}
