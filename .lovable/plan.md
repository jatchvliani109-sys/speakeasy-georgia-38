## Speaking Path Overhaul — Implementation Plan

Scope: Rebuild only the Speaking learning path (`/path/speaking` and new sub-routes). No changes to other paths, onboarding, auth, level test, or payments.

### 1. New routes & files

Add routes in `src/App.tsx` under the speaking path:
- `/path/speaking` — redesigned dashboard (replaces current `Speaking.tsx`)
- `/path/speaking/daily` — Daily Speaking Lesson
- `/path/speaking/pronunciation` — Pronunciation Practice
- `/path/speaking/roleplay` — Roleplay scenarios list
- `/path/speaking/roleplay/:scenarioId` — Roleplay session
- `/path/speaking/progress` — Speaking progress

New files:
```
src/pages/paths/speaking/
  SpeakingDashboard.tsx     (replaces paths/Speaking.tsx usage)
  DailyLesson.tsx
  Pronunciation.tsx
  RoleplayList.tsx
  RoleplaySession.tsx
  SpeakingProgress.tsx
  data.ts                   (phrase banks, roleplay scenarios per level)
  components/
    PhraseCard.tsx          (English + Georgian + 🔊 + example + "I practiced")
    MicPlaceholder.tsx      ("🎤 Recording coming soon", disabled)
    StepHeader.tsx
```

### 2. Dashboard (`SpeakingDashboard.tsx`)

- Title: "საუბრის გაუმჯობესება"
- Subtitle: "ივარჯიშე ინგლისურად საუბარში, გამოთქმაში და თავდაჯერებულობაში."
- Purple→bright-blue gradient header, soft white cards, teal accents (semantic tokens added to `index.css`/`tailwind.config.ts` if needed; otherwise inline gradient classes scoped to this section).
- Four large mobile-first cards with icon, GE title, GE description, primary CTA button — each linking to its sub-route. Uses `PathSwitcher` like other dashboards.

### 3. Daily Speaking Lesson

5 steps in a single page with progress indicator:
1. **Topic** — title, goal, ~5–10 min badge. Topic is fetched via existing `ai-tutor` edge function in `mode: "plan"` (already supports speaking lesson plans). Falls back to a hardcoded "Introducing Yourself" topic.
2. **Useful Phrases** — first 3 entries from `plan.new_words` rendered as `PhraseCard` (🔊 uses existing `tts` edge function via `SpeakButton`).
3. **Repeat Practice** — same phrases with "მოუსმინე" / "გაიმეორე ხმამაღლა" / "I practiced" toggle + disabled mic placeholder.
4. **Guided Conversation** — 2–3 short questions from `plan.warmup_questions`, asked one at a time. User types reply; tutor reply via `ai-tutor` chat mode with stage `practice` and a speaking-coach system addendum (see §6). Uses user's `english_level` from profile to choose Georgian-first vs English.
5. **Lesson Review** — phrases practiced count, mistakes corrected (from tutor replies that contained "Type:" corrections, kept simple), suggested next topic (from plan), encouraging message in Georgian. Persists to `lessons` table with `level` tagged `speaking:<level>` so it's distinguishable in progress.

### 4. Pronunciation Practice

- Phrase bank in `data.ts` keyed by level (Beginner/Elementary/Intermediate). Includes the examples in the brief.
- Renders `PhraseCard` list. "I practiced" toggles a per-item flag stored in `localStorage` under `speaking:pronunciation:<userId>` (no schema change required; counts surface on Progress page).

### 5. Roleplay Practice

- `RoleplayList.tsx` — scenario cards by level (data in `data.ts`): title, GE explanation, difficulty badge, "დაწყება" button.
- `RoleplaySession.tsx` — shows scenario, user role, AI role. Conversation uses `ai-tutor` chat mode with a roleplay system addendum and `lessonContext` containing `{ scenario, userRole, aiRole, level }`. Beginner mode renders 3 suggested reply chips per turn (generated client-side from a small static set per scenario); Intermediate uses free text input. Completion writes to `lessons` table with `level: "speaking:roleplay:<level>"`.

### 6. AI tutor behavior for Speaking

Extend `supabase/functions/ai-tutor/index.ts`:
- Add new optional `coachMode: "speaking_lesson" | "roleplay"` field.
- When set, prepend a Speaking Coach system block: focus on speaking confidence, short replies, one question at a time, gentle correction ("Good try! Try: '…'"), encourage repetition, Georgian-first for Beginner, no long English paragraphs, stay on topic. For roleplay: stay strictly in `aiRole`, do not break character, end naturally after ~6 turns.
- All other modes remain unchanged so other paths (General English lesson) are unaffected.

### 7. Speaking Progress

Reads from Supabase + localStorage:
- Speaking lessons completed: `select count from lessons where user_id=auth.uid() and level like 'speaking:%' and completed=true`.
- Phrases practiced + Pronunciation items practiced: localStorage counters.
- Roleplays completed: `lessons` rows with `level like 'speaking:roleplay:%'`.
- Recent speaking topics: last 5 lesson summaries (`summary->>title_ka`).
- Common speaking mistakes: `select original_sentence, corrected_sentence, count from mistakes where user_id=auth.uid() group by ... limit 5` (filters on lesson_id joined to speaking lessons).

Visual: simple stat cards + bullet lists. No fake numbers — empty states show "ჯერ არ გაქვს დაწყებული".

### 8. Future voice readiness

- `MicPlaceholder` component used in Daily Lesson Step 3 and Roleplay session: disabled button with "🎤 Recording coming soon" tooltip.
- Audio playback buttons reuse existing `SpeakButton` (TTS edge function).

### 9. Out of scope (untouched)

General English / Writing / Business / School / National Exam dashboards, onboarding, level test, auth, payments, vocabulary, mistakes pages, streak.

### Technical notes

- No database migrations required. `lessons.level` is already free-text TEXT, so namespacing with `speaking:` is safe and won't affect other paths' queries (they filter by user only).
- `ai-tutor` edge function gets a backwards-compatible additive change (`coachMode` is optional).
- All new colors come from existing semantic tokens (`primary`, `accent`, `secondary`); the purple/blue/teal feel comes from `from-purple-500/10 to-blue-500/10` style utilities already used in `paths/Speaking.tsx`, plus a small teal accent class.
- All UI text Georgian-first as specified.
