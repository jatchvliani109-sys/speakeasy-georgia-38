import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export default function Summary() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    if (!id) return;
    supabase.from("lessons").select("summary").eq("id", id).maybeSingle().then(({ data }) => setData(data?.summary));
  }, [id]);

  if (!data) return <Layout><p className="text-center py-12 text-muted-foreground ka">იტვირთება...</p></Layout>;

  const Section = ({ title, children }: any) => (
    <section className="p-5 rounded-2xl gradient-card border border-border shadow-card">
      <h3 className="font-bold text-lg mb-3 ka">{title}</h3>
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

        {data.new_words?.length > 0 && (
          <Section title="ახალი სიტყვები">
            <div className="space-y-2">
              {data.new_words.map((w: any, i: number) => (
                <div key={i} className="p-3 bg-secondary/50 rounded-xl">
                  <div className="font-bold">{w.english_word} <span className="text-muted-foreground font-normal ka">— {w.georgian_meaning}</span></div>
                  <div className="text-sm text-muted-foreground italic mt-1">"{w.example_sentence}"</div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {data.mistakes?.length > 0 && (
          <Section title="შეცდომები და გასწორება">
            <div className="space-y-2">
              {data.mistakes.map((m: any, i: number) => (
                <div key={i} className="p-3 bg-secondary/50 rounded-xl">
                  <div className="line-through text-destructive">{m.original_sentence}</div>
                  <div className="font-bold text-success">✓ {m.corrected_sentence}</div>
                  <div className="text-sm text-muted-foreground mt-1 ka">{m.explanation_ka}</div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {data.useful_phrases?.length > 0 && (
          <Section title="სასარგებლო ფრაზები">
            <ul className="space-y-1">
              {data.useful_phrases.map((p: string, i: number) => <li key={i}>• {p}</li>)}
            </ul>
          </Section>
        )}

        {data.pronunciation_notes?.length > 0 && (
          <Section title="გამოთქმის რჩევები">
            <ul className="space-y-1">{data.pronunciation_notes.map((p: string, i: number) => <li key={i}>• {p}</li>)}</ul>
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
