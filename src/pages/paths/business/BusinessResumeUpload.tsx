import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BusinessShell, { BizCard, BizButton } from "./BusinessShell";
import { pullBusinessFromSupabase, saveBusiness } from "./lib/state";

type Extracted = {
  full_name: string;
  job_title: string;
  industry: string;
  skills: string[];
  years_of_experience: string;
  education: string;
};

const empty: Extracted = {
  full_name: "",
  job_title: "",
  industry: "",
  skills: [],
  years_of_experience: "",
  education: "",
};

const ACCEPT = ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MAX_BYTES = 8 * 1024 * 1024; // 8MB

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

export default function BusinessResumeUpload() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [extracted, setExtracted] = useState<Extracted | null>(null);
  const [skillsInput, setSkillsInput] = useState("");

  useEffect(() => {
    if (!user) return;
    // Pre-check: if a resume was already uploaded, skip ahead
    (async () => {
      const { data } = await supabase
        .from("business_resumes")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data?.id) {
        // Mark step complete so flow advances
        saveBusiness(user.id, { businessResumeUploaded: true } as any);
      }
    })();
  }, [user]);

  const validate = (f: File): string | null => {
    const ok =
      f.type === "application/pdf" ||
      f.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      f.name.toLowerCase().endsWith(".pdf") ||
      f.name.toLowerCase().endsWith(".docx");
    if (!ok) return "მხოლოდ PDF ან Word (.docx) ფაილებია ნებადართული";
    if (f.size > MAX_BYTES) return "ფაილი ძალიან დიდია (მაქს. 8MB)";
    return null;
  };

  const handleFile = async (f: File) => {
    const err = validate(f);
    if (err) {
      toast.error(err);
      return;
    }
    setFile(f);
    setParsing(true);
    setExtracted(null);
    try {
      const base64 = await fileToBase64(f);
      const { data, error } = await supabase.functions.invoke("business-resume-parse", {
        body: { fileBase64: base64, mimeType: f.type, fileName: f.name },
      });
      if (error) throw error;
      if (!data?.extracted) throw new Error("ვერ მოხერხდა მონაცემების ამოღება");
      const ex: Extracted = { ...empty, ...data.extracted };
      setExtracted(ex);
      setSkillsInput((ex.skills || []).join(", "));
    } catch (e: any) {
      console.error(e);
      toast.error("ვერ მოხერხდა რეზიუმეს გაანალიზება. სცადე ხელახლა.");
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
      const skills = skillsInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const row = {
        user_id: user.id,
        file_name: file.name,
        mime_type: file.type,
        full_name: extracted.full_name || null,
        job_title: extracted.job_title || null,
        industry: extracted.industry || null,
        skills,
        years_of_experience: extracted.years_of_experience || null,
        education: extracted.education || null,
      };
      const { error } = await supabase.from("business_resumes").insert(row as any);
      if (error) throw error;
      saveBusiness(user.id, { businessResumeUploaded: true } as any);
      toast.success("რეზიუმე შენახულია");
      // Continue the flow
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

  return (
    <BusinessShell>
      <div className="mb-6">
        <p className="ka text-[11px] uppercase tracking-wider text-[#C9A227] font-semibold">
          არჩევითი ნაბიჯი
        </p>
        <h1 className="ka text-2xl font-bold text-[#1E2A44] mt-1">ატვირთე შენი რეზიუმე</h1>
        <p className="ka text-sm text-[#5B6473] mt-2 leading-relaxed">
          ატვირთე შენი რეზიუმე და ჩვენ მოვარგებთ ყველა გაკვეთილს შენს პროფესიულ
          გამოცდილებას. ასევე გამოგადგება Cover Letter-ების და ელ-ფოსტების დასაწერად.
        </p>
      </div>

      {!extracted && (
        <BizCard className="mb-4">
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
                ? "border-[#1E2A44] bg-[#1E2A44]/5"
                : "border-[#E7E2D5] hover:border-[#1E2A44]/40 hover:bg-[#FAF7F0]"
            }`}
          >
            <div className="mx-auto w-12 h-12 rounded-full bg-[#1E2A44]/10 grid place-items-center text-[#1E2A44] text-xl mb-3">
              ↑
            </div>
            <p className="ka text-sm font-semibold text-[#1E2A44]">
              {parsing ? "ვამუშავებ..." : "გადმოაგდე ფაილი ან აირჩიე"}
            </p>
            <p className="ka text-xs text-[#5B6473] mt-1">PDF ან Word (.docx) — მაქს. 8MB</p>
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
            <p className="ka text-xs text-[#5B6473] mt-3 text-center">
              მონაცემების ამოღება — შეიძლება დასჭირდეს რამდენიმე წამი...
            </p>
          )}

          <div className="mt-5 flex items-center justify-center">
            <button
              onClick={skip}
              className="ka text-xs text-[#5B6473] hover:text-[#1E2A44] underline underline-offset-2"
            >
              გამოტოვება — შემდეგ ვცადო
            </button>
          </div>
        </BizCard>
      )}

      {extracted && (
        <BizCard className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="ka text-[11px] uppercase tracking-wider text-[#C9A227] font-semibold">
                ამოღებული მონაცემები
              </p>
              <p className="ka text-xs text-[#5B6473] mt-1">
                გადაამოწმე და გაასწორე საჭიროების შემთხვევაში.
              </p>
            </div>
            <button
              onClick={() => {
                setFile(null);
                setExtracted(null);
              }}
              className="ka text-xs text-[#5B6473] hover:text-[#1E2A44] underline underline-offset-2"
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
            label="ძირითადი უნარები (გამოყავი მძიმეებით)"
            value={skillsInput}
            onChange={setSkillsInput}
          />
          <Field
            label="განათლება"
            value={extracted.education}
            onChange={(v) => setExtracted({ ...extracted, education: v })}
            textarea
          />

          <div className="flex items-center justify-between mt-6 gap-3">
            <button
              onClick={skip}
              className="ka text-xs text-[#5B6473] hover:text-[#1E2A44] underline underline-offset-2"
            >
              გამოტოვება
            </button>
            <BizButton onClick={save} disabled={saving}>
              {saving ? "ვინახავ..." : "შენახვა და გაგრძელება"}
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
      <label className="ka block text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold mb-1">
        {label}
      </label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 rounded-lg border border-[#E7E2D5] text-sm text-[#1E2A44] outline-none focus:border-[#1E2A44] bg-white resize-none"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-[#E7E2D5] text-sm text-[#1E2A44] outline-none focus:border-[#1E2A44] bg-white"
        />
      )}
    </div>
  );
}
