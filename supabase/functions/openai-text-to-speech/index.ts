// OpenAI Text-to-Speech for the read-aloud speaker buttons.
// Uses OPENAI_API_KEY from Supabase secrets — never exposed to the frontend.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireUser } from "../_shared/auth.ts";

function cleanForTTS(text: string): string {
  let s = text;
  try {
    s = s.replace(/\p{Extended_Pictographic}/gu, " ");
    s = s.replace(/[\p{Emoji_Presentation}\p{Emoji_Modifier}\p{Emoji_Component}]/gu, " ");
  } catch {}
  s = s
    .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, " ")
    .replace(/[\u10A0-\u10FF\u2D00-\u2D2F\u1C90-\u1CBF]+/g, " ")
    .replace(/[*_`~#>|\\/=+^<>{}\[\]()]/g, " ")
    .replace(/[•·●◦▪►–—−-]+/g, " ")
    .replace(/["“”„«»‘’'`]/g, "")
    .replace(/[:;]/g, ".")
    .replace(/[^A-Za-z0-9 ,.!?']/g, " ")
    .replace(/[!?]+/g, ".")
    .replace(/\.{2,}/g, ".")
    .replace(/,+/g, ",")
    .replace(/\s+([,.])/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
  return s;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const _auth = await requireUser(req);
    if (_auth.error) return _auth.error;
    const { text, voice } = await req.json().catch(() => ({}));
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "Missing text" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const cleaned = cleanForTTS(text);
    if (!cleaned || !/[A-Za-z]/.test(cleaned)) {
      return new Response(JSON.stringify({ error: "NO_ENGLISH" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "NOT_CONFIGURED" }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // OpenAI TTS API: POST https://api.openai.com/v1/audio/speech
    // Voices: alloy, ash, ballad, coral, echo, fable, nova, onyx, sage, shimmer
    const voiceId = (typeof voice === "string" && voice) || "nova";
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        input: cleaned,
        voice: voiceId,
        response_format: "mp3",
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("OpenAI TTS failed", res.status, err.slice(0, 400));
      return new Response(JSON.stringify({ error: "TTS_FAILED", detail: err.slice(0, 200) }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // OpenAI returns raw audio bytes directly
    const audioBuffer = await res.arrayBuffer();
    return new Response(audioBuffer, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=86400" },
    });
  } catch (e) {
    console.error("openai-text-to-speech error", (e as Error).message);
    return new Response(JSON.stringify({ error: "INTERNAL" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
