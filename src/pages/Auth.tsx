import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Layout from "@/components/Layout";
import { toast } from "sonner";
import { z } from "zod";
import { ArrowRight } from "lucide-react";

const schema = z.object({
  email: z.string().trim().email("არასწორი ელ-ფოსტა").max(255),
  password: z.string().min(6, "მინიმუმ 6 სიმბოლო").max(72),
});

export default function Auth() {
  const [params] = useSearchParams();
  const [mode, setMode] = useState<"signup" | "login">(params.get("mode") === "login" ? "login" : "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        toast.success("მოგესალმებით");
        navigate("/dashboard");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("კეთილი იყოს თქვენი დაბრუნება");
        navigate("/dashboard");
      }
    } catch (err: any) {
      toast.error(err.message ?? "შეცდომა");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout showLogout={false}>
      <div className="max-w-sm mx-auto py-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-[10px] font-semibold tracking-[0.22em] uppercase text-[#A84060]">
            <span className="h-px w-6 bg-[#A84060]" />
            {mode === "signup" ? "Welcome" : "Sign in"}
            <span className="h-px w-6 bg-[#A84060]" />
          </div>
          <h1 className="text-3xl font-extrabold ka text-[#4A1429] mt-3 tracking-tight">
            {mode === "signup" ? "შექმენი ანგარიში" : "შესვლა"}
          </h1>
          <p className="text-sm text-[#6B6B6B] mt-2 ka">
            {mode === "signup" ? "ელ-ფოსტა და პაროლი — ეს არის ყველაფერი." : "კეთილი იყოს თქვენი მობრძანება."}
          </p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-4 p-6 sm:p-7 rounded-2xl bg-[#FAF6F7] border border-[#E8D5DA] shadow-[0_2px_10px_-4px_rgba(74,20,41,0.08)]"
        >
          <div>
            <Label htmlFor="email" className="ka text-xs font-semibold tracking-wide uppercase text-[#6B6B6B]">
              ელ-ფოსტა
            </Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 mt-1.5 rounded-lg bg-white border-[#E8D5DA] focus-visible:ring-[#A84060]"
            />
          </div>
          <div>
            <Label htmlFor="password" className="ka text-xs font-semibold tracking-wide uppercase text-[#6B6B6B]">
              პაროლი
            </Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 mt-1.5 rounded-lg bg-white border-[#E8D5DA] focus-visible:ring-[#A84060]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="group w-full inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-[#4A1429] text-[#FAF6F7] text-sm font-semibold tracking-wide ka hover:bg-[#5A1834] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                {mode === "signup" ? "რეგისტრაცია" : "შესვლა"}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "signup" ? "login" : "signup")}
          className="w-full text-center mt-6 text-sm text-[#6B6B6B] hover:text-[#4A1429] transition-colors ka"
        >
          {mode === "signup" ? "უკვე მაქვს ანგარიში → შესვლა" : "ანგარიში არ მაქვს → რეგისტრაცია"}
        </button>

        <div className="mt-8 pt-6 border-t border-dashed border-[#E8D5DA]">
          <div className="text-[10px] font-semibold tracking-[0.22em] uppercase text-[#A8A8A8] text-center mb-3">
            Dev only
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              const devEmail = "dev.preview@speakeasy.local";
              const devPass = "DevPreview123!";
              try {
                let { error } = await supabase.auth.signInWithPassword({ email: devEmail, password: devPass });
                if (error) {
                  const { error: sErr } = await supabase.auth.signUp({
                    email: devEmail,
                    password: devPass,
                    options: { emailRedirectTo: `${window.location.origin}/dashboard` },
                  });
                  if (sErr) throw sErr;
                  const retry = await supabase.auth.signInWithPassword({ email: devEmail, password: devPass });
                  if (retry.error) throw retry.error;
                }
                toast.success("Dev preview mode");
                navigate("/dashboard");
              } catch (err: any) {
                toast.error(err.message ?? "Dev login failed");
              } finally {
                setLoading(false);
              }
            }}
            className="w-full h-11 rounded-xl bg-white border-2 border-dashed border-[#A84060]/60 text-sm font-semibold text-[#4A1429] hover:bg-[#FAF6F7] transition-colors disabled:opacity-60 ka"
          >
            Continue as Guest (Dev Preview)
          </button>
        </div>
      </div>
    </Layout>
  );
}
