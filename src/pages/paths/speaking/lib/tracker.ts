import { supabase } from "@/integrations/supabase/client";

export type SpeakingActivity =
  | "daily_speaking_lesson"
  | "pronunciation_practice"
  | "roleplay";

function localDateString(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isYesterday(prev: string, today: string): boolean {
  const t = new Date(today + "T00:00:00");
  const y = new Date(t);
  y.setDate(t.getDate() - 1);
  return localDateString(y) === prev;
}

export async function recordSpeakingActivity(userId: string, _activity: SpeakingActivity) {
  if (!userId) return;
  try {
    const { data: prof } = await supabase
      .from("profiles")
      .select("speaking_current_streak, speaking_longest_streak, speaking_last_practice_date")
      .eq("id", userId)
      .maybeSingle();

    const today = localDateString();
    const last = prof?.speaking_last_practice_date ?? null;
    let current = prof?.speaking_current_streak ?? 0;
    const longest = prof?.speaking_longest_streak ?? 0;

    if (last === today) {
      // already counted today — no change
      return;
    } else if (last && isYesterday(last, today)) {
      current = current + 1;
    } else {
      current = 1;
    }

    const newLongest = Math.max(longest, current);

    await supabase
      .from("profiles")
      .update({
        speaking_current_streak: current,
        speaking_longest_streak: newLongest,
        speaking_last_practice_date: today,
      })
      .eq("id", userId);
  } catch (e) {
    console.warn("[speaking] streak update failed", e);
  }
}

export type SpeakingStats = {
  currentStreak: number;
  longestStreak: number;
  lastPracticeDate: string | null;
  practicedToday: boolean;
};

export async function loadSpeakingStats(userId: string): Promise<SpeakingStats> {
  const { data } = await supabase
    .from("profiles")
    .select("speaking_current_streak, speaking_longest_streak, speaking_last_practice_date")
    .eq("id", userId)
    .maybeSingle();
  const today = localDateString();
  return {
    currentStreak: data?.speaking_current_streak ?? 0,
    longestStreak: data?.speaking_longest_streak ?? 0,
    lastPracticeDate: data?.speaking_last_practice_date ?? null,
    practicedToday: data?.speaking_last_practice_date === today,
  };
}
