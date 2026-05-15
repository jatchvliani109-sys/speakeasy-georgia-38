// useRealtimeCall — connects the browser to OpenAI Realtime via WebRTC.
// The OpenAI key stays server-side; we fetch an ephemeral client_secret from
// the create-realtime-speaking-session edge function and use it as a Bearer.

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type RtStatus =
  | "idle"
  | "connecting"
  | "ready"
  | "listening"
  | "ai_speaking"
  | "thinking"
  | "ended"
  | "error";

export type RtEvent =
  | { kind: "user_text"; text: string; final: boolean }
  | { kind: "ai_text"; text: string; final: boolean }
  | { kind: "georgian_help"; english: string; georgian: string };

type Args = {
  topic: string;
  level: string;
  selectedLearningPath?: string;
  onEvent?: (e: RtEvent) => void;
  onError?: (msg: string) => void;
};

const DEBUG = true;
const dlog = (...a: any[]) => { if (DEBUG) console.log("[rt]", ...a); };

export function useRealtimeCall({ topic, level, selectedLearningPath, onEvent, onError }: Args) {
  const [status, setStatus] = useState<RtStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const micRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const endedRef = useRef(false);
  const responseActiveRef = useRef(false);

  const aiBufRef = useRef<Map<string, string>>(new Map());
  const userBufRef = useRef<Map<string, string>>(new Map());

  const fail = useCallback((msg: string) => {
    setErrorMsg(msg);
    setStatus("error");
    onError?.(msg);
  }, [onError]);

  const cleanup = useCallback(() => {
    dlog("cleanup");
    try { dcRef.current?.close(); } catch {}
    try { pcRef.current?.getSenders().forEach((s) => s.track?.stop()); } catch {}
    try { pcRef.current?.close(); } catch {}
    micRef.current?.getTracks().forEach((t) => t.stop());
    if (audioRef.current) {
      try { audioRef.current.pause(); } catch {}
      try { audioRef.current.srcObject = null; } catch {}
    }
    pcRef.current = null;
    dcRef.current = null;
    micRef.current = null;
    audioRef.current = null;
    responseActiveRef.current = false;
  }, []);

  const stop = useCallback(() => {
    endedRef.current = true;
    cleanup();
    setStatus("ended");
  }, [cleanup]);

  // Toggle mic track without tearing down the call (push-to-talk / manual mode).
  const setMicEnabled = useCallback((enabled: boolean) => {
    micRef.current?.getAudioTracks().forEach((t) => { t.enabled = enabled; });
    dlog("mic enabled =", enabled);
  }, []);

  useEffect(() => () => { endedRef.current = true; cleanup(); }, [cleanup]);

  const handleServerEvent = useCallback((ev: any) => {
    if (DEBUG && ev?.type && ev.type !== "response.audio.delta" && !ev.type.endsWith(".delta")) {
      dlog("event", ev.type);
    }
    switch (ev?.type) {
      case "session.created":
      case "session.updated":
        if (!responseActiveRef.current) setStatus("ready");
        break;
      case "input_audio_buffer.speech_started":
        dlog("user speech started");
        setStatus("listening");
        break;
      case "input_audio_buffer.speech_stopped":
        dlog("user speech stopped");
        setStatus("thinking");
        break;
      case "response.created":
        dlog("AI response started");
        responseActiveRef.current = true;
        setStatus("thinking");
        break;
      case "response.output_audio.delta":
      case "response.audio.delta":
        setStatus("ai_speaking");
        break;
      case "response.output_audio_transcript.delta":
      case "response.audio_transcript.delta": {
        const id = ev.response_id ?? ev.item_id ?? "current";
        const cur = aiBufRef.current.get(id) ?? "";
        const next = cur + (ev.delta ?? "");
        aiBufRef.current.set(id, next);
        onEvent?.({ kind: "ai_text", text: next, final: false });
        break;
      }
      case "response.output_audio_transcript.done":
      case "response.audio_transcript.done": {
        const id = ev.response_id ?? ev.item_id ?? "current";
        const text = ev.transcript ?? aiBufRef.current.get(id) ?? "";
        aiBufRef.current.delete(id);
        dlog("AI transcript done:", text);
        if (text) onEvent?.({ kind: "ai_text", text, final: true });
        break;
      }
      case "conversation.item.input_audio_transcription.delta": {
        const id = ev.item_id ?? "current";
        const cur = userBufRef.current.get(id) ?? "";
        const next = cur + (ev.delta ?? "");
        userBufRef.current.set(id, next);
        onEvent?.({ kind: "user_text", text: next, final: false });
        break;
      }
      case "conversation.item.input_audio_transcription.completed": {
        const id = ev.item_id ?? "current";
        const text = ev.transcript ?? userBufRef.current.get(id) ?? "";
        userBufRef.current.delete(id);
        dlog("user transcript completed:", text);
        if (text) onEvent?.({ kind: "user_text", text, final: true });
        break;
      }
      case "response.done":
      case "response.completed":
        dlog("AI response completed");
        responseActiveRef.current = false;
        setStatus("ready");
        break;
      case "response.cancelled":
        dlog("response cancelled");
        responseActiveRef.current = false;
        setStatus("ready");
        break;
      case "error":
        console.warn("[rt] server error", ev);
        if (ev.error?.message) onError?.(ev.error.message);
        break;
    }
  }, [onError, onEvent]);

  const start = useCallback(async () => {
    if (status === "connecting" || status === "ready" || status === "ai_speaking" ||
        status === "listening" || status === "thinking") return;
    setErrorMsg(null);
    endedRef.current = false;
    setStatus("connecting");

    let mic: MediaStream;
    try {
      mic = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      micRef.current = mic;
      dlog("mic stream active");
    } catch {
      return fail("მიკროფონის გამოყენებისთვის საჭიროა ნებართვა.");
    }

    let clientSecret: string | undefined;
    let model: string | undefined;
    try {
      const { data, error } = await supabase.functions.invoke("create-realtime-speaking-session", {
        body: { topic, level, selectedLearningPath },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error ?? error?.message);
      clientSecret = (data as any).client_secret?.value;
      model = (data as any).model;
      if (!clientSecret) throw new Error("Missing client secret");
      dlog("session created, model =", model);
    } catch (e: any) {
      console.error("[rt] session creation failed", e);
      return fail("საუბრის სესია ვერ დაიწყო. სცადე თავიდან.");
    }

    try {
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // Persistent remote audio element
      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;
      (audioEl as any).playsInline = true;
      audioRef.current = audioEl;
      pc.ontrack = (e) => {
        dlog("remote track");
        audioEl.srcObject = e.streams[0];
        audioEl.play().catch((err) => console.warn("[rt] audio play blocked", err));
      };

      mic.getTracks().forEach((t) => pc.addTrack(t, mic));

      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;
      dc.onmessage = (e) => {
        try { handleServerEvent(JSON.parse(e.data)); } catch (err) { console.warn("[rt] parse fail", err); }
      };
      dc.onopen = () => { dlog("data channel opened"); };
      dc.onclose = () => { dlog("data channel closed"); };

      pc.onconnectionstatechange = () => {
        const s = pc.connectionState;
        dlog("pc state", s);
        if (endedRef.current) return;
        if (s === "failed") fail("კავშირი გაწყდა. სცადე თავიდან.");
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const resp = await fetch(`https://api.openai.com/v1/realtime/calls?model=${encodeURIComponent(model!)}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${clientSecret}`,
          "Content-Type": "application/sdp",
        },
        body: offer.sdp ?? "",
      });
      if (!resp.ok) {
        const t = await resp.text().catch(() => "");
        console.error("[rt] sdp exchange failed", resp.status, t);
        return fail("საუბრის სესია ვერ დაიწყო. სცადე თავიდან.");
      }
      const answerSdp = await resp.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
      dlog("connection opened");
    } catch (e: any) {
      console.error("[rt] webrtc error", e);
      return fail("საუბრის სესია ვერ დაიწყო. სცადე თავიდან.");
    }
  }, [fail, handleServerEvent, level, selectedLearningPath, status, topic]);

  return { status, errorMsg, start, stop };
}
