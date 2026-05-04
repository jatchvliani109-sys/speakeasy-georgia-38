import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export default function Mistakes() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    if (!user) return;
    supabase.from("mistakes").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setItems(data ?? []));
  }, [user]);

  return (
    <Layout>
      <h1 className="text-2xl font-extrabold mb-4 ka">ჩემი შეცდომები</h1>
      {items.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground ka">ჯერ შეცდომები არ გაქვს. ყოჩაღ! 🎉</p>
      ) : (
        <div className="space-y-2">
          {items.map((m) => (
            <div key={m.id} className="p-4 rounded-2xl gradient-card border border-border shadow-card">
              <div className="line-through text-destructive">{m.original_sentence}</div>
              <div className="font-bold text-success mt-1">✓ {m.corrected_sentence}</div>
              {m.explanation_ka && <div className="text-sm text-muted-foreground mt-2 ka">{m.explanation_ka}</div>}
              <div className="text-xs text-muted-foreground/70 mt-2">{new Date(m.created_at).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
