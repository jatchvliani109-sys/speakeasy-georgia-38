import { useEffect, useMemo, useState } from "react";

export type GiorgiState =
  | "idle"
  | "correct"
  | "wrong"
  | "combo"
  | "complete"
  | "newWord"
  | "blank";

const MESSAGES: Record<GiorgiState, string[]> = {
  idle: ["მზად ვარ ვარჯიშისთვის.", "დავიწყოთ!"],
  correct: [
    "ბრავო! ვიცოდი რომ შეგეძლო!",
    "სწორია! გიორგი ბიზნესიანი კმაყოფილია.",
    "შესანიშნავი პასუხი!",
    "აი ეგრე!",
  ],
  wrong: [
    "არა… ეს სიტყვა გუშინაც გქონდა…",
    "გიორგი ბიზნესიანი დარდობს…",
    "შეეცადე კიდევ ერთხელ!",
  ],
  combo: [
    "5 სწორი პასუხი?! ეს ჩემი საუკეთესო სტუდენტია!",
    "გაუჩერებელი ხარ!",
    "გავარდი ნებისმიერ ბიზნეს შეხვედრაში — მზად ხარ!",
  ],
  complete: [
    "კარგი სამუშაო. გიორგი ბიზნესიანი კმაყოფილია.",
    "დღეს კარგად ივარჯიშე!",
    "ეს იყო პროფესიული მუშაობა.",
  ],
  newWord: [
    "ახალი სიტყვა! კარგად დაიმახსოვრე!",
    "ეს სიტყვა მნიშვნელოვანია!",
    "ყურადღება — ახალი ცოდნა მოდის.",
  ],
  blank: [
    "გიორგი ბიზნესიანი გელოდება…",
    "სცადე! შენ შეგიძლია!",
  ],
};

function pickMessage(state: GiorgiState, salt: number): string {
  const arr = MESSAGES[state];
  return arr[salt % arr.length];
}

export function GiorgiCharacter({
  state,
  salt = 0,
  size = 140,
}: {
  state: GiorgiState;
  salt?: number;
  size?: number;
}): JSX.Element {
  const [bubbleVisible, setBubbleVisible] = useState(true);
  const message = useMemo(() => pickMessage(state, salt), [state, salt]);

  useEffect(() => {
    setBubbleVisible(true);
    if (state === "idle") return;
    const t = setTimeout(() => setBubbleVisible(false), 3200);
    return () => clearTimeout(t);
  }, [state, salt]);

  return (
    <div className="relative flex items-end gap-2" style={{ minHeight: size }}>
      <div
        className="relative"
        style={{
          width: size,
          height: size,
          animation:
            state === "correct"
              ? "giorgiPump 600ms ease-out"
              : state === "wrong"
              ? "giorgiSad 700ms ease-out"
              : state === "combo"
              ? "giorgiWild 700ms ease-in-out infinite"
              : state === "complete"
              ? "giorgiProud 900ms ease-out"
              : state === "newWord"
              ? "giorgiAttentive 700ms ease-out"
              : "giorgiBreathe 3.5s ease-in-out infinite",
          transformOrigin: "50% 90%",
        }}
      >
        <GiorgiSVG state={state} />
      </div>

      {bubbleVisible && (
        <div
          className="ka relative max-w-[180px] -mb-1 bg-white border border-[#E7E2D5] text-[#1E2A44] text-[12px] leading-snug px-3 py-2 rounded-2xl shadow-sm"
          style={{ animation: "giorgiBubble 240ms ease-out both" }}
        >
          {message}
          <span
            className="absolute -left-1.5 bottom-3 w-3 h-3 bg-white border-l border-b border-[#E7E2D5]"
            style={{ transform: "rotate(45deg)" }}
          />
        </div>
      )}
    </div>
  );
}

