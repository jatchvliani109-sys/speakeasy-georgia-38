import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { pathById } from "@/lib/learningPaths";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (!prof) return;
      if (!prof.onboarding_completed) return navigate("/onboarding", { replace: true });
      if (!prof.level_test_completed) return navigate("/level-test", { replace: true });
      const selected = (prof as any).selected_learning_path;
      const p = pathById(selected);
      if (!p) return navigate("/learning-path", { replace: true });
      navigate(p.route, { replace: true });
    })();
  }, [user, navigate]);

  return <div className="min-h-screen flex items-center justify-center text-muted-foreground">...</div>;
}
