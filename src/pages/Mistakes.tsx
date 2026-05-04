import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";

type Mistake = {
  id: string;
  original_sentence: string;
  corrected_sentence: string;
  explanation_ka: string | null;
  tag: string;
  created_at: string;
};

const TAGS = [
  { key: "all", label: "ყველა" },
  { key: "grammar", label: "გრამატიკა" },
  { key: "vocabulary", label: "ლექსიკა" },
  { key: "structure", label: "წინადადების სტრუქტურა" },
];

const tagBadge: Record<string, string> = {
  grammar: "bg-primary/15 text-primary",
  vocabulary: "bg-accent/20 text-accent-foreground",
  structure: "bg-success/20 text-success",
};
const tagLabel: Record<string, string> = {
  grammar: "გრამატიკა",
  vocabulary: "ლექსიკა",
  structure: "სტრუქტურა",
};

export default function Mistakes() {
  const { user } = useAuth();
  const [items, setItems] = useState<Mistake[]>([]);
  const [filter, setFilter] = useState("all");

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("mistakes").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setItems((data as Mistake[]) ?? []);
  };

  useEffect(() => { load(); }, [user]);

  const remove = async (id: string) => {
    setItems((prev) => prev.filter((m) => m.id !== id));
    const { error } = await supabase.from("mistakes").delete().eq("id", id);
    if (error) { toast.error("ვერ წაიშალა"); load(); }
  };

  const filtered = filter === "all" ? items : items.filter((m) => (m.tag || "grammar") === filter);

  return (
    <Layout>
      <h1 className="text-2xl font-extrabold mb-3 ka">ჩემი შეცდომები</h1>
      <div className="flex gap-2 overflow-x-auto pb-3 -mx-1 px-1">
        {TAGS.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold ka transition-colors ${
              filter === t.key ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground ka">შეცდომები არ მოიძებნა. ყოჩაღ! 🎉</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((m) => {
            const tag = (m.tag || "grammar") as keyof typeof tagBadge;
            return (
              <div key={m.id} className="p-4 rounded-2xl gradient-card border border-border shadow-card">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ka ${tagBadge[tag] ?? tagBadge.grammar}`}>
                    {tagLabel[tag] ?? tagLabel.grammar}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => remove(m.id)} aria-label="წაშლა">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div>❌ <span className="line-through text-destructive">{m.original_sentence}</span></div>
                <div className="font-bold text-success mt-1">✅ {m.corrected_sentence}</div>
                {m.explanation_ka && (
                  <div className="text-sm text-muted-foreground mt-2 ka">🇬🇪 {m.explanation_ka}</div>
                )}
                <div className="text-[11px] text-muted-foreground/70 mt-2">
                  {new Date(m.created_at).toLocaleDateString("ka-GE")}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
