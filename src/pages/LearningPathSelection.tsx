import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { LEARNING_PATHS, LearningPathId } from "@/lib/learningPaths";
import { toast } from "sonner";
import { Mic, Briefcase, GraduationCap, ArrowRight, LucideIcon } from "lucide-react";
import { TestingShortcuts } from "@/components/GlobalNav";

type Theme = {
  icon: LucideIcon;
  accentLine: string; // tailwind bg color for top accent
  iconBg: string;
  iconColor: string;
  badge: string;
};

const THEMES: Record<LearningPathId, Theme> = {
  speaking: {
    icon: Mic,
    accentLine: "bg-[#0F766E]",
    iconBg: "bg-[#071A2F]",
    iconColor: "text-[#C9A227]",
    badge: "AI Speaking",
  },
  business_english: {
    icon: Briefcase,
    accentLine: "bg-[#C9A227]",
    iconBg: "bg-[#111827]",
    iconColor: "text-[#F7F1E3]",
    badge: "Executive",
  },
  national_exam: {
    icon: GraduationCap,
    accentLine: "bg-[#071A2F]",
    iconBg: "bg-[#0F766E]",
    iconColor: "text-[#F7F1E3]",
    badge: "Exam Prep",
  },
};

export default function LearningPathSelection() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState<LearningPathId | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

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
    const { error } = await supabase
      .from("profiles")
      .update({ selected_learning_path: id } as any)
      .eq("id", user.id);
    if (error) {
      setSaving(null);
      toast.error(error.message);
      return;
    }
    // Smooth fade-out before navigation
    setMounted(false);
    setTimeout(() => navigate(route), 220);
  };

  return (
    <Layout>
      <style>{`
        @keyframes lp-fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .lp-anim { opacity: 0; }
        .lp-anim.in { animation: lp-fade-up 520ms cubic-bezier(0.22, 1, 0.36, 1) both; }
        .lp-card {
          transition: transform 280ms cubic-bezier(0.22,1,0.36,1),
                      box-shadow 280ms ease,
                      border-color 280ms ease;
          will-change: transform;
        }
        .lp-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 18px 40px -22px rgba(7, 26, 47, 0.35);
          border-color: rgba(201, 162, 39, 0.45);
        }
        .lp-btn {
          transition: background 200ms ease, color 200ms ease, letter-spacing 200ms ease;
        }
        .lp-btn:hover { letter-spacing: 0.04em; }
        @media (prefers-reduced-motion: reduce) {
          .lp-anim, .lp-anim.in { animation: none !important; opacity: 1 !important; }
          .lp-card, .lp-btn { transition: none !important; }
        }
      `}</style>

      <div className="py-4 space-y-8">
        <header
          className={`lp-anim ${mounted ? "in" : ""} text-center space-y-3`}
          style={{ animationDelay: "0ms" }}
        >
          <div className="inline-flex items-center gap-2 text-[10px] font-semibold tracking-[0.22em] uppercase text-[#C9A227]">
            <span className="h-px w-6 bg-[#C9A227]" />
            SpeakEasy
            <span className="h-px w-6 bg-[#C9A227]" />
          </div>
          <h1 className="ka text-3xl sm:text-4xl font-extrabold text-[#071A2F] leading-tight">
            აირჩიე შენი მიზანი
          </h1>
          <p className="ka text-sm sm:text-base text-[#6B7280] max-w-md mx-auto">
            გაკვეთილები და AI მასწავლებელი შენს მიზანზე მოერგება.
          </p>
        </header>

        <div className="grid gap-4">
          {LEARNING_PATHS.map((p, idx) => {
            const theme = THEMES[p.id as LearningPathId];
            const Icon = theme.icon;
            const isCurrent = current === p.id;
            const isSaving = saving === p.id;
            return (
              <article
                key={p.id}
                className={`lp-anim ${mounted ? "in" : ""} lp-card relative overflow-hidden rounded-2xl bg-[#FAFAF7] border border-[#E5E2D8] shadow-[0_2px_10px_-4px_rgba(7,26,47,0.08)]`}
                style={{ animationDelay: `${120 + idx * 90}ms` }}
              >
                <div className={`absolute top-0 left-0 right-0 h-[3px] ${theme.accentLine}`} />
                <div className="p-6 sm:p-7 flex flex-col gap-5">
                  <div className="flex items-start gap-4">
                    <div
                      className={`shrink-0 w-14 h-14 rounded-xl ${theme.iconBg} ${theme.iconColor} flex items-center justify-center shadow-[0_8px_20px_-10px_rgba(7,26,47,0.5)]`}
                    >
                      <Icon className="w-6 h-6" strokeWidth={1.75} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-semibold tracking-[0.18em] uppercase text-[#6B7280] mb-1">
                        {theme.badge}
                      </div>
                      <h2 className="ka text-lg sm:text-xl font-extrabold text-[#071A2F] leading-snug">
                        {p.title}
                      </h2>
                      <p className="ka text-sm text-[#6B7280] mt-2 leading-relaxed">
                        {p.description}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => choose(p.id as LearningPathId, p.route)}
                    disabled={saving !== null}
                    className={`lp-btn group inline-flex items-center justify-center gap-2 w-full h-12 rounded-xl text-sm font-semibold tracking-wide ka
                      ${isCurrent
                        ? "bg-[#FAFAF7] text-[#071A2F] border border-[#071A2F]/30 hover:bg-[#F7F1E3]"
                        : "bg-[#071A2F] text-[#FAFAF7] hover:bg-[#0F2748]"}
                      disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    {isSaving ? (
                      <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>{isCurrent ? "გაგრძელება" : "არჩევა"}</span>
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
                      </>
                    )}
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        <p
          className={`lp-anim ${mounted ? "in" : ""} text-center text-[11px] text-[#6B7280] ka`}
          style={{ animationDelay: "480ms" }}
        >
          მოგვიანებით შეგიძლია მიმართულების შეცვლა.
        </p>

        <TestingShortcuts />
      </div>
    </Layout>
  );
}
