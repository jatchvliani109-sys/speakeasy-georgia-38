import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BookOpen, AlertCircle, Sparkles, Check, Repeat } from "lucide-react";

type WordRow = { id: string; english_word: string; georgian_meaning: string; example_sentence: string | null; status: string };

export default function Summary() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [words, setWords] = useState<WordRow[]>([]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: lesson } = await supabase.from("lessons").select("summary").eq("id", id).maybeSingle();
      setData(lesson?.summary);
      const { data: vocab } = await supabase.from("vocabulary").select("id, english_word, georgian_meaning, example_sentence, status").eq("lesson_id", id);
      setWords((vocab as WordRow[]) ?? []);
    })();
  }, [id]);

  const setWordStatus = async (wid: string, status: string) => {
    setWords((prev) => prev.map((w) => (w.id === wid ? { ...w, status } : w)));
    const { error } = await supabase.from("vocabulary").update({ status }).eq("id", wid);
    if (error) toast.error("ვერ შეინახა");
    else toast.success(status === "learned" ? "შენახულია ნასწავლად ✓" : "მონიშნულია გასამეორებლად");
  };

  if (!data) return <Layout><p className="text-center py-12 text-muted-foreground ka">იტვირთება...</p></Layout>;

  const Section = ({ title, icon: Icon, children }: any) => (
    <section className="p-5 rounded-2xl gradient-card border border-border shadow-card">
      <h3 className="font-bold text-lg mb-3 ka flex items-center gap-2">
        {Icon && <Icon className="w-5 h-5 text-primary" />}
        {title}
      </h3>
      {children}
    </section>
  );

  return (
    <Layout>
      <div className="space-y-4 py-2">
        <div className="text-center py-4">
          <div className="text-5xl mb-2">🌟</div>
          <h1 className="text-2xl font-extrabold ka">დიდი მადლობა!</h1>
          {data.encouragement_ka && <p className="text-muted-foreground mt-2 ka">{data.encouragement_ka}</p>}
        </div>

        {words.length > 0 && (
          <Section title="ახალი სიტყვები" icon={BookOpen}>
            <div className="space-y-2">
              {words.map((w) => (
                <div key={w.id} className="p-3 bg-secondary/50 rounded-xl">
                  <div className="font-bold">{w.english_word} <span className="text-muted-foreground font-normal ka">— {w.georgian_meaning}</span></div>
                  {w.example_sentence && <div className="text-sm text-muted-foreground italic mt-1">"{w.example_sentence}"</div>}
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant={w.status === "learned" ? "hero" : "soft"} className="flex-1 ka" onClick={() => setWordStatus(w.id, "learned")}>
                      <Check className="w-4 h-4" /> ნასწავლი
                    </Button>
                    <Button size="sm" variant={w.status === "review" ? "hero" : "soft"} className="flex-1 ka" onClick={() => setWordStatus(w.id, "review")}>
                      <Repeat className="w-4 h-4" /> გავიმეორო
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Button asChild variant="ghost" size="sm" className="w-full mt-3 ka">
              <Link to="/vocabulary">ყველა სიტყვის ნახვა →</Link>
            </Button>
          </Section>
        )}

        {data.mistakes?.length > 0 && (
          <Section title="შეცდომები და გასწორება" icon={AlertCircle}>
            <div className="space-y-2">
              {data.mistakes.map((m: any, i: number) => (
                <div key={i} className="p-3 bg-secondary/50 rounded-xl">
                  <div>❌ <span className="line-through text-destructive">{m.original_sentence}</span></div>
                  <div className="font-bold text-success">✅ {m.corrected_sentence}</div>
                  {m.explanation_ka && <div className="text-sm text-muted-foreground mt-1 ka">🇬🇪 {m.explanation_ka}</div>}
                </div>
              ))}
            </div>
            <Button asChild variant="ghost" size="sm" className="w-full mt-3 ka">
              <Link to="/mistakes">ყველა შეცდომის ნახვა →</Link>
            </Button>
          </Section>
        )}

        {data.useful_phrases?.length > 0 && (
          <Section title="სასარგებლო ფრაზები" icon={Sparkles}>
            <ul className="space-y-1">
              {data.useful_phrases.map((p: string, i: number) => <li key={i}>• {p}</li>)}
            </ul>
          </Section>
        )}

        {data.homework_ka && (
          <Section title="საშინაო დავალება">
            <p className="ka">{data.homework_ka}</p>
          </Section>
        )}

        {data.plan?.title_en && (
          <div className="text-center text-xs text-muted-foreground ka">გაკვეთილი: {data.plan.title_en}</div>
        )}

        <Button asChild variant="hero" size="lg" className="w-full ka">
          <Link to="/dashboard">დაბრუნება მთავარ გვერდზე</Link>
        </Button>
      </div>
    </Layout>
  );
}
