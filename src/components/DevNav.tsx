import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wrench, ArrowLeft } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * DevNav — floating dev-only navigation menu.
 *
 * Always visible from any screen. Each link bypasses auth by ensuring a
 * shared dev account session exists, then navigating directly to the route.
 *
 * To hide for production: remove the <DevNav /> mount in src/App.tsx, or
 * gate it with `import.meta.env.DEV` there.
 */

const DEV_EMAIL = "dev.preview@speakeasy.local";
const DEV_PASS = "DevPreview123!";

async function ensureDevSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) return;
  let r = await supabase.auth.signInWithPassword({ email: DEV_EMAIL, password: DEV_PASS });
  if (r.error) {
    const s = await supabase.auth.signUp({
      email: DEV_EMAIL,
      password: DEV_PASS,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    if (s.error) throw s.error;
    r = await supabase.auth.signInWithPassword({ email: DEV_EMAIL, password: DEV_PASS });
    if (r.error) throw r.error;
  }
}

type Item = { to: string; label: string; public?: boolean };
type Group = { title: string; items: Item[] };

const GROUPS: Group[] = [
  {
    title: "Entry",
    items: [
      { to: "/", label: "Landing / Home", public: true },
      { to: "/auth", label: "Login / Register", public: true },
      { to: "/auth?mode=login", label: "Login screen", public: true },
      { to: "/dashboard", label: "Path selection" },
      { to: "/dashboard", label: "Dashboard router" },
    ],
  },
  {
    title: "Business English",
    items: [
      { to: "/path/business", label: "Business gate (router)" },
      { to: "/path/business/home", label: "Business dashboard" },
      { to: "/path/business/test", label: "Placement test" },
      { to: "/path/business/setup", label: "Onboarding questions" },
      { to: "/path/business/plan", label: "Personal plan" },
      { to: "/path/business/self-introduction", label: "Professional introduction" },
    ],
  },
  {
    title: "Business — modules",
    items: [
      { to: "/path/business/module/interview", label: "Job interview" },
      { to: "/path/business/module/emails", label: "Work emails" },
      { to: "/path/business/module/meetings", label: "Meetings" },
      
      { to: "/path/business/module/vocabulary", label: "Business vocabulary" },
    ],
  },
];

export default function DevNav() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const go = async (item: Item) => {
    setOpen(false);
    if (item.public) {
      navigate(item.to);
      return;
    }
    try {
      setBusy(true);
      await ensureDevSession();
      navigate(item.to);
    } catch (e: any) {
      toast.error(e?.message ?? "Dev session failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Dev menu"
          className="fixed z-[100] bottom-4 right-4 h-11 px-3 inline-flex items-center gap-1.5 rounded-full bg-[#0B0B0B] text-white text-[11px] font-mono uppercase tracking-wider shadow-lg border border-amber-500/60 hover:bg-amber-500 hover:text-black transition-colors"
        >
          <Wrench className="w-3.5 h-3.5" />
          Dev
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[320px] sm:w-[360px] overflow-y-auto p-0 bg-[#0B0B0B] text-white border-l border-amber-500/40">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-white/10">
          <SheetTitle className="font-mono text-xs uppercase tracking-[0.2em] text-amber-400 flex items-center gap-2">
            <Wrench className="w-3.5 h-3.5" /> Dev navigation
          </SheetTitle>
          <p className="text-[10px] text-white/50 font-mono">
            Bypasses auth & progress. Remove &lt;DevNav /&gt; in App.tsx before prod.
          </p>
        </SheetHeader>
        <div className="px-3 py-2 border-b border-white/10">
          <button
            onClick={() => { setOpen(false); navigate(-1); }}
            className="font-mono flex items-center gap-2 w-full px-2 py-2 text-[11px] text-white/60 hover:text-white"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
        </div>
        <nav className="px-3 pb-8 pt-3 space-y-5">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <div className="font-mono px-2 text-[10px] uppercase tracking-[0.18em] text-amber-400/80 mb-1.5">
                {g.title}
              </div>
              <ul className="space-y-0.5">
                {g.items.map((it) => (
                  <li key={it.to + it.label}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => go(it)}
                      className="w-full text-left rounded-md px-2 py-1.5 text-[13px] text-white/85 hover:bg-amber-500/15 hover:text-amber-300 transition-colors disabled:opacity-50"
                    >
                      {it.label}
                      <span className="block text-[10px] font-mono text-white/35">{it.to}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
