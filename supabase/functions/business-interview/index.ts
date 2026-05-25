import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

type Action = "session" | "reply" | "verdict" | "debrief";

type SessionBody = {
  action: "session";
  level?: string;
  intensity?: string;
  fields?: string[];
  goals?: string[];
  profession?: string;
  recentRoles?: string[];
  curriculumTopicKey?: string;
  curriculumTopicTitleKa?: string;
  curriculumGuidance?: string;
  curriculumStep?: number;
  curriculumTotal?: number;
  curriculumCycle?: number;
  previouslyLearned?: { topicKa: string; phrases: { en: string; ka: string }[] } | null;
};

type ReplyBody = {
  action: "reply";
  level?: string;
  briefing: any;
  stage: string; // small_talk | background | situational | curveball | closing
  history: { role: "interviewer" | "candidate"; text: string }[];
  candidateAnswer: string;
  remainingQuestions: number; // how many more interviewer turns we plan in this stage
};

type VerdictBody = {
  action: "verdict";
  level?: string;
  briefing: any;
  history: { role: "interviewer" | "candidate"; text: string }[];
};

type DebriefBody = {
  action: "debrief";
  level?: string;
  briefing: any;
  history: { role: "interviewer" | "candidate"; text: string }[];
  verdict: string;
};

const SYSTEM_SESSION = `You design realistic job-interview practice sessions for Georgian learners of Business English.
Output STRICT JSON only — no markdown.

Rules:
- Each session follows a FIXED PROGRESSIVE CURRICULUM. The caller passes curriculumTopicKey/Guidance — your interview must HEAVILY emphasize that focus area (e.g. "background" = lots of background-story questions; "pressure" = harsh pushback throughout; "salary" = include compensation discussion in closing).
- Build on previouslyLearned phrases from the last session — incorporate one of them implicitly into the warmUp options or the openingLineEn context so it feels connected.
- Scenarios MUST be unique. Never reuse role/company combos from recentRoles. Invent a fresh employer + role each time.
- Complexity grows with curriculumCycle (1 = first pass, 2+ = more nuanced pushback and richer professional vocabulary).
- Personalize company type, interviewer name & title, role to the learner's fields/profession/level.
- management/finance/economics → corporate; marketing/sales → agency or B2C brand; project_management/hr → tech company; entrepreneurship/remote_work → startup or agency; freelancer goals → small startup or client.
- Level scale: business_beginner (A1-A2 simple), business_elementary (A2-B1), business_intermediate (B1-B2), business_advanced (B2-C1 nuanced).
- intensity "light" => fewer stages (skip curveball); "intensive"/"deadline" => richer briefing + harder pushback.
- Warm-up: 2-3 multiple-choice prompts (Georgian instruction, 2 English answer options each). Each option labeled "A"/"B" with isBetter flag and a short Georgian explanation per option.
- Tone: warm, encouraging Georgian copy. English content stays natural & professional.`;

const SYSTEM_REPLY = `You are an interviewer in a job interview roleplay. STAY 100% IN CHARACTER — never reveal you are AI, never give feedback, never speak Georgian.
- Speak ONLY in natural professional English. 2-4 sentences max per turn.
- Adapt to the candidate's last answer: ask a relevant follow-up, push back gently when answers are vague ("interesting — can you give me a specific example?"), or move forward when they did well.
- Stay in the requested stage (small_talk, background, situational, curveball, closing). When remainingQuestions <= 1, wrap up that stage cleanly (closing stage = invite their questions).
- Level adapts complexity: beginner/elementary = simpler vocabulary, slower pace; intermediate/advanced = nuanced situational/curveball questions.

Also score this single exchange and optionally surface a phrase highlight.

Output STRICT JSON only:
{
  "interviewerText": "Your next interviewer line in English",
  "scoreDelta": -2 | -1 | 0 | 1 | 2,  // -2 very weak ... 2 excellent
  "phraseHighlight": null | {
    "phraseEn": "exact strong phrase the candidate just used",
    "praiseKa": "1 short Georgian sentence praising the move",
    "ka": "Georgian translation of the phrase"
  },
  "miniQuiz": null | {
    "promptKa": "Quick Georgian question — e.g. 'რომელი პასუხი იქნებოდა უფრო ძლიერი ამ კითხვაზე?'",
    "options": [
      { "label": "A", "text": "english option", "isBetter": true, "whyKa": "1-line Georgian reason" },
      { "label": "B", "text": "english option", "isBetter": false, "whyKa": "1-line Georgian reason" }
    ]
  }
}
Only include miniQuiz occasionally (every 2-3 turns), never two turns in a row.`;

const SYSTEM_VERDICT = `You are still the interviewer, delivering a brief verdict at the end of the interview. STAY IN CHARACTER, English only, 2-3 sentences, professional tone.
Choose verdict based on the candidate's overall performance across the transcript:
- "strong" → invite to a second interview
- "average" → will review application and follow up
- "weak" → went with another candidate

Output STRICT JSON only:
{
  "verdict": "strong | average | weak",
  "messageEn": "Your in-character closing message in English",
  "headlineKa": "Short Georgian headline reflecting the result (e.g. 'თქვენ მიიღეთ მეორე ინტერვიუ')"
}`;

