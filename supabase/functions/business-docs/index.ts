import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireUser } from "../_shared/auth.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

type Action =
  | "email_write"
  | "email_fix"
  | "cover_letter"
  | "resume_improve"
  | "bio_write"
  | "adjust";

type Profile = {
  fullName?: string;
  jobTitle?: string;
  industry?: string;
  skills?: string[];
  yearsOfExperience?: string;
  education?: string;
  rawResumeText?: string;
  level?: string;
  fields?: string[];
  goals?: string[];
};

const SYSTEM_BASE = `You are a senior professional writer helping Georgian users produce real English business documents they can actually use.
Output STRICT JSON only — no markdown, no commentary outside JSON.
Rules:
- Output the polished English document.
- Add 3-6 "highlights": short phrases from the document with a 1-line Georgian explanation of WHY they work. These are subtle learning moments.
- Tone: professional, natural, modern (not stiff, not corporate-cliche).
- Use the user's profile/resume context to personalize specifics (industry, role, skills).
- Never invent fake credentials or specific employer names not in the profile.`;

function profileBlock(p: Profile) {
  return `
USER PROFILE:
- name: ${p.fullName || "(not provided)"}
- current role: ${p.jobTitle || "(not provided)"}
- industry: ${p.industry || "(not provided)"}
- years of experience: ${p.yearsOfExperience || "(not provided)"}
- education: ${p.education || "(not provided)"}
- skills: ${(p.skills || []).join(", ") || "(not provided)"}
- english level: ${p.level || "business_intermediate"}
- learning fields: ${(p.fields || []).join(", ") || "general"}
- learning goals: ${(p.goals || []).join(", ") || "general"}
${p.rawResumeText ? `\nRESUME TEXT (truncated to 3000 chars):\n${p.rawResumeText.slice(0, 3000)}` : ""}`;
}

function emailPrompt(b: any, p: Profile) {
  return `${profileBlock(p)}

TASK: Write a professional English email.

User's intent (Georgian or simple English):
"""${b.intent}"""

Recipient: ${b.recipient || "colleague"}
Relationship: ${b.relationship || "colleague"}
Desired outcome: ${b.outcome || "clear professional communication"}
Tone preference: ${b.tone || "balanced professional"}

Return JSON:
{
  "title": "short Georgian title for saving (e.g. 'იმეილი მენეჯერთან პროექტის გადადებაზე')",
  "subject": "English subject line",
  "content": "Full email body in English with greeting, body paragraphs separated by \\n\\n, and sign-off",
  "highlights": [
    { "phrase": "exact phrase from email", "whyKa": "1-line Georgian explanation" }
  ]
}`;
}

function coverLetterPrompt(b: any, p: Profile) {
  return `${profileBlock(p)}

TASK: Write a tailored English cover letter.

Target job title: ${b.jobTitle}
${b.jobDescription ? `Job description:\n"""${b.jobDescription.slice(0, 2500)}"""` : "(No job description provided — write based on title and the user's resume.)"}

Return JSON:
{
  "title": "short Georgian title (e.g. 'სამოტივაციო წერილი — Product Manager')",
  "content": "Full English cover letter — header, greeting, 3 body paragraphs, closing. Use \\n\\n between paragraphs",
  "emphasized": ["1-3 short Georgian bullets describing which parts of their experience were emphasized and why"],
  "highlights": [
    { "phrase": "exact phrase from letter", "whyKa": "1-line Georgian explanation" }
  ]
}`;
}

function resumeImprovePrompt(b: any, p: Profile) {
  return `${profileBlock(p)}

TASK: Analyze the user's resume and give specific, actionable improvements AND produce a fully rewritten, ready-to-use version of the resume.

Resume text:
"""${(b.resumeText || p.rawResumeText || "").slice(0, 4000)}"""

${b.jobDescription ? `Target role / job description:\n"""${b.jobDescription.slice(0, 2000)}"""` : ""}

Return JSON:
{
  "title": "Georgian title (e.g. 'რეზიუმეს გაუმჯობესება')",
  "content": "Short Georgian executive summary (3-5 sentences) of the resume's strengths and main areas to improve",
  "toneAssessmentKa": "1-2 Georgian sentences about overall professional tone",
  "missingKeywords": ["English keywords missing for the target role (5-10)"],
  "suggestions": [
    {
      "sectionKa": "Georgian label of the section (e.g. 'სამუშაო გამოცდილება — Project X')",
      "issueKa": "1-line Georgian explanation of what's weak",
      "before": "exact weak phrase from the resume (English)",
      "after": "stronger English rewrite",
      "whyKa": "1-line Georgian explanation of why the rewrite is stronger"
    }
  ],
  "rewrittenResume": "FULL rewritten resume in clean plain text English. STRICT RULES: (1) Keep EXACTLY the same sections and same order as the user's original (e.g. header/name, summary, experience, education, skills, etc. — only those that exist). (2) Keep ALL same factual information (companies, dates, roles, schools, skills). Do NOT invent or remove facts. (3) Rewrite phrasing with stronger professional language and action verbs; apply all suggestions above. (4) Use clear section headers in UPPERCASE on their own line, blank line between sections. (5) For experience entries: line 1 = Role — Company — Dates; following lines = '- ' bullets. (6) Plain text only, no markdown, real line breaks.",
  "highlights": []
}
Include 4-7 suggestions. The rewrittenResume must be the COMPLETE document the user can copy and paste.`;
}

