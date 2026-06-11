import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";

export default function Dashboard() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <Navigate to="/path/business" replace />;
}
