import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { toast } from "sonner";
import { ArrowRight, KeyRound } from "lucide-react";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // When user lands from recovery email, Supabase fires PASSWORD_RECOVERY event
    // and establishes a temporary session used to call updateUser.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });

    // Also check if a session already exists (link just processed).
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });

    // If nothing happens shortly, likely invalid/expired link.
    const t = setTimeout(() => {
      supabase.auth.getSession().then(({ data }) => {
        if (!data.session) setInvalidLink(true);
      });
    }, 1500);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(t);
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("პაროლი უნდა შეიცავდეს მინიმუმ 6 სიმბოლოს");
      return;
    }
    if (password !== confirm) {
      toast.error("პაროლები არ ემთხვევა");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("პაროლი წარმატებით შეიცვალა");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message ?? "პაროლის შეცვლა ვერ მოხერხდა");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout showLogout={false}>
      <SEO
        title="ახალი პაროლი — SpeakBusy"
        description="დააყენე SpeakBusy-ის ახალი პაროლი."
        path="/reset-password"
      />
      <div className="max-w-sm mx-auto py-10">
        <div className="text-center mb-8">
          <span className="inline-flex w-14 h-14 rounded-full bg-[#3D1220] text-[#F8F5F0] items-center justify-center">
            <KeyRound className="w-6 h-6" />
          </span>
          <h1 className="text-3xl font-extrabold ka text-[#3D1220] mt-4 tracking-tight">
            ახალი პაროლი
          </h1>
          <p className="text-sm text-[#4A4A4A] mt-2 ka leading-relaxed">
            შეიყვანე ახალი პაროლი ანგარიშისთვის.
          </p>
        </div>

        {invalidLink && !ready ? (
          <div className="p-6 rounded-2xl bg-[#F8F5F0] border border-[#E0D8D0] text-center">
            <p className="text-sm text-[#3D1220] ka leading-relaxed">
              ბმული არასწორია ან ვადა გაუვიდა. გთხოვთ, მოითხოვოთ ახალი ბმული.
            </p>
            <Link
              to="/forgot-password"
              className="inline-block mt-4 text-sm font-semibold text-[#3D1220] underline ka"
            >
              ახალი ბმულის მოთხოვნა
            </Link>
          </div>
        ) : (
          <form
            onSubmit={submit}
            className="space-y-4 p-6 sm:p-7 rounded-2xl bg-[#F8F5F0] border border-[#E0D8D0] shadow-[0_2px_10px_-4px_rgba(61,18,32,0.08)]"
          >
            <div>
              <Label htmlFor="password" className="ka text-xs font-semibold tracking-wide uppercase text-[#4A4A4A]">
                ახალი პაროლი
              </Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 mt-1.5 rounded-lg bg-white border-[#E0D8D0] focus-visible:ring-[#1C1C1E]"
              />
            </div>
            <div>
              <Label htmlFor="confirm" className="ka text-xs font-semibold tracking-wide uppercase text-[#4A4A4A]">
                გაიმეორე პაროლი
              </Label>
              <Input
                id="confirm"
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="h-11 mt-1.5 rounded-lg bg-white border-[#E0D8D0] focus-visible:ring-[#1C1C1E]"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !ready}
              className="group w-full inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-[#3D1220] text-[#F8F5F0] text-sm font-semibold tracking-wide ka hover:bg-[#4A1525] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  პაროლის შენახვა
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </Layout>
  );
}
