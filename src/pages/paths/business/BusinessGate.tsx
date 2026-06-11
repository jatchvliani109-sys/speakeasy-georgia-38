import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { pullBusinessFromSupabase } from "./lib/state";

export default function BusinessGate() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const s = await pullBusinessFromSupabase(user.id);
      if (cancelled) return;
      if (!s.testCompleted || !s.level) navigate("/path/business/test", { replace: true });
      else if (!s.setupCompleted) navigate("/path/business/setup", { replace: true });
      else if (!s.plan) navigate("/path/business/plan", { replace: true });
      else if (!s.businessResumeUploaded && !s.businessResumeSkipped) navigate("/path/business/resume", { replace: true });
      else if (!s.businessSelfIntroductionCompleted && !s.businessSelfIntroductionSkipped) navigate("/path/business/self-introduction", { replace: true });
      else navigate("/path/business/home", { replace: true });
    })();
    return () => { cancelled = true; };
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center text-[#6B6B6B]">
      <span className="ka text-sm">იტვირთება...</span>
    </div>
  );
}
