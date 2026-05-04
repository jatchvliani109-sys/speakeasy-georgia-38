import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export default function ProgressPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ lessons: 0, words: 0, mistakes: 0, level: "—" });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [l, v, m, p] = await Promise.all([
        supabase.from("lessons").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("completed", true),
        supabase.from("vocabulary").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("mistakes").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("profiles").select("english_level").eq("id", user.id).maybeSingle(),
      ]);
      setStats({
        lessons: l.count ?? 0, words: v.count ?? 0, mistakes: m.count ?? 0,
        level: p.data?.english_level ?? "—",
      });
    })();
  }, [user]);

  const cards = [
    { label: "გაკვეთილები", value: stats.lessons, emoji: "💬" },
    { label: "ნასწავლი სიტყვები", value: stats.words, emoji: "📚" },
    { label: "გასწორებული შეცდომები", value: stats.mistakes, emoji: "✅" },
    { label: "მიმდინარე დონე", value: stats.level, emoji: "⭐" },
  ];

  return (
    <Layout>
      <h1 className="text-2xl font-extrabold mb-6 ka">პროგრესი</h1>
      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="p-5 rounded-3xl gradient-card border border-border shadow-card text-center">
            <div className="text-3xl mb-1">{c.emoji}</div>
            <div className="text-3xl font-extrabold">{c.value}</div>
            <div className="text-xs text-muted-foreground mt-1 ka">{c.label}</div>
          </div>
        ))}
      </div>
    </Layout>
  );
}
