import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export default function Vocabulary() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    if (!user) return;
    supabase.from("vocabulary").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setItems(data ?? []));
  }, [user]);

  return (
    <Layout>
      <h1 className="text-2xl font-extrabold mb-4 ka">ჩემი სიტყვები</h1>
      {items.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground ka">ჯერ არ გაქვს სიტყვები. დაიწყე გაკვეთილი! ✨</p>
      ) : (
        <div className="space-y-2">
          {items.map((w) => (
            <div key={w.id} className="p-4 rounded-2xl gradient-card border border-border shadow-card">
              <div className="flex items-baseline justify-between gap-2">
                <div className="font-bold text-lg">{w.english_word}</div>
                {w.difficulty && <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{w.difficulty}</span>}
              </div>
              <div className="text-muted-foreground ka">{w.georgian_meaning}</div>
              {w.example_sentence && <div className="text-sm italic mt-2 text-foreground/70">"{w.example_sentence}"</div>}
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
