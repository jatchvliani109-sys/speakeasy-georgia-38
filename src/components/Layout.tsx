import { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, Sparkles, RotateCcw } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export default function Layout({ children, showLogout = true }: { children: ReactNode; showLogout?: boolean }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2 font-bold text-lg">
            <span className="w-9 h-9 rounded-2xl gradient-hero flex items-center justify-center text-primary-foreground shadow-soft">
              <Sparkles className="w-5 h-5" />
            </span>
            <span>SpeakEasy</span>
          </Link>
          {user && showLogout && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground h-8 px-2"
                title="Reset Onboarding for Testing"
                onClick={async () => {
                  if (!confirm("Are you sure you want to reset onboarding for testing?")) return;
                  await supabase.from("profiles").update({
                    onboarding_completed: false,
                    level_test_completed: false,
                    selected_learning_path: null,
                    english_level: null,
                  }).eq("id", user.id);
                  navigate("/onboarding", { replace: true });
                }}
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Reset
              </Button>
              <Button variant="ghost" size="sm" onClick={async () => { await supabase.auth.signOut(); navigate("/"); }}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </header>
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
