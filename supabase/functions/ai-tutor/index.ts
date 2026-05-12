import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LEVEL_GUIDE: Record<string, string> = {
  Beginner: `CRITICAL: The student is a BEGINNER and is TYPING (not speaking).
STRICT RULES — never break:
1. EVERY instruction must be in GEORGIAN FIRST. English appears only as a short example or target sentence.
2. English sentences MUST be 3-6 words. NEVER write English paragraphs or multi-sentence English.
3. Ask ONE tiny task at a time. No combined questions.
4. Pattern (use it almost every turn):
   "დავალება ქართულად...
   მაგალითი: 'I go to school.'
   ნიშნავს: 'მე მივდივარ სკოლაში.'
   ახლა შენ სცადე."
5. Never use complex English instructions like "Choose the correct sentence that best describes...". Instead say: "აირჩიე სწორი წინადადება:" then list 2 short options.
6. Be warm, patient, encouraging. Never overwhelm. The student should NEVER feel confused reading an instruction.`,
  Elementary: `Simple daily English. Brief Georgian help when needed. Short sentences. Topics: school, hobbies, weekend, family.`,
  Intermediate: `Natural English. Encourage longer answers. Roleplay: cafe, travel, work. Georgian only if stuck.`,
  Advanced: `English only. Push nuance, idioms, opinions. Detailed kind feedback.`,
};

const STAGE_INSTRUCTIONS: Record<string, string> = {
  warmup: `You are in the WARM-UP stage. The student is TYPING answers (not speaking). Ask ONE simple warm-up question at a time from the list provided. After they answer, briefly react warmly (1 short sentence) and ask the next warm-up question. After all warm-up questions, say "Great! Now let's learn some new words." and STOP.`,
  practice: `You are in the SPEAKING PRACTICE stage. The student is TYPING (not speaking). Never say "say" — use "type" or "write". Guide a short focused typing exercise around the lesson goal. Ask ONE question at a time. Encourage the student to use the new words. Gently correct mistakes by writing the correct sentence and asking them to type it back. Be warm. After 4-6 exchanges, say "Wonderful work! Let's review what you learned." and STOP.`,
};

