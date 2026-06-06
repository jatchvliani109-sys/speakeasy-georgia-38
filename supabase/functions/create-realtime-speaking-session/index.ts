// Proxies the Inworld Realtime WebRTC SDP exchange so the INWORLD_API_KEY
// stays server-side. Client posts its SDP offer here; we forward to Inworld
// with Bearer auth and return the SDP answer.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const INWORLD_API_KEY = Deno.env.get("INWORLD_API_KEY");
const MODEL = "gpt-4o-mini"; // placeholder; Inworld uses its own model list. Adjust if needed.

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

function inworldAuthHeader(apiKey: string) {
  const k = apiKey.trim().replace(/^Basic\s+/i, "").replace(/^Bearer\s+/i, "");
  return `Bearer ${k}`;
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
    const sdp = String(body?.sdp ?? "");
    if (!sdp) {
      return new Response(JSON.stringify({ error: "Missing sdp" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const topic = String(body?.topic ?? "Free conversation").slice(0, 120);
    const level = String(body?.level ?? "Beginner").slice(0, 40);
    const tierRaw = String(body?.tier ?? "easy").toLowerCase();
    const tier: Tier = tierRaw === "hard" ? "hard" : tierRaw === "medium" ? "medium" : "easy";
    const instructions = instructionsFor(level, topic, tier);

    const res = await fetch("https://api.inworld.ai/v1/realtime/calls", {
      method: "POST",
      headers: {
        Authorization: inworldAuthHeader(INWORLD_API_KEY),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sdp,
        session: {
          instructions,
          output_modalities: ["audio", "text"],
          audio: {
            input: {
              transcription: { model: "inworld/inworld-stt-1" },
              turn_detection: {
                type: "semantic_vad",
                eagerness: "medium",
                create_response: true,
                interrupt_response: true,
              },
            },
            output: { model: "inworld-tts-2", voice: "Dennis", speed: 1.0 },
          },
        },
      }),
    });

    const text = await res.text();
    if (!res.ok) {
      console.error("[inworld] call create failed", res.status, text);
      return new Response(
        JSON.stringify({ error: "Inworld call error", status: res.status, detail: text }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let json: any = {};
    try { json = JSON.parse(text); } catch { /* unexpected */ }
    const answerSdp = json?.sdp;
    if (!answerSdp) {
      console.error("[inworld] missing sdp in response", json);
      return new Response(JSON.stringify({ error: "Missing sdp in Inworld response" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ sdp: answerSdp, id: json?.id ?? null, ice_servers: json?.ice_servers ?? [], model: MODEL }),
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
