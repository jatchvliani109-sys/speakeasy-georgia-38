// Streak system removed. These functions are kept as no-ops so existing
// call sites continue to compile without changes.

export type SpeakingActivity =
  | "daily_speaking_lesson"
  | "pronunciation_practice"
  | "roleplay";

export async function recordSpeakingActivity(_userId: string, _activity: SpeakingActivity) {
  return;
}

export type SpeakingStats = {
  currentStreak: number;
  longestStreak: number;
  lastPracticeDate: string | null;
  practicedToday: boolean;
};

export async function loadSpeakingStats(_userId: string): Promise<SpeakingStats> {
  return {
    currentStreak: 0,
    longestStreak: 0,
    lastPracticeDate: null,
    practicedToday: false,
  };
}
