import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Check, Repeat, Trash2 } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import SpeakButton from "@/components/SpeakButton";

type Word = {
  id: string;
  english_word: string;
  georgian_meaning: string;
  example_sentence: string | null;
  status: string;
  created_at: string;
};

const FILTERS = [
  { key: "all", label: "ყველა" },
  { key: "new", label: "ახალი" },
  { key: "practicing", label: "ვვარჯიშობ" },
  { key: "review", label: "გასამეორებელი" },
  { key: "learned", label: "ნასწავლი" },
];

const statusBadge: Record<string, { label: string; className: string }> = {
  new: { label: "ახალი", className: "bg-primary/15 text-primary" },
  practicing: { label: "ვვარჯიშობ", className: "bg-accent/20 text-accent-foreground" },
  review: { label: "გასამეორებელი", className: "bg-destructive/15 text-destructive" },
  learned: { label: "ნასწავლი", className: "bg-success/20 text-success" },
};

export default function Vocabulary() {
  const { user } = useAuth();
  const [items, setItems] = useState<Word[]>([]);
  const [filter, setFilter] = useState("all");

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("vocabulary").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setItems((data as Word[]) ?? []);
  };

  useEffect(() => { load(); }, [user]);

  const updateStatus = async (id: string, status: string) => {
    setItems((prev) => prev.map((w) => (w.id === id ? { ...w, status } : w)));
    const { error } = await supabase.from("vocabulary").update({ status }).eq("id", id);
    if (error) toast.error("ვერ შეინახა");
  };

  const remove = async (id: string) => {
    setItems((prev) => prev.filter((w) => w.id !== id));
    const { error } = await supabase.from("vocabulary").delete().eq("id", id);
    if (error) { toast.error("ვერ წაიშალა"); load(); }
  };

  const filtered = filter === "all" ? items : items.filter((w) => (w.status || "new") === filter);

  return (
    <Layout>
      <PageHeader title="ჩემი სიტყვები" backTo="/dashboard" />
      <div className="flex gap-2 overflow-x-auto pb-3 -mx-1 px-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold ka transition-colors ${
              filter === f.key ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground ka">სიტყვები არ მოიძებნა.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((w) => {
            const status = (w.status || "new") as keyof typeof statusBadge;
            const b = statusBadge[status] ?? statusBadge.new;
            const isReview = status === "review";
            return (
              <div
                key={w.id}
                className={`p-4 rounded-2xl border shadow-card ${
                  isReview ? "bg-destructive/5 border-destructive/30" : "gradient-card border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <SpeakButton text={w.english_word} />
                      <div className="font-bold text-lg break-words">{w.english_word}</div>
                    </div>
                    <div className="text-muted-foreground ka">{w.georgian_meaning}</div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ka shrink-0 ${b.className}`}>{b.label}</span>
                </div>
                {w.example_sentence && (
                  <div className="flex items-start gap-2 mt-2">
                    <SpeakButton text={w.example_sentence} />
                    <div className="text-sm italic text-foreground/70">"{w.example_sentence}"</div>
                  </div>
                )}
                <div className="text-[11px] text-muted-foreground/70 mt-2">
                  {new Date(w.created_at).toLocaleDateString("ka-GE")}
                </div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="soft" className="flex-1 ka" onClick={() => updateStatus(w.id, "learned")}>
                    <Check className="w-4 h-4" /> ნასწავლი
                  </Button>
                  <Button size="sm" variant="soft" className="flex-1 ka" onClick={() => updateStatus(w.id, "review")}>
                    <Repeat className="w-4 h-4" /> გასამეორებელი
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(w.id)} aria-label="წაშლა">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
