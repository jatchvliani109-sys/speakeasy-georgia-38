import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireUser } from "../_shared/auth.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

type Action = "session" | "feedback" | "improve";

type SessionBody = {
  action: "session";
  level?: string;
  intensity?: string;
  fields?: string[];
  goals?: string[];
  recentEmailTypes?: string[];
  recentScenarios?: string[];
  curriculumTopicKey?: string;
  curriculumTopicTitleKa?: string;
  curriculumGuidance?: string;
  curriculumStep?: number;
  curriculumTotal?: number;
  curriculumCycle?: number;
  previouslyLearned?: { topicKa: string; phrases: { en: string; ka: string }[] } | null;
};

type FeedbackBody = {
  action: "feedback";
  level?: string;
  emailType: string;
  scenario: string;
  recipientRole: string;
  userEmail: string;
};

type ImproveBody = {
  action: "improve";
  level?: string;
  emailType: string;
  originalEmail: string;
  targetBefore: string;
  targetAfter: string;
  whyKa: string;
  userRewrite: string;
};

const SYSTEM_SESSION = `You design daily email-writing practice for Georgian learners of Business English following a FIXED PROGRESSIVE CURRICULUM.
Output STRICT JSON only — no markdown, no comments.

Rules:
- The caller LOCKS today's emailType via curriculumTopicKey — you MUST use exactly that emailType. Do NOT pick a different one.
- Each session explicitly builds on previous knowledge. If previouslyLearned is provided, naturally weave one of those phrases into either learn.examples or realExample.body, and reference it in dailyFocusKa as a callback.
- Scenarios must be UNIQUE — never repeat anything in recentScenarios. Always invent a fresh real-world situation tied to the learner's fields/goals.
- Complexity grows with curriculumCycle (1 = first pass, 2+ = repeat exposure with harder nuance and richer vocabulary). Cycle 2+ should NOT re-teach basics — assume previous topic mastery and push polish/nuance.
- Level scale: business_beginner (A1-A2, very short, simple), business_elementary (A2-B1), business_intermediate (B1-B2), business_advanced (B2-C1, nuanced).
- Length adapts to intensity: "light" (10 min) => shorter example + 1 vocab focus, "standard" (20 min) => normal, "intensive" / "deadline" => longer/nuanced example AND include a bonusScenario for extra practice.
- Real example must reflect chosen fields (e.g. management vs freelancing vs marketing).
- Warm-up must be quick (1-2 min), engaging, and prime the learner for today's email type.
- Georgian translations are required where specified.
- Encouraging, warm, human tone in Georgian intro/explanations.`;

const SYSTEM_FEEDBACK = `You evaluate a Business English learner's email. The learner is a Georgian speaker, but you must output almost NO Georgian — only English content and category tags. Georgian framing is added later by the app.

Return STRICT JSON only:
{
  "verdict": "strong" | "okay" | "weak",
  "inCharacter": { "subject": "Re: ...", "body": "A realistic 2-5 sentence reply FROM the recipient role, in natural English. No meta, no 'as a colleague'." },
  "strengthKeys": ["1-3 keys from the STRENGTH list below describing what the learner did well"],
  "corrections": [
    {
      "before": "exact phrase from the learner's email (English)",
      "after": "improved English version of that phrase",
      "categoryKey": "ONE key from the CATEGORY list below"
    }
  ],
  "rewriteEn": "the learner's full email rewritten cleanly in professional English"
}

Pick verdict honestly:
- "strong": clear, professional, minor polish only.
- "okay": understandable but several real issues with tone/clarity/grammar.
- "weak": significant problems in clarity, grammar, or professionalism.

STRENGTH keys (use only these): clear_structure, polite_tone, good_greeting, clear_ask, good_closing, concise, specific_detail, good_subject

CATEGORY keys for corrections (use only these): too_casual, too_direct, vague_ask, wrong_tense, missing_article, word_order, preposition, cliche, too_long, unclear_subject, greeting_issue, closing_issue, word_choice, redundant, tone_mismatch, spelling, general

Rules:
- Provide 2-4 corrections (fewer if the email is genuinely strong).
- "before" MUST be an exact snippet from the learner's email.
- Each correction gets exactly ONE categoryKey from the list.
- Output English only in before/after/rewriteEn/inCharacter. NO Georgian sentences anywhere.`;