function bioPrompt(b: any, p: Profile) {
  return `${profileBlock(p)}

TASK: Write a professional bio in three lengths.

Purpose: ${b.purpose || "general professional bio (LinkedIn, portfolio, email signature)"}
Tone preference: ${b.tone || "confident, warm, professional"}

Return JSON:
{
  "title": "Georgian title (e.g. 'პროფესიული ბიო')",
  "short": "2-3 sentence English bio",
  "medium": "1 paragraph (4-6 sentences) English bio",
  "full": "2-3 paragraph English bio with line breaks (\\n\\n)",
  "content": "use the medium version as the default content",
  "highlights": [
    { "phrase": "exact phrase from bio", "whyKa": "1-line Georgian explanation" }
  ]
}`;
}

function emailFixPrompt(b: any, p: Profile) {
  return `${profileBlock(p)}

TASK: The user pasted an English email they wrote. Produce an improved, polished professional version AND explain each meaningful change so the user learns.

Original email:
"""${(b.original || "").slice(0, 4000)}"""

Recipient context: ${b.recipient || "(not provided)"}
Purpose / desired outcome: ${b.purpose || "(not provided)"}
Tone preference: ${b.tone || "balanced professional"}

Rules:
- Keep the user's intent and core content. Do not invent facts.
- Fix grammar, clarity, structure, tone, professionalism.
- Improve subject line if there was one (or propose one).
- Identify 3-8 SPECIFIC changes with concrete before/after snippets and a short Georgian explanation of WHY each change is better.

Return JSON:
{
  "title": "short Georgian title for saving (e.g. 'გასწორებული იმეილი — კლიენტს')",
  "subject": "improved English subject line (or empty string if not applicable)",
  "content": "the improved English email (greeting, body paragraphs separated by \\n\\n, sign-off)",
  "changes": [
    {
      "before": "exact snippet from the original (English)",
      "after": "improved snippet (English)",
      "whyKa": "1-line Georgian explanation of why this is better"
    }
  ],
  "summaryKa": "2-3 sentence Georgian summary of what was improved overall",
  "highlights": [
    { "phrase": "exact phrase from improved email", "whyKa": "1-line Georgian explanation" }
  ]
}`;
}

function adjustPrompt(b: any) {
  return `Rewrite the following English document with the requested adjustment. Keep the same purpose and core content. Output JSON only.

Document type: ${b.docType}
Original:
"""${b.content}"""

Adjustment: ${b.adjustment}

Return JSON:
{
  "content": "the rewritten English document",
  "highlights": [ { "phrase": "...", "whyKa": "..." } ]
}`;
}

async function callAI(system: string, user: string) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    const status = res.status === 429 || res.status === 402 ? res.status : 500;
    return { ok: false as const, status, error: `AI gateway ${res.status}`, detail: txt };
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content ?? "{}";
  try {
    return { ok: true as const, parsed: JSON.parse(content) };
  } catch {
    return { ok: true as const, parsed: { raw: content } };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const _auth = await requireUser(req);
    if (_auth.error) return _auth.error;
    const body = (await req.json()) as { action: Action; profile?: Profile } & Record<string, any>;
    const profile = body.profile || {};
    let r;
    if (body.action === "email_write") {
      r = await callAI(SYSTEM_BASE, emailPrompt(body, profile));
    } else if (body.action === "email_fix") {
      r = await callAI(SYSTEM_BASE, emailFixPrompt(body, profile));
    } else if (body.action === "cover_letter") {
      r = await callAI(SYSTEM_BASE, coverLetterPrompt(body, profile));
    } else if (body.action === "resume_improve") {
      r = await callAI(SYSTEM_BASE, resumeImprovePrompt(body, profile));
    } else if (body.action === "bio_write") {
      r = await callAI(SYSTEM_BASE, bioPrompt(body, profile));
    } else if (body.action === "adjust") {
      r = await callAI(SYSTEM_BASE, adjustPrompt(body));
    } else {
      return new Response(JSON.stringify({ error: "unknown action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!r.ok) {
      return new Response(JSON.stringify({ error: r.error, detail: r.detail }), {
        status: r.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify(r.parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
