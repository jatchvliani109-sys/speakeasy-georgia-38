import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Mic, BookOpen, AlertCircle, TrendingUp } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (!data) return;
      setProfile(data);
      if (!data.onboarding_completed) navigate("/onboarding");
      else if (!data.level_test_completed) navigate("/level-test");
    });
  }, [user, navigate]);

  const tiles = [
    { to: "/lesson", icon: Mic, label: "გაკვეთილის დაწყება", variant: "hero" as const, big: true },
    { to: "/vocabulary", icon: BookOpen, label: "ჩემი სიტყვები" },
    { to: "/mistakes", icon: AlertCircle, label: "ჩემი შეცდომები" },
    { to: "/progress", icon: TrendingUp, label: "პროგრესი" },
  ];

  return (
    <Layout>
      <div className="py-2">
        <p className="text-muted-foreground ka">კეთილი იყოს თქვენი მობრძანება 👋</p>
        <h1 className="text-2xl font-extrabold mt-1 ka">{profile?.display_name ?? "მოსწავლე"}</h1>
        {profile?.english_level && (
          <div className="mt-4 p-5 rounded-3xl gradient-hero text-primary-foreground shadow-warm">
            <div className="text-sm opacity-90 ka">შენი დონე</div>
            <div className="text-3xl font-extrabold mt-1">{profile.english_level}</div>
          </div>
        )}

        <div className="mt-6 grid gap-3">
          {tiles.map((t) => (
            <Button
              key={t.to}
              asChild
              variant={t.variant ?? "soft"}
              size={t.big ? "xl" : "lg"}
              className="w-full justify-start ka"
            >
              <Link to={t.to}>
                <t.icon />
                {t.label}
              </Link>
            </Button>
          ))}
        </div>
      </div>
    </Layout>
  );
}
