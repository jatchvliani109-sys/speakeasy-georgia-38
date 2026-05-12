import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SpeakingShell from "./components/SpeakingShell";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Square } from "lucide-react";
import { SCENARIOS } from "./data";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SpeakButton from "@/components/SpeakButton";
import MicPlaceholder from "./components/MicPlaceholder";

type Msg = { role: "user" | "assistant"; content: string };

export default function RoleplaySession() {
  const { scenarioId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const scenario = SCENARIOS.find((s) => s.id === scenarioId);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ending, setEnding] = useState(false);
  const [level, setLevel] = useState("Beginner");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("english_level").eq("id", user.id).maybeSingle();
      setLevel(data?.english_level ?? "Beginner");
    })();
  }, [user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!scenario || messages.length) return;
    // Kick off the AI as the role
    void ask([
      {
        role: "user",
        content: `Start the roleplay. You are ${scenario.aiRole}. I am ${scenario.userRole}. Scenario: "${scenario.topic}". Greet me and ask one short question to begin. Stay in character.`,
      },
    ], true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario]);

  if (!scenario) {
    return (
      <SpeakingShell>
        <PageHeader title="როლური საუბარი" backTo="/path/speaking/roleplay" />
        <p className="text-center py-12 sp-text-muted ka">სცენარი ვერ მოიძებნა.</p>
      </SpeakingShell>
    );
  }

  const ask = async (next: Msg[], hideSeed = false) => {
    setLoading(true);
    const r = await supabase.functions.invoke("ai-tutor", {
      body: {
        messages: next,
        level,
        coachMode: "roleplay",
        lessonContext: {
          scenario: scenario.topic,
          userRole: scenario.userRole,
          aiRole: scenario.aiRole,
        },
      },
    });
    setLoading(false);
    if (r.error || (r.data as any)?.error) {
      toast.error((r.data as any)?.error ?? "შეცდომა");
      return;
    }
    const reply = (r.data as any).reply as string;
    const visible = hideSeed ? next.slice(0, -1) : next;
    setMessages([...visible, { role: "assistant", content: reply }]);
  };

  const send = (text: string) => {
    if (!text.trim() || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    void ask(next);
  };

  const finish = async () => {
    if (!user) return;
    setEnding(true);
    try {
      await supabase.from("lessons").insert({
        user_id: user.id,
        level: `speaking:roleplay:${scenario.level.toLowerCase()}`,
        messages: messages as any,
        summary: { plan: { title_ka: scenario.title_ka, topic: scenario.topic } } as any,
        completed: true,
        ended_at: new Date().toISOString(),
      });
      toast.success("როლური სავარჯიშო დასრულდა! 🎉");
      navigate("/path/speaking/progress");
    } catch (e: any) {
      toast.error(e.message ?? "ვერ შევინახე");
      setEnding(false);
    }
  };

  const isBeginner = scenario.level === "Beginner";

  return (
    <SpeakingShell>
      <PageHeader title={scenario.title_ka} backTo="/path/speaking/roleplay" />
      <div className="flex flex-col h-[calc(100vh-11rem)]">
        <div className="sp-card-hero p-4 sm:p-5 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[hsl(175_70%_38%)] text-white flex items-center justify-center text-2xl shrink-0">
              {scenario.emoji}
            </div>
            <div className="min-w-0 text-sm">
              <div className="ka sp-text">
                <span className="font-bold">სცენარი:</span>{" "}
                <span className="sp-text-muted">{scenario.description_ka}</span>
              </div>
              <div className="ka mt-1 sp-text">
                <span className="font-bold">შენ:</span> <span className="sp-text-muted">{scenario.userRole_ka}</span> ·{" "}
                <span className="font-bold">AI:</span> <span className="sp-text-muted">{scenario.aiRole_ka}</span>
              </div>
            </div>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-1">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] px-4 py-2 rounded-2xl ${
                m.role === "user" ? "sp-btn-primary" : "sp-card"
              }`}>
                <div className="text-sm whitespace-pre-wrap break-words">{m.content}</div>
                {m.role === "assistant" && (
                  <div className="mt-1"><SpeakButton text={m.content} /></div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="px-4 py-2 rounded-2xl sp-card">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "hsl(220 50% 30%)" }} />
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "hsl(175 70% 38%)", animationDelay: "100ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "hsl(210 70% 45%)", animationDelay: "200ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="pt-3 space-y-2">
          {isBeginner && scenario.starters_ka && !loading && (
            <div className="flex flex-wrap gap-2">
              {scenario.starters_ka.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="sp-chip px-3 py-1.5 rounded-full text-xs hover:bg-[hsl(40_40%_92%)] transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              placeholder={isBeginner ? "მარტივად ინგლისურად..." : "Type your reply..."}
              className="resize-none bg-white text-foreground border-[hsl(220_22%_88%)]"
              disabled={loading}
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || loading}
              className="sp-btn-primary h-12 w-12 inline-flex items-center justify-center rounded-2xl disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <MicPlaceholder />
            <Button variant="ghost" size="sm" className="ka sp-text hover:bg-[hsl(40_40%_94%)]" onClick={finish} disabled={ending || messages.length < 2}>
              <Square className="w-4 h-4" /> {ending ? "..." : "დასრულება"}
            </Button>
          </div>
        </div>
      </div>
    </SpeakingShell>
  );
}
