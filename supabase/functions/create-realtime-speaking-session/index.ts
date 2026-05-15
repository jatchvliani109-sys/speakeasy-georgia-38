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
    ? "Speak slowly and clearly with very simple English (A1-A2). Use short sentences."
    : "Use natural conversational English (B1-B2). Encourage longer answers.";

  return [
    `You are a warm, natural English-speaking tutor for a Georgian (ქართული) learner.`,
    `You are having a real spoken conversation about: "${topic}". Stay on this topic.`,
    `Level: ${level}. ${pace}`,
    ``,
    `CONVERSATION STYLE — VERY IMPORTANT:`,
    `- Always speak ENGLISH out loud. Never speak Georgian aloud.`,
    `- Have a real back-and-forth conversation. Move the conversation forward.`,
    `- Ask ONE short question per turn. Keep replies to 1-2 short sentences.`,
    `- Do NOT act like a pronunciation drill. Do NOT keep asking the student to "repeat after me".`,
    `- Do NOT over-correct. Only correct grammar gently when it really helps, then continue naturally.`,
    `- React to what the student said before asking the next question (e.g. "Nice!", "Cool.", "Oh, really?").`,
    `- Wait until the student is clearly finished before answering. Do not interrupt.`,
    ``,
    `IF THE STUDENT SPEAKS GEORGIAN OR ASKS FOR HELP:`,
    `- Do NOT speak Georgian aloud.`,
    `- Reply with ONE short English line like: "Try saying: <short English phrase>." Then stop and let them try.`,
    ``,
    learningPath ? `Learning path context: ${learningPath}.` : "",
    `Begin now: greet the student warmly in ONE short English sentence and ask ONE simple opening question about "${topic}".`,
  ].filter(Boolean).join("\n");
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
              input: {
                transcription: { model: "whisper-1" },
                turn_detection: {
                  type: "server_vad",
                  threshold: 0.6,
                  prefix_padding_ms: 350,
                  silence_duration_ms: 900,
                  create_response: true,
                  interrupt_response: false,
                },
              },
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
