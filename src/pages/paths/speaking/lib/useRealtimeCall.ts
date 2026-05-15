// useRealtimeCall — connects the browser to OpenAI Realtime via WebRTC.
// The OpenAI key stays server-side; we fetch an ephemeral client_secret from
// the create-realtime-speaking-session edge function and use it as a Bearer.

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type RtStatus =
  | "idle"
  | "connecting"
  | "ready"          // connected, awaiting next turn
  | "listening"     // user speaking detected
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

export function useRealtimeCall({ topic, level, selectedLearningPath, onEvent, onError }: Args) {
  const [status, setStatus] = useState<RtStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const micRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // accumulators per response/item
  const aiBufRef = useRef<Map<string, string>>(new Map());
  const userBufRef = useRef<Map<string, string>>(new Map());

  const fail = useCallback((msg: string) => {
    setErrorMsg(msg);
    setStatus("error");
    onError?.(msg);
  }, [onError]);

  const cleanup = useCallback(() => {
    try { dcRef.current?.close(); } catch {}
    try { pcRef.current?.getSenders().forEach((s) => s.track?.stop()); } catch {}
    try { pcRef.current?.close(); } catch {}
    micRef.current?.getTracks().forEach((t) => t.stop());
    if (audioRef.current) {
      try { audioRef.current.pause(); } catch {}
      audioRef.current.srcObject = null;
    }
    pcRef.current = null;
    dcRef.current = null;
    micRef.current = null;
  }, []);

  const stop = useCallback(() => {
    cleanup();
    setStatus("ended");
  }, [cleanup]);

  useEffect(() => () => cleanup(), [cleanup]);

  const handleServerEvent = useCallback((ev: any) => {
    switch (ev?.type) {
      case "session.created":
      case "session.updated":
        setStatus("ready");
        break;
      case "input_audio_buffer.speech_started":
        setStatus("listening");
        break;
      case "input_audio_buffer.speech_stopped":
        setStatus("thinking");
        break;
      case "response.created":
        setStatus("thinking");
        break;
      case "response.audio.delta":
        setStatus("ai_speaking");
        break;
      case "response.audio_transcript.delta": {
        const id = ev.response_id ?? ev.item_id ?? "current";
        const cur = aiBufRef.current.get(id) ?? "";
        const next = cur + (ev.delta ?? "");
        aiBufRef.current.set(id, next);
        onEvent?.({ kind: "ai_text", text: next, final: false });
        break;
      }
      case "response.audio_transcript.done": {
        const id = ev.response_id ?? ev.item_id ?? "current";
        const text = ev.transcript ?? aiBufRef.current.get(id) ?? "";
        aiBufRef.current.delete(id);
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
        if (text) onEvent?.({ kind: "user_text", text, final: true });
        break;
      }
      case "response.done":
        setStatus("ready");
        break;
      case "error":
        console.warn("[realtime] server error", ev);
        if (ev.error?.message) fail(ev.error.message);
        break;
    }
  }, [fail, onEvent]);

  const start = useCallback(async () => {
    if (status === "connecting" || status === "ready" || status === "ai_speaking" || status === "listening") return;
    setErrorMsg(null);
    setStatus("connecting");

    // 1. Mic
    let mic: MediaStream;
    try {
      mic = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      micRef.current = mic;
    } catch {
      return fail("მიკროფონის გამოყენებისთვის საჭიროა ნებართვა.");
    }

    // 2. Ephemeral session
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
    } catch (e: any) {
      console.error("[realtime] session creation failed", e);
      return fail("საუბრის სესია ვერ დაიწყო. სცადე თავიდან.");
    }

    // 3. WebRTC
    try {
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // remote audio
      const audioEl = audioRef.current ?? new Audio();
      audioEl.autoplay = true;
      audioRef.current = audioEl;
      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0];
      };

      // mic track
      mic.getTracks().forEach((t) => pc.addTrack(t, mic));

      // datachannel for events
      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;
      dc.onmessage = (e) => {
        try { handleServerEvent(JSON.parse(e.data)); } catch {}
      };
      dc.onopen = () => {
        // session.update is optional; instructions already set server-side.
        // We can still tell it to start by requesting an initial response if needed.
      };

      pc.onconnectionstatechange = () => {
        const s = pc.connectionState;
        if (s === "failed" || s === "disconnected" || s === "closed") {
          if (status !== "ended") fail("სესია შეწყდა. შეგიძლია თავიდან სცადო.");
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const resp = await fetch(`https://api.openai.com/v1/realtime?model=${encodeURIComponent(model!)}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${clientSecret}`,
          "Content-Type": "application/sdp",
        },
        body: offer.sdp ?? "",
      });
      if (!resp.ok) {
        const t = await resp.text().catch(() => "");
        console.error("[realtime] sdp exchange failed", resp.status, t);
        return fail("საუბრის სესია ვერ დაიწყო. სცადე თავიდან.");
      }
      const answerSdp = await resp.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
    } catch (e: any) {
      console.error("[realtime] webrtc error", e);
      return fail("საუბრის სესია ვერ დაიწყო. სცადე თავიდან.");
    }
  }, [fail, handleServerEvent, level, selectedLearningPath, status, topic]);

  return { status, errorMsg, start, stop };
}