function GiorgiSVG({ state }: { state: GiorgiState }): JSX.Element {
  // Face expressions
  const isHappy = state === "correct" || state === "combo" || state === "complete";
  const isSad = state === "wrong";

  // Tie tilt
  const tieRotate =
    state === "wrong" ? -22 : state === "combo" ? 8 : state === "complete" ? -2 : 0;

  // Arm positions
  const armRaise = state === "correct" || state === "combo";

  return (
    <svg viewBox="0 0 120 140" width="100%" height="100%" aria-hidden>
      {/* Shadow */}
      <ellipse cx="60" cy="134" rx="28" ry="3" fill="#1E2A44" opacity="0.12" />

      {/* Body / suit jacket */}
      <path
        d="M30 132 L34 86 Q60 78 86 86 L90 132 Z"
        fill="#1E2A44"
      />
      {/* Lapels */}
      <path d="M60 86 L46 132 L52 132 L60 102 Z" fill="#15203A" />
      <path d="M60 86 L74 132 L68 132 L60 102 Z" fill="#15203A" />

      {/* Shirt collar */}
      <path d="M60 86 L54 96 L60 102 L66 96 Z" fill="#F7F1E3" />

      {/* Tie */}
      <g
        style={{
          transformOrigin: "60px 96px",
          transform: `rotate(${tieRotate}deg)`,
          transition: "transform 280ms ease-out",
        }}
      >
        <path d="M58 96 L62 96 L64 100 L60 104 L56 100 Z" fill="#C9A227" />
        <path d="M56 100 L64 100 L66 122 L60 128 L54 122 Z" fill="#C9A227" />
      </g>

      {/* Arms */}
      {armRaise ? (
        <>
          <path d="M34 92 L22 60 L28 56 L40 88 Z" fill="#1E2A44" />
          <path d="M86 92 L98 60 L92 56 L80 88 Z" fill="#1E2A44" />
          {/* Fists */}
          <circle cx="24" cy="56" r="5" fill="#E8C9A0" />
          <circle cx="96" cy="56" r="5" fill="#E8C9A0" />
        </>
      ) : isSad ? (
        <>
          {/* Hands to face */}
          <path d="M34 92 L48 70 L54 74 L40 96 Z" fill="#1E2A44" />
          <path d="M86 92 L72 70 L66 74 L80 96 Z" fill="#1E2A44" />
          <circle cx="50" cy="68" r="5" fill="#E8C9A0" />
          <circle cx="70" cy="68" r="5" fill="#E8C9A0" />
        </>
      ) : (
        <>
          <path d="M32 90 L30 122 L40 122 L42 92 Z" fill="#1E2A44" />
          <path d="M88 90 L90 122 L80 122 L78 92 Z" fill="#1E2A44" />
          <circle cx="34" cy="124" r="4" fill="#E8C9A0" />
          <circle cx="86" cy="124" r="4" fill="#E8C9A0" />
        </>
      )}

      {/* Neck */}
      <rect x="55" y="72" width="10" height="10" fill="#E8C9A0" />

      {/* Head */}
      <ellipse cx="60" cy="56" rx="22" ry="24" fill="#F0D2A8" />

      {/* Hair */}
      <path
        d="M38 50 Q40 30 60 30 Q80 30 82 50 Q78 40 60 40 Q42 40 38 50 Z"
        fill="#2A2118"
      />

      {/* Glasses (more visible when newWord / idle) */}
      {(state === "newWord" || state === "idle" || state === "complete") && (
        <g stroke="#1E2A44" strokeWidth="1.5" fill="none">
          <circle cx="51" cy="56" r="5" />
          <circle cx="69" cy="56" r="5" />
          <line x1="56" y1="56" x2="64" y2="56" />
        </g>
      )}

      {/* Eyes */}
      {isSad ? (
        <>
          <path d="M46 58 L54 56" stroke="#1E2A44" strokeWidth="2" strokeLinecap="round" />
          <path d="M66 56 L74 58" stroke="#1E2A44" strokeWidth="2" strokeLinecap="round" />
        </>
      ) : isHappy ? (
        <>
          <path d="M46 56 Q50 52 54 56" stroke="#1E2A44" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M66 56 Q70 52 74 56" stroke="#1E2A44" strokeWidth="2" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="51" cy="56" r="1.6" fill="#1E2A44" />
          <circle cx="69" cy="56" r="1.6" fill="#1E2A44" />
        </>
      )}

      {/* Mouth */}
      {isHappy ? (
        <path
          d="M50 66 Q60 76 70 66"
          stroke="#1E2A44"
          strokeWidth="2"
          fill="#7A1F1F"
          strokeLinecap="round"
        />
      ) : isSad ? (
        <path
          d="M52 70 Q60 64 68 70"
          stroke="#1E2A44"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      ) : (
        <line
          x1="54"
          y1="68"
          x2="66"
          y2="68"
          stroke="#1E2A44"
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}

      {/* Brows */}
      {isSad ? (
        <>
          <path d="M46 48 L54 51" stroke="#2A2118" strokeWidth="2" strokeLinecap="round" />
          <path d="M66 51 L74 48" stroke="#2A2118" strokeWidth="2" strokeLinecap="round" />
        </>
      ) : (
        <>
          <line x1="46" y1="50" x2="54" y2="49" stroke="#2A2118" strokeWidth="2" strokeLinecap="round" />
          <line x1="66" y1="49" x2="74" y2="50" stroke="#2A2118" strokeWidth="2" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
