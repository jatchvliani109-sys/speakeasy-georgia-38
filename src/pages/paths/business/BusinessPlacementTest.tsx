import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import BusinessShell, { BizCard, BizButton } from "./BusinessShell";
import { BusinessLevel, LEVEL_LABELS, pullBusinessFromSupabase, saveBusiness } from "./lib/state";



type MCQ = {
  type: "mcq";
  prompt: string;
  promptKa?: string;
  options: string[];
  correct: number;
  weight: 1 | 2 | 3;
};
type Open = {
  type: "open";
  prompt: string;
  promptKa?: string;
};
type Question = MCQ | Open;

// 10 MCQ + 1 optional open. Mix of easy(1), medium(2), hard(3).
const QUESTIONS: Question[] = [
  // EASY (1pt) — basic vocab in context
  {
    type: "mcq",
    weight: 1,
    prompt: "We need to ______ the meeting until next week because the client is unavailable.",
    promptKa: "შეავსე ხარვეზი.",
    options: ["cancel", "postpone", "delay back", "remove"],
    correct: 1,
  },
  {
    type: "mcq",
    weight: 1,
    prompt: "Which word best completes the sentence: 'Please find the report ______ to this email.'",
    promptKa: "შეავსე ხარვეზი.",
    options: ["included", "attached", "connected", "added"],
    correct: 1,
  },
  {
    type: "mcq",
    weight: 1,
    prompt: "A colleague writes: 'Could you send it ASAP?' This means they want it:",
    promptKa: "რას ნიშნავს ASAP?",
    options: [
      "whenever you have time",
      "as soon as possible",
      "after the next meeting",
      "at a scheduled point",
    ],
    correct: 1,
  },
  // MEDIUM (2pt) — tone & register
  {
    type: "mcq",
    weight: 2,
    prompt: "You missed a deadline. Which message is the most professional?",
    promptKa: "აირჩიე ყველაზე პროფესიული პასუხი.",
    options: [
      "Sorry, I forgot. Will send it later today.",
      "Apologies for the delay — I'll have it on your desk by end of day.",
      "My bad, things got crazy. Tomorrow ok?",
      "I couldn't finish, sorry about that.",
    ],
    correct: 1,
  },
  {
    type: "mcq",
    weight: 2,
    prompt: "Which sentence is grammatically correct in a business context?",
    promptKa: "აირჩიე გრამატიკულად სწორი წინადადება.",
    options: [
      "I look forward to hear from you.",
      "I am looking forward to hear from you soon.",
      "I look forward to hearing from you.",
      "I will look forward hearing from you.",
    ],
    correct: 2,
  },
  {
    type: "mcq",
    weight: 2,
    prompt: "In a meeting, how do you politely disagree with a senior colleague?",
    promptKa: "როგორ გამოხატავ თავაზიან უთანხმოებას?",
    options: [
      "You're wrong about that.",
      "I don't think so.",
      "I see your point, however, I'd like to suggest another angle.",
      "That doesn't make sense to me.",
    ],
    correct: 2,
  },
  {
    type: "mcq",
    weight: 2,
    prompt: "'We need to touch base before the client call.' What does 'touch base' mean here?",
    promptKa: "რას ნიშნავს 'touch base'?",
    options: [
      "Sign a contract",
      "Briefly connect or align",
      "Reach a final decision",
      "Physically meet in person",
    ],
    correct: 1,
  },
  // HARD (3pt) — nuance, idiom, complex register
  {
    type: "mcq",
    weight: 3,
    prompt: "Your manager says: 'Let's circle back on this once we have more bandwidth.' This means:",
    promptKa: "რას ნიშნავს ეს ფრაზა?",
    options: [
      "We should restart the project from scratch.",
      "We'll revisit this when we have more capacity.",
      "We need to involve more team members now.",
      "The decision has been finalized.",
    ],
    correct: 1,
  },
  {
    type: "mcq",
    weight: 3,
    prompt: "A client email ends: 'I'd appreciate your thoughts at your earliest convenience.' The tone is:",
    promptKa: "რა ტონია?",
    options: [
      "Urgent and demanding",
      "Polite but indicates the writer expects a timely reply",
      "Casual and friendly with no time pressure",
      "Passive-aggressive and unhappy",
    ],
    correct: 1,
  },
  {
    type: "mcq",
    weight: 3,
    prompt: "Choose the best rewrite of: 'We can't do this because we don't have enough money.'",
    promptKa: "აირჩიე საუკეთესო პროფესიული გადაწერა.",
    options: [
      "We are unable to proceed due to current budget constraints.",
      "We can't proceed because of money problems right now.",
      "Money is a problem so this isn't possible.",
      "Due to the fact of money we cannot proceed with this.",
    ],
    correct: 0,
  },
  // OPTIONAL open
  {
    type: "open",
    prompt:
      "(Optional) Write 2–3 sentences: a polite email to a client explaining a one-week delay on a deliverable.",
    promptKa:
      "(არასავალდებულო) დაწერე 2–3 წინადადება: თავაზიანი იმეილი კლიენტისთვის ერთკვირიანი დაგვიანების შესახებ.",
  },
];