const SYSTEM_IMPROVE = `You honestly assess whether a learner's targeted rewrite is actually better than the original snippet.
Be warm and encouraging, but ALWAYS honest. Never falsely praise weak or unchanged attempts.

Compare userRewrite against:
- originalSnippet (what they were asked to improve)
- targetAfter (the suggested direction — for reference only, not a required answer)
- whyKa (the reason the original needed improvement)

Choose ONE verdict:
- "better": genuinely improved — clearer, more professional, better tone, addresses the issue in whyKa.
- "similar": only superficially changed (synonyms, reordering) without real improvement, OR essentially the same as original.
- "worse": grammatically broken, less clear, wrong tone, or further from the suggested direction.
- "empty": userRewrite is empty, whitespace only, or one or two random characters.

Output STRICT JSON only:
{
  "verdict": "better" | "similar" | "worse" | "empty",
  "headlineKa": "1 short warm Georgian sentence reflecting the verdict (e.g. 'მართლა გაუმჯობესდა!' or 'ეს ვერსია ცოტა უფრო სუსტია — ვცადოთ ისევ.')",
  "detailsKa": "1-2 specific Georgian sentences — for 'better' name exactly what improved and why it works; for 'similar' point out what stayed the same; for 'worse' honestly say what made it weaker (grammar, tone, clarity); never harsh.",
  "tipKa": "1 short Georgian hint focusing on what to try next (concrete, actionable)",
  "polishedEn": "for 'better' only: a slightly polished version of their rewrite (1-2 sentences). For other verdicts return empty string.",
  "canRetry": true | false
}
canRetry: true when verdict is 'similar' or 'worse' (encourage another try), false when 'better' (move on).`;

