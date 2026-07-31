import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { toast } from "sonner";
import { z } from "zod";
import { ArrowRight, Mail, CheckCircle2 } from "lucide-react";

const loginSchema = z.object({
  email: z.string().trim().email("არასწორი ელ-ფოსტა").max(255),
  password: z.string().min(6, "მინიმუმ 6 სიმბოლო").max(72),
});
const signupSchema = loginSchema.extend({
  termsAccepted: z.boolean().refine((v) => v === true, { message: "გთხოვთ, დაეთანხმოთ წესებს, პირობებს და კონფიდენციალობის პოლიტიკას" }),
});

export default function Auth() {
  const [params] = useSearchParams();
  const [mode, setMode] = useState<"signup" | "login">(params.get("mode") === "login" ? "login" : "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const navigate = useNavigate();

  // Preserve return target (used by /.lovable/oauth/consent redirect flow).
  const rawNext = params.get("next") ?? "";
  const nextPath = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";
  const afterAuthAbsolute = `${window.location.origin}${nextPath}`;


  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = mode === "signup"
      ? signupSchema.safeParse({ email, password, termsAccepted })
      : loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: afterAuthAbsolute },
        });
        if (error) throw error;
        if (!data.session) {
          setPendingEmail(email);
        } else {
          window.location.href = afterAuthAbsolute;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (/confirm/i.test(error.message)) {
            setPendingEmail(email);
            return;
          }
          throw error;
        }
        toast.success("კეთილი იყოს თქვენი დაბრუნება");
        window.location.href = afterAuthAbsolute;
      }
    } catch (err: any) {
      // Supabase returns these in English; the common ones deserve Georgian.
      const raw = String(err?.message ?? "");
      const ka =
        /already registered|already exists/i.test(raw)
          ? "ეს ელ-ფოსტა უკვე დარეგისტრირებულია — სცადე შესვლა"
          : /invalid login credentials/i.test(raw)
          ? "ელ-ფოსტა ან პაროლი არასწორია"
          : /rate limit|too many/i.test(raw)
          ? "ძალიან ბევრი მცდელობა — სცადე ცოტა ხანში"
          : /network|fetch/i.test(raw)
          ? "კავშირი ვერ დამყარდა — შეამოწმე ინტერნეტი"
          : raw || "შეცდომა";
      toast.error(ka);
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (!pendingEmail) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: pendingEmail,
        options: { emailRedirectTo: afterAuthAbsolute },
      });
      if (error) throw error;
      toast.success("ბმული თავიდან გაიგზავნა");
    } catch (err: any) {
      toast.error(err.message ?? "ვერ მოხერხდა გაგზავნა");
    } finally {
      setResending(false);
    }
  };

  if (pendingEmail) {
    return (
      <Layout showLogout={false}>
        <SEO
          title="დაადასტურე ელ-ფოსტა — SpeakBusy"
          description="შეამოწმე შენი ელ-ფოსტა და დაადასტურე SpeakBusy-ის ანგარიში, რომ დაიწყო ბიზნეს ინგლისურის სწავლა."
          path="/auth"
        />
        <div className="max-w-sm mx-auto py-10">
          <div className="text-center mb-6">
            <span className="inline-flex w-14 h-14 rounded-full bg-[#111111] text-[#F5F4F2] items-center justify-center">
              <Mail className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-extrabold ka text-[#5C1A2E] mt-4 tracking-tight">
              შეამოწმეთ თქვენი ელ-ფოსტა
            </h1>
            <p className="text-sm text-[#4A4A4A] mt-3 ka leading-relaxed">
              გთხოვთ შეამოწმოთ თქვენი ელ-ფოსტა. გამოგვიგზავნეთ დადასტურების ბმული —
              გთხოვთ გადახედოთ inbox-ს და დააჭიროთ ბმულს.
            </p>
            <p className="text-xs text-[#6B6B6B] mt-3 ka">
              გავაგზავნეთ: <span className="font-semibold text-[#5C1A2E]">{pendingEmail}</span>
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#F5F4F2] border border-[#E4E2DF] space-y-3">
            <div className="flex items-start gap-2 text-xs text-[#4A4A4A] ka">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-[#5C1A2E]" />
              <span>ბმულზე დაჭერის შემდეგ ავტომატურად შეხვალთ აპში.</span>
            </div>
            <button
              type="button"
              onClick={resend}
              disabled={resending}
              className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl border border-[#3D1220]/30 text-sm font-semibold text-[#5C1A2E] hover:bg-[#111111]/5 transition-colors disabled:opacity-60 ka"
            >
              {resending ? "იგზავნება..." : "ხელახლა გაგზავნა"}
            </button>
          </div>

          <button
            onClick={() => {
              setPendingEmail(null);
              setMode("login");
            }}
            className="w-full text-center mt-6 text-sm text-[#4A4A4A] hover:text-[#5C1A2E] transition-colors ka"
          >
            ← სხვა ანგარიში / შესვლა
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showLogout={false}>
      <SEO
        title={mode === "signup" ? "რეგისტრაცია — SpeakBusy" : "შესვლა — SpeakBusy"}
        description={
          mode === "signup"
            ? "შექმენი უფასო SpeakBusy ანგარიში და დაიწყე ბიზნეს ინგლისურის სწავლა AI-powered პლატფორმით."
            : "შედი შენს SpeakBusy ანგარიშში და გააგრძელე ბიზნეს ინგლისურის სწავლა."
        }
        path="/auth"
      />
      <div className="max-w-sm mx-auto py-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-[10px] font-semibold tracking-[0.22em] uppercase text-[#1C1C1E]">
            <span className="h-px w-6 bg-[#1C1C1E]" />
            {mode === "signup" ? "Welcome" : "Sign in"}
            <span className="h-px w-6 bg-[#1C1C1E]" />
          </div>
          <h1 className="text-3xl font-extrabold ka text-[#5C1A2E] mt-3 tracking-tight">
            {mode === "signup" ? "შექმენი ანგარიში" : "შესვლა"}
          </h1>
          <p className="text-sm text-[#4A4A4A] mt-2 ka">
            {mode === "signup" ? "ელ-ფოსტა და პაროლი" : "კეთილი იყოს თქვენი მობრძანება."}
          </p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-4 p-6 sm:p-7 rounded-2xl bg-[#F5F4F2] border border-[#E4E2DF] shadow-[0_2px_10px_-4px_rgba(61,18,32,0.08)]"
        >
          <div>
            <Label htmlFor="email" className="ka text-xs font-semibold tracking-wide uppercase text-[#4A4A4A]">
              ელ-ფოსტა
            </Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 mt-1.5 rounded-lg bg-white border-[#E4E2DF] focus-visible:ring-[#1C1C1E]"
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="ka text-xs font-semibold tracking-wide uppercase text-[#4A4A4A]">
                პაროლი
              </Label>
              {mode === "login" && (
                <Link
                  to="/forgot-password"
                  className="ka text-xs text-[#4A4A4A] hover:text-[#5C1A2E] underline underline-offset-2 transition-colors"
                >
                  დაგავიწყდათ პაროლი?
                </Link>
              )}
            </div>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 mt-1.5 rounded-lg bg-white border-[#E4E2DF] focus-visible:ring-[#1C1C1E]"
            />
          </div>
          {mode === "signup" && (
            <div className="flex items-start gap-3">
              {/* shrink-0: without it the flex row squashes the box into a
                  sliver next to the long Georgian label on narrow phones.
                  Border darkened — #E4E2DF on the #F5F4F2 form background was
                  almost invisible, so users could not see what was blocking
                  the disabled submit button. */}
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                className="mt-0.5 shrink-0 h-5 w-5 border-2 border-[#5C1A2E]/40 data-[state=checked]:bg-[#5C1A2E] data-[state=checked]:border-[#5C1A2E] data-[state=checked]:text-[#F5F4F2]"
              />
              <Label htmlFor="terms" className="text-xs text-[#4A4A4A] ka leading-relaxed cursor-pointer">
                ვეთანხმები{" "}
                <Link to="/terms" className="underline hover:text-[#5C1A2E] transition-colors">
                  წესებს და პირობებს
                </Link>{" "}
                და{" "}
                <Link to="/privacy" className="underline hover:text-[#5C1A2E] transition-colors">
                  კონფიდენციალობის პოლიტიკას
                </Link>
              </Label>
            </div>
          )}
          <button
            type="submit"
            disabled={loading || (mode === "signup" && !termsAccepted)}
            className="group w-full inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-[#111111] text-[#F5F4F2] text-sm font-semibold tracking-wide ka hover:bg-[#161616] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
          className="w-full text-center mt-6 text-sm text-[#4A4A4A] hover:text-[#5C1A2E] transition-colors ka"
        >
          {mode === "signup" ? "უკვე მაქვს ანგარიში → შესვლა" : "ანგარიში არ მაქვს → რეგისტრაცია"}
        </button>

        <div className="flex items-center justify-center gap-4 mt-6 text-xs text-[#6B6B6B] ka">
          <Link to="/privacy" className="hover:text-[#5C1A2E] transition-colors">
            კონფიდენციალობის პოლიტიკა
          </Link>
          <span className="text-[#E4E2DF]">|</span>
          <Link to="/terms" className="hover:text-[#5C1A2E] transition-colors">
            წესები და პირობები
          </Link>
        </div>
      </div>
    </Layout>
  );
}
