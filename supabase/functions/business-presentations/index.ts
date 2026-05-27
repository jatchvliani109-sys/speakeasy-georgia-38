import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

type Action = "session" | "explain" | "practiceFeedback" | "audienceQuestion" | "evaluate" | "debrief";

const SYSTEM_SESSION = `You design a personalized BUSINESS PRESENTATION coaching session for a Georgian learner of English.
Output STRICT JSON only — no markdown.

Rules:
- Follow a FIXED PROGRESSIVE CURRICULUM. Caller passes curriculumTopicKey + Guidance — the entire deck must reflect that focus.
- Scenarios MUST match learner's fields + goals + profession (management → present to your team; freelancer → pitch to a client; marketing → campaign deck; finance → quarterly numbers; HR → policy rollout; etc.).
- Complexity grows with curriculumCycle.
- Level scaling:
  • business_beginner / business_elementary: 3-4 slides, simpler English, longer Georgian support, more keywords in stage 2
  • business_intermediate: 4-5 slides, natural professional English
  • business_advanced: 5-6 slides, nuanced executive English, minimal Georgian crutches
- Intensity:
  • light (10 min) → 3 slides, skip stage 2 entirely (UI handles)
  • standard (20 min) → 4-5 slides, full 3-stage flow
  • intensive/deadline (30+ min) → 5-6 slides, extra audience Q&A
- Tone: premium, calm, executive-training. Avoid childish or school-quiz vibe.
- Each slide is minimal: a short title, 3-5 short bullet points (key idea only, NOT full prose), one "key sentence" the user will be asked to paraphrase in stage 1.
- Provide 3-4 vocabulary items per slide: difficult professional words/phrases with Georgian translation + pronunciation guide (simple Georgian phonetic spelling).
- "whyMattersEn" and "whyMattersKa" explain why this presentation TOPIC matters for the learner's field — used as the AI introduction.
- "audienceQuestions" array: 2-3 questions an audience member would ask. The LAST one MUST be slightly off-topic / unexpected to test adaptability.
- "tomorrowTeaseKa" hints at the next curriculum step.`;

const SYSTEM_EXPLAIN = `You are a calm, premium presentation coach. Explain one slide to a Georgian learner of Business English.
Output STRICT JSON only:
{
  "english": "1-3 sentence clear English explanation of this slide's key idea, in natural professional English",
  "georgian": "Georgian translation/explanation — short, helpful, supportive",
  "tip": "1 short Georgian tip about HOW to deliver this slide (pace, emphasis, body, structure)"
}`;

const SYSTEM_PRACTICE = `You are a warm, encouraging presentation coach grading ONE short user paraphrase of a slide's key sentence.
Output STRICT JSON only:
{
  "rating": "great" | "good" | "needs_work",
  "encouragementKa": "1-2 sentence warm Georgian feedback",
  "improvedEn": "1 polished English version they could say instead",
  "praiseKa": "1 short Georgian sentence praising one specific thing they did well"
}
Be generous — this is practice, not a test. Always find something positive.`;

const SYSTEM_AUDIENCE = `You roleplay an AUDIENCE MEMBER at a business presentation. STAY IN CHARACTER — never break the fourth wall.
- Ask ONE professional question in natural English, 1-2 sentences.
- Tone: curious or politely skeptical, like a real attendee.
- If "unexpected: true" is passed, your question should be slightly off-topic — testing adaptability (e.g. about company culture, future plans, personal opinion). Stay professional, not weird.
- DO NOT include any Georgian.
Output STRICT JSON only: { "questionEn": "..." }`;

const SYSTEM_EVALUATE = `You grade the user's STAGE 3 full presentation + Q&A performance. Stay in coach voice.
Choose verdict based on overall flow, grammar, vocabulary use, structure, and confidence shown in the transcript.

Output STRICT JSON only:
{
  "verdict": "strong | average | weak",
  "headlineKa": "Short Georgian headline reflecting the result. Use one of:
    strong → 'პრეზენტაცია წარმატებული იყო — აუდიტორია დაინტერესდა'
    average → 'კარგი სტრუქტურა, მაგრამ მეტი თავდაჯერებულობა გჭირდება'
    weak → 'იდეები კარგია, მაგრამ სტრუქტურაზე და სიცხადეზე უნდა ვიმუშაოთ'",
  "summaryKa": "1-2 sentence Georgian summary of the performance"
}`;

const SYSTEM_DEBRIEF = `You are a warm Business English presentation coach giving final structured Georgian feedback.
Output STRICT JSON only:
{
  "summaryKa": "1-2 sentence warm Georgian overall summary",
  "wentWell": [
    { "momentKa": "specific moment that worked", "phraseEn": "exact phrase they used or paraphrase", "whyKa": "why it landed" }
  ],
  "needsImprovement": [
    { "momentKa": "specific weak moment", "phraseEn": "what they said (or didn't)", "whyKa": "why it weakened the presentation" }
  ],
  "keyPhrases": [
    { "en": "3 presentation phrases to remember", "ka": "Georgian translation", "whenKa": "when to use it" }
  ],
  "practiceNextKa": "ONE specific thing to focus on in next session — short Georgian sentence",
  "vocabulary": [
    { "en": "phrase", "ka": "Georgian", "exampleEn": "1 sentence usage", "exampleKa": "Georgian translation" }
  ]
}
Include 2-3 wentWell, 2-3 needsImprovement, exactly 3 keyPhrases, 4-6 vocabulary items.`;