const MAX_MCQ_SCORE = QUESTIONS.reduce(
  (s, q) => s + (q.type === "mcq" ? q.weight : 0),
  0,
);

function levelFromPercent(pct: number): BusinessLevel {
  if (pct >= 85) return "business_advanced";
  if (pct >= 70) return "business_intermediate";
  if (pct >= 50) return "business_elementary";
  return "business_beginner";
}

const LEVEL_BLURB: Record<BusinessLevel, string> = {
  business_beginner:
    "შენ ახლა იწყებ ბიზნეს ინგლისურს. შენი გეგმა ფოკუსირდება საბაზისო ლექსიკაზე, მარტივ იმეილებზე და ყოველდღიურ სამუშაო ფრაზებზე.",
  business_elementary:
    "შენ უკვე გესმის ბიზნეს ინგლისურის საფუძვლები. შენი გეგმა ფოკუსირდება უფრო თავაზიან ფორმულირებებზე, იმეილების სტრუქტურაზე და გავრცელებულ სამუშაო სიტუაციებზე.",
  business_intermediate:
    "შენ კარგად მართავ ბიზნეს კომუნიკაციას. შენი გეგმა გააძლიერებს ნუანსს, ტონს, შეხვედრებსა და პრეზენტაციებში თავდაჯერებას.",
  business_advanced:
    "შენ მაღალ დონეზე ფლობ ბიზნეს ინგლისურს. შენი გეგმა გაასწავლის გამოცდილ ნიუანსებს, idiom-ებს, რთულ მოლაპარაკებებსა და დახვეწილ წერას.",
};

