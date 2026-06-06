// useRealtimeCall — connects the browser to Inworld AI Realtime via WebRTC.
// The INWORLD_API_KEY stays server-side; the create-realtime-speaking-session
// edge function proxies the SDP exchange with Inworld's /v1/realtime/calls endpoint.

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
  | { kind: "user_turn_started" }
  | { kind: "user_text"; text: string; final: boolean }
  | { kind: "user_text_failed" }
  | { kind: "ai_text"; text: string; final: boolean }
  | { kind: "georgian_help"; english: string; georgian: string };

type Args = {
  topic: string;
  level: string;
  tier?: "easy" | "medium" | "hard";
  selectedLearningPath?: string;
  onEvent?: (e: RtEvent) => void;
  onError?: (msg: string) => void;
};

const DEBUG = true;
const dlog = (...a: any[]) => { if (DEBUG) console.log("[rt]", ...a); };

export function useRealtimeCall({ topic, level, tier, selectedLearningPath, onEvent, onError }: Args) {
  const [status, setStatus] = useState<RtStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [micOn, setMicOn] = useState(false);
  const startingRef = useRef(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const micRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const endedRef = useRef(false);
  const responseActiveRef = useRef(false);
  const greetedRef = useRef(false);
  const topicRef = useRef(topic);
  topicRef.current = topic;

  const aiBufRef = useRef<Map<string, string>>(new Map());
  const userBufRef = useRef<Map<string, string>>(new Map());

  const fail = useCallback((msg: string) => {
    setErrorMsg(msg);
    setStatus("error");
    onError?.(msg);
  }, [onError]);

  const cleanup = useCallback(() => {
    dlog("cleanup → closing data channel, peer connection, mic tracks");
    try { dcRef.current?.close(); } catch {}
    try { pcRef.current?.getSenders().forEach((s) => s.track?.stop()); } catch {}
    try { pcRef.current?.close(); } catch {}
    micRef.current?.getTracks().forEach((t) => { t.stop(); dlog("mic track stopped"); });
    if (audioRef.current) {
      try { audioRef.current.pause(); } catch {}
      try { audioRef.current.srcObject = null; } catch {}
    }
    pcRef.current = null;
    dcRef.current = null;
    micRef.current = null;
    audioRef.current = null;
    responseActiveRef.current = false;
    startingRef.current = false;
    setMicOn(false);
  }, []);

  const stop = useCallback(() => {
    if (endedRef.current) return;
    dlog("stop() called → ending session");
    endedRef.current = true;
    cleanup();
    setStatus("ended");
  }, [cleanup]);

  // Toggle mic track without tearing down the call (push-to-talk / manual mode).
  const setMicEnabled = useCallback((enabled: boolean) => {
    const tracks = micRef.current?.getAudioTracks() ?? [];
    tracks.forEach((t) => { t.enabled = enabled; });
    setMicOn(enabled && tracks.length > 0);
    dlog(enabled ? "mic track enabled (sending audio)" : "mic track muted (silence)");
  }, []);

  // Inject a typed user message into the conversation and request a response.
  const sendUserText = useCallback((text: string) => {
    const dc = dcRef.current;
    if (!dc || dc.readyState !== "open" || !text.trim()) return;
    try {
      dc.send(JSON.stringify({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text }],
        },
      }));
      dc.send(JSON.stringify({ type: "response.create" }));
      dlog("sent typed user text:", text);
    } catch (e) { console.warn("[rt] sendUserText failed", e); }
  }, []);

  useEffect(() => () => { dlog("session cleanup on unmount"); endedRef.current = true; cleanup(); }, [cleanup]);

  const handleServerEvent = useCallback((ev: any) => {
    if (DEBUG && ev?.type && ev.type !== "response.audio.delta" && !ev.type.endsWith(".delta")) {
      dlog("event", ev.type);
    }
    switch (ev?.type) {
      case "session.created":
      case "session.updated":
        if (!responseActiveRef.current) setStatus("ready");
        // AI greets first — trigger one short opening response right after session is ready.
        if (!greetedRef.current && dcRef.current?.readyState === "open") {
          greetedRef.current = true;
          try {
            dcRef.current.send(JSON.stringify({
              type: "response.create",
              response: {
                instructions: `Greet the learner warmly in ONE short English sentence, then ask ONE simple opening question about the topic "${topicRef.current}". Keep total under 18 words. Do not explain rules. Do not speak Georgian.`,
              },
            }));
            dlog("greeting response.create sent");
          } catch (e) { console.warn("[rt] greeting failed", e); }
        }
        break;
      case "input_audio_buffer.speech_started":
        dlog("user speech started → pending transcript");
        setStatus("listening");
        onEvent?.({ kind: "user_turn_started" });
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
        else onEvent?.({ kind: "user_text_failed" });
        break;
      }
      case "conversation.item.input_audio_transcription.failed": {
        dlog("user transcript failed");
        onEvent?.({ kind: "user_text_failed" });
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
    if (startingRef.current || pcRef.current ||
        status === "connecting" || status === "ready" || status === "ai_speaking" ||
        status === "listening" || status === "thinking") {
      console.log("[rt] Realtime session already active — not creating another.");
      return;
    }
    startingRef.current = true;
    setErrorMsg(null);
    endedRef.current = false;
    greetedRef.current = false;
    setStatus("connecting");
    dlog("creating realtime session");

    let mic: MediaStream;
    try {
      mic = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      micRef.current = mic;
      // Start MUTED — caller decides when to enable (push-to-talk default).
      mic.getAudioTracks().forEach((t) => { t.enabled = false; });
      setMicOn(false);
      dlog("mic track started (muted by default)");
    } catch {
      startingRef.current = false;
      return fail("მიკროფონის გამოყენებისთვის საჭიროა ნებართვა.");
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

      // Proxy SDP exchange through the edge function (keeps INWORLD_API_KEY server-side).
      const { data, error } = await supabase.functions.invoke("create-realtime-speaking-session", {
        body: { sdp: offer.sdp ?? "", topic, level, tier, selectedLearningPath },
      });
      if (error || (data as any)?.error) {
        console.error("[rt] sdp exchange failed", error, data);
        startingRef.current = false;
        return fail("საუბრის სესია ვერ დაიწყო. სცადე თავიდან.");
      }
      const answerSdp: string | undefined = (data as any)?.sdp;
      if (!answerSdp) {
        startingRef.current = false;
        return fail("საუბრის სესია ვერ დაიწყო. სცადე თავიდან.");
      }
      setModel((data as any)?.model ?? null);
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
      startingRef.current = false;
      dlog("WebRTC connected");
    } catch (e: any) {
      console.error("[rt] webrtc error", e);
      startingRef.current = false;
      return fail("საუბრის სესია ვერ დაიწყო. სცადე თავიდან.");
    }
  }, [fail, handleServerEvent, level, tier, selectedLearningPath, status, topic]);


  return { status, errorMsg, start, stop, setMicEnabled, sendUserText, model, micOn };
}
