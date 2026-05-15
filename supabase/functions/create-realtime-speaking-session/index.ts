// Creates an ephemeral OpenAI Realtime session for the AI Speaking Call.
// The OpenAI API key never leaves the server. The browser uses the returned
// client_secret to connect via WebRTC.

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
    `Be warm and encouraging. Never lecture. Never list options unless asked.`,
    `If the student speaks Georgian or asks for help in Georgian: do NOT speak long Georgian audio.`,
    `Briefly say in English something like: "Try saying: <short English phrase>." Then invite them to repeat in English.`,
    `If the student is silent or stuck, offer a tiny English example they can repeat.`,
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

    async function createSession(model: string) {
      const res = await fetch("https://api.openai.com/v1/realtime/sessions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          voice,
          modalities: ["audio", "text"],
          instructions: instructionsFor(level, topic, learningPath),
          input_audio_transcription: { model: "whisper-1" },
          turn_detection: {
            type: "server_vad",
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 700,
          },
        }),
      });
      const json = await res.json().catch(() => ({}));
      return { res, json };
    }

    let { res: r, json: data } = await createSession(PRIMARY_MODEL);
    let usedModel = PRIMARY_MODEL;
    if (!r.ok) {
      console.warn("[realtime] primary model failed, trying fallback", r.status, data);
      const retry = await createSession(FALLBACK_MODEL);
      r = retry.res;
      data = retry.json;
      usedModel = FALLBACK_MODEL;
    }

    if (!r.ok) {
      console.error("[realtime] openai error", r.status, data);
      return new Response(
        JSON.stringify({ error: data?.error?.message ?? "OpenAI session error" }),
        { status: r.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        client_secret: data.client_secret, // { value, expires_at }
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
