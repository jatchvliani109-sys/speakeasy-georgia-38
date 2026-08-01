import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireUser } from "../_shared/auth.ts";
import { consumeAiSession, refundAiSession, quotaExceededResponse } from "../_shared/aiQuota.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

function adminDb() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/**
 * Atomically marks an interview row as "quota charged". Returns true only for
 * the caller that flipped the flag — a conditional UPDATE on quota_charged =
 * false, so two rapid replies can never both claim.
 */
async function claimInterviewCharge(userId: string, sessionId: string): Promise<boolean> {
  const { data, error } = await adminDb()
    .from("business_interview_sessions")
    .update({ quota_charged: true })
    .eq("id", sessionId)
    .eq("user_id", userId)
    .eq("quota_charged", false)
    .select("id");
  if (error) return false;
  return Array.isArray(data) && data.length > 0;
}

/** Releases the marker when the quota claim or the AI call failed. */
async function releaseInterviewCharge(userId: string, sessionId: string): Promise<void> {
  try {
    await adminDb()
      .from("business_interview_sessions")
      .update({ quota_charged: false })
      .eq("id", sessionId)
      .eq("user_id", userId);
  } catch (_e) { /* best-effort */ }
}


// Model split (email-module economics): high quality only where it's felt.
const MODEL_SESSION = "gpt-5.4";  // briefing/warm-ups — Georgian quality matters
const MODEL_REPLY = "gpt-4o";     // in-character loop — fast, cheap, English-mostly
const MODEL_VERDICT = "gpt-5-mini"; // short in-character English verdict
const MODEL_DEBRIEF = "gpt-5.4";  // the rich Georgian teaching report

type Action = "session" | "reply" | "verdict" | "debrief";

type InterviewMode = "real" | "matched" | "random";

type ResumeData = {
  full_name?: string | null;
  job_title?: string | null;
  industry?: string | null;
  technical_skills?: string[] | null;
  soft_skills?: string[] | null;
  years_of_experience?: number | string | null;
  education?: string | null;
  achievements?: string[] | null;
  languages?: any;
};

