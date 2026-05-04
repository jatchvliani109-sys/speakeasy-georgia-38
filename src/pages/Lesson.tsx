import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mic, MicOff, Send, Square } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

export default function Lesson() {
  const { user } = useAuth();
  const [level, setLevel] = useState("Beginner");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ending, setEnding] = useState(false);
  const [recording, setRecording] = useState(false);
  const recRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("english_level").eq("id", user.id).maybeSingle().then(({ data }) => {
      const lvl = data?.english_level ?? "Beginner";
      setLevel(lvl);
      // greeting
      sendInitial(lvl);
    });
  }, [user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const sendInitial = async (lvl: string) => {
    setLoading(true);
    const r = await supabase.functions.invoke("ai-tutor", {
      body: { messages: [{ role: "user", content: "Start the lesson with a warm greeting and one simple question." }], level: lvl },
    });
    setLoading(false);
    if (r.error) { toast.error("ვერ ვუკავშირდები"); return; }
    if ((r.data as any).error) { toast.error((r.data as any).error); return; }
    setMessages([{ role: "assistant", content: (r.data as any).reply }]);
  };

  const send = async (text: string) => {
    if (!text.trim()) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    const r = await supabase.functions.invoke("ai-tutor", { body: { messages: next, level } });
    setLoading(false);
    if (r.error || (r.data as any).error) {
      toast.error((r.data as any)?.error ?? "შეცდომა");
      return;
    }
    setMessages([...next, { role: "assistant", content: (r.data as any).reply }]);
  };

  const toggleRecord = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error("ბრაუზერი არ უჭერს მხარს ხმოვან შეყვანას"); return; }
    if (recording) { recRef.current?.stop(); return; }
    const r = new SR();
    r.lang = "en-US"; r.continuous = false; r.interimResults = false;
    r.onresult = (e: any) => setInput((prev) => (prev ? prev + " " : "") + e.results[0][0].transcript);
    r.onend = () => setRecording(false);
    r.onerror = () => setRecording(false);
    recRef.current = r; r.start(); setRecording(true);
  };

  const endLesson = async () => {
    if (messages.length < 2 || !user) { navigate("/dashboard"); return; }
    setEnding(true);
    try {
      const r = await supabase.functions.invoke("ai-tutor", { body: { messages, level, mode: "summary" } });
      if (r.error || (r.data as any).error) throw new Error((r.data as any)?.error ?? "Summary failed");
      const summary = (r.data as any).summary;

      const { data: lesson } = await supabase.from("lessons").insert({
        user_id: user.id, level, messages: messages as any, summary, completed: true, ended_at: new Date().toISOString(),
      }).select().single();

      if (lesson) {
        if (summary.new_words?.length) {
          await supabase.from("vocabulary").insert(summary.new_words.map((w: any) => ({
            user_id: user.id, lesson_id: lesson.id, ...w,
          })));
        }
        if (summary.mistakes?.length) {
          await supabase.from("mistakes").insert(summary.mistakes.map((m: any) => ({
            user_id: user.id, lesson_id: lesson.id, ...m,
          })));
        }
      }
      navigate(`/summary/${lesson?.id}`);
    } catch (e: any) {
      toast.error(e.message);
      setEnding(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-7rem)]">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-muted-foreground ka">დონე: <span className="font-bold text-foreground">{level}</span></div>
          <Button variant="ghost" size="sm" onClick={endLesson} disabled={ending} className="ka">
            <Square className="w-4 h-4" />{ending ? "..." : "დასრულება"}
          </Button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pb-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] px-4 py-3 rounded-2xl ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-card border border-border shadow-card rounded-bl-sm"
              }`}>
                <div className="whitespace-pre-wrap text-base leading-relaxed">{m.content}</div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-card border border-border px-4 py-3 rounded-2xl rounded-bl-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-end gap-2 pt-2 border-t border-border">
          <Button variant={recording ? "accent" : "soft"} size="icon" onClick={toggleRecord} className="shrink-0 h-12 w-12">
            {recording ? <MicOff /> : <Mic />}
          </Button>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder="Type or speak..."
            className="min-h-12 max-h-32 rounded-2xl resize-none"
            rows={1}
          />
          <Button variant="hero" size="icon" onClick={() => send(input)} disabled={loading || !input.trim()} className="shrink-0 h-12 w-12">
            <Send />
          </Button>
        </div>
      </div>
    </Layout>
  );
}
