// Text-to-Speech edge function. Uses ElevenLabs if ELEVENLABS_API_KEY is set,
// otherwise returns 503 so the client can fall back to the browser voice.
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { requireUser } from "../_shared/auth.ts";

const DEFAULT_VOICE = "EXAVITQu4vr4xnSDxMaL"; // Sarah – warm, clear English
const MODEL = "eleven_multilingual_v2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const _auth = await requireUser(req);
    if (_auth.error) return _auth.error;
    const { text, voiceId } = await req.json().catch(() => ({}));
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "Missing text" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "TTS provider not configured" }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let cleaned = text;
    try {
      cleaned = cleaned.replace(/\p{Extended_Pictographic}/gu, " ");
      cleaned = cleaned.replace(/[\p{Emoji_Presentation}\p{Emoji_Modifier}\p{Emoji_Component}]/gu, " ");
    } catch {}
    cleaned = cleaned
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
      .slice(0, 800);
    if (!cleaned) {
      return new Response(JSON.stringify({ error: "Empty text" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const vId = (typeof voiceId === "string" && voiceId) || DEFAULT_VOICE;
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${vId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          text: cleaned,
          model_id: MODEL,
          voice_settings: { stability: 0.55, similarity_boost: 0.8, style: 0.25, use_speaker_boost: true, speed: 0.9 },
        }),
      },
    );
    if (!res.ok) {
      const err = await res.text();
      console.error("ElevenLabs TTS unavailable", res.status, err.slice(0, 500));
      return new Response(JSON.stringify({ error: "TTS_PROVIDER_UNAVAILABLE", fallback: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const buf = await res.arrayBuffer();
    return new Response(buf, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=86400" },
    });
  } catch (e) {
    console.error("TTS function failed", (e as Error).message);
    return new Response(JSON.stringify({ error: "TTS_SERVICE_FAILED", fallback: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
