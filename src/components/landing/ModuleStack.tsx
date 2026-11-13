// src/components/landing/ModuleStack.tsx
//
// The four modules as a deck that builds itself while you scroll: each card
// pins near the top of the screen and the next one slides up over it, so
// they pile into a stack with a sliver of every card still showing. A card
// that is being covered sinks back a little (smaller, shaded), the way the
// page under the one you are reading does.
//
// Pinning is plain CSS (position: sticky). Script only adds the sinking:
// per frame it reads the four card positions, then writes one transform and
// one opacity per card.

import { useRef, type ComponentType } from "react";
import { useReducedMotion, useScrollFrame } from "@/lib/motion";

export type ModuleItem = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  body: string;
};

const PIN_TOP = 92; // px below the top of the screen (under the header)
const STEP = 18; // px of each earlier card left showing

export default function ModuleStack({ items }: { items: ModuleItem[] }) {
  const reduced = useReducedMotion();
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const shadeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const tops = useRef<number[]>([]);
  const heights = useRef<number[]>([]);

  useScrollFrame(
    {
      read: () => {
        slotRefs.current.forEach((s, i) => {
          if (!s) return;
          const r = s.getBoundingClientRect();
          tops.current[i] = r.top;
          heights.current[i] = r.height;
        });
      },
      write: () => {
        const n = items.length;
        for (let i = 0; i < n; i++) {
          const card = cardRefs.current[i];
          const shade = shadeRefs.current[i];
          if (!card || !shade) continue;
          // how far the cards above it have covered it, summed down the pile
          let cover = 0;
          for (let j = i + 1; j < n; j++) {
            const gap = (tops.current[j] ?? 0) - (tops.current[i] ?? 0);
            const h = heights.current[i] || 1;
            cover += Math.min(1, Math.max(0, 1 - (gap - STEP * (j - i)) / h));
          }
          const scale = 1 - Math.min(cover, 3) * 0.045;
          card.style.transform = `scale(${scale.toFixed(4)})`;
          shade.style.opacity = Math.min(0.5, cover * 0.18).toFixed(3);
        }
      },
    },
    !reduced,
  );

  return (
    <div data-thread className="relative max-w-2xl mx-auto pb-10">
      {items.map(({ icon: Icon, title, body }, i) => (
        <div
          key={title}
          ref={(el) => (slotRefs.current[i] = el)}
          className={reduced ? "relative mb-5" : "sticky mb-8 sm:mb-10"}
          style={reduced ? undefined : { top: PIN_TOP + i * STEP }}
        >
          <div
            ref={(el) => (cardRefs.current[i] = el)}
            className="paper-card relative overflow-hidden rounded-[26px] p-6 sm:p-9 min-h-[190px] sm:min-h-[220px] origin-top will-change-transform"
          >
            <div className="flex items-start gap-5 sm:gap-7">
              <div className="shrink-0 inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-paper-btn text-paper">
                <Icon className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xl sm:text-2xl font-extrabold ka text-paper-ink leading-snug">{title}</h3>
                <p className="mt-2 text-[15px] sm:text-base text-paper-ink-muted leading-relaxed ka">{body}</p>
              </div>
            </div>
            {/* darkens as the card is covered by the next one */}
            <div
              ref={(el) => (shadeRefs.current[i] = el)}
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-paper-ink"
              style={{ opacity: 0 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