function sessionPrompt(b: SessionBody) {
  const wantsBonus = b.intensity === "intensive" || b.intensity === "deadline";
  const lockedType = b.curriculumTopicKey || "";
  const prevBlock = b.previouslyLearned
    ? `Previously learned (last session, topic: ${b.previouslyLearned.topicKa}):\n${b.previouslyLearned.phrases
        .map((p) => `- "${p.en}" (${p.ka})`)
        .join("\n")}\n→ Weave ONE of these phrases naturally into either learn.examples or realExample.body, and briefly reference it in dailyFocusKa as a callback ("ვაგრძელებთ გუშინდელ...").`
    : "(No previous session — this is their first lesson; keep tone introductory.)";

  return `Generate today's email-writing session.

CURRICULUM LOCK:
- topicKey (use as emailType): ${lockedType}
- topic (Georgian): ${b.curriculumTopicTitleKa || ""}
- step ${b.curriculumStep || 1} / ${b.curriculumTotal || 7}, pass #${b.curriculumCycle || 1}
- guidance: ${b.curriculumGuidance || ""}

${prevBlock}

Learner:
- level: ${b.level || "business_intermediate"}
- intensity: ${b.intensity || "standard"}
- fields: ${(b.fields || []).join(", ") || "general"}
- goals: ${(b.goals || []).join(", ") || "work_communication"}

Already used scenarioKeys (NEVER reuse, generate a fresh scenario):
${(b.recentScenarios || []).join(", ") || "(none)"}

Return JSON exactly in this shape:
{
  "emailType": "${lockedType || "introduction"}",
  "scenarioKey": "short kebab-case unique key for this scenario",
  "dailyFocusKa": "one short Georgian sentence stating today's goal (reference previous phrase if applicable)",
  "estimatedMinutes": 10,
  "warmUp": {
    "kind": "spot_mistakes | compare",
    "promptKa": "1 short Georgian instruction (e.g. 'შენი აზრით რომელია უფრო პროფესიული?' or 'რა არასწორია ამ იმეილში?')",
    "options": [
      { "label": "A", "text": "short email or sentence in English", "isBetter": true, "issuesKa": ["if spot_mistakes: 1-3 Georgian bullets explaining problems; if compare and this is worse, list weaknesses; if better, leave empty array"] },
      { "label": "B", "text": "short email or sentence in English", "isBetter": false, "issuesKa": ["..."] }
    ],
    "explanationKa": "1-2 sentence Georgian explanation of WHY the better one is better — connects to today's focus"
  },
  "learn": {
    "titleKa": "Georgian title of the concept",
    "explanationKa": "2-4 sentence Georgian explanation",
    "structure": [
      { "partKa": "Georgian label of email part (e.g. 'მისალმება')", "purposeKa": "1-line Georgian purpose", "exampleEn": "1 short English example for that part" }
    ],
    "examples": [
      { "en": "short english example phrase/line", "ka": "Georgian translation", "noteKa": "optional 1-line tip" }
    ]
  },
  "realExample": {
    "contextKa": "1 sentence Georgian setup explaining who/why",
    "subject": "Email subject line",
    "body": "Full example email body in English (paragraphs separated by \\n\\n)",
    "annotationsKa": ["1-3 short Georgian bullets pointing out key moves in the email"]
  },
  "practice": {
    "scenarioKa": "Full Georgian scenario the learner must respond to (2-4 sentences, realistic to their fields/goals)",
    "recipientRole": "e.g. 'a client', 'your manager', 'a teammate' — keep concise English",
    "promptKa": "1-line instruction in Georgian telling them what to write",
    "hintsKa": ["2-3 short Georgian writing hints"]
  },
  ${wantsBonus ? `"bonusScenario": {
    "scenarioKa": "A second, SHORTER Georgian scenario (1-2 sentences) for extra practice — DIFFERENT angle/context from practice",
    "recipientRole": "...",
    "promptKa": "1-line Georgian instruction",
    "hintsKa": ["1-2 short Georgian hints"]
  },` : `"bonusScenario": null,`}
  "vocabulary": [
    { "en": "phrase or word", "ka": "Georgian translation", "exampleEn": "1-sentence usage", "exampleKa": "Georgian translation" }
  ],
  "tomorrowTeaseKa": "1 short Georgian sentence hinting at tomorrow's focus"
}

Include 3-5 vocabulary items. Include 2-3 examples in learn. Include 3-4 structure parts in learn.structure.
For "light" intensity: include only 2 structure parts and 2 vocab items.`;
}

function feedbackPrompt(b: FeedbackBody) {
  return `Learner level: ${b.level || "business_intermediate"}
Email type: ${b.emailType}
Scenario (Georgian, for your understanding only): ${b.scenario}
Recipient role: ${b.recipientRole}

Learner's email:
"""${b.userEmail}"""

Evaluate it and return the JSON exactly as specified. Remember: English and category keys only, no Georgian sentences.`;
}


function improvePrompt(b: ImproveBody) {
  return `Learner level: ${b.level || "business_intermediate"}
Email type: ${b.emailType}

ORIGINAL SNIPPET (what they were asked to improve):
"""${b.targetBefore}"""

SUGGESTED DIRECTION (reference only, not required):
"""${b.targetAfter}"""

WHY THE ORIGINAL NEEDED IMPROVING (Georgian):
${b.whyKa}

LEARNER'S REWRITE:
"""${b.userRewrite}"""

Honestly judge whether the rewrite is genuinely better than the ORIGINAL SNIPPET.
Do NOT default to praise. If it is similar or worse, say so kindly and explain specifically why, then give a concrete hint.
Return the JSON schema exactly.`;
}

async function callAI(system: string, user: string) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
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
    const body = (await req.json()) as { action: Action } & Record<string, unknown>;
    let r;
    if (body.action === "session") {
      r = await callAI(SYSTEM_SESSION, sessionPrompt(body as unknown as SessionBody));
    } else if (body.action === "feedback") {
      r = await callAI(SYSTEM_FEEDBACK, feedbackPrompt(body as unknown as FeedbackBody));
    } else if (body.action === "improve") {
      r = await callAI(SYSTEM_IMPROVE, improvePrompt(body as unknown as ImproveBody));
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
