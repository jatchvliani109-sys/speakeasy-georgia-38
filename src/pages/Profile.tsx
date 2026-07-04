import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Mail, User as UserIcon, Award, FileText, Target, Briefcase, Save, Upload, Check } from "lucide-react";
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

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [cur, prof, resume] = await Promise.all([
        pullBusinessFromSupabase(user.id),
        supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
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
      setDisplayName(prof.data?.display_name ?? "");
      setInitialName(prof.data?.display_name ?? "");
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
    return a !== b || c !== d;
  }, [s, goals, fields]);

  const toggleGoal = (g: BusinessPriority) =>
    setGoals((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  const toggleField = (f: BusinessField) =>
    setFields((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));

  const handleSave = async () => {
    if (!user || !s) return;
    setSaving(true);
    try {
      const nextPlan = s.plan ? { ...s.plan, mainGoals: goals, fields } : s.plan;
      saveBusiness(user.id, { mainPriority: goals, field: fields, plan: nextPlan ?? null });
      setS({ ...s, mainPriority: goals, field: fields, plan: nextPlan ?? null });
      toast.success("შენახულია");
    } catch (e: any) {
      toast.error(e?.message ?? "შენახვა ვერ მოხერხდა");
    } finally {
      setSaving(false);
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
    <BusinessShell seo={{ title: "ჩემი პროფილი — SpeakBusy", description: "ნახე და განაახლე შენი პროფილი, დონე, მიზნები და პროფესიული ინტერესები SpeakBusy-ზე.", path: "/profile" }}>
      <header className="mb-6">
        <p className="ka text-[11px] uppercase tracking-wider text-[#4A4A4A] font-semibold">
          ანგარიში
        </p>
        <h1 className="ka text-2xl font-bold text-[#5C1A2E] mt-1">პროფილი</h1>
      </header>

      <BizCard className="mb-4">
        <div className="flex items-start gap-4">
          <span className="w-12 h-12 rounded-full bg-[#5C1A2E] text-[#F0EBE3] grid place-items-center shrink-0 text-base font-bold">
            {(displayName || email).slice(0, 1).toUpperCase()}
          </span>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 text-[#1C1C1E]">
              <UserIcon size={14} strokeWidth={2.25} className="text-[#4A4A4A]" />
              <span className="ka font-bold text-base break-words min-w-0">{displayName || "—"}</span>
            </div>
            <div className="flex items-center gap-2 text-[#4A4A4A]">
              <Mail size={13} strokeWidth={2.25} className="shrink-0" />
              <span className="text-sm break-all min-w-0">{email}</span>
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
            className="ka text-xs font-semibold text-[#5C1A2E] border border-[#E0D8D0] rounded-md px-3 py-2 hover:bg-[#5C1A2E]/5"
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
            className="ka inline-flex items-center gap-1.5 text-xs font-semibold text-[#5C1A2E] border border-[#E0D8D0] rounded-md px-3 py-2 hover:bg-[#5C1A2E]/5"
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
                    ? "bg-[#5C1A2E] text-[#F0EBE3] border-[#5C1A2E]"
                    : "bg-white text-[#1C1C1E] border-[#E0D8D0] hover:border-[#5C1A2E]/40"
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
                    ? "bg-[#5C1A2E] text-[#F0EBE3] border-[#5C1A2E]"
                    : "bg-white text-[#1C1C1E] border-[#E0D8D0] hover:border-[#5C1A2E]/40"
                }`}
              >
                {on && <Check size={12} strokeWidth={2.5} />}
                {FIELD_LABELS[f]}
              </button>
            );
          })}
        </div>
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