const SYSTEM_DEBRIEF = `You are now a warm Business English coach (NOT the interviewer). Break character fully and give structured Georgian feedback on the candidate's interview performance.
Output STRICT JSON only:
{
  "summaryKa": "1-2 sentence warm Georgian summary of the result",
  "wentWell": [
    { "momentKa": "what specifically worked", "phraseEn": "exact phrase or paraphrase they used", "whyKa": "why it worked" }
  ],
  "hurtChances": [
    { "momentKa": "what hurt them", "phraseEn": "exact weak answer or paraphrase", "whyKa": "why it was weak" }
  ],
  "keyPhrases": [
    { "en": "phrase to use next time", "ka": "Georgian translation", "whenKa": "when to use it" }
  ],
  "practiceNextKa": "1 short Georgian sentence — one specific thing to practice before next interview",
  "vocabulary": [
    { "en": "phrase", "ka": "Georgian", "exampleEn": "1-sentence usage", "exampleKa": "Georgian translation" }
  ]
}
Include 2-3 items each in wentWell/hurtChances. Include 3 keyPhrases. Include 4-6 vocabulary items pulled from strong phrases + key phrases.`;

function sessionPrompt(b: SessionBody) {
  const intensity = b.intensity || "standard";
  const prevBlock = b.previouslyLearned
    ? `Previously learned (last session, topic: ${b.previouslyLearned.topicKa}):\n${b.previouslyLearned.phrases
        .map((p) => `- "${p.en}" (${p.ka})`)
        .join("\n")}\n→ Reference one of these phrases naturally inside warmUp options or in the interviewer's openingLineEn context.`
    : "(First interview session — set a welcoming tone.)";

  return `Generate a personalized interview session.

CURRICULUM LOCK (drives interview focus):
- topicKey: ${b.curriculumTopicKey || "background"}
- topic (Georgian): ${b.curriculumTopicTitleKa || ""}
- step ${b.curriculumStep || 1} / ${b.curriculumTotal || 7}, pass #${b.curriculumCycle || 1}
- guidance: ${b.curriculumGuidance || ""}

${prevBlock}

Learner:
- level: ${b.level || "business_intermediate"}
- intensity: ${intensity}
- profession/role: ${b.profession || "(not provided)"}
- fields: ${(b.fields || []).join(", ") || "general"}
- goals: ${(b.goals || []).join(", ") || "job_interview"}

Already used role titles (NEVER reuse, invent a fresh role + company): ${(b.recentRoles || []).join(", ") || "(none)"}

Return JSON exactly in this shape:
{
  "scenarioKey": "short-kebab-key",
  "briefing": {
    "companyName": "fictional but realistic company name",
    "companyType": "e.g. 'mid-size marketing agency', 'fintech startup', 'corporate consultancy'",
    "industryKa": "Georgian short industry label",
    "roleTitle": "the role they're interviewing for (English)",
    "roleTitleKa": "Georgian translation of the role",
    "interviewerName": "first + last name",
    "interviewerTitle": "e.g. 'Head of Marketing'",
    "aboutCompanyKa": "2-3 sentence Georgian briefing on company context",
    "whatToExpectKa": "1-2 sentence Georgian heads-up about the interview style"
  },
  "stages": ${intensity === "light"
    ? `["small_talk", "background", "situational", "closing"]`
    : `["small_talk", "background", "situational", "curveball", "closing"]`},
  "stageLabelsKa": {
    "small_talk": "გახურება",
    "background": "გამოცდილება",
    "situational": "სიტუაცია",
    "curveball": "უცაბედი კითხვა",
    "closing": "დახურვა"
  },
  "warmUp": [
    {
      "promptKa": "Georgian instruction (e.g. 'რომელი პასუხი იქნება უფრო ძლიერი გასაუბრების დასაწყისში?')",
      "contextEn": "Short English interviewer line that prompts these options",
      "options": [
        { "label": "A", "text": "candidate answer in English", "isBetter": true, "whyKa": "1-line Georgian explanation" },
        { "label": "B", "text": "candidate answer in English", "isBetter": false, "whyKa": "1-line Georgian explanation" }
      ]
    }
  ],
  "openingLineEn": "The interviewer's very first line in English (small talk / welcome)",
  "estimatedMinutes": ${intensity === "light" ? 10 : intensity === "intensive" || intensity === "deadline" ? 30 : 20},
  "tomorrowTeaseKa": "1 short Georgian sentence hinting at next session's focus"
}

Include exactly ${intensity === "light" ? 2 : 3} warmUp items.`;
}

function replyPrompt(b: ReplyBody) {
  return `Learner level: ${b.level || "business_intermediate"}
Interview stage: ${b.stage}
Remaining interviewer turns planned in this stage: ${b.remainingQuestions}

Briefing context:
${JSON.stringify(b.briefing)}

Transcript so far (most recent last):
${b.history.map((t) => `${t.role.toUpperCase()}: ${t.text}`).join("\n")}

Candidate just answered:
"""${b.candidateAnswer}"""

Give your next interviewer line, score this single exchange, and decide if a quick learner mini-quiz fits here.`;
}

function verdictPrompt(b: VerdictBody) {
  return `Briefing:
${JSON.stringify(b.briefing)}

Full transcript:
${b.history.map((t) => `${t.role.toUpperCase()}: ${t.text}`).join("\n")}

Pick a verdict that genuinely reflects performance and deliver a short closing message in character.`;
}

function debriefPrompt(b: DebriefBody) {
  return `Learner level: ${b.level || "business_intermediate"}
Verdict: ${b.verdict}

Briefing:
${JSON.stringify(b.briefing)}

Full transcript:
${b.history.map((t) => `${t.role.toUpperCase()}: ${t.text}`).join("\n")}

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
