import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireUser } from "../_shared/auth.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

type Action = "session" | "reply" | "verdict" | "debrief";

type SessionBody = {
  action: "session";
  level?: string;
  intensity?: string;
  fields?: string[];
  goals?: string[];
  profession?: string;
  recentScenarios?: string[];
  curriculumTopicKey?: string;
  curriculumTopicTitleKa?: string;
  curriculumGuidance?: string;
  curriculumStep?: number;
  curriculumTotal?: number;
  curriculumCycle?: number;
  previouslyLearned?: { topicKa: string; phrases: { en: string; ka: string }[] } | null;
};

type Attendee = { name: string; titleEn: string; personality?: string };

type ReplyBody = {
  action: "reply";
  level?: string;
  briefing: any;
  attendees: Attendee[];
  stage: string; // opening | discussion | curveball | decision | closing
  history: { role: "ai" | "user"; speaker?: string; text: string }[];
  userText: string;
  remainingTurns: number;
};

type VerdictBody = {
  action: "verdict";
  level?: string;
  briefing: any;
  history: { role: "ai" | "user"; speaker?: string; text: string }[];
};

type DebriefBody = {
  action: "debrief";
  level?: string;
  briefing: any;
  history: { role: "ai" | "user"; speaker?: string; text: string }[];
  verdict: string;
};

const SYSTEM_SESSION = `You design realistic WORKPLACE MEETING practice sessions for Georgian learners of Business English.
Output STRICT JSON only — no markdown.

Rules:
- Follow a FIXED PROGRESSIVE CURRICULUM. The caller passes curriculumTopicKey/Guidance — your meeting must HEAVILY emphasize that focus area (e.g. "disagreement" = colleagues actively challenge user; "leading" = user IS the chair; "problem_solving" = a crisis to solve live; "closing" = wrap-up + action items).
- Build on previouslyLearned — reference one of those phrases implicitly in the warmUp options or the openingLineEn so the meeting feels connected to last session.
- Scenarios MUST be unique — never reuse company/meeting types from recentScenarios.
- Complexity grows with curriculumCycle (1 = first pass; 2+ = more nuanced pushback, richer vocabulary, more attendees).
- Personalize meeting type, company, and attendees to the learner's fields/profession/goals:
  • management/finance/economics → corporate team meeting / leadership sync / budget review
  • marketing/sales → campaign planning / pipeline review / client pitch debrief
  • project_management/hr → sprint planning / hiring loop / 1:1 sync
  • entrepreneurship/remote_work/freelancer → client check-in / async kickoff / async stand-up
- Level scale: business_beginner (A1-A2 simpler attendees, slower), business_elementary (A2-B1), business_intermediate (B1-B2 natural), business_advanced (B2-C1 multi-participant, fast pace, nuanced).
- Intensity "light" → fewer stages (skip curveball, 1-2 attendees); "intensive"/"deadline" → 3-4 attendees, extra agenda item.
- Warm-up: 2-3 multiple-choice prompts (Georgian instruction, 2 English options each) about RIGHT WAY to participate in this meeting type. Each option labeled "A"/"B" with isBetter flag + short Georgian "why".
- Attendees should feel like real distinct colleagues with names + roles + a one-line personality so the model can voice them.
- Tone: warm, encouraging Georgian copy. English content stays natural, conversational, professional.`;

const SYSTEM_REPLY = `You are running a roleplay WORKPLACE MEETING. STAY 100% IN CHARACTER as the attendees. Never reveal you are AI, never give feedback in this mode, never speak Georgian.

- Speak ONLY in natural professional English. 1-3 short turns per reply (you may chain 1-3 attendees responding to each other so it feels collaborative).
- Each spoken turn MUST be prefixed by the speaker's name like "Maya Tabidze: ..." so the UI can attribute it.
- Adapt to the user's last contribution: agree + build, disagree politely, ask a follow-up, redirect if they went off-topic, pull a quiet colleague in.
- Stay in the requested stage (opening, discussion, curveball, decision, closing). When remainingTurns <= 1, wrap up this stage cleanly (closing stage = summarize decisions and assign action items).
- Level adapts complexity: beginner/elementary = simpler vocabulary, slower pace; intermediate/advanced = nuanced disagreement and pressure.
- Make the meeting feel DYNAMIC and slightly unpredictable — attendees should disagree with each other sometimes, joke briefly, push back, or change direction. Never one-sided.

Also score this single exchange and optionally surface a phrase highlight + occasional mini-quiz.

Output STRICT JSON only:
{
  "turns": [
    { "speaker": "Attendee Full Name", "text": "english line" }
  ],
  "scoreDelta": -2 | -1 | 0 | 1 | 2,
  "phraseHighlight": null | {
    "phraseEn": "exact strong phrase the user just used",
    "praiseKa": "1 short Georgian sentence praising the move",
    "ka": "Georgian translation of the phrase"
  },
  "miniQuiz": null | {
    "promptKa": "Quick Georgian question — e.g. 'როგორ უარყოფ ამ წინადადებას პროფესიონალურად?'",
    "options": [
      { "label": "A", "text": "english option", "isBetter": true, "whyKa": "1-line Georgian reason" },
      { "label": "B", "text": "english option", "isBetter": false, "whyKa": "1-line Georgian reason" }
    ]
  }
}
Include 1-3 turns each reply. Only include miniQuiz occasionally (every 2-3 turns), never two turns in a row.`;

