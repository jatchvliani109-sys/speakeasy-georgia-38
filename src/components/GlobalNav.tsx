import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  Home,
  GraduationCap,
  Briefcase,
  Mail,
  MailCheck,
  FileText,
  FileEdit,
  UserCircle,
  BookOpen,
  Star,
  User,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useDisplayName } from "@/hooks/useDisplayName";

type NavItem = {
  to?: string;
  label: string;
  icon: typeof Home;
  match?: (path: string) => boolean;
  action?: "logout";
};

const NAV_ITEMS: NavItem[] = [
  { to: "/path/business/home", label: "მთავარი", icon: Home, match: (p) => p === "/path/business/home" || p === "/path/business" },
  { to: "/path/business/module/vocabulary", label: "ბიზნეს ლექსიკა", icon: GraduationCap, match: (p) => p.startsWith("/path/business/module/vocabulary") || p.startsWith("/path/business/vocabulary") },
  { to: "/path/business/module/interview", label: "გასაუბრება", icon: Briefcase, match: (p) => p.startsWith("/path/business/module/interview") },
  { to: "/path/business/documents?tool=email", label: "იმეილის დაწერა", icon: Mail },
  { to: "/path/business/documents?tool=email_fix", label: "იმეილის გასწორება", icon: MailCheck },
  { to: "/path/business/documents?tool=cover_letter", label: "სამოტივაციო წერილი", icon: FileText },
  { to: "/path/business/documents?tool=resume_improve", label: "რეზიუმეს გაუმჯობესება", icon: FileEdit },
  { to: "/path/business/documents?tool=bio", label: "პროფესიონალური ბიო", icon: UserCircle },
  { to: "/path/business/lexicon", label: "ჩემი ლექსიკონი", icon: BookOpen, match: (p) => p.startsWith("/path/business/lexicon") },
  { to: "/path/business/premium", label: "⭐ პრემიუმი", icon: Star, match: (p) => p.startsWith("/path/business/premium") },
  { to: "/profile", label: "პროფილი", icon: User, match: (p) => p.startsWith("/profile") },
  { label: "გასვლა", icon: LogOut, action: "logout" },
];

function isItemActive(item: NavItem, pathname: string) {
  if (!item.to) return false;
  return item.match ? item.match(pathname) : pathname === item.to;
}

export default function GlobalNav() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { displayName } = useDisplayName();

  const handleLogout = async () => {
    setOpen(false);
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  };

  const handleItem = (item: NavItem) => {
    if (item.action === "logout") return handleLogout();
    if (item.to) {
      setOpen(false);
      navigate(item.to);
    }
  };

  return (
    <>
      {/* Desktop: inline top nav */}
      <nav className="hidden lg:flex items-center gap-1">
        {NAV_ITEMS.filter((i) => i.action !== "logout")
          .filter((i) => ["მთავარი", "ბიზნეს ლექსიკა", "გასაუბრება", "ჩემი ლექსიკონი"].includes(i.label))
          .map((item) => {
          const active = isItemActive(item, pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              to={item.to!}
              className={`ka inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[13px] font-semibold transition-colors ${
                active
                  ? "bg-[#232323] text-[#F5F4F2]"
                  : "text-[#4A4A4A] hover:text-[#5C1A2E] hover:bg-[#5C1A2E]/5"
              }`}
            >
              <Icon size={14} strokeWidth={2.25} />
              {item.label}
            </Link>
          );
        })}
        <button
          onClick={handleLogout}
          aria-label="გასვლა"
          className="ka inline-flex items-center gap-1.5 px-3 py-2 ml-1 rounded-md text-[13px] font-semibold text-[#4A4A4A] hover:text-[#5C1A2E] hover:bg-[#5C1A2E]/5 border-l border-[#E4E2DF]"
        >
          <LogOut size={14} strokeWidth={2.25} />
          გასვლა
        </button>
      </nav>

      {/* Mobile/Tablet: hamburger sheet */}
      <div className="lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0 text-[#5C1A2E] hover:bg-[#5C1A2E]/5"
              aria-label="მენიუ"
            >
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-[300px] sm:w-[340px] p-0 bg-[#F5F4F2] border-l border-[#E4E2DF]"
          >
            <SheetHeader className="px-5 pt-5 pb-4 border-b border-[#E4E2DF]">
              <SheetTitle className="ka text-[#5C1A2E] text-base font-bold text-left">
                {displayName ? `გამარჯობა, ${displayName}` : "ნავიგაცია"}
              </SheetTitle>
              {user?.email && (
                <p className="ka text-xs text-[#4A4A4A] text-left break-all">
                  {user.email}
                </p>
              )}
            </SheetHeader>
            <nav className="px-3 py-3 space-y-0.5">
              {NAV_ITEMS.map((item) => {
                const active = isItemActive(item, pathname);
                const Icon = item.icon;
                const isLogout = item.action === "logout";
                return (
                  <button
                    key={item.label}
                    onClick={() => handleItem(item)}
                    className={`ka w-full flex items-center gap-3 px-3 py-3 rounded-md text-sm font-semibold transition-colors ${
                      isLogout
                        ? "text-[#5C1A2E] hover:bg-[#5C1A2E]/5 mt-2 border-t border-[#E4E2DF] rounded-none pt-4"
                        : active
                        ? "bg-[#232323] text-[#F5F4F2]"
                        : "text-[#1C1C1E] hover:bg-[#5C1A2E]/5 hover:text-[#5C1A2E]"
                    }`}
                  >
                    <Icon size={16} strokeWidth={2.25} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
