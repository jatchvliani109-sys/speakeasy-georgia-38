import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import BusinessShell, { BizCard, BizButton } from "./BusinessShell";
import { BusinessLevel, LEVEL_LABELS, buildPlan, loadBusiness, saveBusiness } from "./lib/state";

type MCQ = {
  type: "mcq";
  prompt: string;
  promptKa?: string;
  options: string[];
  correct: number;
};
type Open = {
  type: "open";
  prompt: string;
  promptKa?: string;
  minWords: number;
};
type Question = MCQ | Open;

const QUESTIONS: Question[] = [
  {
    type: "mcq",
    prompt: "What does deadline mean?",
    promptKa: "რას ნიშნავს deadline?",
    options: ["ბოლო ვადა", "შემოსავალი", "შეხვედრა", "თანამშრომელი"],
    correct: 0,
  },
  {
    type: "mcq",
    prompt: "What does revenue mean?",
    promptKa: "რას ნიშნავს revenue?",
    options: ["ხარჯი", "შემოსავალი", "გადასახადი", "ბიუჯეტი"],
    correct: 1,
  },
  {
    type: "mcq",
    prompt: "Choose the more professional sentence.",
    promptKa: "აირჩიე უფრო პროფესიული წინადადება.",
    options: [
      "Send me this today.",
      "Could you please send this to me today?",
      "Send today now.",
      "U must send this.",
    ],
    correct: 1,
  },
  {
    type: "mcq",
    prompt: "Choose the most polite email opening.",
    promptKa: "აირჩიე ყველაზე თავაზიანი იმეილის გახსნა.",
    options: [
      "Hey, what's up?",
      "Yo team,",
      "Dear Mr. Smith,",
      "Hi dude,",
    ],
    correct: 2,
  },
  {
    type: "mcq",
    prompt: "Choose the correct sentence.",
    promptKa: "აირჩიე სწორი წინადადება.",
    options: [
      "I am interesting in this position.",
      "I am interested in this position.",
      "I have interest on this position.",
      "Me interested for this job.",
    ],
    correct: 1,
  },
  {
    type: "mcq",
    prompt: "Choose the correct sentence.",
    promptKa: "აირჩიე სწორი წინადადება.",
    options: [
      "We discussed about the project yesterday.",
      "We discussed the project yesterday.",
      "We did discuss to the project.",
      "We are discuss the project.",
    ],
    correct: 1,
  },
  {
    type: "mcq",
    prompt: "Your manager asks for a status update. Choose the best response.",
    promptKa: "მენეჯერი სტატუსს გეკითხება. აირჩიე საუკეთესო პასუხი.",
    options: [
      "Nothing much, will see.",
      "I'm on it, will share an update by EOD.",
      "Idk, ask later.",
      "Why you ask?",
    ],
    correct: 1,
  },
  {
    type: "mcq",
    prompt: "Choose the best follow-up email line.",
    promptKa: "აირჩიე საუკეთესო follow-up ფრაზა იმეილში.",
    options: [
      "Why no answer?",
      "Just checking in on my previous email — let me know if you need more info.",
      "Reply now please.",
      "I send again.",
    ],
    correct: 1,
  },
  {
    type: "mcq",
    prompt: "Pick the best presentation opener.",
    promptKa: "აირჩიე საუკეთესო პრეზენტაციის გახსნა.",
    options: [
      "So yeah, let's start.",
      "Today I'd like to walk you through our Q3 results.",
      "Listen up everyone.",
      "Okay so basically...",
    ],
    correct: 1,
  },
  {
    type: "mcq",
    prompt: "What does stakeholder mean?",
    promptKa: "რას ნიშნავს stakeholder?",
    options: [
      "კონკურენტი",
      "დაინტერესებული მხარე",
      "კლიენტი მხოლოდ",
      "მენეჯერი",
    ],
    correct: 1,
  },
  {
    type: "open",
    prompt: "Write 2–3 sentences: Tell me about yourself professionally.",
    promptKa: "დაწერე 2–3 წინადადება: მოგვიყევი შენს თავზე პროფესიულად.",
    minWords: 12,
  },
];

function computeLevel(correct: number, openWords: number): BusinessLevel {
  // 10 MCQs + 1 open task
  let score = correct; // 0..10
  if (openWords >= 25) score += 2;
  else if (openWords >= 12) score += 1;
  if (score >= 11) return "business_advanced";
  if (score >= 8) return "business_intermediate";
  if (score >= 5) return "business_elementary";
  return "business_beginner";
}

