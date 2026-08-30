// src/lib/track.ts
//
// First-party event tracking. No third-party analytics service, so no extra
// processor to disclose, no consent banner, and the data stays in the database
// you already own.
//
// Two rules that must not be broken:
//
//  1. NEVER pass personal data in `props`. No emails, no names, no CV content,
//     no free text a user typed. Counts, enums and durations only. The table is
//     for measuring behaviour, not recording people.
//
//  2. Tracking must NEVER break the app. Every call is fire-and-forget and
//     swallows its own errors. An analytics outage must not stop someone
//     finishing a lesson.

import { supabase } from "@/integrations/supabase/client";

/** Events we actually measure. A closed list stops the table filling with typos. */
export type TrackEvent =
  // acquisition / onboarding funnel
  | "landing_viewed"
  | "signup_started"
  | "login_started"
  | "signup_completed"
  | "setup_started"
  | "setup_step_skipped"
  | "setup_completed"
  | "placement_test_started"
  | "placement_test_skipped"
  | "placement_test_completed"
  | "reached_dashboard"
  // core loop
  | "vocab_session_started"
  | "vocab_session_completed"
  | "vocab_session_abandoned"
  | "vocab_milestone_reached"
  // features
  | "interview_started"
  | "interview_completed"
  | "document_generated"
  | "self_intro_generated"
  | "resume_uploaded"
  // monetisation
  | "trial_gift_shown"
  | "trial_accepted"
  | "trial_declined"
  | "trial_ended_shown"
  | "trial_end_upgrade_clicked"
  | "trial_end_continue_free"
  | "premium_viewed"
  | "premium_activated"
  | "premium_cancelled"
  | "ai_quota_exhausted"
  // account
  | "data_exported"
  | "account_deleted";

type Props = Record<string, string | number | boolean | null>;

let cachedUserId: string | null | undefined;

async function currentUserId(): Promise<string | null> {
  if (cachedUserId !== undefined) return cachedUserId;
  try {
    const { data } = await supabase.auth.getUser();
    cachedUserId = data?.user?.id ?? null;
  } catch {
    cachedUserId = null;
  }
  return cachedUserId;
}

/** Call after login/logout so events attach to the right person. */
export function resetTrackedUser() {
  cachedUserId = undefined;
}

/**
 * Record an event. Never awaited by callers, never throws.
 *
 *   track("vocab_session_completed", { questions: 23, correct: 19 });
 */
export function track(event: TrackEvent, props: Props = {}): void {
  void (async () => {
    try {
      const user_id = await currentUserId();
      await supabase.from("analytics_events" as any).insert({ event, user_id, props });
    } catch {
      // Deliberately silent. Analytics is never worth an error in front of a user.
    }
  })();
}