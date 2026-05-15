// Creates an ephemeral OpenAI Realtime client secret for the AI Speaking Call.
// Uses the GA Realtime API: POST /v1/realtime/client_secrets
//
// Optimized for low cost + natural conversation:
// - Cheapest model first (gpt-realtime-mini), fallback gpt-realtime-2
// - Short, focused tutor instructions (no long prompts)
// - Faster turn detection (shorter silence padding)
// - Hard cap on response length (max_response_output_tokens)

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");
const PRIMARY_MODEL = "gpt-realtime-mini";
const FALLBACK_MODEL = "gpt-realtime-2";

function instructionsFor(level: string, topic: string) {
  // Very short prompt to keep input tokens low.
  return `Friendly English tutor for Georgian learners. Topic: ${topic}. Level: ${level}. Speak short simple English. One question at a time. If user speaks Georgian, do NOT speak Georgian; say "Try in English" and wait.`;
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
    const topic = String(body?.topic ?? "Free conversation").slice(0, 120);
    const level = String(body?.level ?? "Beginner").slice(0, 40);
    const voice = "alloy";
    const instructions = instructionsFor(level, topic);

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
            // Hard cap to keep voice replies short and cheap.
            max_response_output_tokens: 120,
            audio: {
              input: {
                transcription: { model: "whisper-1" },
                turn_detection: {
                  type: "server_vad",
                  threshold: 0.55,
                  prefix_padding_ms: 250,
                  silence_duration_ms: 550,
                  create_response: true,
                  interrupt_response: true,
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