const SYSTEM_VERDICT = `You are still inside the meeting roleplay, delivering brief colleague-style feedback as the meeting wraps. STAY IN CHARACTER (one of the attendees speaks). English only, 2-3 sentences, collegial tone — NOT a grade.
Choose verdict based on the user's overall contribution across the transcript:
- "strong" → "Great meeting — your input was really valuable."
- "average" → "Some good ideas, but you'll want a bit more confidence next time."
- "weak" → "We needed more participation from you today — let's hear more next time."

Output STRICT JSON only:
{
  "verdict": "strong | average | weak",
  "messageEn": "Your in-character closing line in English",
  "headlineKa": "Short Georgian headline reflecting the result (e.g. 'კარგი შეხვედრა იყო — შენი წვლილი სასარგებლო იყო')"
}`;

const SYSTEM_DEBRIEF = `You are now a warm Business English coach (NOT a meeting attendee). Break character fully and give structured Georgian feedback on the user's meeting performance.
Output STRICT JSON only:
{
  "summaryKa": "1-2 sentence warm Georgian summary of the meeting performance",
  "wentWell": [
    { "momentKa": "what specifically worked", "phraseEn": "exact phrase or paraphrase they used", "whyKa": "why it worked" }
  ],
  "hurtChances": [
    { "momentKa": "missed opportunity", "phraseEn": "what they said (or didn't)", "whyKa": "why it weakened their contribution" }
  ],
  "keyPhrases": [
    { "en": "meeting phrase to use next time", "ka": "Georgian translation", "whenKa": "when to use it" }
  ],
  "practiceNextKa": "1 short Georgian sentence — one specific communication skill to practice before next meeting",
  "vocabulary": [
    { "en": "phrase", "ka": "Georgian", "exampleEn": "1-sentence usage", "exampleKa": "Georgian translation" }
  ]
}
Include 2-3 items each in wentWell/hurtChances. Include 3 keyPhrases. Include 4-6 vocabulary items.`;

