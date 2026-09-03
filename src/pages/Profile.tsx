import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, User as UserIcon, Award, FileText, Target, Briefcase, Save, Upload, Check, KeyRound, ShieldCheck, LifeBuoy, Trash2, AlertTriangle, Download, AtSign, Instagram, MessageCircle, CreditCard, Star } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import BusinessShell, { BizCard, BizButton } from "./paths/business/BusinessShell";
import {
  BusinessField,
  BusinessPriority,
  BusinessState,
  FIELD_LABELS,
  LEVEL_LABELS,
  PRIORITY_LABELS,
  pullBusinessFromSupabase,
  saveBusiness,
} from "./paths/business/lib/state";
import { toast } from "sonner";

export default function Profile() {
  const { user } = useAuth();
  const [s, setS] = useState<BusinessState | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const [initialName, setInitialName] = useState<string>("");
  const [hasResume, setHasResume] = useState<boolean>(false);
  const [resumeName, setResumeName] = useState<string | null>(null);
  const [goals, setGoals] = useState<BusinessPriority[]>([]);
  const [fields, setFields] = useState<BusinessField[]>([]);
  const [saving, setSaving] = useState(false);
  // Password change
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  // Subscription. Managed here rather than on the premium page because that is
  // where people look for it: settings, alongside password and account deletion.
  const [sub, setSub] = useState<{
    status: string;
    masked_card: string | null;
    current_period_end: string | null;
  } | null>(null);
  const [subBusy, setSubBusy] = useState(false);

  const loadSubscription = async () => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase
        .from("subscriptions" as any)
        .select("status, masked_card, current_period_end")
        .maybeSingle();
      setSub((data as any) ?? null);
    } catch { /* table absent in older environments */ }
  };

  useEffect(() => { if (user) loadSubscription(); }, [user]);

  /**
   * Two distinct actions:
   *   cancel      stop future charges, keep access to period end, card stays
   *   delete_card remove the stored card, which also ends the subscription
   */
  const manageSubscription = async (action: "cancel" | "delete_card") => {
    if (subBusy) return;
    const msg = action === "cancel"
      ? "გამოწერის გაუქმება? ავტომატური გადახდა შეწყდება, პრემიუმით ისარგებლებ გადახდილი პერიოდის ბოლომდე."
      : "ბარათის წაშლა? შენახული ბარათი წაიშლება და გამოწერაც გაუქმდება.";
    if (!confirm(msg)) return;
    setSubBusy(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase.functions.invoke("flitt-cancel", { body: { action } });
      if (error) throw error;
      await loadSubscription();
      toast.success(action === "cancel" ? "გამოწერა გაუქმდა" : "ბარათი წაიშალა");
    } catch (e: any) {
      toast.error(e?.message ?? "ვერ მოხერხდა");
    } finally {
      setSubBusy(false);
    }
  };

  // Data export (right to portability)
  const [exporting, setExporting] = useState(false);
  // Email change
  const [newEmail, setNewEmail] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  // Account deletion
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [cur, prof, resume] = await Promise.all([
        pullBusinessFromSupabase(user.id),
        supabase.from("profiles").select("first_name, display_name").eq("id", user.id).maybeSingle(),
        supabase
          .from("business_resumes")
          .select("file_name, full_name")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      setS(cur);
      setGoals(cur.mainPriority || []);
      setFields(cur.field || []);
      const currentName = ((prof.data as any)?.first_name ?? prof.data?.display_name ?? "").toString();
      setDisplayName(currentName);
      setInitialName(currentName);
      setHasResume(!!resume.data);
      setResumeName(resume.data?.file_name ?? resume.data?.full_name ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const email = user?.email ?? "";
  const level = s?.plan?.level ?? s?.level ?? null;

  const dirty = useMemo(() => {
    if (!s) return false;
    const a = [...goals].sort().join(",");
    const b = [...(s.mainPriority || [])].sort().join(",");
    const c = [...fields].sort().join(",");
    const d = [...(s.field || [])].sort().join(",");
    const nameChanged = displayName.trim() !== initialName.trim();
    return a !== b || c !== d || nameChanged;
  }, [s, goals, fields, displayName, initialName]);

  const toggleGoal = (g: BusinessPriority) =>
    setGoals((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  const toggleField = (f: BusinessField) =>
    setFields((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));

  const handleSave = async () => {
    if (!user || !s) return;
    const cleanName = displayName.trim();
    if (!cleanName) {
      toast.error("სახელი არ შეიძლება იყოს ცარიელი");
      return;
    }
    setSaving(true);
    try {
      const nextPlan = s.plan ? { ...s.plan, mainGoals: goals, fields } : s.plan;
      saveBusiness(user.id, { mainPriority: goals, field: fields, plan: nextPlan ?? null });
      if (cleanName !== initialName.trim()) {
        const { error } = await supabase.from("profiles").update({ first_name: cleanName, display_name: cleanName } as any).eq("id", user.id);
        if (error) throw error;
        setInitialName(cleanName);
      }
      setS({ ...s, mainPriority: goals, field: fields, plan: nextPlan ?? null });
      toast.success("შენახულია");
    } catch (e: any) {
      toast.error(e?.message ?? "შენახვა ვერ მოხერხდა");
    } finally {
      setSaving(false);
    }
  };

  // Right to data portability. RLS guarantees a user can only read their own
  // rows, so this runs client-side — no edge function or elevated key needed.
  // The table list mirrors delete-account, so "what you can export" and "what
  // gets deleted" can never drift apart.
  const EXPORT_TABLES = [
    "business_vocab_progress", "business_vocab_sessions", "business_interview_sessions",
    "business_meeting_sessions", "business_presentation_sessions", "business_email_sessions",
    "business_documents", "business_reassessments", "business_resumes", "business_state",
    "vocabulary", "lessons", "level_test_results", "mistakes", "onboarding_answers",
    "pronunciation_attempts", "speaking_scenario_progress",
  ];

  const handleExport = async () => {
    if (!user || exporting) return;
    setExporting(true);
    try {
      const bundle: Record<string, unknown> = {
        exportedAt: new Date().toISOString(),
        account: { id: user.id, email: user.email, createdAt: (user as any).created_at ?? null },
      };
      for (const table of EXPORT_TABLES) {
        const { data, error } = await supabase.from(table as any).select("*").eq("user_id", user.id);
        // A table that does not exist in this project is skipped, not fatal.
        if (!error) bundle[table] = data ?? [];
      }
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id);
      bundle["profiles"] = prof ?? [];

      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `speakbusy-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("მონაცემები ჩამოიტვირთა");
    } catch (e: any) {
      toast.error(e?.message ?? "ჩამოტვირთვა ვერ მოხერხდა");
    } finally {
      setExporting(false);
    }
  };

  // Email change. Supabase sends a confirmation to the NEW address; the change
  // only takes effect once that link is clicked, so the old address stays
  // active until then.
  const handleEmailChange = async () => {
    if (emailBusy) return;
    const clean = newEmail.trim();
    if (!clean || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) {
      toast.error("შეიყვანე სწორი ელფოსტა");
      return;
    }
    if (clean.toLowerCase() === (user?.email ?? "").toLowerCase()) {
      toast.error("ეს უკვე შენი ელფოსტაა");
      return;
    }
    setEmailBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: clean });
      if (error) throw error;
      setNewEmail("");
      toast.success("დადასტურების ბმული გაიგზავნა ახალ ელფოსტაზე");
    } catch (e: any) {
      toast.error(e?.message ?? "ელფოსტის შეცვლა ვერ მოხერხდა");
    } finally {
      setEmailBusy(false);
    }
  };

  const handlePasswordChange = async () => {
    if (pwBusy) return;
    if (newPassword.length < 8) {
      toast.error("პაროლი უნდა შეიცავდეს მინიმუმ 8 სიმბოლოს");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("პაროლები არ ემთხვევა");
      return;
    }
    setPwBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      toast.success("პაროლი შეიცვალა");
    } catch (e: any) {
      toast.error(e?.message ?? "პაროლის შეცვლა ვერ მოხერხდა");
    } finally {
      setPwBusy(false);
    }
  };

  // Deletion runs through an edge function: removing the auth account needs the
  // service role key, which cannot live in the browser.
  const handleDeleteAccount = async () => {
    if (deleting) return;
    if (deleteConfirm.trim() !== "წაშლა") {
      toast.error("დასადასტურებლად ჩაწერე: წაშლა");
      return;
    }
    setDeleting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("სესია ვერ მოიძებნა — გამოდი და თავიდან შედი");

      const { data, error } = await supabase.functions.invoke("delete-account", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      await supabase.auth.signOut();
      toast.success("ანგარიში წაშლილია");
      navigate("/", { replace: true });
    } catch (e: any) {
      toast.error(e?.message ?? "წაშლა ვერ მოხერხდა — დაგვიკავშირდი");
      setDeleting(false);
    }
  };

  if (!user || !s) {
    return (
      <BusinessShell>
        <div className="ka text-[#4A4A4A]">იტვირთება...</div>
      </BusinessShell>
    );
  }

  return (
    <BusinessShell seo={{ title: "ჩემი პროფილი — SpeakBusy", description: "ნახე და განაახლე შენი პროფილი, დონე, მიზნები და პროფესიონალური ინტერესები SpeakBusy-ზე.", path: "/profile" }}>
      <header className="mb-6">
        <p className="ka text-[11px] uppercase tracking-wider text-[#4A4A4A] font-semibold">
          ანგარიში
        </p>
        <h1 className="ka text-2xl font-bold text-[#5C1A2E] mt-1">პროფილი</h1>
      </header>

      <BizCard className="mb-4">
        <div className="flex items-start gap-4">
          <span className="w-12 h-12 rounded-full bg-[#232323] text-[#F5F4F2] grid place-items-center shrink-0 text-base font-bold">
            {(displayName || email).slice(0, 1).toUpperCase()}
          </span>
          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <label htmlFor="profile-name" className="ka text-[11px] uppercase tracking-wider text-[#4A4A4A] font-semibold flex items-center gap-1.5">
                <UserIcon size={12} strokeWidth={2.25} />
                სახელი
              </label>
              <input
                id="profile-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={60}
                placeholder="შენი სახელი"
                className="ka mt-1 w-full px-3 py-2 rounded-md border border-[#E4E2DF] focus:border-[#5C1A2E] focus:outline-none text-[#1C1C1E] text-sm bg-white"
              />
            </div>
            <div className="flex items-center gap-2 text-[#4A4A4A]">
              <Mail size={13} strokeWidth={2.25} className="shrink-0" />
              <span className="text-sm break-all min-w-0">{email}</span>
            </div>
            <div>
              <label htmlFor="new-email" className="ka text-[11px] uppercase tracking-wider text-[#4A4A4A] font-semibold flex items-center gap-1.5">
                <AtSign size={12} strokeWidth={2.25} />
                ელფოსტის შეცვლა
              </label>
              <div className="flex gap-2 mt-1">
                <input
                  id="new-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="ახალი ელფოსტა"
                  autoComplete="email"
                  className="ka flex-1 min-w-0 px-3 py-2 rounded-md border border-[#E4E2DF] focus:border-[#5C1A2E] focus:outline-none text-[#1C1C1E] text-sm bg-white"
                />
                <button
                  onClick={handleEmailChange}
                  disabled={emailBusy || !newEmail.trim()}
                  className="ka shrink-0 px-3 py-2 rounded-md bg-[#232323] text-[#F5F4F2] text-xs font-semibold disabled:opacity-40"
                >
                  {emailBusy ? "..." : "შეცვლა"}
                </button>
              </div>
              <p className="ka text-[11px] text-[#8A8A8A] mt-1 leading-relaxed">
                დადასტურების ბმული გაიგზავნება ახალ მისამართზე. ცვლილება ძალაში შევა
                მხოლოდ ბმულზე დაჭერის შემდეგ.
              </p>
            </div>
          </div>
        </div>
      </BizCard>

      <BizCard className="mb-4">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-md bg-[#5C1A2E]/10 text-[#5C1A2E] grid place-items-center shrink-0">
            <Award size={16} strokeWidth={2.25} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="ka text-[11px] uppercase tracking-wider text-[#4A4A4A] font-semibold">
              მიმდინარე დონე
            </p>
            <p className="ka font-bold text-[#5C1A2E] text-base mt-0.5">
              {level ? LEVEL_LABELS[level] : "ჯერ არ შეფასებულა"}
            </p>
          </div>
          <Link
            to="/path/business/reassessment"
            className="ka text-xs font-semibold text-[#5C1A2E] border border-[#E4E2DF] rounded-md px-3 py-2 hover:bg-[#5C1A2E]/5"
          >
            შეფასება
          </Link>
        </div>
      </BizCard>

      <BizCard className="mb-4">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-md bg-[#5C1A2E]/10 text-[#5C1A2E] grid place-items-center shrink-0">
            <FileText size={16} strokeWidth={2.25} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="ka text-[11px] uppercase tracking-wider text-[#4A4A4A] font-semibold">
              რეზიუმე
            </p>
            <p className="ka text-sm text-[#1C1C1E] mt-0.5 break-words line-clamp-2">
              {hasResume ? resumeName || "ატვირთულია" : "ჯერ არ ატვირთულა"}
            </p>
          </div>
          <Link
            to="/path/business/resume"
            className="ka inline-flex items-center gap-1.5 text-xs font-semibold text-[#5C1A2E] border border-[#E4E2DF] rounded-md px-3 py-2 hover:bg-[#5C1A2E]/5"
          >
            <Upload size={12} strokeWidth={2.25} />
            {hasResume ? "განახლება" : "ატვირთვა"}
          </Link>
        </div>
      </BizCard>

      <BizCard className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Target size={14} strokeWidth={2.25} className="text-[#5C1A2E]" />
          <h2 className="ka font-bold text-[#5C1A2E] text-sm">მიზნები</h2>
        </div>
        <p className="ka text-xs text-[#4A4A4A] mb-3">აირჩიე რა მიმართულებებზე გინდა ფოკუსირება.</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(PRIORITY_LABELS) as BusinessPriority[]).map((g) => {
            const on = goals.includes(g);
            return (
              <button
                key={g}
                onClick={() => toggleGoal(g)}
                className={`ka inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-colors border ${
                  on
                    ? "bg-[#232323] text-[#F5F4F2] border-[#5C1A2E]"
                    : "bg-white text-[#1C1C1E] border-[#E4E2DF] hover:border-[#5C1A2E]/40"
                }`}
              >
                {on && <Check size={12} strokeWidth={2.5} />}
                {PRIORITY_LABELS[g]}
              </button>
            );
          })}
        </div>
      </BizCard>

      <BizCard className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Briefcase size={14} strokeWidth={2.25} className="text-[#5C1A2E]" />
          <h2 className="ka font-bold text-[#5C1A2E] text-sm">სფეროები</h2>
        </div>
        <p className="ka text-xs text-[#4A4A4A] mb-3">რომელ ბიზნეს სფეროებთან გაქვს საქმე.</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(FIELD_LABELS) as BusinessField[]).map((f) => {
            const on = fields.includes(f);
            return (
              <button
                key={f}
                onClick={() => toggleField(f)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-colors border ${
                  on
                    ? "bg-[#232323] text-[#F5F4F2] border-[#5C1A2E]"
                    : "bg-white text-[#1C1C1E] border-[#E4E2DF] hover:border-[#5C1A2E]/40"
                }`}
              >
                {on && <Check size={12} strokeWidth={2.5} />}
                {FIELD_LABELS[f]}
              </button>
            );
          })}
        </div>
      </BizCard>

      <BizCard className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <KeyRound size={14} strokeWidth={2.25} className="text-[#5C1A2E]" />
          <h2 className="ka font-bold text-[#5C1A2E] text-sm">პაროლის შეცვლა</h2>
        </div>
        <div className="space-y-2">
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="ახალი პაროლი"
            autoComplete="new-password"
            className="ka w-full px-3 py-2 rounded-md border border-[#E4E2DF] focus:border-[#5C1A2E] focus:outline-none text-[#1C1C1E] text-sm bg-white"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="გაიმეორე ახალი პაროლი"
            autoComplete="new-password"
            className="ka w-full px-3 py-2 rounded-md border border-[#E4E2DF] focus:border-[#5C1A2E] focus:outline-none text-[#1C1C1E] text-sm bg-white"
          />
          <button
            onClick={handlePasswordChange}
            disabled={pwBusy || !newPassword || !confirmPassword}
            className="ka w-full px-3 py-2 rounded-md bg-[#232323] text-[#F5F4F2] text-xs font-semibold disabled:opacity-40"
          >
            {pwBusy ? "ინახება..." : "პაროლის განახლება"}
          </button>
        </div>
      </BizCard>

      <BizCard className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck size={14} strokeWidth={2.25} className="text-[#5C1A2E]" />
          <h2 className="ka font-bold text-[#5C1A2E] text-sm">დახმარება და პირობები</h2>
        </div>
        <div className="flex flex-col gap-2">
          <a
            href="mailto:speakbusy@gmail.com"
            className="ka inline-flex items-center gap-2 text-sm text-[#5C1A2E] font-semibold"
          >
            <LifeBuoy size={13} strokeWidth={2.25} />
            დახმარება — დაგვიკავშირდი
          </a>

          {/* Feedback is invited explicitly. A user who is already in their
              profile is the one most likely to have an opinion worth hearing. */}
          <div className="pt-3 mt-1 border-t border-[#E4E2DF]">
            <p className="ka text-xs text-[#4A4A4A] leading-relaxed">
              <MessageCircle size={12} strokeWidth={2.25} className="inline -mt-0.5 mr-1 text-[#5C1A2E]" />
              აპლიკაცია ჯერ ახალია — თუ რამე გაწუხებს ან იდეა გაქვს, აუცილებლად მოგვწერე.
            </p>
            <div className="flex items-center gap-2 mt-2.5">
              <a
                href="https://www.instagram.com/speakbusy/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#E4E2DF] text-[#5C1A2E] text-xs font-semibold hover:bg-[#5C1A2E]/5 transition-colors"
              >
                <Instagram size={13} strokeWidth={2.25} />
                Instagram
              </a>
              <a
                href="https://www.tiktok.com/@speakbusy"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#E4E2DF] text-[#5C1A2E] text-xs font-semibold hover:bg-[#5C1A2E]/5 transition-colors"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.59 2.59 0 1 1 .77-5.06V9.7a5.66 5.66 0 0 0-.77-.05 5.68 5.68 0 1 0 5.68 5.68V8.99a7.35 7.35 0 0 0 4.29 1.37V7.27a4.29 4.29 0 0 1-3.23-1.45z" />
                </svg>
                TikTok
              </a>
            </div>
          </div>
          <Link to="/privacy" className="ka text-sm text-[#4A4A4A] hover:text-[#5C1A2E]">
            კონფიდენციალობის პოლიტიკა
          </Link>
          <Link to="/terms" className="ka text-sm text-[#4A4A4A] hover:text-[#5C1A2E]">
            წესები და პირობები
          </Link>
        </div>
      </BizCard>

      {/* SUBSCRIPTION
          Cancelling and removing a card are separate, because they are separate
          decisions: someone may want to stop paying while keeping the card on
          file for later, or remove the card entirely. Consumer law also requires
          cancellation to be as easy as subscribing was. */}
      <BizCard className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Star size={14} strokeWidth={2.25} className="text-[#C9A84C]" />
          <h2 className="ka font-bold text-[#5C1A2E] text-sm">გამოწერა</h2>
        </div>

        {(() => {
          // THREE states, not two. The earlier version treated "cancelled" as
          // "no subscription", which hid the saved card even though cancelling
          // deliberately keeps it. The card looked deleted when it was not.
          const periodEnd = sub?.current_period_end ? new Date(sub.current_period_end) : null;
          const stillInPeriod = !!periodEnd && periodEnd > new Date();
          const active = sub?.status === "active";
          const cancelledButActive = sub?.status === "cancelled" && stillInPeriod;

          // 1 — nothing to manage
          if (!sub || (!active && !cancelledButActive && !sub.masked_card)) {
            return (
              <>
                <p className="ka text-xs text-[#4A4A4A] mt-1 leading-relaxed">
                  აქტიური გამოწერა არ გაქვს. უფასო ვერსიით სარგებლობ.
                </p>
                <Link
                  to="/path/business/premium"
                  className="ka inline-block mt-3 px-3 py-2 rounded-md bg-[#5C1A2E] text-[#F8F5F0] text-xs font-bold"
                >
                  პრემიუმის ნახვა
                </Link>
              </>
            );
          }

          // 2 & 3 — active, or cancelled with access remaining
          return (
            <>
              <p className="ka text-xs text-[#4A4A4A] mt-1 mb-3 leading-relaxed">
                {active ? (
                  <>
                    პრემიუმი აქტიურია.
                    {periodEnd && ` შემდეგი გადახდა: ${periodEnd.toLocaleDateString("ka-GE")}.`}
                  </>
                ) : (
                  <>
                    გამოწერა გაუქმებულია, ავტომატური გადახდა აღარ მოხდება.
                    {periodEnd && ` პრემიუმი აქტიურია ${periodEnd.toLocaleDateString("ka-GE")}-მდე.`}
                  </>
                )}
              </p>

              {sub.masked_card && (
                <div className="flex items-center gap-3 rounded-lg border border-[#E4E2DF] bg-[#F8F5F0] px-3 py-2.5 mb-3">
                  <CreditCard size={16} strokeWidth={2} className="text-[#5C1A2E] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#1C1C1E] tabular-nums truncate">
                      {sub.masked_card}
                    </p>
                    <p className="ka text-[10px] text-[#8A8A8A]">
                      {active
                        ? "სრული მონაცემები ჩვენთან არ ინახება"
                        : "ბარათი შენახულია, გადახდა აღარ მოხდება"}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {active && (
                  <button
                    onClick={() => manageSubscription("cancel")}
                    disabled={subBusy}
                    className="ka px-3 py-2 rounded-md border border-[#E4E2DF] text-[#4A4A4A] text-xs font-semibold hover:border-[#5C1A2E]/40 disabled:opacity-50"
                  >
                    {subBusy ? "..." : "გამოწერის გაუქმება"}
                  </button>
                )}
                {!active && (
                  <Link
                    to="/path/business/premium"
                    className="ka px-3 py-2 rounded-md bg-[#5C1A2E] text-[#F8F5F0] text-xs font-bold"
                  >
                    გამოწერის განახლება
                  </Link>
                )}
                {sub.masked_card && (
                  <button
                    onClick={() => manageSubscription("delete_card")}
                    disabled={subBusy}
                    className="ka px-3 py-2 rounded-md border border-[#C0392B]/40 text-[#C0392B] text-xs font-semibold hover:bg-[#C0392B]/5 disabled:opacity-50"
                  >
                    {subBusy ? "..." : "ბარათის წაშლა"}
                  </button>
                )}
              </div>

              <p className="ka text-[11px] text-[#8A8A8A] mt-3 leading-relaxed">
                გაუქმებისას ავტომატური გადახდა წყდება, ბარათი კი შენახული რჩება,
                რომ განახლება მარტივი იყოს. ბარათის წაშლისას ორივე უქმდება.
              </p>
            </>
          );
        })()}
      </BizCard>

      <BizCard className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Download size={14} strokeWidth={2.25} className="text-[#5C1A2E]" />
          <h2 className="ka font-bold text-[#5C1A2E] text-sm">ჩემი მონაცემების ჩამოტვირთვა</h2>
        </div>
        <p className="ka text-xs text-[#4A4A4A] mb-3 leading-relaxed">
          ჩამოტვირთე ყველა შენი მონაცემი — პროფილი, პროგრესი, სესიები და შენახული
          დოკუმენტები — JSON ფაილად.
        </p>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="ka inline-flex items-center gap-2 px-3 py-2 rounded-md border border-[#E4E2DF] text-[#5C1A2E] text-xs font-semibold hover:bg-[#5C1A2E]/5 disabled:opacity-40"
        >
          <Download size={12} strokeWidth={2.25} />
          {exporting ? "მზადდება..." : "ჩამოტვირთვა"}
        </button>
      </BizCard>

      <BizCard className="mb-4 border-[#C0392B]/30">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={14} strokeWidth={2.25} className="text-[#C0392B]" />
          <h2 className="ka font-bold text-[#C0392B] text-sm">ანგარიშის წაშლა</h2>
        </div>
        <p className="ka text-xs text-[#4A4A4A] mb-3 leading-relaxed">
          წაშლა საბოლოოა. წაიშლება შენი პროფილი, ნასწავლი სიტყვები, პროგრესი, რეზიუმე და
          ყველა სესია. დაბრუნება შეუძლებელია.
        </p>
        {!deleteOpen ? (
          <button
            onClick={() => setDeleteOpen(true)}
            className="ka inline-flex items-center gap-2 px-3 py-2 rounded-md border border-[#C0392B]/40 text-[#C0392B] text-xs font-semibold hover:bg-[#C0392B]/5"
          >
            <Trash2 size={12} strokeWidth={2.25} />
            ანგარიშის წაშლა
          </button>
        ) : (
          <div className="space-y-2">
            <p className="ka text-xs text-[#1C1C1E] font-semibold">
              დასადასტურებლად ჩაწერე სიტყვა: წაშლა
            </p>
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="წაშლა"
              className="ka w-full px-3 py-2 rounded-md border border-[#C0392B]/40 focus:border-[#C0392B] focus:outline-none text-[#1C1C1E] text-sm bg-white"
            />
            <div className="flex gap-2">
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirm.trim() !== "წაშლა"}
                className="ka flex-1 px-3 py-2 rounded-md bg-[#C0392B] text-white text-xs font-bold disabled:opacity-40"
              >
                {deleting ? "იშლება..." : "საბოლოოდ წაშლა"}
              </button>
              <button
                onClick={() => { setDeleteOpen(false); setDeleteConfirm(""); }}
                disabled={deleting}
                className="ka px-3 py-2 rounded-md border border-[#E4E2DF] text-[#4A4A4A] text-xs font-semibold"
              >
                გაუქმება
              </button>
            </div>
          </div>
        )}
      </BizCard>

      <div className="sticky bottom-4 flex justify-end">
        <BizButton onClick={handleSave} disabled={!dirty || saving}>
          <Save size={14} strokeWidth={2.25} />
          {saving ? "ინახება..." : "ცვლილებების შენახვა"}
        </BizButton>
      </div>
    </BusinessShell>
  );
}
