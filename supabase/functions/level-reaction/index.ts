import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireUser } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FALLBACKS = [
  "კარგია, რომ დაიწყე! აქ ნელ-ნელა და მარტივად ვისწავლით 😊",
  "მაგარი დასაწყისია! ერთად გავაუმჯობესებთ შენს ინგლისურს 💪",
  "კარგი ნაბიჯია — ყოველი წინადადება შენს დონეს ზრდის ✨",
  "გილოცავ პირველ ნაბიჯს! მთავარია დაიწყე — დანარჩენი მოვა 😄",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const _auth = await requireUser(req);
    if (_auth.error) return _auth.error;
    const { writingSample = "", level = "" } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const fallback = FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];

    if (!OPENAI_API_KEY || !writingSample.trim()) {
      return new Response(JSON.stringify({ reaction: fallback }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sys = `You write a SHORT (max 2 sentences), warm, friendly reaction in GEORGIAN (ქართული) to a student's English writing sample.
Rules:
- Mostly Georgian script. You may quote 1-2 English words from the sample.
- Encouraging, age-appropriate for 5th grade and up.
- Optionally a tiny compliment or light joke. Never mock the student. Never shame mistakes.
- Do NOT correct grammar. Do NOT mention the level.
- Tie the reaction to a topic from the sample if possible (e.g. football, school, family, music).
- One emoji max.`;

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: `Student wrote:\n"""${writingSample}"""\nWrite the friendly Georgian reaction now.` },
        ],
      }),
    });

    if (!resp.ok) {
      return new Response(JSON.stringify({ reaction: fallback }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await resp.json();
    const reaction = data?.choices?.[0]?.message?.content?.trim() || fallback;
    return new Response(JSON.stringify({ reaction }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ reaction: FALLBACKS[0] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
