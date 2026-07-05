import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { toast } from "sonner";
import { ArrowRight, Mail, CheckCircle2 } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
      toast.error("არასწორი ელ-ფოსტა");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success("პაროლის აღდგენის ბმული გამოგზავნილია თქვენს ელფოსტაზე");
    } catch (err: any) {
      toast.error(err.message ?? "ვერ მოხერხდა გაგზავნა");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <Layout showLogout={false}>
        <SEO
          title="პაროლის აღდგენა — SpeakBusy"
          description="აღადგინე SpeakBusy-ის პაროლი ელფოსტაზე გამოგზავნილი ბმულით."
          path="/forgot-password"
        />
        <div className="max-w-sm mx-auto py-10">
          <div className="text-center mb-6">
            <span className="inline-flex w-14 h-14 rounded-full bg-[#3D1220] text-[#F8F5F0] items-center justify-center">
              <Mail className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-extrabold ka text-[#3D1220] mt-4 tracking-tight">
              შეამოწმეთ თქვენი ელ-ფოსტა
            </h1>
            <p className="text-sm text-[#4A4A4A] mt-3 ka leading-relaxed">
              პაროლის აღდგენის ბმული გამოგზავნილია თქვენს ელფოსტაზე. გთხოვთ, გადახედოთ inbox-ს და დააჭიროთ ბმულს ახალი პაროლის დასაყენებლად.
            </p>
            <p className="text-xs text-[#6B6B6B] mt-3 ka">
              გავაგზავნეთ: <span className="font-semibold text-[#3D1220]">{email}</span>
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#F8F5F0] border border-[#E0D8D0]">
            <div className="flex items-start gap-2 text-xs text-[#4A4A4A] ka">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-[#3D1220]" />
              <span>თუ არ ხედავთ წერილს, გადაამოწმეთ spam ან junk საქაღალდე.</span>
            </div>
          </div>

          <Link
            to="/auth?mode=login"
            className="block w-full text-center mt-6 text-sm text-[#4A4A4A] hover:text-[#3D1220] transition-colors ka"
          >
            ← შესვლის გვერდზე დაბრუნება
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showLogout={false}>
      <SEO
        title="პაროლის აღდგენა — SpeakBusy"
        description="აღადგინე SpeakBusy-ის პაროლი ელფოსტაზე გამოგზავნილი ბმულით."
        path="/forgot-password"
      />
      <div className="max-w-sm mx-auto py-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-[10px] font-semibold tracking-[0.22em] uppercase text-[#1C1C1E]">
            <span className="h-px w-6 bg-[#1C1C1E]" />
            Reset password
            <span className="h-px w-6 bg-[#1C1C1E]" />
          </div>
          <h1 className="text-3xl font-extrabold ka text-[#3D1220] mt-3 tracking-tight">
            პაროლის აღდგენა
          </h1>
          <p className="text-sm text-[#4A4A4A] mt-2 ka leading-relaxed">
            შეიყვანე ელ-ფოსტა და გამოგიგზავნით აღდგენის ბმულს.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-4 p-6 sm:p-7 rounded-2xl bg-[#F8F5F0] border border-[#E0D8D0] shadow-[0_2px_10px_-4px_rgba(61,18,32,0.08)]"
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
              className="h-11 mt-1.5 rounded-lg bg-white border-[#E0D8D0] focus-visible:ring-[#1C1C1E]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="group w-full inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-[#3D1220] text-[#F8F5F0] text-sm font-semibold tracking-wide ka hover:bg-[#4A1525] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                ბმულის გამოგზავნა
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </form>

        <Link
          to="/auth?mode=login"
          className="block w-full text-center mt-6 text-sm text-[#4A4A4A] hover:text-[#3D1220] transition-colors ka"
        >
          ← შესვლის გვერდზე დაბრუნება
        </Link>
      </div>
    </Layout>
  );
}
