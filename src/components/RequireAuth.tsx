import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";

export default function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  return children;
}
