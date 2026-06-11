import { useNavigate } from "react-router-dom";
import { User, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export default function UserMenu() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const email = user.email ?? "";
  const initials = email
    .split("@")[0]
    .split(/[._-]/)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 rounded-full border border-[#E0D8D0] hover:bg-[#5C1A2E]/5 hover:border-[#5C1A2E]/30 transition-colors"
          aria-label="მომხმარებელი"
        >
          {initials ? (
            <span className="ka text-[11px] font-semibold text-[#5C1A2E]">
              {initials}
            </span>
          ) : (
            <User className="w-4 h-4 text-[#5C1A2E]" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56" sideOffset={6}>
        <DropdownMenuLabel className="ka font-normal text-[#6B6B6B] truncate">
          {email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="ka text-[#1C1C1E] cursor-pointer focus:bg-[#5C1A2E]/5 focus:text-[#5C1A2E]"
        >
          <LogOut className="w-4 h-4 mr-2 text-[#6B6B6B]" />
          გამოსვლა
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
