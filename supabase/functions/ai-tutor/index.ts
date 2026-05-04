import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LEVEL_GUIDE: Record<string, string> = {
  Beginner: `Use VERY short English (3-6 words). Add Georgian translation in (parentheses) for hard words. Topics: name, age, family, colors, food.`,
  Elementary: `Simple daily English. Brief Georgian help only when needed. Topics: school, hobbies, weekend, family.`,
  Intermediate: `Natural English. Encourage longer answers. Roleplay: cafe, travel, work. Georgian only if stuck.`,
  Advanced: `English only. Push nuance, idioms, opinions. Detailed kind feedback.`,
};

const STAGE_INSTRUCTIONS: Record<string, string> = {
  warmup: `You are in the WARM-UP stage. Ask the student ONE simple warm-up question at a time from the list provided. After they answer, briefly react warmly (1 short sentence) and ask the next warm-up question. After all warm-up questions are answered, say "Great! Now let's learn some new words." and STOP.`,
  practice: `You are in the SPEAKING PRACTICE stage. The student just learned new words. Guide a short focused speaking exercise around the lesson goal. Ask ONE question at a time. Encourage the student to use the new words. Gently correct mistakes by repeating the correct sentence and asking them to repeat it. Be warm. After 4-6 exchanges, say "Wonderful work! Let's review what you learned." and STOP.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { messages = [], level = "Beginner", mode = "chat", stage, lessonContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const baseTutor = `You are a warm, patient English speaking teacher for Georgian (ქართველი) speakers.
Level: ${level}. ${LEVEL_GUIDE[level] ?? LEVEL_GUIDE.Beginner}
Always: ask ONE question at a time. Be encouraging. Never shame. Use 😊 occasionally.
Gently correct: "Good try! Say: '...'". Use Georgian script (ქართული) when adding Georgian help.`;

    let body: any = {
      model: "google/gemini-2.5-flash",
      messages: [],
    };

    if (mode === "plan") {
      // Generate a fresh structured lesson plan (title, goal, warmup Qs, new words, practice prompt)
      body.messages = [
        {
          role: "system",
          content: `You design a short English speaking lesson plan for a Georgian-speaking student at level: ${level}. Output via the provided tool only. Make it appropriate for ages 10+ (school children to adults). Keep everything simple and warm. Georgian text must be in Georgian script.`,
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
            },
            required: ["title_en", "title_ka", "goal_ka", "topic", "estimated_minutes", "warmup_questions", "new_words", "practice_intro"],
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
                  },
                  required: ["original_sentence", "corrected_sentence", "explanation_ka"],
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
      // chat mode — stage-aware
      let sys = baseTutor;
      if (stage && STAGE_INSTRUCTIONS[stage]) sys += `\n\n${STAGE_INSTRUCTIONS[stage]}`;
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
