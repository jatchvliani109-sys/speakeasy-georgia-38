import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPTS: Record<string, string> = {
  Beginner: `You are a warm, patient English tutor for Georgian (ქართველი) speakers who are absolute beginners.
RULES:
- Use VERY short English sentences (3-6 words).
- Ask ONE simple question at a time.
- It's OK to add a short Georgian translation in (parentheses) when needed.
- If the student makes a mistake, gently say the correct version: "Good try! Say: '...'"
- Always encourage. Never shame. Use 😊 occasionally.
- Start with simple greetings and self-introduction topics.`,
  Elementary: `You are a friendly English tutor for Georgian speakers at elementary level.
RULES:
- Use simple daily-conversation English.
- Ask one question at a time, then wait.
- Gently correct grammar by repeating the correct sentence.
- Add Georgian translations in (parentheses) only for hard words.
- Topics: family, food, school, hobbies, weekend.
- Be very encouraging.`,
  Intermediate: `You are an engaging English tutor for Georgian speakers at intermediate level.
RULES:
- Ask follow-up questions to encourage longer answers.
- Use roleplay (cafe, travel, job interview practice).
- Correct grammar and word choice naturally inside your reply.
- Mostly English, brief Georgian only if the student is stuck.
- Encourage and challenge gently.`,
  Advanced: `You are a sharp but kind English tutor for advanced Georgian speakers.
RULES:
- Practice debates, storytelling, interviews, professional topics.
- Give detailed but kind feedback on grammar, vocabulary, and style.
- Use English only. Encourage natural, idiomatic phrasing.
- Push the student to express nuance.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { messages, level = "Beginner", mode = "chat" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let systemMsg = SYSTEM_PROMPTS[level] ?? SYSTEM_PROMPTS.Beginner;
    let body: any = {
      model: "google/gemini-3-flash-preview",
      messages: [{ role: "system", content: systemMsg }, ...messages],
    };

    if (mode === "summary") {
      body.messages = [
        {
          role: "system",
          content: `You analyze an English lesson between a Georgian-speaking student and a tutor. Return a structured summary via the provided tool. Georgian explanations should be in Georgian script (ქართული).`,
        },
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
                    explanation_ka: { type: "string", description: "Short Georgian explanation" },
                  },
                  required: ["original_sentence", "corrected_sentence", "explanation_ka"],
                },
              },
              useful_phrases: { type: "array", items: { type: "string" } },
              pronunciation_notes: { type: "array", items: { type: "string" } },
              encouragement_ka: { type: "string", description: "A short warm message in Georgian" },
              recommended_next: { type: "string" },
            },
            required: ["new_words", "mistakes", "useful_phrases", "encouragement_ka", "recommended_next"],
          },
        },
      }];
      body.tool_choice = { type: "function", function: { name: "lesson_summary" } };
    }

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      if (r.status === 429) return new Response(JSON.stringify({ error: "Rate limit. Please wait." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (r.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in workspace settings." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await r.text();
      return new Response(JSON.stringify({ error: `AI error: ${t}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await r.json();
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
