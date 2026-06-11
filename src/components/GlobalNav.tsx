import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

type NavItem = { to: string; label: string };
type NavGroup = { title: string; items: NavItem[] };

const GROUPS: NavGroup[] = [
  {
    title: "მთავარი",
    items: [
      { to: "/dashboard", label: "მთავარი დაშბორდი" },
    ],
  },
  {
    title: "ბიზნეს ინგლისური",
    items: [
      { to: "/path/business/home", label: "Business Dashboard" },
      { to: "/path/business/self-introduction", label: "First Step: Professional Introduction" },
      { to: "/path/business/setup", label: "Business Setup" },
      { to: "/path/business/test", label: "Placement Test" },
      { to: "/path/business/plan", label: "Personal Plan" },
      { to: "/path/business/module/interview", label: "Job Interview" },
      { to: "/path/business/module/emails", label: "Work Emails" },
      { to: "/path/business/module/meetings", label: "Meetings" },
      
      { to: "/path/business/module/vocabulary", label: "Business Vocabulary" },
    ],
  },
];

export default function GlobalNav() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="h-9 px-2 gap-1.5" aria-label="მენიუ">
          <Menu className="w-4 h-4" />
          <span className="ka text-xs font-medium">მენიუ</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px] sm:w-[340px] overflow-y-auto p-0">
        <SheetHeader className="px-5 pt-5 pb-3 border-b">
          <SheetTitle className="ka text-base">ნავიგაცია</SheetTitle>
        </SheetHeader>
        <div className="px-3 py-2">
          <button
            onClick={() => { setOpen(false); navigate(-1); }}
            className="ka flex items-center gap-2 w-full px-2 py-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> უკან
          </button>
        </div>
        <nav className="px-3 pb-6 space-y-4">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <div className="ka px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                {g.title}
              </div>
              <ul className="space-y-0.5">
                {g.items.map((it) => (
                  <li key={it.to + it.label}>
                    <Link
                      to={it.to}
                      onClick={() => setOpen(false)}
                      className="ka block rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      {it.label}
                    </Link>
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

export const TESTING_SHORTCUTS: NavItem[] = [
  
  { to: "/path/business/home", label: "Business" },
  
  { to: "/path/business/setup", label: "Biz Setup" },
  { to: "/path/business/test", label: "Biz Test" },
  { to: "/path/business/plan", label: "Biz Plan" },
  { to: "/path/business/self-introduction", label: "Self-Intro" },
];

export function TestingShortcuts() {
  return (
    <div className="mt-8 pt-4 border-t border-border/60">
      <div className="ka text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
        Testing Shortcuts
      </div>
      <div className="flex flex-wrap gap-1.5">
        {TESTING_SHORTCUTS.map((s) => (
          <Link
            key={s.to + s.label}
            to={s.to}
            className="text-[11px] px-2 py-1 rounded border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            {s.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
