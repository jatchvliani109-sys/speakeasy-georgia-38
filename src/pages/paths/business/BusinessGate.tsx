import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { loadBusiness } from "./lib/state";

export default function BusinessGate() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    const s = loadBusiness(user.id);
    if (!s.setupCompleted) navigate("/path/business/setup", { replace: true });
    else if (!s.testCompleted || !s.level) navigate("/path/business/test", { replace: true });
    else if (!s.plan) navigate("/path/business/plan", { replace: true });
    else navigate("/path/business/home", { replace: true });
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center text-[#5B6473]">
      ...
    </div>
  );
}
