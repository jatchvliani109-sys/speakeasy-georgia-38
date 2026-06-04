import { useEffect, useMemo, useRef, useState } from "react";
import Lottie from "lottie-react";

export type GiorgiState =
  | "idle"
  | "correct"
  | "wrong"
  | "combo"
  | "complete"
  | "newWord"
  | "blank";

const MESSAGES: Record<GiorgiState, string[]> = {
  idle: [
    "მზად ვარ ვარჯიშისთვის!",
    "მოდი დავიწყოთ ცოტა მუშაობა.",
    "ბიზნეს ლექსიკონი გვაყვება.",
    "ყურადღება — დრო ფასობს!",
  ],
  correct: [
    "ბრავო! ვიცოდი რომ შეგეძლო!",
    "სწორია! გიორგი ბიზნესიანი კმაყოფილია.",
    "შესანიშნავი პასუხი!",
    "აი ეგრე — პროფესიონალურად!",
    "ეს ძალიან მომეწონა!",
  ],
  wrong: [
    "არა… ეს სიტყვა გუშინაც გქონდა…",
    "გიორგი ბიზნესიანი დარდობს…",
    "შეეცადე კიდევ ერთხელ!",
    "მე გჯერა — შემდეგი სწორი იქნება.",
  ],
  combo: [
    "5 სწორი პასუხი?! ეს ჩემი საუკეთესო სტუდენტია!",
    "გაუჩერებელი ხარ!",
    "ნებისმიერ ბიზნეს შეხვედრაში მზად ხარ!",
    "ვაუ! მე ვერ მისდევ შენს ტემპს!",
  ],
  complete: [
    "კარგი სამუშაო. გიორგი ბიზნესიანი კმაყოფილია.",
    "დღეს ნამდვილად კარგად ივარჯიშე!",
    "ეს იყო პროფესიული მუშაობა.",
    "ვამაყობ შენით.",
  ],
  newWord: [
    "ახალი სიტყვა! კარგად დაიმახსოვრე!",
    "ეს სიტყვა მნიშვნელოვანია ბიზნესში.",
    "ყურადღება — ახალი ცოდნა მოდის.",
    "ეს გამოგადგება შეხვედრებზე!",
  ],
  blank: [
    "გიორგი ბიზნესიანი გელოდება…",
    "სცადე! შენ შეგიძლია!",
    "არ მერიდება — სცადე!",
  ],
};

// Lottie animation URLs — friendly business / character animations from LottieFiles CDN
const LOTTIE_URLS: Record<Exclude<GiorgiState, "blank">, string> = {
  idle: "https://assets1.lottiefiles.com/packages/lf20_touohxv0.json",
  correct: "https://assets9.lottiefiles.com/packages/lf20_jcikwtux.json",
  wrong: "https://assets3.lottiefiles.com/packages/lf20_yom6uvgj.json",
  combo: "https://assets2.lottiefiles.com/packages/lf20_kkflmtur.json",
  complete: "https://assets10.lottiefiles.com/packages/lf20_GxMZME.json",
  newWord: "https://assets6.lottiefiles.com/packages/lf20_ysas4vcp.json",
};

const cache = new Map<string, unknown>();
async function loadLottie(url: string): Promise<unknown> {
  if (cache.has(url)) return cache.get(url);
  const res = await fetch(url);
  const json = await res.json();
  cache.set(url, json);
  return json;
}

function pickRandom<T>(arr: T[], avoidIdx?: number): { value: T; idx: number } {
  if (arr.length <= 1) return { value: arr[0], idx: 0 };
  let idx = Math.floor(Math.random() * arr.length);
  if (avoidIdx !== undefined && idx === avoidIdx) {
    idx = (idx + 1) % arr.length;
  }
  return { value: arr[idx], idx };
}

export function GiorgiCharacter({
  state,
  salt = 0,
  size = 160,
}: {
  state: GiorgiState;
  salt?: number;
  size?: number;
}): JSX.Element {
  const lastIdxRef = useRef<number>(-1);
  const [bubbleVisible, setBubbleVisible] = useState(true);
  const [displayState, setDisplayState] = useState<GiorgiState>(state);
  const [anim, setAnim] = useState<Record<string, unknown> | null>(null);

  // Switch back to idle after transient states
  useEffect(() => {
    setDisplayState(state);
    if (state === "correct" || state === "wrong" || state === "newWord" || state === "complete") {
      const t = setTimeout(() => setDisplayState("idle"), 2500);
      return () => clearTimeout(t);
    }
  }, [state, salt]);

  // Load Lottie JSON for current display state
  useEffect(() => {
    const key = displayState === "blank" ? "idle" : displayState;
    const url = LOTTIE_URLS[key as Exclude<GiorgiState, "blank">];
    let cancelled = false;
    loadLottie(url)
      .then((data) => {
        if (!cancelled) setAnim(data as Record<string, unknown>);
      })
      .catch(() => {
        if (!cancelled) setAnim(null);
      });
    return () => {
      cancelled = true;
    };
  }, [displayState]);

  const message = useMemo(() => {
    const arr = MESSAGES[state];
    const { value, idx } = pickRandom(arr, lastIdxRef.current);
    lastIdxRef.current = idx;
    return value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, salt]);

  useEffect(() => {
    setBubbleVisible(true);
    const ttl = state === "idle" ? 4200 : 3400;
    const t = setTimeout(() => setBubbleVisible(false), ttl);
    return () => clearTimeout(t);
  }, [state, salt]);

  const isLooping = displayState === "idle" || displayState === "combo" || displayState === "blank";

  return (
    <div className="relative flex items-end gap-2" style={{ minHeight: size }}>
      <div
        className="relative shrink-0 flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        {anim ? (
          <Lottie
            key={displayState}
            animationData={anim}
            loop={isLooping}
            autoplay
            style={{ width: "100%", height: "100%" }}
          />
        ) : (
          <div
            className="w-full h-full rounded-full bg-[#1E2A44]/5 animate-pulse"
            aria-hidden
          />
        )}
      </div>

      {bubbleVisible && (
        <div
          key={`${state}-${salt}-${message}`}
          className="ka relative max-w-[200px] mb-2 bg-white border-2 border-[#1E2A44]/10 text-[#1E2A44] text-[12.5px] font-medium leading-snug px-3.5 py-2.5 rounded-3xl shadow-md"
          style={{
            animation: "giorgiBubble 320ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
            transformOrigin: "0% 80%",
          }}
        >
          {message}
          <svg
            className="absolute -left-2 bottom-3"
            width="14"
            height="14"
            viewBox="0 0 14 14"
            aria-hidden
          >
            <path
              d="M14 0 L14 14 L0 7 Z"
              fill="white"
              stroke="rgba(30,42,68,0.1)"
              strokeWidth="2"
            />
            <path d="M14 1 L14 13 L2 7 Z" fill="white" />
          </svg>
        </div>
      )}
    </div>
  );
}