type SessionBody = {
  action: "session";
  mode?: InterviewMode;          // real | matched | random (default matched)
  resume?: ResumeData | null;     // for real + matched
  jobPosting?: string | null;     // real: user-pasted posting
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
  sessionId: string;             // business_interview_sessions.id — gates the charge

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
  mode?: InterviewMode;
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
- Tone: warm, encouraging Georgian copy. English content stays natural & professional.

REAL/MATCHED MODES — GROUNDED QUESTION PLANNING (this is what makes the interview feel human):
Work in two internal stages.
Stage 1 — EXTRACT concrete facts. From the resume: company names, role titles, durations, employment gaps, specific achievements with numbers, claimed skills. From the posting: must-have requirements, key responsibilities, seniority signals.
Stage 2 — PLAN questions GROUNDED in those facts, the way a real interviewer works: name the specifics ("I see you spent two years at Alpha Consulting — what made you leave?"), probe every posting requirement the resume does NOT clearly demonstrate, and challenge vague or unquantified claims. Generic template questions ("tell me about a challenge you overcame") are FORBIDDEN except at most ONE classic behavioral.
For real/matched, ADD inside "briefing" an "interviewPlan" object:
"interviewPlan": {
  "resumeFacts": ["5-8 short concrete facts extracted from the resume"],
  "postingRequirements": ["4-6 must-have requirements from the posting"],
  "plannedQuestions": [
    { "stage": "background" | "situational" | "curveball" | "closing", "questionEn": "the grounded question", "groundedIn": "resume: ... | posting: ... | gap: ..." }
  ]
}
plannedQuestions: 6-8 questions spread across the stages, each explicitly grounded. Omit interviewPlan entirely for random mode.`;

const SYSTEM_REPLY = `You are an interviewer in a job interview roleplay. STAY 100% IN CHARACTER — never reveal you are AI, never give feedback, never speak Georgian.
- Speak ONLY in natural professional English. 2-4 sentences max per turn.
- Adapt to the candidate's last answer: ask a relevant follow-up, push back gently when answers are vague ("interesting — can you give me a specific example?"), or move forward when they did well.
- Stay in the requested stage. PER-STAGE INSTRUCTIONS (follow exactly):
  * small_talk: brief friendly welcome / easy warm-up question. No deep probing.
  * background: ask about their experience, roles, career story, gaps, claims on the resume.
  * situational: give a concrete work scenario and ask how they would handle it.
  * curveball: an unexpected, harder or pressure question; push back on weak answers.
  * closing, FIRST turn (remainingQuestions >= 2): thank the candidate for their time, briefly signal the interview is wrapping up, then invite THEIR questions — e.g. "Do you have any questions for me about the role or the company?". DO NOT ask another competency, behavioural, technical or situational question. This turn's ONLY question must be an invitation for their questions.
  * closing, FINAL turn (remainingQuestions <= 1): answer/acknowledge whatever they asked, then close warmly — thank them, explain next steps and timeline, and say goodbye. This turn MUST NOT contain any question at all, and must not end with a question mark, because the interview ends immediately after it.
- For non-closing stages, when remainingQuestions <= 1, wrap up that stage cleanly and move the conversation forward.
- Level adapts complexity: beginner/elementary = simpler vocabulary, slower pace; intermediate/advanced = nuanced situational/curveball questions.
- If briefing.interviewPlan exists: prefer its plannedQuestions for the CURRENT stage — ask them adapted naturally to the conversation flow, referencing the concrete facts they're grounded in (company names, durations, posting requirements). Ask one follow-up on the candidate's answer before moving to the next planned question. NEVER invent resume or posting facts that aren't in interviewPlan.

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
  "modelAnswers": [
    {
      "questionEn": "the interviewer question they answered weakest",
      "theirAnswerKa": "1 short Georgian note on what was weak about their actual answer",
      "modelAnswerEn": "a strong model answer they could have given (3-5 sentences, natural spoken English)",
      "whyStrongerKa": "1 Georgian sentence on why this version is stronger"
    }
  ],
  "practiceNextKa": "1 short Georgian sentence — one specific thing to practice before next interview",
  "vocabulary": [
    { "en": "phrase", "ka": "Georgian", "exampleEn": "1-sentence usage", "exampleKa": "Georgian translation" }
  ]
}
Include 2-3 items each in wentWell/hurtChances. Include 3 keyPhrases. Include exactly 2 modelAnswers — for the learner's TWO WEAKEST answers, giving them a full model response to learn from. Include 4-6 vocabulary items pulled from strong phrases + key phrases.
If focusAreas were provided (real/matched mode), explicitly comment in hurtChances or practiceNextKa on any REQUIRED competency the candidate failed to demonstrate.
If briefing.interviewPlan exists, judge specifically how the candidate handled the GROUNDED questions (employment gaps, posting requirements, challenged claims) and reference those moments concretely in wentWell/hurtChances.
CLOSING STAGE: read the transcript carefully. If the candidate DID ask the interviewer question(s) at the end, credit that explicitly in wentWell (and comment on the quality/relevance of what they asked). Only mention "you should have asked questions" in hurtChances if the transcript shows they were invited to ask and genuinely asked nothing.`;

function resumeBlock(resume?: ResumeData | null): string {
  if (!resume) return "(No resume provided.)";
  const langs = Array.isArray(resume.languages)
    ? resume.languages.map((l: any) => (typeof l === "string" ? l : l?.name)).filter(Boolean).join(", ")
    : "";
  return [
    `- Name: ${resume.full_name || "(n/a)"}`,
    `- Current/last role: ${resume.job_title || "(n/a)"}`,
    `- Industry: ${resume.industry || "(n/a)"}`,
    `- Years of experience: ${resume.years_of_experience ?? "(n/a)"}`,
    `- Technical skills: ${(resume.technical_skills || []).join(", ") || "(n/a)"}`,
    `- Soft skills: ${(resume.soft_skills || []).join(", ") || "(n/a)"}`,
    `- Education: ${resume.education || "(n/a)"}`,
    `- Achievements: ${(resume.achievements || []).join("; ") || "(n/a)"}`,
    langs ? `- Languages: ${langs}` : "",
  ].filter(Boolean).join("\n");
}

function modeGuidance(mode: InterviewMode, b: SessionBody): string {
  if (mode === "real") {
    return `MODE: REAL — the learner is preparing for an ACTUAL job they pasted below.
