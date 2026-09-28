import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";

export default function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        ...
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;

  // NO EMAIL-VERIFICATION WALL.
  //
  // This used to block anyone whose `email_confirmed_at` was null behind a
  // "check your inbox" screen. Two reasons it is gone:
  //
  //  1. Paid traffic arrives from the Instagram in-app browser. A mandatory
  //     mail round-trip there means leaving the webview, opening a mail app,
  //     and landing back in a DIFFERENT browser — the session they signed up
  //     in is orphaned. Most of that traffic never comes back.
  //
  //  2. It made the whole app hostage to one Supabase toggle. With
  //     "Confirm email" switched off, GoTrue is expected to stamp
  //     `email_confirmed_at` at signup — but if that ever changed, or the
  //     toggle got flipped back, every new account would hit this wall with
  //     no confirmation mail on the way to release them.
  //
  // The address still matters, so it is checked where it actually costs money:
  // BusinessPremium makes the user confirm it in writing before a card is
  // stored, since that is where receipts and charge notices are sent.
  return children;
}