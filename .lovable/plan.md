# Speaking Path Progression System

Transforms the Speaking path from a flat list of conversations into a structured curriculum across the 17 existing scenarios (the `TOPICS` list in `AISpeakingCall.tsx`), each with 3 difficulty tiers and unlockable progression.

## Scope decisions

- **Canonical scenarios** = the 17 entries in `TOPICS` in `AISpeakingCall.tsx`. These already cover Beginner / Elementary / Intermediate / Free buckets and are what the user actually launches calls against. The older `SCENARIOS` list in `data.ts` (used only by the optional `/roleplay` chat list) stays unchanged.
- **Difficulty tiers** = `easy` (დამწყები), `medium` (საშუალო), `hard` (რთული). These are independent of the existing topic "level" grouping (Beginner / Elementary / etc.) — every scenario gets all three tiers.
- A **completed** session = call summary saved with at least 4 user turns (existing summary screen already saves this).

## Database

New table `speaking_scenario_progress`:

```text
user_id uuid
scenario_id text          -- topic id (e.g. "cafe", "interview")
tier text                 -- 'easy' | 'medium' | 'hard'
completed_at timestamptz
score int                 -- 0–100, derived from session summary
unique (user_id, scenario_id, tier)
```

RLS: user can read/write only their own rows. Standard GRANTs.

The existing `lessons` table keeps holding call transcripts. The new table is just the progression ledger so unlock state and dashboard queries are fast.

## Tier behavior (passed into the realtime call)

`useRealtimeCall` already takes a `level` string. Add a new `tier` param that the call session builder maps to instructions:

- **easy**: short sentences, A1 vocab, slow pace, lots of confirmation, simple follow-ups
- **medium**: natural pace, B1 vocab, multi-clause sentences, occasional clarification
- **hard**: native pace, B2/C1 vocab, idioms, unexpected topic pivots, no hand-holding

Send these as system instructions when creating the realtime session.

## Unlocking rules

- Every scenario starts with **easy unlocked**, others locked.
- Completing easy for a scenario unlocks medium for the same scenario.
- Completing medium unlocks hard.
- Locked = grayed card + `Lock` icon, not clickable.
- Completed = `CheckCircle2` badge on the tier dot.

## Daily Mission

Top section on `SpeakingDashboard`, above the existing AI call card:

- Picks one `{scenario, tier}` per day, deterministic by date+user so it doesn't change on refresh.
- Selection priority:
  1. Scenarios not practiced in the last 7 days
  2. Lowest-score scenarios from past sessions
  3. Lowest unlocked tier overall (push user forward gradually)
- Shows scenario icon, title, tier chip, "~10 წუთი", `დაწყება` CTA that deep-links to `/path/speaking/call?scenario=<id>&tier=<tier>`.
- If today's mission is done: success state with tomorrow's preview scenario.

## Progress Dashboard

New `SpeakingProgressMap` section, rendered on both the dashboard (compact) and `SpeakingProgress` page (full):

- 17 scenario rows. Each row: icon, title, 3 dots (easy/medium/hard) — filled gold when completed, hollow when unlocked-not-done, gray + lock when locked.
- Stats strip: total completions, scenarios with all 3 tiers done, current CEFR level.
- "Strongest" / "Needs work" lists derived from average `score` per scenario.

## CEFR level calculation

Pure function over completed rows:

```
easyDone   = count(tier='easy')
mediumDone = count(tier='medium')
hardDone   = count(tier='hard')

if hardDone >= 17                          → C1 Advanced
else if mediumDone >= 17 && hardDone > 0   → B2 Upper Intermediate
else if easyDone >= 17 && mediumDone > 0   → B1 Intermediate
else if easyDone >= 6                      → A2 Elementary
else                                       → A1 Beginner
```

Rendered prominently in the dashboard header. Updates on every completion.

## Call screen changes

- `AISpeakingCall` setup screen replaced by a **scenario picker that shows the 3 tiers per scenario** as small dots; clicking a tier launches the call with that tier (only unlocked tiers clickable).
- Deep link `?scenario=…&tier=…` skips the picker (used by Daily Mission).
- After the call, the summary screen:
  1. Computes a 0–100 score from existing summary signals (turns count, mistakes count, encouragement).
  2. Inserts a row into `speaking_scenario_progress` (upsert: keep best score).
  3. Plays a brief checkmark animation.
  4. If the next tier just unlocked: shows a one-time toast/modal "საშუალო დონე განბლოკილია!".
  5. Shows "X scenarios left at <tier>" and the next recommended scenario.

## Files

**New**
- `supabase/migrations/<ts>_speaking_progress.sql` — table + RLS + GRANTs
- `src/pages/paths/speaking/lib/progression.ts` — tier types, unlock logic, CEFR calc, daily-mission picker, scoring
- `src/pages/paths/speaking/lib/useSpeakingProgress.ts` — hook that loads progress rows and exposes helpers
- `src/pages/paths/speaking/components/ScenarioProgressMap.tsx` — the 17-row tier grid
- `src/pages/paths/speaking/components/DailyMissionCard.tsx`
- `src/pages/paths/speaking/components/TierUnlockedToast.tsx`

**Edited**
- `src/pages/paths/speaking/AISpeakingCall.tsx` — tier-aware picker, deep-link support, tier passed to call, completion writes progress row + unlock UI
- `src/pages/paths/speaking/lib/useRealtimeCall.ts` — accept `tier`, inject tier instructions into the session prompt
- `src/pages/paths/speaking/SpeakingDashboard.tsx` — CEFR badge, Daily Mission on top, compact progress map
- `src/pages/paths/speaking/SpeakingProgress.tsx` — full progress map and strongest/weakest sections
- `src/integrations/supabase/types.ts` — regenerated after migration approval

## Out of scope (kept as-is)

- Roleplay list / chat scenarios in `RoleplayList.tsx` — separate surface, no tiering.
- Pronunciation bank and Daily Lesson flow.
- Existing visual theme (warm gold/amber) — used throughout the new components.