Candidate's resume:
${resumeBlock(b.resume)}

The REAL job posting they're applying to:
"""${(b.jobPosting || "").slice(0, 4000)}"""

Build the briefing DIRECTLY from this real posting (real-sounding company/role derived from it — you may keep the real role title). The interview MUST probe the fit between the resume and this posting, INCLUDING GAPS: if the posting requires something the resume doesn't show, plan to test it (the interviewer will press on it later). In "briefing", add a "focusAreasEn" array (3-5 short strings) naming the exact competencies from the posting to probe — especially gaps. Fill briefing.interviewPlan from THIS resume + posting per the system rules — every planned question must cite a real detail from them.`;
  }
  if (mode === "matched") {
    return `MODE: MATCHED — invent a realistic job posting that fits the learner's resume but is ONE STEP more ambitious (a natural next career move).
Candidate's resume:
${resumeBlock(b.resume)}

Return the invented posting in "jobPostingEn" (6-10 lines: company one-liner, role, 4-6 responsibilities, 3-5 requirements) so the learner can read it before starting. Base the briefing on that invented posting. Probe realistic fit for the slightly-stretched role. Add "focusAreasEn" (3-5 strings) for the competencies to probe, and fill briefing.interviewPlan from the resume + your invented posting per the system rules.`;
  }
  return `MODE: RANDOM — a generic practice role (no resume). Keep it broadly accessible for the learner's level and fields.`;
}

function sessionPrompt(b: SessionBody) {
  const intensity = b.intensity || "standard";
  const prevBlock = b.previouslyLearned
    ? `Previously learned (last session, topic: ${b.previouslyLearned.topicKa}):\n${b.previouslyLearned.phrases
        .map((p) => `- "${p.en}" (${p.ka})`)
        .join("\n")}\n→ Reference one of these phrases naturally inside warmUp options or in the interviewer's openingLineEn context.`
    : "(First interview session — set a welcoming tone.)";

  const mode: InterviewMode = b.mode || "matched";

  return `Generate a personalized interview session.

${modeGuidance(mode, b)}

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
    "whatToExpectKa": "1-2 sentence Georgian heads-up about the interview style",
    "focusAreasEn": ["only for real/matched: competencies to probe, especially gaps"]
  },
  "jobPostingEn": "ONLY for matched mode: the invented posting text for the learner to read (omit otherwise)",
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
  const isClosing = b.stage === "closing";
  const isFinal = (b.remainingQuestions ?? 0) <= 1;
  const directive = isClosing
    ? isFinal
      ? `\nMANDATORY FOR THIS TURN (closing, FINAL turn): respond to whatever the candidate just asked or said, then close the interview warmly — thank them, state the next steps and timeline, and say goodbye. Do NOT ask any question. Your text must contain no question mark. The interview ends right after this line.`
      : `\nMANDATORY FOR THIS TURN (closing, FIRST turn): thank the candidate for their time and invite THEIR questions, e.g. "Before we finish — do you have any questions for me about the role or the team?". Do NOT ask any competency, behavioural, technical or situational question.`
    : "";
  return `Learner level: ${b.level || "business_intermediate"}
Interview stage: ${b.stage}
Remaining interviewer turns planned in this stage: ${b.remainingQuestions}${directive}

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
  const focus = b.briefing?.focusAreasEn?.length
    ? `\nRequired competencies for this role (assess whether they were shown): ${b.briefing.focusAreasEn.join(", ")}`
    : "";
  return `Learner level: ${b.level || "business_intermediate"}
Mode: ${b.mode || "matched"}
Verdict: ${b.verdict}${focus}

Briefing:
${JSON.stringify(b.briefing)}

Full transcript:
${b.history.map((t) => `${t.role.toUpperCase()}: ${t.text}`).join("\n")}

Now break character and give the structured Georgian debrief.`;
}

