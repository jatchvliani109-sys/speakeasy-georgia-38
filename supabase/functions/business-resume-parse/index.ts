import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
// @ts-ignore - jszip via npm
import JSZip from "npm:jszip@3.10.1";
import { requireUser } from "../_shared/auth.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
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
Return a STRICT JSON object with these keys:
- full_name (string) — preserve original script exactly. If Georgian (e.g. "ნინო ბერიძე"), keep Georgian — do NOT transliterate.
- job_title (string: current or most recent role)
- industry (string: short field/industry label in English)
- technical_skills (array of 3-12 short hard skills in English where reasonable)
- soft_skills (array of 2-8 short soft skills in English)
- years_of_experience (string like "5 years", "Entry-level", or "3+ years")
- education (string: highest degree + institution, one line, original language preserved)
- graduation_year (string like "2021" or "")
- languages (array of { "name": "English", "level": "B2" } — include proficiency if mentioned, else empty string)
- achievements (array of 0-8 short strings: notable achievements, certifications, awards, publications)

Rules:
- Preserve Georgian characters exactly (UTF-8). Do NOT romanize Georgian names.
- If a field is missing, return an empty string (or empty array).
- Do not invent information.
- Respond ONLY with raw JSON.`;

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/\s/g, "");
  const bin = atob(clean);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

// Extract plain text from a .docx by reading word/document.xml inside the zip.
async function extractDocxText(bytes: Uint8Array): Promise<string> {
  const zip = await JSZip.loadAsync(bytes);
  const doc = zip.file("word/document.xml");
  if (!doc) throw new Error("Invalid .docx (missing word/document.xml)");
  const xml: string = await doc.async("string");
  // Replace paragraph/break tags with newlines, then strip remaining tags.
  const withBreaks = xml
    .replace(/<w:p[\s>][^>]*\/?>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<w:br[^>]*\/?>/g, "\n")
    .replace(/<w:tab[^>]*\/?>/g, "\t");
  const stripped = withBreaks.replace(/<[^>]+>/g, "");
  // Decode common XML entities
  const decoded = stripped
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_m, d) => String.fromCodePoint(parseInt(d, 10)));
  return decoded.replace(/\n{3,}/g, "\n\n").trim();
}

async function callOpenAI(userParts: any[]): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
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
    throw new Error(`OpenAI error ${res.status}: ${t}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || "{}";
}

async function callLovableFallback(userParts: any[]): Promise<string> {
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
  return data?.choices?.[0]?.message?.content || "{}";
}

function normalise(raw: string): ExtractedResume {
  let parsed: any = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    parsed = m ? JSON.parse(m[0]) : {};
  }
  const tech: string[] = Array.isArray(parsed.technical_skills)
    ? parsed.technical_skills.map((s: any) => String(s)).slice(0, 14)
    : [];
  const soft: string[] = Array.isArray(parsed.soft_skills)
    ? parsed.soft_skills.map((s: any) => String(s)).slice(0, 10)
    : [];
  const languages: LanguageEntry[] = Array.isArray(parsed.languages)
    ? parsed.languages
        .map((l: any) => {
          if (typeof l === "string") return { name: l, level: "" };
          return { name: String(l?.name || ""), level: String(l?.level || "") };
        })
        .filter((l: LanguageEntry) => l.name)
        .slice(0, 10)
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
      ? parsed.achievements.map((s: any) => String(s)).slice(0, 10)
      : [],
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const _auth = await requireUser(req);
    if (_auth.error) return _auth.error;
    if (!OPENAI_API_KEY && !LOVABLE_API_KEY) {
      throw new Error("No AI provider configured");
    }

    const body = await req.json();
    const fileBase64: string = body?.fileBase64;
    const mimeType: string = body?.mimeType || "";
    const fileName: string = body?.fileName || "";

    const MAX_FILE_BASE64 = 7 * 1024 * 1024; // ~5 MB decoded
    if (!fileBase64 || typeof fileBase64 !== "string") {
      return new Response(JSON.stringify({ error: "Missing fileBase64" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (fileBase64.length > MAX_FILE_BASE64) {
      return new Response(JSON.stringify({ error: "File too large (max ~5 MB)" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lower = fileName.toLowerCase();
    const isPdf = mimeType.includes("pdf") || lower.endsWith(".pdf");
    const isDocx =
      mimeType.includes("officedocument.wordprocessingml") || lower.endsWith(".docx");

    if (!isPdf && !isDocx) {
      return new Response(JSON.stringify({ error: "Unsupported file type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let rawText = "";
    let aiContent = "";

    if (isDocx) {
      const bytes = base64ToBytes(fileBase64);
      rawText = await extractDocxText(bytes);
      if (!rawText) throw new Error("Could not read text from DOCX");
      const parts = [
        {
          type: "text",
          text: `Resume text:\n\n${rawText}\n\nExtract the fields as instructed. Preserve Georgian names exactly.`,
        },
      ];
      try {
        if (OPENAI_API_KEY) aiContent = await callOpenAI(parts);
        else aiContent = await callLovableFallback(parts);
      } catch (e) {
        console.error("primary AI failed, trying fallback", e);
        if (LOVABLE_API_KEY) aiContent = await callLovableFallback(parts);
        else throw e;
      }
    } else {
      // PDF
      const dataUrl = `data:application/pdf;base64,${fileBase64}`;
      const openAiParts = [
        {
          type: "file",
          file: { filename: fileName || "resume.pdf", file_data: dataUrl },
        },
        { type: "text", text: "Extract the resume fields as instructed. Preserve Georgian names exactly." },
      ];
      try {
        if (OPENAI_API_KEY) aiContent = await callOpenAI(openAiParts);
        else throw new Error("openai not configured");
      } catch (e) {
        console.error("OpenAI PDF parse failed, falling back to Lovable Gemini", e);
        if (!LOVABLE_API_KEY) throw e;
        aiContent = await callLovableFallback(openAiParts);
      }
    }

    const extracted = normalise(aiContent);

    return new Response(JSON.stringify({ extracted, rawText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("business-resume-parse error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
