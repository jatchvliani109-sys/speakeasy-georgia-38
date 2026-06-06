// Inworld AI Text-to-Speech for the read-aloud speaker buttons.
// Uses INWORLD_API_KEY from Supabase secrets — never exposed to the frontend.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

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

function basicAuthHeader(apiKey: string) {
  return `Basic ${btoa(`${apiKey}:`)}`;
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
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
    const apiKey = Deno.env.get("INWORLD_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "NOT_CONFIGURED" }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Inworld TTS REST API: POST https://api.inworld.ai/tts/v1/voice
    // Body: { text, voiceId, modelId }
    // Response: { audioContent: <base64 mp3/wav> }
    const voiceId = (typeof voice === "string" && voice) || "Ashley";
    const res = await fetch("https://api.inworld.ai/tts/v1/voice", {
      method: "POST",
      headers: { Authorization: basicAuthHeader(apiKey), "Content-Type": "application/json" },
      body: JSON.stringify({
        text: cleaned,
        voiceId,
        modelId: "inworld-tts-1",
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("Inworld TTS failed", res.status, err.slice(0, 400));
      return new Response(JSON.stringify({ error: "TTS_FAILED", detail: err.slice(0, 200) }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const json = await res.json().catch(() => null) as any;
    const b64 = json?.audioContent ?? json?.audio ?? json?.audio_content;
    if (!b64 || typeof b64 !== "string") {
      console.error("Inworld TTS missing audioContent", JSON.stringify(json).slice(0, 300));
      return new Response(JSON.stringify({ error: "TTS_EMPTY" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const bytes = b64ToBytes(b64);
    return new Response(bytes, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=86400" },
    });
  } catch (e) {
    console.error("inworld-text-to-speech error", (e as Error).message);
    return new Response(JSON.stringify({ error: "INTERNAL" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