const FALLBACK_MODEL = "gpt-4o";

async function callAI(system: string, user: string, model = "gpt-4o") {
  const attempt = async (m: string) => {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: m,
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
  };

  let r = await attempt(model);
  // If the primary model is unavailable (retired name, quota, gateway error),
  // silently retry once with the known-good fallback instead of failing the
  // learner's session.
  if (!r.ok && model !== FALLBACK_MODEL) {
    console.log(`[business-interview] ${model} failed (${r.error}); retrying with ${FALLBACK_MODEL}`);
    r = await attempt(FALLBACK_MODEL);
  }
  return r;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  let _claimedWeek: string | null = null;   // set once a session is claimed
  let _chargedSessionId: string | null = null; // interview row that holds the charge
  try {
    const _auth = await requireUser(req);
    if (_auth.error) return _auth.error;
    const body = (await req.json()) as { action: Action } & Record<string, unknown>;

    // One interview = one weekly AI session, charged on the FIRST reply (not on
    // "session"), so abandoning at the briefing costs nothing and random mode —
    // which skips the "session" call entirely — is covered too. "First" is
    // decided by the persisted quota_charged flag, never by the client.
    if (body.action === "reply") {
      const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
      if (!sessionId) {
        return new Response(JSON.stringify({ error: "missing sessionId" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const claimed = await claimInterviewCharge(_auth.user.id, sessionId);
      if (claimed) {
        _chargedSessionId = sessionId;
        const quota = await consumeAiSession(_auth.user.id);
        if (!quota.ok) {
          await releaseInterviewCharge(_auth.user.id, sessionId);
          return quotaExceededResponse(quota, corsHeaders);
        }
        _claimedWeek = quota.week;
      }
    }

    let r;
    if (body.action === "session") {
      r = await callAI(SYSTEM_SESSION, sessionPrompt(body as unknown as SessionBody), MODEL_SESSION);
    } else if (body.action === "reply") {
      r = await callAI(SYSTEM_REPLY, replyPrompt(body as unknown as ReplyBody), MODEL_REPLY);
    } else if (body.action === "verdict") {
      r = await callAI(SYSTEM_VERDICT, verdictPrompt(body as unknown as VerdictBody), MODEL_VERDICT);
    } else if (body.action === "debrief") {
      r = await callAI(SYSTEM_DEBRIEF, debriefPrompt(body as unknown as DebriefBody), MODEL_DEBRIEF);
    } else {
      if (_claimedWeek) await refundAiSession(_auth.user.id, _claimedWeek);
      if (_chargedSessionId) await releaseInterviewCharge(_auth.user.id, _chargedSessionId);
      return new Response(JSON.stringify({ error: "unknown action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!r.ok) {
      // AI call failed — the learner never got an interview, give the session back.
      if (_claimedWeek) await refundAiSession(_auth.user.id, _claimedWeek);
      if (_chargedSessionId) await releaseInterviewCharge(_auth.user.id, _chargedSessionId);
      return new Response(JSON.stringify({ error: r.error, detail: r.detail }), {
        status: r.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(r.parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    try {
      const a = await requireUser(req);
      if (!a.error && _claimedWeek) await refundAiSession(a.user.id, _claimedWeek);
      if (!a.error && _chargedSessionId) await releaseInterviewCharge(a.user.id, _chargedSessionId);
    } catch (_ignored) { /* refund is best-effort */ }

    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});