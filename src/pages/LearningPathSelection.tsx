import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { LEARNING_PATHS, LearningPathId } from "@/lib/learningPaths";
import { toast } from "sonner";

export default function LearningPathSelection() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState<LearningPathId | null>(null);
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (!data) return;
      if (!data.onboarding_completed) return navigate("/onboarding", { replace: true });
      if (!data.level_test_completed) return navigate("/level-test", { replace: true });
      setCurrent((data as any)?.selected_learning_path ?? null);
    })();
  }, [user, navigate]);

  const choose = async (id: LearningPathId, route: string) => {
    if (!user) return;
    setSaving(id);
    const { error } = await supabase.from("profiles").update({ selected_learning_path: id } as any).eq("id", user.id);
    setSaving(null);
    if (error) { toast.error(error.message); return; }
    navigate(route);
  };

  return (
    <Layout>
      <div className="py-2 space-y-5">
        <div className="text-center">
          <h1 className="text-2xl font-extrabold ka">აირჩიე შენი სასწავლო მიზანი</h1>
          <p className="text-sm text-muted-foreground ka mt-2">შეგიძლია აირჩიო ერთი მთავარი მიმართულება. მოგვიანებით შეცვლასაც შეძლებ.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {LEARNING_PATHS.map((p) => (
            <div key={p.id} className="p-5 rounded-3xl bg-card border-2 border-border hover:border-primary/40 transition-colors shadow-card flex flex-col">
              <div className="text-4xl mb-2">{p.icon}</div>
              <h3 className="font-extrabold ka text-lg">{p.title}</h3>
              <p className="text-sm text-muted-foreground ka mt-1 flex-1">{p.description}</p>
              <Button
                variant={current === p.id ? "soft" : "hero"}
                size="lg"
                className="ka mt-4"
                disabled={saving !== null}
                onClick={() => choose(p.id, p.route)}
              >
                {saving === p.id ? "..." : "არჩევა"}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
