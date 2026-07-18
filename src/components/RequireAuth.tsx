import { Navigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Mail } from "lucide-react";
import { toast } from "sonner";

export default function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  const [resending, setResending] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        ...
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;

  // Block unverified users — Supabase only sets email_confirmed_at after the
  // user clicks the link in their inbox.
  if (!user.email_confirmed_at) {
    const resend = async () => {
      if (!user.email) return;
      setResending(true);
      try {
        const { error } = await supabase.auth.resend({
          type: "signup",
          email: user.email,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        toast.success("ბმული თავიდან გაიგზავნა");
      } catch (err: any) {
        toast.error(err.message ?? "ვერ მოხერხდა გაგზავნა");
      } finally {
        setResending(false);
      }
    };

    return (
      <Layout showLogout={false}>
        <div className="max-w-sm mx-auto py-10 text-center">
          <span className="inline-flex w-14 h-14 rounded-full bg-[#111111] text-[#F5F4F2] items-center justify-center">
            <Mail className="w-6 h-6" />
          </span>
          <h1 className="text-2xl font-extrabold ka text-[#5C1A2E] mt-4 tracking-tight">
            დაადასტურეთ თქვენი ელ-ფოსტა
          </h1>
          <p className="text-sm text-[#4A4A4A] mt-3 ka leading-relaxed">
            დაშბორდზე წვდომისთვის ჯერ უნდა დაადასტუროთ ელ-ფოსტა. გადახედეთ თქვენს
            inbox-ს და დააჭირეთ დადასტურების ბმულს.
          </p>
          {user.email && (
            <p className="text-xs text-[#6B6B6B] mt-2 ka">
              გავაგზავნეთ: <span className="font-semibold text-[#5C1A2E]">{user.email}</span>
            </p>
          )}
          <button
            type="button"
            onClick={resend}
            disabled={resending}
            className="mt-6 w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl border border-[#3D1220]/30 text-sm font-semibold text-[#5C1A2E] hover:bg-[#111111]/5 transition-colors disabled:opacity-60 ka"
          >
            {resending ? "იგზავნება..." : "ხელახლა გაგზავნა"}
          </button>
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/auth";
            }}
            className="mt-3 w-full text-center text-xs text-[#6B6B6B] hover:text-[#5C1A2E] ka"
          >
            გასვლა
          </button>
        </div>
      </Layout>
    );
  }

  return children;
}
