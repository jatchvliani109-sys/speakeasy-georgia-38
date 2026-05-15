// Creates an ephemeral OpenAI Realtime client secret for the AI Speaking Call.
// Uses the GA Realtime API: POST /v1/realtime/client_secrets

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");
const PRIMARY_MODEL = "gpt-realtime-mini";
const FALLBACK_MODEL = "gpt-realtime-2";

function instructionsFor(level: string, topic: string, learningPath?: string) {
  const lvl = (level || "Beginner").toLowerCase();
  const beginner = lvl.includes("begin") || lvl.includes("a1") || lvl.includes("a2");
  const pace = beginner
    ? "Speak slowly and clearly. Use very simple English (A1-A2). Short sentences (max 8 words). Ask one easy question at a time."
    : "Use natural conversational English (B1-B2). Ask follow-up questions. Encourage longer answers. Gently correct grammar.";

  return [
    `You are a friendly English speaking tutor for Georgian (ქართული) speakers.`,
    `The student is practicing the topic: "${topic}". Stay focused on this topic.`,
    `Level: ${level}. ${pace}`,
    `Always speak ENGLISH out loud. Keep replies short (1-2 sentences). Ask only ONE question per turn.`,
    `Be warm and encouraging. Never lecture.`,
    `If the student speaks Georgian or asks for help, say briefly in English: "Try saying: <short English phrase>." Then invite them to repeat.`,
    learningPath ? `Learning path context: ${learningPath}.` : "",
    `Start by greeting the student warmly in one short English sentence and asking one simple opening question about "${topic}".`,
  ].filter(Boolean).join(" ");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (!OPENAI_KEY) {
    return new Response(JSON.stringify({ error: "OPENAI_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const topic = String(body?.topic ?? "Free conversation").slice(0, 200);
    const level = String(body?.level ?? "Beginner").slice(0, 60);
    const learningPath = body?.selectedLearningPath ? String(body.selectedLearningPath).slice(0, 60) : undefined;
    const voice = "alloy";
    const instructions = instructionsFor(level, topic, learningPath);

    async function createClientSecret(model: string) {
      const res = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session: {
            type: "realtime",
            model,
            instructions,
            audio: {
              output: { voice },
            },
          },
        }),
      });
      const json = await res.json().catch(() => ({}));
      return { res, json };
    }

    let { res, json } = await createClientSecret(PRIMARY_MODEL);
    let usedModel = PRIMARY_MODEL;
    if (!res.ok) {
      console.warn("[realtime] primary failed, trying fallback", res.status, json);
      const retry = await createClientSecret(FALLBACK_MODEL);
      res = retry.res;
      json = retry.json;
      usedModel = FALLBACK_MODEL;
    }

    if (!res.ok) {
      console.error("[realtime] openai error", res.status, json);
      return new Response(
        JSON.stringify({ error: json?.error?.message ?? "OpenAI session error" }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // GA response shape: { value, expires_at, session: {...} }
    const clientSecretValue = json?.value ?? json?.client_secret?.value;
    const expiresAt = json?.expires_at ?? json?.client_secret?.expires_at;

    return new Response(
      JSON.stringify({
        client_secret: { value: clientSecretValue, expires_at: expiresAt },
        model: usedModel,
        voice,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[realtime] error", e);
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
