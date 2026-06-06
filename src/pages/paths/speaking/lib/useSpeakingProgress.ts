import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  buildProgressMap, calculateCEFR, pickDailyMission, ProgressMap, ProgressRow,
  Tier, tierCounts, fullyMasteredCount, strongestWeakest, DailyMission,
} from "./progression";

const TABLE = "speaking_scenario_progress" as const;

export function useSpeakingProgress() {
  const { user } = useAuth();
  const [rows, setRows] = useState<ProgressRow[]>([]);
  const [recentScenarioIds, setRecent] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: pr }, { data: ls }] = await Promise.all([
      (supabase as any).from(TABLE).select("scenario_id,tier,score,completed_at").eq("user_id", user.id),
      supabase
        .from("lessons")
        .select("summary, created_at")
        .eq("user_id", user.id)
        .eq("completed", true)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);
    setRows((pr ?? []) as ProgressRow[]);
    const sevenDaysAgo = Date.now() - 7 * 24 * 3600 * 1000;
    const recent = (ls ?? [])
      .filter((l) => new Date(l.created_at).getTime() >= sevenDaysAgo)
      .map((l) => (l.summary as any)?.topic_id)
      .filter(Boolean) as string[];
    setRecent(recent);
    setLoading(false);
  }, [user]);

  useEffect(() => { void refresh(); }, [refresh]);

  const map: ProgressMap = buildProgressMap(rows);
  const cefr = calculateCEFR(map);
  const counts = tierCounts(map);
  const mastered = fullyMasteredCount(map);
  const mission: DailyMission | null = user
    ? pickDailyMission({ userId: user.id, map, recentScenarioIds })
    : null;
  const { strongest, weakest } = strongestWeakest(map);

  const recordCompletion = useCallback(async (input: {
    scenarioId: string; tier: Tier; score: number;
  }) => {
    if (!user) return { newlyUnlockedTier: null as Tier | null };
    const prev = map[input.scenarioId]?.[input.tier];
    const willUpgrade = !prev || input.score > prev.score;
    const wasFirstCompletion = !prev;
    const payload = {
      user_id: user.id,
      scenario_id: input.scenarioId,
      tier: input.tier,
      score: Math.round(input.score),
      completed_at: new Date().toISOString(),
    };
    await (supabase as any)
      .from(TABLE)
      .upsert(payload, { onConflict: "user_id,scenario_id,tier" });
    await refresh();
    const newlyUnlockedTier: Tier | null = wasFirstCompletion
      ? (input.tier === "easy" ? "medium" : input.tier === "medium" ? "hard" : null)
      : null;
    return { newlyUnlockedTier, upgraded: willUpgrade };
  }, [user, map, refresh]);

  return {
    loading, rows, map, cefr, counts, mastered, mission, strongest, weakest,
    recordCompletion, refresh,
  };
}
