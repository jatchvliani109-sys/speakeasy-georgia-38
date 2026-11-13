// src/components/landing/Reveal.tsx
//
// Headlines that write themselves in: every word rises out of its own clipping
// box, one after another. The words are split at spaces only, so Georgian
// words are never broken mid-word. Screen readers get the plain sentence
// (aria-label) instead of a list of fragments.

import { createElement, useRef, type ReactNode } from "react";
import { useRevealClass } from "@/lib/motion";

/** Split `text` into masked words. `start` continues the stagger count. */
export function SplitWords({ text, start = 0 }: { text: string; start?: number }) {
  const words = text.split(" ");
  return (
    <>
      {words.map((w, i) => (
        <span key={i}>
          <span className="rw" aria-hidden>
            <span style={{ ["--i" as string]: start + i }}>{w}</span>
          </span>
          {i < words.length - 1 ? " " : null}
        </span>
      ))}
    </>
  );
}

/**
 * A heading (or any block) that reveals word by word when it scrolls into
 * view. `children` may add things after the words (an underline, an icon).
 */
export function RevealHeading({
  as = "h2",
  text,
  className = "",
  delayMs = 0,
  immediate = false,
  children,
}: {
  as?: "h1" | "h2" | "h3" | "p";
  text: string;
  className?: string;
  delayMs?: number;
  immediate?: boolean;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  useRevealClass(ref, { immediate });
  return createElement(
    as,
    {
      ref,
      className,
      "aria-label": text,
      style: { ["--d" as string]: `${delayMs}ms` },
    },
    <SplitWords text={text} />,
    children,
  );
}
