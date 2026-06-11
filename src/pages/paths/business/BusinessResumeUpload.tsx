import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BusinessShell, { BizCard, BizButton } from "./BusinessShell";
import { pullBusinessFromSupabase, saveBusiness } from "./lib/state";

type LanguageEntry = { name: string; level: string };

type Extracted = {
  full_name: string;
  job_title: string;
  industry: string;
  technical_skills: string[];
  soft_skills: string[];
  years_of_experience: string;
  education: string;
  graduation_year: string;
  languages: LanguageEntry[];
  achievements: string[];
};

const empty: Extracted = {
  full_name: "",
  job_title: "",
  industry: "",
  technical_skills: [],
  soft_skills: [],
  years_of_experience: "",
  education: "",
  graduation_year: "",
  languages: [],
  achievements: [],
};

const ACCEPT = ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MAX_BYTES = 10 * 1024 * 1024; // 10MB

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const res = reader.result as string;
      const comma = res.indexOf(",");
      resolve(comma >= 0 ? res.slice(comma + 1) : res);
    };
    reader.readAsDataURL(file);
  });
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("ka-GE", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return iso;
  }
}

type ExistingResume = {
  id: string;
  file_name: string | null;
  created_at: string;
  full_name: string | null;
  job_title: string | null;
};

export default function BusinessResumeUpload() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [extracted, setExtracted] = useState<Extracted | null>(null);
  const [existing, setExisting] = useState<ExistingResume | null>(null);
  const [showReplace, setShowReplace] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Text inputs (comma-separated)
  const [techInput, setTechInput] = useState("");
  const [softInput, setSoftInput] = useState("");
  const [achievementsInput, setAchievementsInput] = useState("");
  const [languagesInput, setLanguagesInput] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("business_resumes")
        .select("id, file_name, created_at, full_name, job_title")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data?.id) {
        setExisting(data as ExistingResume);
        saveBusiness(user.id, { businessResumeUploaded: true } as any);
      }
      setLoaded(true);
    })();
  }, [user]);

  const validate = (f: File): string | null => {
    const ok =
      f.type === "application/pdf" ||
      f.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      f.name.toLowerCase().endsWith(".pdf") ||
      f.name.toLowerCase().endsWith(".docx");
    if (!ok) return "მხოლოდ PDF ან Word (.docx) ფაილებია ნებადართული";
    if (f.size > MAX_BYTES) return "ფაილი ძალიან დიდია — მაქსიმუმ 10MB";
    if (f.size === 0) return "ფაილი ცარიელია — სცადე სხვა";
    return null;
  };

  const formatLanguages = (langs: LanguageEntry[]) =>
    langs.map((l) => (l.level ? `${l.name} (${l.level})` : l.name)).join(", ");

  const parseLanguages = (s: string): LanguageEntry[] =>
    s
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => {
        const m = p.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
        if (m) return { name: m[1].trim(), level: m[2].trim() };
        return { name: p, level: "" };
      });

  const [storagePath, setStoragePath] = useState<string | null>(null);

  const handleFile = async (f: File) => {
    const err = validate(f);
    if (err) {
      toast.error(err);
      return;
    }
    if (!user) {
      toast.error("გთხოვ შეხვიდე ანგარიშში");
      return;
    }
    setFile(f);
    setParsing(true);
    setExtracted(null);
    setStoragePath(null);
    try {
      const base64 = await fileToBase64(f);

      // Upload raw file to private storage (best-effort, don't block extraction).
      const safeName = f.name.replace(/[^\w.\-]+/g, "_");
      const path = `${user.id}/${Date.now()}_${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("resumes")
        .upload(path, f, { upsert: true, contentType: f.type || undefined });
      if (upErr) {
        console.warn("resume storage upload failed", upErr);
      } else {
        setStoragePath(path);
      }

      const { data, error } = await supabase.functions.invoke("business-resume-parse", {
        body: { fileBase64: base64, mimeType: f.type, fileName: f.name },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.extracted) throw new Error("ვერ მოხერხდა მონაცემების ამოღება");
      const ex: Extracted = { ...empty, ...data.extracted };
      setExtracted(ex);
      setTechInput((ex.technical_skills || []).join(", "));
      setSoftInput((ex.soft_skills || []).join(", "));
      setAchievementsInput((ex.achievements || []).join("\n"));
      setLanguagesInput(formatLanguages(ex.languages || []));
    } catch (e: any) {
      console.error(e);
      const msg = String(e?.message || "");
      if (msg.includes("Unsupported")) {
        toast.error("მხოლოდ PDF ან Word (.docx) ფაილებია ნებადართული");
      } else {
        toast.error("ვერ მოხერხდა რეზიუმეს გაანალიზება. სცადე ხელახლა.");
      }
      setFile(null);
    } finally {
      setParsing(false);
    }
  };

  const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const save = async () => {
    if (!user || !extracted || !file) return;
    setSaving(true);
    try {
      const technical = techInput.split(",").map((s) => s.trim()).filter(Boolean);
      const soft = softInput.split(",").map((s) => s.trim()).filter(Boolean);
      const achievements = achievementsInput.split("\n").map((s) => s.trim()).filter(Boolean);
      const languages = parseLanguages(languagesInput);

      const row = {
        user_id: user.id,
        file_name: file.name,
        mime_type: file.type,
        storage_path: storagePath,
        full_name: extracted.full_name || null,
        job_title: extracted.job_title || null,
        industry: extracted.industry || null,
        skills: [...technical, ...soft],
        technical_skills: technical,
        soft_skills: soft,
        years_of_experience: extracted.years_of_experience || null,
        education: extracted.education || null,
        graduation_year: extracted.graduation_year || null,
        languages,
        achievements,
      };
      const { error } = await supabase.from("business_resumes").insert(row as any);
      if (error) throw error;
      saveBusiness(user.id, { businessResumeUploaded: true } as any);
      toast.success("რეზიუმე შენახულია");
      const s = await pullBusinessFromSupabase(user.id);
      if (!s.businessSelfIntroductionCompleted && !s.businessSelfIntroductionSkipped) {
        navigate("/path/business/self-introduction", { replace: true });
      } else {
        navigate("/path/business/home", { replace: true });
      }
    } catch (e: any) {
      console.error(e);
      toast.error("ვერ შევინახე. სცადე ხელახლა.");
    } finally {
      setSaving(false);
    }
  };

  const skip = () => {
    if (!user) return;
    saveBusiness(user.id, { businessResumeSkipped: true } as any);
    navigate("/path/business/self-introduction", { replace: true });
  };

  const keepExisting = () => {
    navigate("/path/business/home", { replace: true });
  };

  return (
    <BusinessShell>
      <div className="mb-6">
        <p className="ka text-[11px] uppercase tracking-wider text-[#1C1C1E] font-semibold">
          არჩევითი ნაბიჯი
        </p>
        <h1 className="ka text-2xl font-bold text-[#5C1A2E] mt-1">ატვირთე შენი რეზიუმე</h1>
        <p className="ka text-sm text-[#4A4A4A] mt-2 leading-relaxed">
          ატვირთე შენი რეზიუმე და ჩვენ მოვარგებთ ყველა გაკვეთილს შენს პროფესიულ
          გამოცდილებას. ასევე გამოგადგება Cover Letter-ების და ელ-ფოსტების დასაწერად.
        </p>
      </div>

      {/* Existing resume view */}
      {loaded && existing && !showReplace && !extracted && (
        <BizCard className="mb-4">
          <p className="ka text-[11px] uppercase tracking-wider text-[#1C1C1E] font-semibold">
            შენი ამჟამინდელი რეზიუმე
          </p>
          <div className="mt-3 p-4 rounded-xl bg-[#F8F5F0] border border-[#E0D8D0]">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#5C1A2E] text-white grid place-items-center text-sm font-bold shrink-0">
                PDF
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#5C1A2E] truncate">
                  {existing.file_name || "resume"}
                </p>
                {(existing.full_name || existing.job_title) && (
                  <p className="text-xs text-[#1C1C1E] mt-0.5 truncate">
                    {[existing.full_name, existing.job_title].filter(Boolean).join(" — ")}
                  </p>
                )}
                <p className="ka text-[11px] text-[#4A4A4A] mt-1">
                  ატვირთულია: {formatDate(existing.created_at)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3 flex-wrap">
            <BizButton variant="outline" onClick={() => setShowReplace(true)}>
              ახალი ფაილის ატვირთვა
            </BizButton>
            <BizButton onClick={keepExisting}>დატოვება და გაგრძელება</BizButton>
          </div>
        </BizCard>
      )}

      {/* Upload zone */}
      {loaded && !extracted && (!existing || showReplace) && (
        <BizCard className="mb-4">
          {showReplace && (
            <div className="mb-3 flex items-center justify-between">
              <p className="ka text-[11px] uppercase tracking-wider text-[#4A4A4A] font-semibold">
                ახალი რეზიუმე ჩაანაცვლებს ძველს
              </p>
              <button
                onClick={() => setShowReplace(false)}
                className="ka text-xs text-[#4A4A4A] hover:text-[#5C1A2E] underline underline-offset-2"
              >
                გაუქმება
              </button>
            </div>
          )}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed transition-colors p-8 text-center ${
              dragging
                ? "border-[#5C1A2E] bg-[#5C1A2E]/5"
                : "border-[#E0D8D0] hover:border-[#5C1A2E]/40 hover:bg-[#F8F5F0]"
            }`}
          >
            <div className="mx-auto w-12 h-12 rounded-full bg-[#5C1A2E]/10 grid place-items-center text-[#5C1A2E] text-xl mb-3">
              ↑
            </div>
            <p className="ka text-sm font-semibold text-[#5C1A2E]">
              {parsing ? "ვამუშავებ..." : "გადმოაგდე ფაილი ან აირჩიე"}
            </p>
            <p className="ka text-xs text-[#4A4A4A] mt-1">PDF ან Word (.docx) — მაქს. 10MB</p>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
          </div>

          {parsing && (
            <p className="ka text-xs text-[#4A4A4A] mt-3 text-center">
              მონაცემების ამოღება — შეიძლება დასჭირდეს რამდენიმე წამი...
            </p>
          )}

          {!existing && (
            <div className="mt-5 flex items-center justify-center">
              <button
                onClick={skip}
                className="ka text-xs text-[#4A4A4A] hover:text-[#5C1A2E] underline underline-offset-2"
              >
                გამოტოვება — შემდეგ ვცადო
              </button>
            </div>
          )}
        </BizCard>
      )}

      {extracted && (
        <BizCard className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="ka text-[11px] uppercase tracking-wider text-[#1C1C1E] font-semibold">
                ამოღებული მონაცემები
              </p>
              <p className="ka text-xs text-[#4A4A4A] mt-1">
                გადაამოწმე და გაასწორე საჭიროების შემთხვევაში.
              </p>
            </div>
            <button
              onClick={() => {
                setFile(null);
                setExtracted(null);
              }}
              className="ka text-xs text-[#4A4A4A] hover:text-[#5C1A2E] underline underline-offset-2"
            >
              ხელახლა ატვირთვა
            </button>
          </div>

          <Field
            label="სრული სახელი"
            value={extracted.full_name}
            onChange={(v) => setExtracted({ ...extracted, full_name: v })}
          />
          <Field
            label="ამჟამინდელი / ბოლო პოზიცია"
            value={extracted.job_title}
            onChange={(v) => setExtracted({ ...extracted, job_title: v })}
          />
          <Field
            label="სფერო"
            value={extracted.industry}
            onChange={(v) => setExtracted({ ...extracted, industry: v })}
          />
          <Field
            label="გამოცდილება"
            value={extracted.years_of_experience}
            onChange={(v) => setExtracted({ ...extracted, years_of_experience: v })}
          />
          <Field
            label="ტექნიკური უნარები (გამოყავი მძიმეებით)"
            value={techInput}
            onChange={setTechInput}
          />
          <Field
            label="Soft skills (გამოყავი მძიმეებით)"
            value={softInput}
            onChange={setSoftInput}
          />
          <Field
            label="ენები (მაგ. English (B2), German (A2))"
            value={languagesInput}
            onChange={setLanguagesInput}
          />
          <Field
            label="განათლება — ხარისხი და უნივერსიტეტი"
            value={extracted.education}
            onChange={(v) => setExtracted({ ...extracted, education: v })}
            textarea
          />
          <Field
            label="დასრულების წელი"
            value={extracted.graduation_year}
            onChange={(v) => setExtracted({ ...extracted, graduation_year: v })}
          />
          <Field
            label="მიღწევები და სერტიფიკატები (თითო ხაზზე ცალკე)"
            value={achievementsInput}
            onChange={setAchievementsInput}
            textarea
          />

          <div className="flex items-center justify-between mt-6 gap-3">
            <button
              onClick={() => {
                setFile(null);
                setExtracted(null);
              }}
              className="ka text-xs text-[#4A4A4A] hover:text-[#5C1A2E] underline underline-offset-2"
            >
              სხვა ფაილის ატვირთვა
            </button>
            <BizButton onClick={save} disabled={saving}>
              {saving ? "ვინახავ..." : "დადასტურება და გაგრძელება"}
            </BizButton>
          </div>
        </BizCard>
      )}
    </BusinessShell>
  );
}

function Field({
  label,
  value,
  onChange,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
}) {
  return (
    <div className="mb-3">
      <label className="ka block text-[11px] uppercase tracking-wider text-[#4A4A4A] font-semibold mb-1">
        {label}
      </label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 rounded-lg border border-[#E0D8D0] text-sm text-[#5C1A2E] outline-none focus:border-[#5C1A2E] bg-white resize-none"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-[#E0D8D0] text-sm text-[#5C1A2E] outline-none focus:border-[#5C1A2E] bg-white"
        />
      )}
    </div>
  );
}
