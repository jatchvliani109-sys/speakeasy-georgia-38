import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  Home,
  LayoutGrid,
  BookOpen,
  FileText,
  User,
  LogOut,
  X,
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
  { to: "/path/business/modules", label: "მოდულები", icon: LayoutGrid, match: (p) => p.startsWith("/path/business/modules") || p.startsWith("/path/business/module/") },
  { to: "/path/business/lexicon", label: "ჩემი ლექსიკონი", icon: BookOpen, match: (p) => p.startsWith("/path/business/lexicon") },
  { to: "/path/business/documents", label: "დოკუმენტების ასისტენტი", icon: FileText, match: (p) => p.startsWith("/path/business/documents") },
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
        {NAV_ITEMS.filter((i) => i.action !== "logout").map((item) => {
          const active = isItemActive(item, pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              to={item.to!}
              className={`ka inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[13px] font-semibold transition-colors ${
                active
                  ? "bg-[#5C1A2E] text-[#F0EBE3]"
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
          className="ka inline-flex items-center gap-1.5 px-3 py-2 ml-1 rounded-md text-[13px] font-semibold text-[#4A4A4A] hover:text-[#5C1A2E] hover:bg-[#5C1A2E]/5 border-l border-[#E0D8D0]"
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
            className="w-[300px] sm:w-[340px] p-0 bg-[#F0EBE3] border-l border-[#E0D8D0]"
          >
            <SheetHeader className="px-5 pt-5 pb-4 border-b border-[#E0D8D0]">
              <SheetTitle className="ka text-[#5C1A2E] text-base font-bold text-left">
                ნავიგაცია
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
                        ? "text-[#5C1A2E] hover:bg-[#5C1A2E]/5 mt-2 border-t border-[#E0D8D0] rounded-none pt-4"
                        : active
                        ? "bg-[#5C1A2E] text-[#F0EBE3]"
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