const COACH_MODES: Record<string, string> = {
  speaking_lesson: `SPEAKING COACH MODE.
You are a guided speaking coach (not a generic chatbot). Rules:
- Focus only on building speaking confidence on the current topic.
- Ask ONE short question at a time. Maximum 1-2 sentences per turn.
- Never write English paragraphs. English sentences must stay short.
- Encourage the student to repeat the new words/phrases from the lesson.
- Gently correct mistakes using EXACTLY this format: Better: "<correct sentence>". Then 1 short Georgian explanation, then ask the next question.
- For Beginner level: write the instruction in Georgian first, then a very short English question.
- Stay strictly on the lesson topic. Do not change subjects.
- After 4-6 exchanges, end warmly with one short Georgian encouragement.

ANSWER SUGGESTION FORMAT (CRITICAL):
- For BEGINNER level: AFTER each English question, append on a new line exactly: OPTIONS: ["full short answer 1", "full short answer 2", "full short answer 3"]
  Each option must be a complete short English sentence the student could click to send as their reply.
- For ELEMENTARY level: append on a new line exactly: STARTERS: ["I would like...", "Can I have...?"]
  Each starter is a short sentence opener (3-5 words) to help them begin.
- For INTERMEDIATE/ADVANCED: do NOT append OPTIONS or STARTERS.
- Do NOT wrap OPTIONS/STARTERS in markdown. Just the bare line.`,
  roleplay: `ROLEPLAY COACH MODE.
You are a roleplay partner for an English-learning Georgian speaker. Rules:
- Stay STRICTLY in character as the assigned aiRole. Do NOT break character or explain.
- Keep every reply short (1-2 sentences) and on-scene.
- Ask ONE thing at a time so the student can answer easily.
- For Beginner: use very simple English (3-6 words per sentence). Add a tiny Georgian hint in parentheses only if needed.
- For Intermediate: natural English, ask follow-up questions.
- If the student makes a clear mistake, gently model the correct version inside your reply, e.g. "(You can say: '...')". Do not lecture.
- After ~6 exchanges, naturally wrap up the scene with a friendly closing line.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { messages = [], level = "Beginner", mode = "chat", stage, lessonContext, recentTopics = [], suggestedTopic, coachMode } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const baseTutor = `You are a warm, patient English TYPING tutor for Georgian (ქართველი) speakers. The student types their answers — they do NOT speak. Never use the word "say"; use "type" or "write" instead.
Level: ${level}. ${LEVEL_GUIDE[level] ?? LEVEL_GUIDE.Beginner}
Always: ask ONE question at a time. Be encouraging. Never shame. Use 😊 occasionally. Keep responses short.
Gently correct: "Good try! Type: '...'". Use Georgian script (ქართული) when adding Georgian help.`;

    let body: any = {
      model: "google/gemini-2.5-flash",
      messages: [],
    };

    if (mode === "plan") {
      const topicHint = suggestedTopic
        ? `TODAY'S TOPIC MUST BE: "${suggestedTopic}". Build the entire lesson around this topic.`
        : `Choose a fresh topic appropriate for level ${level}.`;
      const avoidHint = recentTopics.length
        ? `AVOID these recently-used topics: ${recentTopics.join(", ")}. Pick something different.`
        : "";
      body.messages = [
        {
          role: "system",
          content: `You design a short English speaking lesson plan for a Georgian-speaking student at level: ${level}. Output via the provided tool only. Make it appropriate for ages 10+ (school children to adults). Keep everything simple and warm. Georgian text must be in Georgian script. Do NOT default to introductions/"what is your name" unless the topic is specifically Introductions. ${topicHint} ${avoidHint}`,
        },
        { role: "user", content: `Design today's lesson plan. ${LEVEL_GUIDE[level] ?? ""}` },
      ];
      body.tools = [{
        type: "function",
        function: {
          name: "lesson_plan",
          description: "Structured speaking lesson plan",
          parameters: {
            type: "object",
            properties: {
              title_en: { type: "string", description: "Short English lesson title" },
              title_ka: { type: "string", description: "Same title in Georgian" },
              goal_ka: { type: "string", description: "One sentence goal in Georgian" },
              topic: { type: "string", description: "Topic theme in English" },
              estimated_minutes: { type: "integer" },
              warmup_questions: {
                type: "array",
                description: "2-3 simple warm-up questions in English (with optional Georgian hint in parentheses for Beginner)",
                items: { type: "string" },
                minItems: 2, maxItems: 3,
              },
              new_words: {
                type: "array",
                description: "3-5 useful words/phrases for this lesson",
                items: {
                  type: "object",
                  properties: {
                    english_word: { type: "string" },
                    georgian_meaning: { type: "string" },
                    example_sentence: { type: "string" },
                  },
                  required: ["english_word", "georgian_meaning", "example_sentence"],
                },
                minItems: 3, maxItems: 5,
              },
              practice_intro: { type: "string", description: "First practice question/prompt the tutor will ask, in English." },
              scenario_ka: { type: "string", description: "Short Georgian scene-setter for the guided conversation, e.g. 'მე ვარ მიმტანი. შენ ხარ მომხმარებელი.'" },
              user_role_ka: { type: "string", description: "User's role in Georgian, e.g. 'მომხმარებელი'." },
              ai_role_ka: { type: "string", description: "AI's role in Georgian, e.g. 'მიმტანი'." },
              activities: {
                type: "array",
                description: "2-3 short interactive practice activities related to the new_words and topic. Use multiple-choice style. Mix types: 'choose_meaning' (translate a word), 'fill_blank' (complete a sentence), 'pick_correct' (choose the correct sentence).",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string", enum: ["choose_meaning", "fill_blank", "pick_correct"] },
                    question_ka: { type: "string", description: "Question text shown to the student in Georgian (or with English target word)." },
                    options: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4 },
                    correct_index: { type: "integer", description: "0-based index of the correct option" },
                    explanation_ka: { type: "string", description: "Short Georgian explanation of why it's correct" },
                  },
                  required: ["type", "question_ka", "options", "correct_index", "explanation_ka"],
                },
                minItems: 2, maxItems: 3,
              },
            },
            required: ["title_en", "title_ka", "goal_ka", "topic", "estimated_minutes", "warmup_questions", "new_words", "practice_intro", "scenario_ka", "user_role_ka", "ai_role_ka", "activities"],
          },
        },
      }];
      body.tool_choice = { type: "function", function: { name: "lesson_plan" } };
    } else if (mode === "summary") {
      body.messages = [
        { role: "system", content: `Analyze this English lesson between a Georgian-speaking student and a tutor. Return a structured summary via the tool. Georgian text must be in Georgian script.` },
        { role: "user", content: `Lesson transcript:\n${JSON.stringify(messages)}` },
      ];
      body.tools = [{
        type: "function",
        function: {
          name: "lesson_summary",
          description: "Structured lesson summary",
          parameters: {
            type: "object",
            properties: {
              new_words: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    english_word: { type: "string" },
                    georgian_meaning: { type: "string" },
                    example_sentence: { type: "string" },
                    difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                  },
                  required: ["english_word", "georgian_meaning", "example_sentence", "difficulty"],
                },
              },
              mistakes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                     original_sentence: { type: "string" },
                    corrected_sentence: { type: "string" },
                    explanation_ka: { type: "string" },
                    tag: { type: "string", enum: ["grammar", "vocabulary", "structure"], description: "Category of mistake" },
                  },
                  required: ["original_sentence", "corrected_sentence", "explanation_ka", "tag"],
                },
              },
              useful_phrases: { type: "array", items: { type: "string" } },
              encouragement_ka: { type: "string" },
              homework_ka: { type: "string", description: "One simple homework task in Georgian" },
            },
            required: ["new_words", "mistakes", "useful_phrases", "encouragement_ka", "homework_ka"],
          },
        },
      }];
      body.tool_choice = { type: "function", function: { name: "lesson_summary" } };
    } else {
      // chat mode — stage-aware + optional coachMode (Speaking path)
      let sys = baseTutor;
      if (stage && STAGE_INSTRUCTIONS[stage]) sys += `\n\n${STAGE_INSTRUCTIONS[stage]}`;
      if (coachMode && COACH_MODES[coachMode]) sys += `\n\n${COACH_MODES[coachMode]}`;
      if (lessonContext) sys += `\n\nLesson context:\n${JSON.stringify(lessonContext)}`;
      body.messages = [{ role: "system", content: sys }, ...messages];
    }

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      if (r.status === 429) return new Response(JSON.stringify({ error: "Rate limit. Please wait." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (r.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await r.text();
      return new Response(JSON.stringify({ error: `AI error: ${t}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await r.json();
    if (mode === "plan") {
      const tc = data.choices?.[0]?.message?.tool_calls?.[0];
      const args = tc ? JSON.parse(tc.function.arguments) : {};
      return new Response(JSON.stringify({ plan: args }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (mode === "summary") {
      const tc = data.choices?.[0]?.message?.tool_calls?.[0];
      const args = tc ? JSON.parse(tc.function.arguments) : {};
      return new Response(JSON.stringify({ summary: args }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const reply = data.choices?.[0]?.message?.content ?? "";
    return new Response(JSON.stringify({ reply }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ai-tutor error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
