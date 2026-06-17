import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireUser } from "../_shared/auth.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

type Body = {
  purpose: string;
  name: string;
  status: string;
  field: string;
  experience: string;
  skills: string;
  goal: string;
  level?: string;
  businessPriority?: string;
  variant?: "all" | "shorter" | "simpler" | "more_professional" | "improve";
  baseText?: string;
};

const SYSTEM = `You write realistic English professional self-introductions for Georgian learners.
LEVEL RULES (strict):
- business_beginner: very simple A1-A2 English. Short sentences (max ~8 words). Only basic vocabulary. Georgian translation MUST fully explain meaning. Phrase explanations longer and fully in Georgian.
- business_elementary: A2-B1. Simple professional sentences, short, with a couple of useful phrases. Georgian explanations still detailed.
- business_intermediate: B1-B2. Natural professional tone. Slightly longer sentences. Georgian explanations only for harder phrases.
- business_advanced: B2-C1. Polished, confident, concise. Subtle professional nuance. Georgian explanations only when phrase is non-obvious; include short tone notes in Georgian.
General:
- Never invent experience the user did not provide. If they have none, say they are learning / studying.
- Avoid AI cliches ("passionate", "results-driven", "hard-working individual").
- Keep it usable in real life.
- Always reply with valid JSON only, no markdown, no comments.`;

function buildPrompt(b: Body): string {
  return `Generate a professional self-introduction.

Purpose: ${b.purpose}
Name: ${b.name}
Current status: ${b.status}
Field / profession: ${b.field}
Experience: ${b.experience || "none yet"}
Skills: ${b.skills}
Goal: ${b.goal}
English level: ${b.level || "intermediate"}
Business priority: ${b.businessPriority || "general"}

Return JSON with this exact shape:
{
  "short":    { "en": "20-30s version", "ka": "Georgian translation" },
  "standard": { "en": "45-60s version", "ka": "Georgian translation" },
  "polished": { "en": "more confident professional version", "ka": "Georgian translation" },
  "phrases": [
    { "en": "phrase", "ka": "Georgian translation",
      "explanationKa": "short Georgian explanation of when to use it",
      "exampleEn": "example sentence", "exampleKa": "Georgian translation of example" }
  ]
}
Include 4-6 useful phrases drawn from the introductions.`;
}

function rewritePrompt(b: Body): string {
  const mode = b.variant;
  const instruction =
    mode === "shorter" ? "Make it noticeably shorter (about 20 seconds) while keeping key facts."
    : mode === "simpler" ? "Rewrite using simpler English (A2/B1) — short sentences, common words."
    : mode === "more_professional" ? "Rewrite in a more professional, confident tone (no exaggeration)."
    : "Improve fluency and naturalness without changing the facts.";
  return `${instruction}

Original:
"""${b.baseText}"""

Speaker context:
Name: ${b.name}; Status: ${b.status}; Field: ${b.field};
Skills: ${b.skills}; Experience: ${b.experience || "none"}; Goal: ${b.goal}.

Return JSON:
{ "en": "rewritten english", "ka": "Georgian translation" }`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const _auth = await requireUser(req);
    if (_auth.error) return _auth.error;
    const body = (await req.json()) as Body;
    const isRewrite = body.variant && body.variant !== "all" && body.baseText;
    const userPrompt = isRewrite ? rewritePrompt(body) : buildPrompt(body);

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      return new Response(JSON.stringify({ error: `AI gateway ${res.status}`, detail: txt }), {
        status: res.status === 429 || res.status === 402 ? res.status : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed: unknown;
    try { parsed = JSON.parse(content); } catch { parsed = { raw: content }; }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