function sessionPrompt(b: any) {
  const intensity = b.intensity || "standard";
  const slideCount =
    intensity === "light" ? 3 :
    intensity === "intensive" || intensity === "deadline" ? 6 : 5;

  return `Design a presentation coaching session.

CURRICULUM LOCK:
- topicKey: ${b.curriculumTopicKey || "self_introduction"}
- topic (Georgian): ${b.curriculumTopicTitleKa || ""}
- step ${b.curriculumStep || 1} / ${b.curriculumTotal || 7}, pass #${b.curriculumCycle || 1}
- guidance: ${b.curriculumGuidance || ""}

Learner:
- level: ${b.level || "business_intermediate"}
- intensity: ${intensity}
- fields: ${(b.fields || []).join(", ") || "general"}
- goals: ${(b.goals || []).join(", ") || "presentations"}

Already used scenarios (NEVER reuse): ${(b.recentScenarios || []).join(", ") || "(none)"}

Return JSON exactly in this shape:
{
  "scenarioKey": "short-kebab-key",
  "presentationTitleEn": "Presentation title in English (specific to learner's field)",
  "presentationTitleKa": "Georgian translation",
  "audienceKa": "Georgian short description of audience (e.g. 'შენი გუნდი', 'პოტენციური კლიენტი', 'საბჭოს წევრები')",
  "audienceEn": "English short audience label",
  "difficultyKa": "Georgian one-line difficulty label (e.g. 'საშუალო — საფუძვლები + ერთი გამოწვევა')",
  "estimatedMinutes": ${intensity === "light" ? 10 : intensity === "intensive" || intensity === "deadline" ? 30 : 20},
  "skillsTrainedKa": ["4-5 short Georgian skill chips, e.g. 'ფორმალური ინგლისური', 'ბიზნეს ლექსიკა', 'თავდაჯერებულობა', 'სტრუქტურა'"],
  "whyMattersEn": "1-2 sentence English explanation of why this presentation topic matters in business",
  "whyMattersKa": "Georgian translation of whyMattersEn",
  "slides": [
    /* exactly ${slideCount} slides */
    {
      "titleEn": "Short slide title in English",
      "titleKa": "Georgian translation",
      "bullets": ["3-5 short bullet points — KEY IDEAS only, not full sentences"],
      "bulletsKa": ["Georgian translation of each bullet"],
      "keySentenceEn": "ONE key sentence from this slide the user will be asked to paraphrase",
      "keywords": ["3-5 short keywords from this slide — used in stage 2 when full text is hidden"],
      "vocabulary": [
        { "en": "difficult professional word/phrase", "ka": "Georgian translation", "pronounceKa": "Georgian phonetic spelling, e.g. 'სტრატიჯი'" }
      ]
    }
  ],
  "audienceQuestions": [
    /* 2-3 questions; last one MUST be slightly off-topic / unexpected */
    { "questionEn": "...", "unexpected": false }
  ],
  "tomorrowTeaseKa": "1 short Georgian sentence hinting at next presentation session"
}

Include exactly ${slideCount} slides. Include 3 vocabulary items per slide (4 for advanced level). Audience questions: ${intensity === "intensive" || intensity === "deadline" ? "3-4 (last is unexpected)" : "2-3 (last is unexpected)"}.`;
}

function explainPrompt(b: any) {
  return `Learner level: ${b.level || "business_intermediate"}
Slide title: ${b.slide?.titleEn || ""}
Slide bullets:
${(b.slide?.bullets || []).map((x: string) => `- ${x}`).join("\n")}
Key sentence: ${b.slide?.keySentenceEn || ""}

Explain this slide to the learner in calm, professional English (1-3 sentences), then give Georgian support and one tip.`;
}

function practicePrompt(b: any) {
  return `Slide title: ${b.slide?.titleEn || ""}
Slide key sentence (target): ${b.slide?.keySentenceEn || ""}

User's paraphrase: """${b.userText || ""}"""

Give warm, encouraging coach feedback.`;
}

function audiencePrompt(b: any) {
  return `Presentation: ${b.presentationTitleEn}
Audience: ${b.audienceEn}
Topic guidance: ${b.curriculumGuidance || ""}
User's full Stage 3 presentation (what they just said):
"""${b.userText || ""}"""

This is question #${b.questionIndex || 1}.
Unexpected (slightly off-topic): ${b.unexpected ? "true" : "false"}

Ask ONE realistic audience question in English.`;
}

function evaluatePrompt(b: any) {
  return `Learner level: ${b.level || "business_intermediate"}
Presentation title: ${b.presentationTitleEn}

Stage 3 transcript (full user presentation):
"""${b.stage3Text || ""}"""

Q&A transcript:
${(b.qa || []).map((t: any) => `Q: ${t.q}\nUser: ${t.a}`).join("\n\n")}

Pick verdict that genuinely reflects performance. Stronger English + structure + handled questions = strong.`;
}

function debriefPrompt(b: any) {
  return `Learner level: ${b.level || "business_intermediate"}
Verdict: ${b.verdict}
Presentation: ${b.presentationTitleEn}

Stage 3:
${b.stage3Text || ""}

Q&A:
${(b.qa || []).map((t: any) => `Q: ${t.q}\nUser: ${t.a}`).join("\n\n")}

Now give the structured Georgian debrief.`;
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
    if (body.action === "session") r = await callAI(SYSTEM_SESSION, sessionPrompt(body));
    else if (body.action === "explain") r = await callAI(SYSTEM_EXPLAIN, explainPrompt(body));
    else if (body.action === "practiceFeedback") r = await callAI(SYSTEM_PRACTICE, practicePrompt(body));
    else if (body.action === "audienceQuestion") r = await callAI(SYSTEM_AUDIENCE, audiencePrompt(body));
    else if (body.action === "evaluate") r = await callAI(SYSTEM_EVALUATE, evaluatePrompt(body));
    else if (body.action === "debrief") r = await callAI(SYSTEM_DEBRIEF, debriefPrompt(body));
    else {
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