export default function BusinessPlacementTest() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const total = QUESTIONS.length;
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<(number | string | null)[]>(() => Array(total).fill(null));
  const [done, setDone] = useState(false);
  const [resultLevel, setResultLevel] = useState<BusinessLevel | null>(null);

  const q = QUESTIONS[idx];
  const a = answers[idx];

  const canNext = q.type === "mcq" ? typeof a === "number" : typeof a === "string" && a.trim().length > 0;

  const submit = () => {
    let correct = 0;
    let openWords = 0;
    answers.forEach((ans, i) => {
      const qq = QUESTIONS[i];
      if (qq.type === "mcq" && ans === qq.correct) correct++;
      if (qq.type === "open" && typeof ans === "string") {
        openWords = ans.trim().split(/\s+/).filter(Boolean).length;
      }
    });
    const level = computeLevel(correct, openWords);
    setResultLevel(level);
    setDone(true);
    if (user) {
      const next = saveBusiness(user.id, { level, testCompleted: true });
      const plan = buildPlan(next);
      if (plan) saveBusiness(user.id, { plan });
    }
  };

  const initial = useMemo(() => (user ? loadBusiness(user.id) : null), [user]);
  if (initial && !initial.setupCompleted) {
    navigate("/path/business/setup", { replace: true });
  }

  if (done && resultLevel) {
    return (
      <BusinessShell>
        <BizCard>
          <p className="ka text-[11px] uppercase tracking-wider text-[#C9A227] font-semibold">
            შედეგი
          </p>
          <h1 className="ka text-2xl font-bold text-[#1E2A44] mt-1">
            შენი ბიზნეს ინგლისურის დონე: <span className="text-[#0F766E]">{LEVEL_LABELS[resultLevel]}</span>
          </h1>
          <p className="ka text-sm text-[#5B6473] mt-2">
            ამ დონის მიხედვით მოგიმზადებთ პერსონალურ გეგმას.
          </p>
          <div className="mt-5">
            <BizButton onClick={() => navigate("/path/business/plan", { replace: true })}>
              გეგმის ნახვა
            </BizButton>
          </div>
        </BizCard>
      </BusinessShell>
    );
  }

  return (
    <BusinessShell>
      <div className="mb-6">
        <p className="ka text-[11px] uppercase tracking-wider text-[#C9A227] font-semibold">
          კითხვა {idx + 1} / {total}
        </p>
        <h1 className="ka text-2xl font-bold text-[#1E2A44] mt-1">ბიზნეს ინგლისურის მოკლე ტესტი</h1>
        <p className="ka text-sm text-[#5B6473] mt-1">
          ტესტი დაგვეხმარება გავიგოთ რა დონიდან დავიწყოთ.
        </p>
      </div>

      <BizCard>
        {q.promptKa && <p className="ka text-xs text-[#5B6473] mb-1">{q.promptKa}</p>}
        <p className="text-[#1E2A44] font-semibold">{q.prompt}</p>

        {q.type === "mcq" ? (
          <div className="space-y-2 mt-4">
            {q.options.map((opt, i) => {
              const on = a === i;
              return (
                <button
                  key={i}
                  onClick={() => setAnswers((p) => p.map((v, j) => (j === idx ? i : v)))}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ${
                    on
                      ? "border-[#1E2A44] bg-[#1E2A44]/5 text-[#1E2A44]"
                      : "border-[#E7E2D5] hover:border-[#1E2A44]/40 text-[#374151]"
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        ) : (
          <textarea
            value={typeof a === "string" ? a : ""}
            onChange={(e) => setAnswers((p) => p.map((v, j) => (j === idx ? e.target.value : v)))}
            rows={4}
            placeholder="Write your answer in English..."
            className="mt-4 w-full px-4 py-3 rounded-xl border border-[#E7E2D5] focus:border-[#1E2A44] outline-none text-sm bg-white"
          />
        )}

        <div className="flex items-center justify-between mt-6">
          <BizButton variant="ghost" onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0}>
            უკან
          </BizButton>
          {idx < total - 1 ? (
            <BizButton onClick={() => setIdx((i) => Math.min(total - 1, i + 1))} disabled={!canNext}>
              შემდეგი
            </BizButton>
          ) : (
            <BizButton onClick={submit} disabled={!canNext}>
              დასრულება
            </BizButton>
          )}
        </div>
      </BizCard>
    </BusinessShell>
  );
}
