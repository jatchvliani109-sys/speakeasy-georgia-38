import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, AlertCircle, MessageCircle, Star, ChevronRight } from "lucide-react";
import PageHeader from "@/components/PageHeader";

export default function ProgressPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ lessons: 0, words: 0, mistakes: 0, level: "—" });
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [l, v, m, p, rec] = await Promise.all([
        supabase.from("lessons").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("completed", true),
        supabase.from("vocabulary").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("mistakes").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("profiles").select("english_level").eq("id", user.id).maybeSingle(),
        supabase.from("lessons").select("id, created_at, summary, level").eq("user_id", user.id).eq("completed", true).order("created_at", { ascending: false }).limit(3),
      ]);
      setStats({
        lessons: l.count ?? 0, words: v.count ?? 0, mistakes: m.count ?? 0,
        level: p.data?.english_level ?? "—",
      });
      setRecent(rec.data ?? []);
    })();
  }, [user]);

  const cards = [
    { to: "/progress", label: "გაკვეთილები", value: stats.lessons, icon: MessageCircle, clickable: false },
    { to: "/vocabulary", label: "ნავარჯიშები სიტყვები", value: stats.words, icon: BookOpen, clickable: true },
    { to: "/mistakes", label: "გასწორებული შეცდომები", value: stats.mistakes, icon: AlertCircle, clickable: true },
    { to: "/progress", label: "მიმდინარე დონე", value: stats.level, icon: Star, clickable: false },
  ];

  return (
    <Layout>
      <h1 className="text-2xl font-extrabold mb-4 ka">პროგრესი</h1>

      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => {
          const Inner = (
            <div className="p-4 rounded-3xl gradient-card border border-border shadow-card text-center h-full">
              <c.icon className="w-6 h-6 mx-auto text-primary" />
              <div className="text-2xl font-extrabold mt-1">{c.value}</div>
              <div className="text-xs text-muted-foreground mt-1 ka">{c.label}</div>
            </div>
          );
          return c.clickable ? (
            <Link key={c.label} to={c.to}>{Inner}</Link>
          ) : (
            <div key={c.label}>{Inner}</div>
          );
        })}
      </div>

      <h2 className="text-lg font-bold mt-6 mb-3 ka">ბოლო გაკვეთილები</h2>
      {recent.length === 0 ? (
        <p className="text-sm text-muted-foreground ka">ჯერ არ გაქვს დასრულებული გაკვეთილი.</p>
      ) : (
        <div className="space-y-2">
          {recent.map((l) => {
            const title = l.summary?.plan?.title_ka || l.summary?.plan?.title_en || "გაკვეთილი";
            const wordsCount = l.summary?.new_words?.length ?? 0;
            return (
              <Link key={l.id} to={`/summary/${l.id}`} className="block">
                <div className="p-4 rounded-2xl bg-card border border-border shadow-card flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold ka truncate">{title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 ka">
                      {new Date(l.created_at).toLocaleDateString("ka-GE")} · {wordsCount} სიტყვა
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
