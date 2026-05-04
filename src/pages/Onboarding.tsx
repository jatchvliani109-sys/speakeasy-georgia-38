import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const QUESTIONS = [
  { key: "age_group", q: "შენი ასაკი?", options: ["10–12", "13–15", "16–18", "ზრდასრული"] },
  { key: "confidence", q: "რამდენად თავდაჯერებულად საუბრობ ინგლისურად?", options: ["დაბალი", "საშუალო", "მაღალი"] },
  { key: "learning_goal", q: "რატომ სწავლობ ინგლისურს?", options: ["სკოლა", "მოგზაურობა", "სამსახური", "ყოველდღიური საუბარი", "გამოცდები"] },
  { key: "georgian_preference", q: "გინდა ქართული ახსნები?", options: ["ყოველთვის", "ხანდახან", "მხოლოდ ინგლისური"] },
  { key: "speaking_comfort", q: "როგორ გრძნობ თავს როცა საუბრობ?", options: ["მორცხვი", "ნორმალური", "თავდაჯერებული"] },
];

export default function Onboarding() {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const current = QUESTIONS[step];

  const choose = async (opt: string) => {
    const next = { ...answers, [current.key]: opt };
    setAnswers(next);
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      if (!user) return;
      setSaving(true);
      const { error } = await supabase.from("onboarding_answers").insert({ user_id: user.id, ...next });
      if (error) { toast.error(error.message); setSaving(false); return; }
      await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id);
      navigate("/level-test");
    }
  };

  return (
    <Layout>
      <div className="py-4">
        <div className="flex gap-1.5 mb-8">
          {QUESTIONS.map((_, i) => (
            <div key={i} className={cn("flex-1 h-2 rounded-full transition-smooth", i <= step ? "bg-primary" : "bg-muted")} />
          ))}
        </div>
        <h2 className="text-2xl font-bold mb-6 text-center ka">{current.q}</h2>
        <div className="grid gap-3">
          {current.options.map((o) => (
            <Button key={o} variant="soft" size="lg" className="w-full ka justify-start text-left" onClick={() => choose(o)} disabled={saving}>
              {o}
            </Button>
          ))}
        </div>
        {step > 0 && (
          <Button variant="ghost" className="w-full mt-6 ka" onClick={() => setStep(step - 1)}>← უკან</Button>
        )}
      </div>
    </Layout>
  );
}
