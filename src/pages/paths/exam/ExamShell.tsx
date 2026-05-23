import { ReactNode, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Layout from "@/components/Layout";

export default function ExamShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  useEffect(() => {
    document.body.classList.add("ex-active");
    return () => document.body.classList.remove("ex-active");
  }, []);
  return (
    <Layout>
      <div className="relative">
        <div key={pathname} className="sp-page">
          {children}
        </div>
      </div>
    </Layout>
  );
}
