// Speech-to-Text edge function (ElevenLabs Scribe v2 batch).
// Accepts JSON: { audioBase64: string, mimeType?: string }
// Returns: { text: string } or 503/4xx with { error }
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireUser } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const _auth = await requireUser(req);
    if (_auth.error) return _auth.error;
    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "STT_NOT_CONFIGURED" }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const body = await req.json().catch(() => ({}));
    const audioBase64: string | undefined = body?.audioBase64;
    const mimeType: string = body?.mimeType || "audio/webm";
    if (!audioBase64 || typeof audioBase64 !== "string") {
      return new Response(JSON.stringify({ error: "MISSING_AUDIO" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Decode base64 -> bytes
    const bin = atob(audioBase64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

    const ext = mimeType.includes("mp4") ? "mp4"
      : mimeType.includes("ogg") ? "ogg"
      : mimeType.includes("wav") ? "wav"
      : mimeType.includes("mpeg") ? "mp3"
      : "webm";
    const file = new File([bytes], `audio.${ext}`, { type: mimeType });

    const form = new FormData();
    form.append("file", file);
    form.append("model_id", "scribe_v2");
    form.append("language_code", "eng");
    form.append("tag_audio_events", "false");
    form.append("diarize", "false");

    const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: form,
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("ElevenLabs STT failed", res.status, err.slice(0, 500));
      // Return soft 200 with fallback flag so the client can degrade gracefully
      return new Response(JSON.stringify({ error: "STT_PROVIDER_FAILED", fallback: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await res.json();
    const text: string = (data?.text ?? "").toString().trim();
    return new Response(JSON.stringify({ text }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("STT function failed", (e as Error).message);
    return new Response(JSON.stringify({ error: "STT_SERVICE_FAILED", fallback: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
