// Returns Inworld realtime connection info to the frontend:
// the API key, ICE servers, and the WebRTC calls URL. The frontend performs
// the SDP exchange directly with Inworld per their official WebRTC docs.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const INWORLD_API_KEY = Deno.env.get("INWORLD_API_KEY");

type Tier = "easy" | "medium" | "hard";

function tierGuidance(tier: Tier): string {
  if (tier === "easy") {
    return `DIFFICULTY: EASY (A1-A2).
- Speak SLOWLY and CLEARLY. Simple vocabulary only.
- Short sentences (max 8 words). One clause at a time.
- Ask ONE simple question at a time (yes/no or short answer).
- Be VERY patient. Wait for the learner. Never rush.
- If the learner struggles, gently simplify even more, offer a hint.
- Topics stay simple and predictable. No idioms. No surprise pivots.`;
  }
  if (tier === "medium") {
    return `DIFFICULTY: MEDIUM (B1).
- Speak at a more natural conversational pace.
- Use wider vocabulary including some common idioms.
- Ask follow-up questions that require more than one-word answers.
- React naturally — show genuine interest in what the learner says.
- Occasionally introduce mild unexpected turns.
- Don't over-explain or over-simplify. Trust the learner.`;
  }
  return `DIFFICULTY: HARD (B2/C1).
- Speak at full natural NATIVE speed.
- Use complex vocabulary, idioms, natural contractions ("gonna", "kinda", "y'know").
- Ask complex situational and opinion questions, hypotheticals.
- CHALLENGE the learner: push back, ask for clarification, express surprise, disagree politely.
- Conversation should feel completely real and unpredictable.
- ZERO hand-holding. Assume strong comprehension.`;
}

function instructionsFor(level: string, topic: string, tier: Tier) {
  return `Friendly English tutor for Georgian learners. Topic: ${topic}. Level: ${level}. ${tierGuidance(tier)} Assume the user is speaking English (possibly with accent). Be lenient: if you can guess the meaning, accept it, briefly offer a better phrasing, and continue. Reply in 1-2 short sentences max, ask ONE question at a time. Do NOT say "repeat" or "try again" unless speech is completely unclear. Do NOT speak Georgian. Never drill pronunciation.`;
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
    const instructions = instructionsFor(level, topic, tier);

    // Fetch ICE servers from Inworld
    let iceServers: any[] = [];
    try {
      const iceRes = await fetch("https://api.inworld.ai/v1/realtime/ice-servers", {
        headers: { Authorization: `Bearer ${INWORLD_API_KEY}` },
      });
      if (iceRes.ok) {
        const iceJson = await iceRes.json().catch(() => ({}));
        iceServers = iceJson?.iceServers ?? iceJson?.ice_servers ?? [];
      } else {
        const txt = await iceRes.text();
        console.warn("[inworld] ice-servers fetch failed", iceRes.status, txt.slice(0, 200));
      }
    } catch (e) {
      console.warn("[inworld] ice-servers error", (e as Error).message);
    }

    return new Response(
      JSON.stringify({
        api_key: INWORLD_API_KEY,
        ice_servers: iceServers,
        webrtc_url: "https://api.inworld.ai/v1/realtime/calls",
        instructions,
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
