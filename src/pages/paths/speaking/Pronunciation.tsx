import { useEffect, useState } from "react";
import SpeakingShell from "./components/SpeakingShell";
import PageHeader from "@/components/PageHeader";
import PhraseCard from "./components/PhraseCard";
import { PRONUNCIATION_BANK } from "./data";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { recordSpeakingActivity } from "./lib/tracker";

import { Headphones } from "lucide-react";

type Level = "Beginner" | "Elementary" | "Intermediate";

const LEVEL_FROM_PROFILE = (lvl: string | null | undefined): Level => {
  if (!lvl) return "Beginner";
  if (/inter/i.test(lvl)) return "Intermediate";
  if (/element|pre/i.test(lvl)) return "Elementary";
  if (/adv/i.test(lvl)) return "Intermediate";
  return "Beginner";
};

function storageKey(userId: string) {
  return `speaking:pronunciation:${userId}`;
}

export default function Pronunciation() {
  const { user } = useAuth();
  const [level, setLevel] = useState<Level>("Beginner");
  const [practiced, setPracticed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("english_level").eq("id", user.id).maybeSingle();
      setLevel(LEVEL_FROM_PROFILE(data?.english_level));
      try {
        const raw = localStorage.getItem(storageKey(user.id));
        if (raw) setPracticed(JSON.parse(raw));
      } catch {}
    })();
  }, [user]);

  const items = PRONUNCIATION_BANK[level] ?? PRONUNCIATION_BANK.Beginner;
  const doneCount = Object.values(practiced).filter(Boolean).length;

  const toggle = (key: string) => {
    if (!user) return;
    const wasPracticed = !!practiced[key];
    const next = { ...practiced, [key]: !wasPracticed };
    setPracticed(next);
    try {
      localStorage.setItem(storageKey(user.id), JSON.stringify(next));
    } catch {}
    if (!wasPracticed) {
      void recordSpeakingActivity(user.id, "pronunciation_practice");
    }
  };

  const pct = items.length ? Math.round((doneCount / items.length) * 100) : 0;

  return (
    <SpeakingShell>
      <PageHeader title="მოუსმინე და გაიმეორე" backTo="/path/speaking" />
      <div className="space-y-5 max-w-3xl mx-auto">
        <section className="sp-card-hero p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[hsl(33_69%_45%)] text-white flex items-center justify-center shrink-0">
              <Headphones className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold uppercase tracking-wider ka text-[hsl(40_91%_82%)]">
                გამოთქმის ბანკი · {level}
              </div>
              <h2 className="text-xl font-extrabold ka sp-text mt-1 leading-snug">
                მოუსმინე და გაიმეორე ხმამაღლა
              </h2>
              <p className="text-sm sp-text-muted ka mt-1.5">
                შენი დონისთვის შერჩეული მოკლე ფრაზები. დააჭირე ხატულას და გაიმეორე.
              </p>
            </div>
          </div>
          <div className="mt-5">
            <div className="flex items-center justify-between text-[11px] ka sp-text-muted mb-1.5">
              <span>გავარჯიშებული</span>
              <span className="font-semibold sp-text">{doneCount} / {items.length}</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
              <div
                className="h-full bg-[hsl(41_100%_55%)] transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
          <div className="mt-4 text-[11px] ka text-[hsl(40_91%_85%)] flex items-center gap-1.5">
            <Headphones className="w-3.5 h-3.5" /> თითოეულ ფრაზაზე შეგიძლია ჩაწერო შენი ხმა და მიიღო მარტივი უკუკავშირი.
          </div>
        </section>

        <div className="space-y-3">
          {items.map((p, i) => {
            const key = `${level}:${i}:${p.english}`;
            return (
              <PhraseCard
                key={key}
                english={p.english}
                georgian={p.georgian}
                example={p.example}
                practiced={!!practiced[key]}
                onPracticed={() => toggle(key)}
                showRepeatHints
                enableRecording
                source="pronunciation"
                topic={level}
              />
            );
          })}
        </div>
      </div>
    </SpeakingShell>
  );
}
