// Creates an Inworld AI Realtime session for the AI Speaking Call.
// Uses INWORLD_API_KEY (server-side only) with HTTP Basic auth.
// Returns a session id that the browser uses as the `key` query parameter
// when establishing the WebRTC / WebSocket connection to Inworld.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const INWORLD_API_KEY = Deno.env.get("INWORLD_API_KEY");
const PRIMARY_MODEL = "inworld-voice-1";

type Tier = "easy" | "medium" | "hard";

function tierGuidance(tier: Tier): string {
  if (tier === "easy") {
    return "DIFFICULTY: EASY. Use A1 vocabulary only. Short sentences (max 8 words). Speak slowly and clearly. Be very patient. Confirm understanding often. Ask one simple yes/no or short-answer question at a time. If the learner pauses, gently offer a hint.";
  }
  if (tier === "medium") {
    return "DIFFICULTY: MEDIUM. Use B1 vocabulary. Natural conversational pace with multi-clause sentences (10-15 words). Occasionally ask follow-up questions. Light, friendly corrections inline. Avoid idioms unless common.";
  }
  return "DIFFICULTY: HARD. Use B2/C1 vocabulary. Native conversational pace. Include idioms and unexpected topic pivots. Push the learner with opinion questions and hypotheticals. No hand-holding — assume strong comprehension.";
}

function instructionsFor(level: string, topic: string, tier: Tier) {
  return `Friendly English tutor for Georgian learners. Topic: ${topic}. Level: ${level}. ${tierGuidance(tier)} Assume the user is speaking English (possibly with accent). Be lenient: if you can guess the meaning, accept it, briefly offer a better phrasing, and continue. Reply in 1-2 short sentences max, ask ONE question at a time. Do NOT say "repeat" or "try again" unless speech is completely unclear. Do NOT speak Georgian. Never drill pronunciation.`;
}

function basicAuthHeader(apiKey: string) {
  // Inworld expects Basic <base64(apiKey:)>  (note the trailing colon, empty password)
  const encoded = btoa(`${apiKey}:`);
  return `Basic ${encoded}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (!INWORLD_API_KEY) {
    return new Response(JSON.stringify({ error: "INWORLD_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const topic = String(body?.topic ?? "Free conversation").slice(0, 120);
    const level = String(body?.level ?? "Beginner").slice(0, 40);
    const tierRaw = String(body?.tier ?? "easy").toLowerCase();
    const tier: Tier = tierRaw === "hard" ? "hard" : tierRaw === "medium" ? "medium" : "easy";
    const voice = "alloy";
    const instructions = instructionsFor(level, topic, tier);

    const res = await fetch("https://api.inworld.ai/api/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: basicAuthHeader(INWORLD_API_KEY),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: PRIMARY_MODEL,
        instructions,
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
      }),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error("[inworld] session create failed", res.status, json);
      return new Response(
        JSON.stringify({ error: json?.error?.message ?? json?.message ?? "Inworld session error" }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const sessionId = json?.id ?? json?.session_id ?? json?.sessionId;
    if (!sessionId) {
      console.error("[inworld] missing session id in response", json);
      return new Response(JSON.stringify({ error: "Missing session id from Inworld" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        session_id: sessionId,
        // Backwards-compatible shape: the frontend reads client_secret.value as the key.
        client_secret: { value: sessionId, expires_at: json?.expires_at ?? null },
        model: PRIMARY_MODEL,
        voice,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[inworld] error", e);
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
