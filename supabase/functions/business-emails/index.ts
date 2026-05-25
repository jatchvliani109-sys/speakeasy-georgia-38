import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

type Action = "session" | "feedback" | "improve";

type SessionBody = {
  action: "session";
  level?: string;
  intensity?: string;
  fields?: string[];
  goals?: string[];
  recentEmailTypes?: string[];
  recentScenarios?: string[];
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

const SYSTEM_SESSION = `You design daily email-writing practice for Georgian learners of Business English.
Output STRICT JSON only — no markdown, no comments.

Rules:
- Personalize to the learner's level, profession fields, goals.
- Level scale: business_beginner (A1-A2, very short, simple), business_elementary (A2-B1), business_intermediate (B1-B2), business_advanced (B2-C1, nuanced).
- Length adapts to intensity: "light" (10 min) => shorter example + 1 vocab focus, "standard" (20 min) => normal, "intensive" / "deadline" => longer/nuanced example AND include a bonusScenario for extra practice.
- Never reuse a scenarioKey or emailType already in recentScenarios/recentEmailTypes.
- Real example must reflect chosen fields (e.g. management vs freelancing vs marketing).
- Warm-up must be quick (1-2 min), engaging, and prime the learner for today's email type.
- Georgian translations are required where specified.
- Encouraging, warm, human tone in Georgian intro/explanations.`;

const SYSTEM_FEEDBACK = `You give feedback on a Business English learner's email.
Two-part response:
1) "inCharacter": a realistic reply email FROM the recipient role (colleague/client/manager). 2-5 sentences. Natural, contextual, NOT meta. No greetings like "as a colleague".
2) "feedback": structured feedback in Georgian (encouraging, human, never harsh):
   - "summaryKa": one warm sentence acknowledging effort
   - "worked": array of 1-3 short Georgian bullets about what worked well
   - "improve": array of 2-3 short Georgian bullets on what to refine
   - "suggestions": array of 2-3 concrete English rewrite suggestions, each with { "before": "...", "after": "...", "whyKa": "..." }
   - "rewriteEn": full polished version of the user's email in English
   - "improveFocus": ONE single targeted improvement the learner should rewrite next, with:
       { "instructionKa": "1 short Georgian sentence telling them what to rewrite",
         "originalSnippet": "the exact sentence/phrase from their email to rewrite",
         "hintKa": "1-line Georgian hint" }
Level guidance:
- beginner/elementary: gentle, simple Georgian; rewrite uses simple words.
- intermediate/advanced: more nuanced critique; rewrite uses polished professional tone.

Output STRICT JSON only.`;

const SYSTEM_IMPROVE = `You acknowledge a learner's targeted rewrite. Be warm, brief, specific.
Output STRICT JSON only:
{
  "praiseKa": "1-2 sentence Georgian praise mentioning what improved",
  "polishedEn": "your slightly polished version of their rewrite (1-2 sentences max)",
  "tipKa": "1 short Georgian micro-tip for next time"
}`;

function sessionPrompt(b: SessionBody) {
  const wantsBonus = b.intensity === "intensive" || b.intensity === "deadline";
  return `Generate today's email-writing session.

Learner:
- level: ${b.level || "business_intermediate"}
- intensity: ${b.intensity || "standard"}
- fields: ${(b.fields || []).join(", ") || "general"}
- goals: ${(b.goals || []).join(", ") || "work_communication"}

Avoid reusing:
- recent emailTypes: ${(b.recentEmailTypes || []).join(", ") || "(none)"}
- recent scenarioKeys: ${(b.recentScenarios || []).join(", ") || "(none)"}

Return JSON exactly in this shape:
{
  "emailType": "one of: follow_up | request | introduction | complaint | update | thank_you | apology | meeting_invite | proposal | reminder",
  "scenarioKey": "short kebab-case unique key for this scenario",
  "dailyFocusKa": "one short Georgian sentence stating today's goal",
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
Scenario (Georgian): ${b.scenario}
Recipient role: ${b.recipientRole}

Learner's email:
"""${b.userEmail}"""

Return JSON:
{
  "inCharacter": { "subject": "Re: ...", "body": "..." },
  "feedback": {
    "summaryKa": "...",
    "worked": ["..."],
    "improve": ["..."],
    "suggestions": [{ "before": "...", "after": "...", "whyKa": "..." }],
    "rewriteEn": "...",
    "improveFocus": { "instructionKa": "...", "originalSnippet": "...", "hintKa": "..." }
  }
}`;
}

function improvePrompt(b: ImproveBody) {
  return `Learner level: ${b.level || "business_intermediate"}
Email type: ${b.emailType}
They were asked to rewrite this part of their original email:
Original snippet: """${b.targetBefore}"""
Suggested direction: """${b.targetAfter}"""
Why (Georgian): ${b.whyKa}

Their rewrite:
"""${b.userRewrite}"""

Acknowledge warmly, polish minimally, give one micro-tip.`;
}

async function callAI(system: string, user: string) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
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
