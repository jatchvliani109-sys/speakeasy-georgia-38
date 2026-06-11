import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import GlobalNav from "@/components/GlobalNav";
import Wordmark from "@/components/Wordmark";

export default function Layout({ children, showLogout = true, fullWidth = false }: { children: ReactNode; showLogout?: boolean; fullWidth?: boolean }) {
  const { user } = useAuth();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Link to={user ? "/path/business/home" : "/"} className="flex items-center text-foreground hover:opacity-80 transition-opacity">
            <Wordmark size="md" />
          </Link>

          {user && showLogout && <GlobalNav />}
        </div>
      </header>
      <main className={`flex-1 w-full ${fullWidth ? "" : "max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6"}`}>{children}</main>
    </div>
  );
}