function sessionPrompt(b: SessionBody) {
  const intensity = b.intensity || "standard";
  const prevBlock = b.previouslyLearned
    ? `Previously learned (last session, topic: ${b.previouslyLearned.topicKa}):\n${b.previouslyLearned.phrases
        .map((p) => `- "${p.en}" (${p.ka})`)
        .join("\n")}\n→ Reference one of these phrases naturally inside warmUp options or openingLineEn.`
    : "(First meeting session — set a welcoming, collaborative tone.)";

  const attendeeCount = intensity === "light" ? 2 : intensity === "intensive" || intensity === "deadline" ? 4 : 3;

  return `Generate a personalized workplace meeting session.

CURRICULUM LOCK (drives meeting focus):
- topicKey: ${b.curriculumTopicKey || "introduction"}
- topic (Georgian): ${b.curriculumTopicTitleKa || ""}
- step ${b.curriculumStep || 1} / ${b.curriculumTotal || 7}, pass #${b.curriculumCycle || 1}
- guidance: ${b.curriculumGuidance || ""}

${prevBlock}

Learner:
- level: ${b.level || "business_intermediate"}
- intensity: ${intensity}
- profession/role: ${b.profession || "(not provided)"}
- fields: ${(b.fields || []).join(", ") || "general"}
- goals: ${(b.goals || []).join(", ") || "work_communication"}

Already used meeting scenarios (NEVER reuse, invent fresh): ${(b.recentScenarios || []).join(", ") || "(none)"}

Return JSON exactly in this shape:
{
  "scenarioKey": "short-kebab-key",
  "briefing": {
    "companyName": "fictional but realistic company name",
    "companyType": "e.g. 'mid-size marketing agency', 'fintech startup'",
    "industryKa": "Georgian short industry label",
    "meetingTypeEn": "e.g. 'Weekly campaign planning', 'Client check-in', 'Sprint retro'",
    "meetingTypeKa": "Georgian translation of meeting type",
    "userRoleEn": "user's role in the meeting (matches their field)",
    "userRoleKa": "Georgian translation",
    "aboutCompanyKa": "1-2 sentence Georgian briefing on company context",
    "agendaKa": ["agenda item 1 (Georgian)", "agenda item 2 (Georgian)"${intensity === "intensive" || intensity === "deadline" ? `, "agenda item 3 (Georgian)"` : ""}],
    "whatToExpectKa": "1-2 sentence Georgian heads-up about the meeting dynamic (who'll push back, what'll be unexpected)"
  },
  "attendees": [
    /* exactly ${attendeeCount} attendees — realistic mixed names, varied roles, distinct personalities */
    { "name": "First Last", "titleEn": "Role at Company", "titleKa": "Georgian role", "personalityKa": "1-line Georgian personality hint (e.g. 'პირდაპირი, კრიტიკული')" }
  ],
  "stages": ${intensity === "light"
    ? `["opening", "discussion", "decision", "closing"]`
    : `["opening", "discussion", "curveball", "decision", "closing"]`},
  "stageLabelsKa": {
    "opening": "გახსნა",
    "discussion": "მთავარი დისკუსია",
    "curveball": "უცაბედი მომენტი",
    "decision": "გადაწყვეტილება",
    "closing": "დახურვა"
  },
  "warmUp": [
    {
      "promptKa": "Georgian instruction (e.g. 'რომელი ფრაზა უკეთესია შეხვედრაზე აზრის გამოსახატად?')",
      "contextEn": "Short English colleague line that prompts these options",
      "options": [
        { "label": "A", "text": "user's possible reply in English", "isBetter": true, "whyKa": "1-line Georgian explanation" },
        { "label": "B", "text": "user's possible reply in English", "isBetter": false, "whyKa": "1-line Georgian explanation" }
      ]
    }
  ],
  "openingLineEn": "The FIRST attendee's opening line in English — should set agenda or welcome people. Prefix with 'Speaker Name: ...'",
  "openingSpeaker": "name of the attendee who delivers openingLineEn",
  "estimatedMinutes": ${intensity === "light" ? 10 : intensity === "intensive" || intensity === "deadline" ? 30 : 20},
  "tomorrowTeaseKa": "1 short Georgian sentence hinting at next meeting session's focus"
}

Include exactly ${intensity === "light" ? 2 : 3} warmUp items.`;
}

function replyPrompt(b: ReplyBody) {
  return `Learner level: ${b.level || "business_intermediate"}
Meeting stage: ${b.stage}
Remaining AI turns planned in this stage: ${b.remainingTurns}

Briefing:
${JSON.stringify(b.briefing)}

Attendees you can voice (ALWAYS prefix turns with one of these names):
${b.attendees.map((a) => `- ${a.name} (${a.titleEn})`).join("\n")}

Transcript so far (most recent last):
${b.history.map((t) => `${t.role === "user" ? "USER" : (t.speaker || "ATTENDEE")}: ${t.text}`).join("\n")}

User just said:
"""${b.userText}"""

Give your next 1-3 attendee turns (collaborative, can disagree with each other), score this exchange, optionally surface a phrase highlight or quick mini-quiz.`;
}

function verdictPrompt(b: VerdictBody) {
  return `Briefing:
${JSON.stringify(b.briefing)}

Full transcript:
${b.history.map((t) => `${t.role === "user" ? "USER" : (t.speaker || "ATTENDEE")}: ${t.text}`).join("\n")}

Pick a verdict that genuinely reflects the user's participation and deliver a short colleague-style closing line in character.`;
}

function debriefPrompt(b: DebriefBody) {
  return `Learner level: ${b.level || "business_intermediate"}
Verdict: ${b.verdict}

Briefing:
${JSON.stringify(b.briefing)}

Full transcript:
${b.history.map((t) => `${t.role === "user" ? "USER" : (t.speaker || "ATTENDEE")}: ${t.text}`).join("\n")}

Now break character and give the structured Georgian debrief.`;
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
    const body = (await req.json()) as { action: Action } & Record<string, unknown>;
    let r;
    if (body.action === "session") {
      r = await callAI(SYSTEM_SESSION, sessionPrompt(body as unknown as SessionBody));
    } else if (body.action === "reply") {
      r = await callAI(SYSTEM_REPLY, replyPrompt(body as unknown as ReplyBody));
    } else if (body.action === "verdict") {
      r = await callAI(SYSTEM_VERDICT, verdictPrompt(body as unknown as VerdictBody));
    } else if (body.action === "debrief") {
      r = await callAI(SYSTEM_DEBRIEF, debriefPrompt(body as unknown as DebriefBody));
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
