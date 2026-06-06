import { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, RotateCcw } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import GlobalNav from "@/components/GlobalNav";
import Wordmark from "@/components/Wordmark";

export default function Layout({ children, showLogout = true }: { children: ReactNode; showLogout?: boolean }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to={user ? "/dashboard" : "/"} className="flex items-center text-foreground hover:opacity-80 transition-opacity">
            <Wordmark size="md" />
          </Link>

          {user && showLogout && (
            <div className="flex items-center gap-1">
              <GlobalNav />
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground h-8 px-2"
                title="Reset path selection for testing"
                onClick={async () => {
                  if (!confirm("Reset path selection for testing?")) return;
                  await supabase.from("profiles").update({
                    selected_learning_path: null,
                  }).eq("id", user.id);
                  navigate("/learning-path", { replace: true });
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
