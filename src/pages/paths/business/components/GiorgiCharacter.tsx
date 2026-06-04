import { useEffect, useMemo, useRef, useState } from "react";

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
  size = 150,
}: {
  state: GiorgiState;
  salt?: number;
  size?: number;
}): JSX.Element {
  const lastIdxRef = useRef<number>(-1);
  const [bubbleVisible, setBubbleVisible] = useState(true);

  const message = useMemo(() => {
    const arr = MESSAGES[state];
    const { value, idx } = pickRandom(arr, lastIdxRef.current);
    lastIdxRef.current = idx;
    return value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, salt]);

  useEffect(() => {
    setBubbleVisible(true);
    if (state === "idle") {
      // idle messages auto-cycle on the salt change
      const t = setTimeout(() => setBubbleVisible(false), 4200);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setBubbleVisible(false), 3400);
    return () => clearTimeout(t);
  }, [state, salt]);

  const charAnim =
    state === "correct"
      ? "giorgiPump 650ms cubic-bezier(0.2,0.8,0.2,1)"
      : state === "wrong"
      ? "giorgiSad 800ms ease-out forwards"
      : state === "combo"
      ? "giorgiWild 850ms ease-in-out infinite"
      : state === "complete"
      ? "giorgiProud 950ms cubic-bezier(0.2,0.8,0.2,1)"
      : state === "newWord"
      ? "giorgiAttentive 700ms ease-out forwards"
      : "giorgiBreathe 3.4s ease-in-out infinite";

  return (
    <div className="relative flex items-end gap-2" style={{ minHeight: size }}>
      <div
        className="relative shrink-0"
        style={{
          width: size,
          height: size,
          animation: charAnim,
          transformOrigin: "50% 92%",
        }}
      >
        <GiorgiSVG state={state} />
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
          {/* Tail pointing to Giorgi */}
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

function GiorgiSVG({ state }: { state: GiorgiState }): JSX.Element {
  const isHappy = state === "correct" || state === "combo" || state === "complete";
  const isSad = state === "wrong";
  const isCurious = state === "newWord";
  const isCombo = state === "combo";

  // Tie animation per state
  const tieAnim =
    state === "correct" || state === "combo"
      ? "giorgiTieBounce 600ms ease-out"
      : state === "complete"
      ? "giorgiTieBounce 800ms ease-out"
      : state === "wrong"
      ? undefined
      : "giorgiTieIdle 4s ease-in-out infinite";

  const tieStaticRotate = state === "wrong" ? -22 : 0;

  // Glasses tilt for combo (excited askew)
  const glassesRotate = isCombo ? -8 : 0;

  // Arm posture
  const armRaise = state === "correct" || state === "combo";
  const armToTie = state === "complete";

  // Eyebrow lift
  const browLift = isHappy ? -2 : isCurious ? -3 : isSad ? 2 : 0;
  const browTiltL = isSad ? 14 : isCurious ? -6 : 0;
  const browTiltR = isSad ? -14 : isCurious ? 0 : 0;

  // Blink only when calm
  const allowBlink = state === "idle" || state === "newWord";

  return (
    <svg viewBox="0 0 140 150" width="100%" height="100%" aria-hidden>
      {/* Shadow */}
      <ellipse cx="70" cy="146" rx="34" ry="3.5" fill="#1E2A44" opacity="0.14" />

      {/* Body / navy suit jacket — slightly chubby silhouette */}
      <path
        d="M28 144 Q24 110 36 92 Q52 82 70 82 Q88 82 104 92 Q116 110 112 144 Z"
        fill="#1E2A44"
      />
      {/* Lapels */}
      <path d="M70 90 L50 144 L60 144 L70 108 Z" fill="#15203A" />
      <path d="M70 90 L90 144 L80 144 L70 108 Z" fill="#15203A" />

      {/* Shirt collar opening */}
      <path d="M70 88 L60 100 L70 110 L80 100 Z" fill="#F7F1E3" />

      {/* Pocket square hint */}
      <rect x="92" y="116" width="8" height="3" fill="#C9A227" opacity="0.9" />

      {/* Gold tie (animated) */}
      <g
        style={{
          transformOrigin: "70px 100px",
          transform: `rotate(${tieStaticRotate}deg)`,
          animation: tieAnim,
        }}
      >
        <path d="M67 100 L73 100 L75 105 L70 110 L65 105 Z" fill="#D4AF37" />
        <path
          d="M65 105 L75 105 L78 132 L70 142 L62 132 Z"
          fill="#C9A227"
        />
        <path d="M65 105 L75 105 L74 110 L66 110 Z" fill="#B8941F" />
      </g>

      {/* Arms */}
      {armRaise ? (
        <>
          {/* Fist pump up */}
          <path d="M34 100 Q22 70 28 56 L38 60 Q34 80 42 96 Z" fill="#1E2A44" />
          <path d="M106 100 Q118 70 112 56 L102 60 Q106 80 98 96 Z" fill="#1E2A44" />
          <circle cx="32" cy="54" r="6" fill="#F0C896" />
          <circle cx="108" cy="54" r="6" fill="#F0C896" />
          <line x1="32" y1="48" x2="32" y2="44" stroke="#C9A227" strokeWidth="2" strokeLinecap="round" />
          <line x1="108" y1="48" x2="108" y2="44" stroke="#C9A227" strokeWidth="2" strokeLinecap="round" />
        </>
      ) : isSad ? (
        <>
          {/* Hands to face / drooped shoulders */}
          <path d="M34 100 Q46 78 56 78 L58 86 Q48 92 42 108 Z" fill="#1E2A44" />
          <path d="M106 100 Q94 78 84 78 L82 86 Q92 92 98 108 Z" fill="#1E2A44" />
          <circle cx="58" cy="78" r="5.5" fill="#F0C896" />
          <circle cx="82" cy="78" r="5.5" fill="#F0C896" />
        </>
      ) : armToTie ? (
        <>
          {/* Hand straightening the tie */}
          <path d="M34 100 L34 132 L44 132 L46 102 Z" fill="#1E2A44" />
          <path d="M106 100 Q92 96 80 108 L86 114 Q96 110 100 118 Z" fill="#1E2A44" />
          <circle cx="36" cy="134" r="4.5" fill="#F0C896" />
          <circle cx="80" cy="108" r="5" fill="#F0C896" />
        </>
      ) : (
        <>
          {/* Resting arms */}
          <path d="M32 96 L28 134 L42 134 L44 98 Z" fill="#1E2A44" />
          <path d="M108 96 L112 134 L98 134 L96 98 Z" fill="#1E2A44" />
          <circle cx="34" cy="136" r="4.5" fill="#F0C896" />
          <circle cx="106" cy="136" r="4.5" fill="#F0C896" />
        </>
      )}

      {/* Neck */}
      <rect x="64" y="78" width="12" height="10" fill="#F0C896" />
      <path d="M64 86 Q70 90 76 86 L76 88 L64 88 Z" fill="#D9A878" opacity="0.4" />

      {/* Head — rounder, chubbier */}
      <ellipse cx="70" cy="56" rx="27" ry="28" fill="#F5D5A8" />

      {/* Chubby cheeks blush */}
      {(isHappy || isCurious) && (
        <>
          <ellipse cx="48" cy="64" rx="5" ry="3.5" fill="#F4A89E" opacity="0.6" />
          <ellipse cx="92" cy="64" rx="5" ry="3.5" fill="#F4A89E" opacity="0.6" />
        </>
      )}

      {/* Hair — friendly side sweep */}
      <path
        d="M44 50 Q44 28 70 26 Q96 28 96 50 Q92 38 78 38 Q66 38 60 42 Q50 42 44 50 Z"
        fill="#2A1F18"
      />
      {/* Sideburn hint */}
      <path d="M46 52 Q44 60 46 66" stroke="#2A1F18" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M94 52 Q96 60 94 66" stroke="#2A1F18" strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* Ears */}
      <ellipse cx="43" cy="58" rx="3" ry="5" fill="#F0C896" />
      <ellipse cx="97" cy="58" rx="3" ry="5" fill="#F0C896" />

      {/* Eyebrows */}
      <g style={{ transform: `translateY(${browLift}px)`, transformOrigin: "70px 46px", transition: "transform 250ms ease-out" }}>
        <path
          d={`M48 48 Q56 ${46 + browTiltL} 62 49`}
          stroke="#2A1F18"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={`M78 49 Q84 ${46 + browTiltR} 92 48`}
          stroke="#2A1F18"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
      </g>

      {/* Round glasses — always on */}
      <g
        style={{
          transformOrigin: "70px 58px",
          transform: `rotate(${glassesRotate}deg)`,
          transition: "transform 250ms ease-out",
        }}
      >
        <circle cx="55" cy="58" r="8" fill="white" fillOpacity="0.25" stroke="#1E2A44" strokeWidth="2" />
        <circle cx="85" cy="58" r="8" fill="white" fillOpacity="0.25" stroke="#1E2A44" strokeWidth="2" />
        <line x1="63" y1="58" x2="77" y2="58" stroke="#1E2A44" strokeWidth="2" />
        {/* glasses arms */}
        <line x1="47" y1="58" x2="43" y2="59" stroke="#1E2A44" strokeWidth="2" strokeLinecap="round" />
        <line x1="93" y1="58" x2="97" y2="59" stroke="#1E2A44" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* Eyes (inside glasses) */}
      <g
        style={{
          transformOrigin: "70px 58px",
          animation: allowBlink ? "giorgiBlink 4.5s ease-in-out infinite" : undefined,
        }}
      >
        {isSad ? (
          <>
            <path d="M50 60 L60 58" stroke="#1E2A44" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M80 58 L90 60" stroke="#1E2A44" strokeWidth="2.2" strokeLinecap="round" />
            {/* Tear */}
            <path d="M52 62 Q51 68 53 70 Q55 68 54 62 Z" fill="#7CB8E8" opacity="0.85" />
          </>
        ) : isHappy ? (
          <>
            <path d="M50 59 Q55 54 60 59" stroke="#1E2A44" strokeWidth="2.2" fill="none" strokeLinecap="round" />
            <path d="M80 59 Q85 54 90 59" stroke="#1E2A44" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          </>
        ) : isCurious ? (
          <>
            <circle cx="55" cy="58" r="2.4" fill="#1E2A44" />
            <circle cx="85" cy="58" r="2.4" fill="#1E2A44" />
            <circle cx="56" cy="57" r="0.8" fill="white" />
            <circle cx="86" cy="57" r="0.8" fill="white" />
          </>
        ) : (
          <>
            <circle cx="55" cy="58" r="2" fill="#1E2A44" />
            <circle cx="85" cy="58" r="2" fill="#1E2A44" />
            <circle cx="56" cy="57" r="0.7" fill="white" />
            <circle cx="86" cy="57" r="0.7" fill="white" />
          </>
        )}
      </g>

      {/* Mouth */}
      {isCombo ? (
        /* Open wide ecstatic mouth */
        <g>
          <path d="M56 68 Q70 84 84 68 Q78 78 70 78 Q62 78 56 68 Z" fill="#5C1414" />
          <path d="M58 70 Q70 80 82 70" stroke="#1E2A44" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <rect x="62" y="69" width="16" height="3" fill="white" opacity="0.9" rx="1" />
        </g>
      ) : isHappy ? (
        <g>
          <path d="M56 70 Q70 82 84 70 Q78 76 70 76 Q62 76 56 70 Z" fill="#7A1F1F" />
          <path d="M58 71 Q70 80 82 71" stroke="#1E2A44" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </g>
      ) : isSad ? (
        <path
          d="M58 76 Q70 68 82 76"
          stroke="#1E2A44"
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
        />
      ) : isCurious ? (
        <ellipse cx="70" cy="73" rx="3" ry="2.5" fill="#5C1414" />
      ) : (
        /* Default — slight smile */
        <path
          d="M60 72 Q70 78 80 72"
          stroke="#1E2A44"
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}
