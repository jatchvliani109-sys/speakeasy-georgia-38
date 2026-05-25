import { useState } from "react";
import { useParams } from "react-router-dom";
import BusinessShell, { BizCard, BizButton } from "./BusinessShell";
import { ReadAloudButton } from "@/components/ReadAloudButton";
import { BUSINESS_MODULES } from "./lib/state";
import { SAMPLE_BUSINESS_VOCAB } from "./lib/vocab";
import EmailsModule from "./EmailsModule";
import InterviewModule from "./InterviewModule";
import MeetingsModule from "./MeetingsModule";

export default function BusinessModule() {
  const { slug } = useParams();
  const mod = BUSINESS_MODULES.find((m) => m.slug === slug);

  if (slug === "emails") return <EmailsModule />;
  if (slug === "interview") return <InterviewModule />;
  if (slug === "meetings") return <MeetingsModule />;



  if (!mod) {
    return (
      <BusinessShell back={{ to: "/path/business/home", label: "უკან დაბრუნება" }}>
        <BizCard>
          <p className="ka text-[#1E2A44]">მოდული ვერ მოიძებნა.</p>
        </BizCard>
      </BusinessShell>
    );
  }

  return (
    <BusinessShell back={{ to: "/path/business/home", label: "ბიზნეს ინგლისური" }}>
      <div className="mb-5">
        <div className="text-2xl mb-2">{mod.icon}</div>
        <h1 className="ka text-2xl font-bold text-[#1E2A44]">{mod.title}</h1>
        <p className="ka text-sm text-[#5B6473] mt-1">{mod.description}</p>
      </div>

      {mod.slug === "vocabulary" ? (
        <VocabularyModule />
      ) : (
        <BizCard>
          <p className="ka text-[11px] uppercase tracking-wider text-[#C9A227] font-semibold">
            მალე დაემატება
          </p>
          <h3 className="ka text-base font-bold text-[#1E2A44] mt-1">Coming next</h3>
          <p className="ka text-sm text-[#5B6473] mt-2">
            ეს მოდული ამჟამად მზადდება. მალე იხილავ პრაქტიკულ გაკვეთილებს, მაგალითებს და სავარჯიშოებს.
          </p>
        </BizCard>
      )}
    </BusinessShell>
  );
}

function VocabularyModule() {
  return (
    <div className="space-y-4">
      {SAMPLE_BUSINESS_VOCAB.map((v) => (
        <VocabCard key={v.word} v={v} />
      ))}
      <BizCard>
        <p className="ka text-xs text-[#5B6473]">
          მალე დაემატება მეტი ბიზნეს სიტყვა, კატეგორიების მიხედვით.
        </p>
      </BizCard>
    </div>
  );
}

function VocabCard({ v }: { v: typeof SAMPLE_BUSINESS_VOCAB[number] }) {
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState<null | boolean>(null);

  return (
    <BizCard>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-[#1E2A44]">{v.word}</h3>
          <p className="ka text-sm text-[#5B6473] mt-0.5">{v.georgian}</p>
        </div>
        <ReadAloudButton text={v.word} size="md" />
      </div>

      <p className="ka text-sm text-[#374151] mt-3">{v.explanation}</p>

      <div className="mt-3 p-3 rounded-lg bg-[#FAF7F0] border border-[#E7E2D5]">
        <p className="text-sm text-[#1E2A44]">{v.example}</p>
        <p className="ka text-xs text-[#5B6473] mt-1">{v.exampleKa}</p>
      </div>

      <p className="text-xs text-[#1E2A44] mt-3">
        <span className="font-semibold">{v.phrase}</span>
        <span className="ka text-[#5B6473]"> — {v.phraseKa}</span>
      </p>

      <div className="mt-4 pt-4 border-t border-[#E7E2D5]">
        <p className="ka text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold mb-2">
          პრაქტიკა
        </p>
        <p className="text-sm text-[#1E2A44]">{v.practice}</p>
        <div className="flex gap-2 mt-2">
          <input
            value={answer}
            onChange={(e) => {
              setAnswer(e.target.value);
              setChecked(null);
            }}
            placeholder="Your answer"
            className="flex-1 px-3 py-2 rounded-lg border border-[#E7E2D5] text-sm outline-none focus:border-[#1E2A44]"
          />
          <BizButton
            onClick={() =>
              setChecked(answer.trim().toLowerCase() === v.practiceAnswer.toLowerCase())
            }
          >
            შემოწმება
          </BizButton>
        </div>
        {checked === true && <p className="ka text-xs text-[#0F766E] mt-2">სწორია!</p>}
        {checked === false && (
          <p className="ka text-xs text-[#B91C1C] mt-2">
            სცადე ისევ. მინიშნება: სიტყვა {v.word.toLowerCase()}-თან არის დაკავშირებული.
          </p>
        )}
      </div>
    </BizCard>
  );
}
