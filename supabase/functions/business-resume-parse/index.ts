import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
// @ts-ignore - mammoth ships CJS, deno can load via npm specifier
import mammoth from "npm:mammoth@1.8.0";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

type LanguageEntry = { name: string; level: string };

type ExtractedResume = {
  full_name: string;
  job_title: string;
  industry: string;
  technical_skills: string[];
  soft_skills: string[];
  skills: string[];
  years_of_experience: string;
  education: string;
  graduation_year: string;
  languages: LanguageEntry[];
  achievements: string[];
};

const SYSTEM_PROMPT = `You are a precise multilingual resume parser. The resume may contain Georgian (ქართული), English, or both.
Read carefully and return a STRICT JSON object with these keys:
- full_name (string) — preserve the original script exactly. If the name is written in Georgian (e.g. "ნინო ბერიძე"), return it in Georgian — do NOT transliterate or translate.
- job_title (string: current or most recent role, in the original language used)
- industry (string: short field/industry label in English)
- technical_skills (array of 3-10 short technical/hard skills in English where reasonable)
- soft_skills (array of 2-6 short soft skills in English)
- years_of_experience (string like "5 years", "Entry-level", or "3+ years")
- education (string: highest degree + institution, one line, original language preserved)
- graduation_year (string like "2021" or "" if not stated)
- languages (array of { "name": "English", "level": "B2" } — include proficiency if mentioned, else empty string for level)
- achievements (array of 0-6 short strings: notable achievements, certifications, awards, publications)

Rules:
- Preserve Georgian characters exactly (UTF-8). Do NOT romanize Georgian names.
- If a field is missing, return an empty string (or empty array).
- Do not invent information.
- Respond ONLY with raw JSON, no markdown.`;

async function parseDocxToText(base64: string): Promise<string> {
  const bin = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const result = await mammoth.extractRawText({ arrayBuffer: bin.buffer });
  return (result?.value || "").trim();
}

async function extractWithAI(payload: {
  textContent?: string;
  pdfBase64?: string;
}): Promise<ExtractedResume> {
  const userParts: any[] = [];
  if (payload.pdfBase64) {
    userParts.push({
      type: "file",
      file: { filename: "resume.pdf", file_data: `data:application/pdf;base64,${payload.pdfBase64}` },
    });
    userParts.push({ type: "text", text: "Extract the resume fields as instructed. Preserve Georgian names exactly." });
  } else {
    userParts.push({
      type: "text",
      text: `Resume text:\n\n${payload.textContent}\n\nExtract the fields as instructed. Preserve Georgian names exactly.`,
    });
  }

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userParts },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI gateway error ${res.status}: ${t}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content || "{}";
  let parsed: any = {};
  try {
    parsed = JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    parsed = match ? JSON.parse(match[0]) : {};
  }

  const tech: string[] = Array.isArray(parsed.technical_skills)
    ? parsed.technical_skills.map((s: any) => String(s)).slice(0, 12)
    : [];
  const soft: string[] = Array.isArray(parsed.soft_skills)
    ? parsed.soft_skills.map((s: any) => String(s)).slice(0, 8)
    : [];

  const languages: LanguageEntry[] = Array.isArray(parsed.languages)
    ? parsed.languages
        .map((l: any) => {
          if (typeof l === "string") return { name: l, level: "" };
          return { name: String(l?.name || ""), level: String(l?.level || "") };
        })
        .filter((l: LanguageEntry) => l.name)
        .slice(0, 8)
    : [];

  return {
    full_name: String(parsed.full_name || ""),
    job_title: String(parsed.job_title || ""),
    industry: String(parsed.industry || ""),
    technical_skills: tech,
    soft_skills: soft,
    skills: [...tech, ...soft],
    years_of_experience: String(parsed.years_of_experience || ""),
    education: String(parsed.education || ""),
    graduation_year: String(parsed.graduation_year || ""),
    languages,
    achievements: Array.isArray(parsed.achievements)
      ? parsed.achievements.map((s: any) => String(s)).slice(0, 8)
      : [],
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const body = await req.json();
    const fileBase64: string = body?.fileBase64;
    const mimeType: string = body?.mimeType || "";
    const fileName: string = body?.fileName || "";

    if (!fileBase64 || typeof fileBase64 !== "string") {
      return new Response(JSON.stringify({ error: "Missing fileBase64" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isPdf = mimeType.includes("pdf") || fileName.toLowerCase().endsWith(".pdf");
    const isDocx =
      mimeType.includes("officedocument.wordprocessingml") ||
      fileName.toLowerCase().endsWith(".docx");

    if (!isPdf && !isDocx) {
      return new Response(JSON.stringify({ error: "Unsupported file type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let rawText = "";
    let extracted: ExtractedResume;

    if (isDocx) {
      rawText = await parseDocxToText(fileBase64);
      if (!rawText) throw new Error("Could not read text from DOCX");
      extracted = await extractWithAI({ textContent: rawText });
    } else {
      extracted = await extractWithAI({ pdfBase64: fileBase64 });
    }

    return new Response(
      JSON.stringify({ extracted, rawText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("business-resume-parse error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
