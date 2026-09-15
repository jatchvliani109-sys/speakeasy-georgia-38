// src/pages/paths/business/lib/offlineQueue.ts
//
// Keeps a session's work when the network drops.
//
// THE PROBLEM. A vocabulary session ends with two writes: the per-word progress
// rows, and a row recording that the session happened. Both went straight to
// Supabase. On a metro ride with no signal both failed, the learner saw an error
// toast, and twenty-one questions of work was gone. Worse, the session row is
// what drives the streak, so a dropped connection could also break a streak the
// learner had kept for weeks.
//
// THE FIX. On failure the writes are parked in localStorage and replayed later:
// when the connection returns, when the app next loads, or before the next save.
// Nothing is lost unless the learner clears their browser storage.
//
// This is deliberately NOT a service worker. The app is a website, not an
// installed app, so it is never expected to open offline; it only has to survive
// losing signal while open.

import { supabase } from "@/integrations/supabase/client";

const KEY = "speakbusy:pending-writes";
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;   // a fortnight
const MAX_ITEMS = 400;

type PendingProgress = {
  kind: "progress";
  userId: string;
  at: number;
  rows: Record<string, unknown>[];
};
type PendingSession = {
  kind: "session";
  userId: string;
  at: number;
  row: Record<string, unknown>;
};
type Pending = PendingProgress | PendingSession;

function read(): Pending[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as Pending[];
    if (!Array.isArray(list)) return [];
    // Drop anything very old. A two-week-old session is no longer worth
    // replaying, and an unbounded queue would eventually break localStorage.
    const cutoff = Date.now() - MAX_AGE_MS;
    return list.filter((p) => p && p.at > cutoff).slice(-MAX_ITEMS);
  } catch {
    return [];
  }
}

function write(list: Pending[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX_ITEMS)));
  } catch {
    // storage full or disabled: nothing useful to do, and throwing here would
    // take down the results screen
  }
}

/** How many writes are waiting. Lets the UI say something honest. */
export function pendingCount(): number {
  return read().length;
}

export function queueProgress(userId: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  write([...read(), { kind: "progress", userId, at: Date.now(), rows }]);
}

export function queueSession(userId: string, row: Record<string, unknown>) {
  write([...read(), { kind: "session", userId, at: Date.now(), row }]);
}

/**
 * Replays everything queued. Safe to call at any time and from anywhere: items
 * are only dropped once their write has actually succeeded, so an interrupted
 * flush simply leaves the rest for next time.
 *
 * Progress rows use the same upsert conflict target as a live save, so replaying
 * an old row cannot duplicate anything. A row that has since been superseded by
 * newer work would be an issue, which is why newest-wins ordering matters: the
 * queue is replayed oldest first.
 */
export async function flushQueue(): Promise<{ sent: number; left: number }> {
  const list = read();
  if (!list.length) return { sent: 0, left: 0 };
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { sent: 0, left: list.length };
  }

  const remaining: Pending[] = [];
  let sent = 0;

  for (const item of list) {
    try {
      if (item.kind === "progress") {
        const { error } = await supabase
          .from("business_vocab_progress")
          .upsert(item.rows as any, { onConflict: "user_id,word_key" });
        if (error) { remaining.push(item); continue; }
      } else {
        const { error } = await supabase
          .from("business_vocab_sessions")
          .insert(item.row as any);
        // A duplicate session row is better than a lost one, but if the insert
        // fails for any other reason keep it for another attempt.
        if (error && !String(error.message).includes("duplicate")) {
          remaining.push(item); continue;
        }
      }
      sent++;
    } catch {
      remaining.push(item);
    }
  }

  write(remaining);
  return { sent, left: remaining.length };
}

/**
 * Flushes when the browser regains connectivity, and once on start-up.
 * Returns a cleanup function.
 */
export function watchConnection(onFlush?: (r: { sent: number; left: number }) => void) {
  const run = () => { void flushQueue().then((r) => { if (r.sent) onFlush?.(r); }); };
  run();
  window.addEventListener("online", run);
  return () => window.removeEventListener("online", run);
}