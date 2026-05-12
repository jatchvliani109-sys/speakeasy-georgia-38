import { useEffect, useState } from "react";
import SpeakingShell, { SoundBars } from "./components/SpeakingShell";
import PageHeader from "@/components/PageHeader";
import PhraseCard from "./components/PhraseCard";
import { PRONUNCIATION_BANK } from "./data";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import MicPlaceholder from "./components/MicPlaceholder";

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
    const next = { ...practiced, [key]: !practiced[key] };
    setPracticed(next);
    try {
      localStorage.setItem(storageKey(user.id), JSON.stringify(next));
    } catch {}
  };

  return (
    <SpeakingShell>
      <PageHeader title="გამოთქმის პრაქტიკა" backTo="/path/speaking" />
      <div className="space-y-4">
        <div className="sp-card-glow p-5 relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-teal-400/25 blur-2xl" />
          <div className="relative flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl sp-btn-teal flex items-center justify-center">🔊</div>
            <div className="min-w-0 flex-1">
              <div className="text-sm ka sp-text">
                მოუსმინე და გაიმეორე ხმამაღლა. დონე:{" "}
                <span className="font-bold text-teal-200">{level}</span>
              </div>
              <div className="text-xs sp-text-muted ka mt-0.5">
                გავარჯიშებული: <span className="font-bold sp-text">{doneCount}</span> / {items.length}
              </div>
            </div>
            <SoundBars />
          </div>
          <div className="mt-3"><MicPlaceholder /></div>
        </div>

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
              />
            );
          })}
        </div>
      </div>
    </SpeakingShell>
  );
}
