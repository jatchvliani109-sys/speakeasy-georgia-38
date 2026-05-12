import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Layout from "@/components/Layout";
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
      <Layout>
        <PageHeader title="როლური საუბარი" backTo="/path/speaking/roleplay" />
        <p className="text-center py-12 text-muted-foreground ka">სცენარი ვერ მოიძებნა.</p>
      </Layout>
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
    <Layout>
      <PageHeader title={scenario.title_ka} backTo="/path/speaking/roleplay" />
      <div className="flex flex-col h-[calc(100vh-9rem)]">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-400/30 mb-3">
          <div className="flex items-center gap-3">
            <div className="text-3xl">{scenario.emoji}</div>
            <div className="min-w-0 text-sm">
              <div className="ka">
                <span className="font-bold">სცენარი:</span> {scenario.description_ka}
              </div>
              <div className="ka mt-1">
                <span className="font-bold">შენ:</span> {scenario.userRole_ka} ·{" "}
                <span className="font-bold">AI:</span> {scenario.aiRole_ka}
              </div>
            </div>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-1">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] px-4 py-2 rounded-2xl ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border shadow-card"
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
              <div className="px-4 py-2 rounded-2xl bg-card border border-border shadow-card">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "100ms" }} />
                  <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "200ms" }} />
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
                  className="px-3 py-1.5 rounded-full bg-secondary hover:bg-primary/10 text-xs"
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
              className="resize-none"
              disabled={loading}
            />
            <Button onClick={() => send(input)} disabled={!input.trim() || loading} size="icon">
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <MicPlaceholder />
            <Button variant="ghost" size="sm" className="ka" onClick={finish} disabled={ending || messages.length < 2}>
              <Square className="w-4 h-4" /> {ending ? "..." : "დასრულება"}
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