export default function BusinessPlacementTest() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const total = QUESTIONS.length;
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<(number | string | null)[]>(() =>
    Array(total).fill(null),
  );
  const [done, setDone] = useState(false);
  const [resultLevel, setResultLevel] = useState<BusinessLevel | null>(null);
  const [resultPct, setResultPct] = useState<number>(0);

  const q = QUESTIONS[idx];
  const a = answers[idx];

  const isOpen = q.type === "open";
  const canNext = isOpen ? true : typeof a === "number"; // open is optional

  const submit = () => {
    let raw = 0;
    answers.forEach((ans, i) => {
      const qq = QUESTIONS[i];
      if (qq.type === "mcq" && ans === qq.correct) raw += qq.weight;
    });
    let pct = (raw / MAX_MCQ_SCORE) * 100;

    // Optional open answer = small upward-only bonus
    const openIdx = QUESTIONS.findIndex((x) => x.type === "open");
    const openAns = answers[openIdx];
    if (typeof openAns === "string") {
      const words = openAns.trim().split(/\s+/).filter(Boolean).length;
      if (words >= 25) pct = Math.min(100, pct + 6);
      else if (words >= 12) pct = Math.min(100, pct + 3);
    }

    const level = levelFromPercent(pct);
    setResultLevel(level);
    setResultPct(Math.round(pct));
    setDone(true);
    if (user) {
      saveBusiness(user.id, { level, testCompleted: true });
    }
  };

  // If the user already completed the placement test before, never make them redo it.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const cur = await pullBusinessFromSupabase(user.id);
      if (cancelled || done) return;
      if (cur.testCompleted && cur.level) {
        if (!cur.setupCompleted) navigate("/path/business/setup", { replace: true });
        else if (!cur.plan) navigate("/path/business/plan", { replace: true });
        else if (!cur.businessSelfIntroductionCompleted && !cur.businessSelfIntroductionSkipped) navigate("/path/business/self-introduction", { replace: true });
        else navigate("/path/business/home", { replace: true });
      }
    })();
    return () => { cancelled = true; };
  }, [user, navigate, done]);


  if (done && resultLevel) {
    return (
      <BusinessShell>
        <BizCard>
          <p className="ka text-[11px] uppercase tracking-wider text-[#1C1C1E] font-semibold">
            შედეგი
          </p>
          <h1 className="ka text-2xl font-bold text-[#5C1A2E] mt-1">
            შენი დონე:{" "}
            <span className="text-[#5A8A6A]">{LEVEL_LABELS[resultLevel]}</span>
          </h1>
          <p className="text-sm text-[#6B6B6B] mt-1">
            Score: {resultPct}% (weighted)
          </p>
          <p className="ka text-sm text-[#1C1C1E] mt-4 leading-relaxed">
            {LEVEL_BLURB[resultLevel]}
          </p>
          <div className="mt-6">
            <BizButton onClick={() => navigate("/path/business/setup", { replace: true })}>
              გაგრძელება
            </BizButton>
          </div>
        </BizCard>
      </BusinessShell>
    );
  }

  return (
    <BusinessShell>
      <div className="mb-6">
        <p className="ka text-[11px] uppercase tracking-wider text-[#1C1C1E] font-semibold">
          კითხვა {idx + 1} / {total}
          {q.type === "mcq" && (
            <span className="ml-2 text-[#6B6B6B] normal-case tracking-normal">
              · {q.weight} pt
            </span>
          )}
        </p>
        <h1 className="ka text-2xl font-bold text-[#5C1A2E] mt-1">
          ბიზნეს ინგლისურის მოკლე ტესტი
        </h1>
        <p className="ka text-sm text-[#6B6B6B] mt-1">
          ტესტი დაგვეხმარება გავიგოთ რა დონიდან დავიწყოთ.
        </p>
      </div>

      <BizCard>
        {q.promptKa && <p className="ka text-xs text-[#6B6B6B] mb-1">{q.promptKa}</p>}
        <p className="text-[#5C1A2E] font-semibold">{q.prompt}</p>

        {q.type === "mcq" ? (
          <div className="space-y-2 mt-4">
            {q.options.map((opt, i) => {
              const on = a === i;
              return (
                <button
                  key={i}
                  onClick={() =>
                    setAnswers((p) => p.map((v, j) => (j === idx ? i : v)))
                  }
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ${
                    on
                      ? "border-[#5C1A2E] bg-[#5C1A2E]/5 text-[#5C1A2E]"
                      : "border-[#E0D8D0] hover:border-[#5C1A2E]/40 text-[#1C1C1E]"
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        ) : (
          <>
            <textarea
              value={typeof a === "string" ? a : ""}
              onChange={(e) =>
                setAnswers((p) =>
                  p.map((v, j) => (j === idx ? e.target.value : v)),
                )
              }
              rows={5}
              placeholder="Write your answer in English... (optional)"
              className="mt-4 w-full px-4 py-3 rounded-xl border border-[#E0D8D0] focus:border-[#5C1A2E] outline-none text-sm bg-white"
            />
            <p className="ka text-xs text-[#6B6B6B] mt-2">
              ეს კითხვა არასავალდებულოა — შეგიძლია გამოტოვო.
            </p>
          </>
        )}

        <div className="flex items-center justify-between mt-6">
          <BizButton
            variant="ghost"
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
          >
            უკან
          </BizButton>
          {idx < total - 1 ? (
            <BizButton
              onClick={() => setIdx((i) => Math.min(total - 1, i + 1))}
              disabled={!canNext}
            >
              შემდეგი
            </BizButton>
          ) : (
            <BizButton onClick={submit}>დასრულება</BizButton>
          )}
        </div>
      </BizCard>
    </BusinessShell>
  );
}
