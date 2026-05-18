// OpenAI Text-to-Speech for the read-aloud speaker buttons.
// Uses OPENAI_API_KEY from Supabase secrets — never expose to the frontend.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

function cleanForTTS(text: string): string {
  let s = text;
  try {
    s = s.replace(/\p{Extended_Pictographic}/gu, " ");
    s = s.replace(/[\p{Emoji_Presentation}\p{Emoji_Modifier}\p{Emoji_Component}]/gu, " ");
  } catch {}
  s = s
    .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, " ")
    // Strip Georgian script
    .replace(/[\u10A0-\u10FF\u2D00-\u2D2F\u1C90-\u1CBF]+/g, " ")
    // Markdown / decorative symbols
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
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice: (typeof voice === "string" && voice) || "alloy",
        input: cleaned,
        response_format: "mp3",
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("OpenAI TTS failed", res.status, err.slice(0, 400));
      return new Response(JSON.stringify({ error: "TTS_FAILED" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const buf = await res.arrayBuffer();
    return new Response(buf, {
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
