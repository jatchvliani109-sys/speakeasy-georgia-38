import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Layout from "@/components/Layout";
import { toast } from "sonner";
import { z } from "zod";

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
          options: { emailRedirectTo: `${window.location.origin}/onboarding` },
        });
        if (error) throw error;
        toast.success("მოგესალმებით! 🎉");
        navigate("/onboarding");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("კეთილი იყოს თქვენი დაბრუნება!");
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
      <div className="max-w-sm mx-auto py-6">
        <h1 className="text-3xl font-extrabold text-center mb-2 ka">
          {mode === "signup" ? "შექმენი ანგარიში" : "შესვლა"}
        </h1>
        <p className="text-center text-muted-foreground mb-6 ka">
          {mode === "signup" ? "სწრაფად — მხოლოდ ელ-ფოსტა და პაროლი" : "კეთილი იყოს თქვენი მობრძანება"}
        </p>
        <form onSubmit={submit} className="space-y-4 p-6 rounded-3xl gradient-card shadow-card border border-border">
          <div>
            <Label htmlFor="email" className="ka">ელ-ფოსტა</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 mt-1.5 rounded-xl" />
          </div>
          <div>
            <Label htmlFor="password" className="ka">პაროლი</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 mt-1.5 rounded-xl" />
          </div>
          <Button type="submit" variant="hero" size="lg" className="w-full ka" disabled={loading}>
            {loading ? "..." : mode === "signup" ? "რეგისტრაცია" : "შესვლა"}
          </Button>
        </form>
        <button onClick={() => setMode(mode === "signup" ? "login" : "signup")} className="w-full text-center mt-6 text-sm text-primary hover:underline ka">
          {mode === "signup" ? "უკვე მაქვს ანგარიში → შესვლა" : "ანგარიში არ მაქვს → რეგისტრაცია"}
        </button>
      </div>
    </Layout>
  );
}
