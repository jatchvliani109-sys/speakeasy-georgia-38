# SpeakBusy — CLAUDE CONTEXT (authoritative status)

Last updated: 2026-08-01. Source of truth for any new Claude conversation.
Where older docs, messages or memory disagree, **this wins**.

---

## 1. What SpeakBusy is

Business-English learning app for Georgian professionals. **Vocab-first**: the
daily vocabulary session is the core loop and everything else supports it.

Solo non-technical founder (Olegi). Works **mostly on desktop**, sometimes phone.
Claude writes **complete file replacements** → Olegi pastes into GitHub →
Lovable auto-deploys. Never send partial diffs or "change line 42" instructions.
Desktop means multi-step dashboard work, SQL, and file handling are all
reasonable to ask for — do not assume a small screen or avoid detail.

Pre-launch. Not yet public.

---

## 2. Stack — READ THIS BEFORE TOUCHING INFRASTRUCTURE

- React / TS / Vite / Tailwind. Repo: `jatchvliani109-sys/speakeasy-georgia-38`
- **Backend is Lovable Cloud**, which provisions Supabase project
  `hmpwjhzrmfyapijikkuc`.

**Olegi has NO supabase.com dashboard access to that project.** It belongs to
Lovable's organisation, not his account. Everything — SQL editor, users, logs,
edge functions, secrets, emails, storage — is reached through **Lovable → Cloud**
in the left sidebar. The Cloud panel *does* include a full SQL editor; use it.

A second Supabase project (`nlvjahbosrflbvryrecf`) exists under Olegi's own
account. It is **EMPTY and unused**. A full day was lost configuring SMTP and
email templates there before discovering the app never pointed at it. Do not
configure it. Do not suggest migrating to it before launch — Lovable Cloud also
provides the payments integration, and there is no automated migration path.

- Edge functions require an **explicit Lovable redeploy** after a code change.
- Auth email: **Lovable Emails**, sending from Olegi's own domain, landing in
  inboxes. Four Georgian HTML templates installed (confirm signup, reset
  password, magic link, change email). A Resend account exists and is retained
  for future non-auth mail, but is NOT what sends auth email.
- Audio: 980 word MP3s + 54 dialogue MP3s in the public `word-audio` bucket.
- `resumes` bucket is **private**, with per-user folder policies.

### API keys (Lovable → Cloud → Secrets)
- `OPENAI_API_KEY` — in use (business-docs, business-self-intro,
  business-interview, business-resume-parse, generate-word-audio)
- `LOVABLE_API_KEY` — Lovable's own + Gemini fallback in resume-parse
- `ELEVENLABS_API_KEY` — **zero consumers**, safe to revoke and delete
- `INWORLD_API_KEY` — **zero consumers**, safe to revoke and delete

Revoke at the provider FIRST, then delete the secret. Deleting the secret only
stops the app using it; the key itself keeps working.

---

## 3. GEORGIAN LANGUAGE RULES (non-negotiable)

**"პროფესიული" is ALWAYS WRONG → "პროფესიონალური".** Scan every file, every
delivery, including AI prompts inside edge functions. The ONLY legitimate
occurrence anywhere is inside the prohibition rule itself, which must name the
word in order to ban it. A naive grep will flag those — check the line before
reporting a violation.

**"viral" → "პოპულარული (სწრაფად გავრცელებული)", never "ვირუსული"** (that is
the medical sense). Caught by Olegi. The bug was in the ORIGINAL bank, not just
the enrichment — both the translation and its example were wrong.

Olegi is the native speaker and the final authority on Georgian. When he says a
word is wrong, it is wrong; fix it and look for the whole class of that error.

---

## 4. Vocabulary system (the core product)

### Data
- **980 words**: 806 core (curriculum, week 1–12) + 174 field (7 professions:
  marketing 31, remote_work 29, finance 27, management 24, hr 22, sales 21,
  project_management 20).
- **100% enriched**: every word has a second example (EN+KA), a Georgian
  explanation, and two collocations (EN+KA). Authored by Claude, reviewed by
  Olegi in batches via gold-column spreadsheets. Zero gaps.
- Enrichment lives in an `ENRICHMENT` overlay map merged by key at load time,
  NOT rewritten into the tuples — safer, and it adds a `collocations` field the
  original type lacked.
- 9 duplicate word pairs were differentiated (not deleted) into distinct
  professional terms, e.g. `audit-fin` → "Financial audit",
  `retention` / `retention-hr` → "Customer retention" / "Employee retention".
  Their examples and collocations were rewritten to match, or their questions
  would have broken.

### Engine (`lib/vocabEngine.ts`) — 15 question types
mc_meaning, fill_blank, tr_en_to_ka, tr_ka_to_en, true_false, sentence_correct,
georgian_mistake, listening, type_word, context_cloze, odd_one_out,
synonym_match, collocation, definition_match, sentence_definition.

**Sessions are budgeted in QUESTIONS, not words** (~21–23 premium, ~19 free). A
new word yields 2 questions and a review word 1, so a fixed *word* count still
swung the quiz between 22 and 32 questions.

**Generator pools rotate from a random offset.** They were previously indexed by
word position (`gens[i % len]`), so a session with 8 words could only ever reach
the first 8 generators — sentence_definition sat at index 8 in tier 2 and was
effectively unreachable in production.

**All entry paths share a question floor.** The main planner was budgeted
correctly, but the review-fallback and practice paths built 1–2 questions per
word with no floor, producing 6–10 question stub sessions. They now top up by
asking the same words in *different formats*, capped at 3 questions per word.

**Distractors are plausibility-ranked** — same topic cohort (+3), same suffix
class (+3), similar length (+2), same word count (+1) — sampled from the top
band for variety. Includes a **KA-collision guard**: no distractor may share the
target's Georgian translation, or the question would have two correct answers.

**Two matchers, and mixing them causes shipped bugs:**
- `exactPhraseRegex` — for BLANKING (fill_blank, context_cloze). Exact form
  only, because the answer options are base forms.
- `targetPhraseRegex` — for HIGHLIGHTING (sentence_definition). Tolerates a
  normal inflected ending, since the word is only underlined, never substituted.

Getting this wrong produced two real production bugs: *"action item items"*
(matched only the first word of a multi-word term) and *"Nino is chair today's
meeting"* (blanked the inflected "chairing" but offered base-form "Chair").

**Other mechanics:** Duolingo-style mistake requeue (a missed question is
appended to the session end exactly once, progress bar grows); session resume
via localStorage snapshot (24h expiry, version-stamped, cleared only when
results actually save); 43 rotating business-pun results messages across four
score tiers, `useMemo`-stabilised so the score counters can't reshuffle them;
streak banner only on the first completed session of the day.

**Georgian mistake bank**: 24 entries, all genuine Georgian-interference errors
(missing articles, `discuss about`, `call to`, `take a decision`). Generic ESL
clichés were REMOVED — Georgian says "25 წლის ვარ" and "ჩართე შუქი", so
"I have 25 years" and "open the light" are not Georgian-speaker errors.

### Audio
`ReadAloudButton` plays a pre-generated MP3 keyed on the word's **`key`**, with
device speech synthesis as fallback. **Display text (`en`) and audio are keyed
separately** — editing a word's `en` in the bank silently desyncs it from its
MP3. This happened once ("Action item" was shortened to "Action" as a manual
workaround; the card then read "Action" while the audio said "action item").

Seven MP3s were once silently EMPTY (byte-identical at 5,760 bytes) and were
regenerated. Any future bulk generation must reject files under ~8 KB — a 0.7%
silent-failure rate is invisible from the UI.

---

## 5. Security & infrastructure (deep audit, 2026-07-31 → 08-01)

**All verified passing:**
- RLS enabled on all 22 tables, each with at least one policy. Policies that do
  not reference `auth.uid()` are all on email-infrastructure tables and are
  correctly gated on `auth.role() = 'service_role'` instead.
- Indexes on `user_id` for every user-owned table.
- Unique constraint on `business_vocab_progress (user_id, word_key)`.
- Zero malformed data: no impossible confidence values, no null users, no future
  timestamps, no malformed state JSON.
- Zero orphaned rows from deleted accounts.
- 1,034 audio files, smallest 9,600 bytes.
- `resumes` bucket private with per-user folder policies.

**Account deletion** (`delete-account` edge function) clears **21 locations**
plus the auth user, verified end-to-end with zero orphans. Must be an edge
function: removing an auth user needs the service role key, which can never ship
to a browser. Identifies the caller from their own JWT, never from the request
body. Deletes rows BEFORE the auth account so a mid-way failure is retryable.

`suppressed_emails` is **deliberately NOT cleared** — it records addresses that
bounced or reported spam, and wiping it would allow that address to be emailed
again, defeating the preference the table exists to enforce.

**AI quota is server-enforced.** SQL functions `consume_ai_session` /
`refund_ai_session` (SECURITY DEFINER, `search_path=public`, row-locking,
execute granted ONLY to `service_role`). Edge functions claim before generating
and refund on failure.

Critical detail: the client's `tryConsumeAiSession` in `state.ts` is **READ-ONLY**
— a UI pre-check that does NOT increment. If both sides incremented, every use
would cost two sessions. Equally, client and server week keys must produce
IDENTICAL strings (client uses local Tbilisi time, edge functions run in UTC and
shift +4). A mismatch would make each side see the other's key as "a new week"
and reset the counter forever, silently disabling the limit.

**`business-interview` charges on the FIRST `reply`, not on `session`.** The
interview makes many calls per session (session → N× reply → verdict → debrief);
charging every call would burn a week's budget in one interview. Charging on
`session` instead left random mode free (it never calls the `session` action)
and made abandoning at the briefing cost a full session. Gated on a persisted
`quota_charged` flag, server-set only.

**`business-resume-parse` is deliberately FREE of quota** — it is a one-time
onboarding action and a dependency of the paid feature; taxing it would
discourage the thing that makes interviews good. Protected by a rate limit
instead: 5 parses per user per day, returning HTTP 429 with
`error: "resume_parse_rate_limited"` and a `messageKa`. Note that
`supabase.functions.invoke` surfaces non-2xx as `error` without the parsed body —
read `error.context.json()` to reach `messageKa`.

**Code splitting**: public pages eager, all authenticated routes lazy. The vocab
bank is 144 KB gzipped and previously downloaded for EVERY visitor, because
`BusinessHome` imports `vocabEngine`.

---

## 6. Monetization (MOCK ERA — blocked on ინდ. მეწარმე registration)

- Price **8.99 GEL/month**.
- Free: 1 AI session/week. Premium: 7/week, unified pool across all AI features,
  Monday reset (Tbilisi time).
- `mockPro` flag in `business_state.state` JSON.
- **Premium cancel is still a mock** — it flips the local flag. When real
  payments exist it MUST reach the payment provider, or people who cancel keep
  being charged.
- Payment processor availability in Georgia is **still UNVERIFIED**. This is the
  biggest remaining unknown and could reshape the launch plan.

---

## 7. Pending board

1. **Payments** — blocked on registration; processor availability unverified.
2. **Legal** — Privacy/Terms need the registered entity name (currently
   "ფიზიკური პირი (რეგისტრაცია მიმდინარეობს)") and a real payments/subscription
   section. Georgian naming convention now used in the app:
   **"წესები და პირობები"** and **"კონფიდენციალობის პოლიტიკა"** — the legal
   pages' own titles should be aligned to match.
3. **Borrowing terms awaiting Olegi's verdict**: ჰედჰანთინგი, ფრიმიუმ,
   ინფლუენსერი, ფიშინგი, სპრინტი, სტენდაპი, ფლაივილი, კოჰორტი, სქრამი,
   კანბანი, პაიპლაინი, ცივი ზარი / თბილი ლიდი, ქოუჩინგი.
4. **Manual verification pass** — most of the recent work has never been clicked
   through by a human. Lazy-loading touched every route, so each needs a visit.
   The app is mobile-first in design and should also be checked on a phone.
5. Legacy tables `lessons` (54 rows), `mistakes` (44), `vocabulary` (186) hold
   data from the pre-SpeakBusy app. Harmless; drop post-launch if desired.
6. Deferred feature: **saved-phrase practice**. Built and reverted 2026-08-01 —
   the isolation logic was sound (zero contamination in testing) but the UI
   jammed into MyLexicon came out broken. A proper version needs its own screen.
7. **Dev RESET button removal — ABSOLUTELY LAST.**

---

## 8. Removed / deleted (2026-07-31 → 08-01)

**Legacy routes** from the pre-SpeakBusy lesson app: `/lesson`, `/summary/:id`,
`/vocabulary`, `/mistakes`, `/progress`. `/dashboard` was KEPT — it is a live
redirect to `/path/business`.

**Dead frontend files**: `Lesson.tsx`, `Vocabulary.tsx`, `Summary.tsx`,
`SpeakButton.tsx`, `EmailsModule.tsx`.

**Edge functions deleted** (all orphaned, all holding live API keys):
`tts`, `level-reaction`, `ai-tutor`, `openai-text-to-speech`, `speech-to-text`,
`business-emails`. `openai-text-to-speech` additionally had `verify_jwt = false`,
leaving its in-code check as the only gate.

**Emails module** deleted entirely — it was unreachable through any UI but
`/path/business/module/emails` still resolved and called an unmetered AI
function. Now falls through to "მოდული ვერ მოიძებნა."

**36 AI-ingested pseudo-vocabulary rows purged** from `business_vocab_progress`
(20 `email:`, 10 `interview:`, 6 `meeting:`). `ingestExternalPhrases()` harvested
phrases from transcripts and stored their EN/KA in a `meta` blob instead of
referencing the curated bank, bypassing every quality gate. This was the source
of the long-unexplained "explore" question Olegi reported weeks earlier — it was
never in the vocab bank because it came from a different pipeline. The call site
in `VocabularyModule` is now commented out; the function remains in the engine
but is unused.

---

## 9. Live edge functions

`business-docs` · `business-self-intro` · `business-interview` —
requireUser ✅ quota ✅
`business-resume-parse` — requireUser ✅ rate-limited (5/day) ✅
`delete-account` — JWT-identified, service-role
`generate-word-audio` — ops/backfill, service-role only
`auth-email-hook` · `process-email-queue` · `mcp` — infrastructure

Every function that spends money is authenticated and metered.

---

## 10. Working principles that have proven necessary

**Verify against the schema, not the frontend.** The first `delete-account`
covered 10 tables because that is all the frontend referenced. The schema had 21.
Twelve tables never appear in client code at all.

**Measure claims before making them.** "113,680 questions, zero issues" was
inflated — it repeated the same 6 review words and never generated 4 of the 15
question types. A corrected audit (9,207 distinct type × word combinations)
immediately found a real bug.

**Olegi finds real bugs by using the app.** Two of the three genuine bugs in one
session came from him playing with it, not from tooling. When he reports
something, look for the whole CLASS of that error, not the single instance.

**A wrong test that fails is far better than a wrong test that passes.** The
saved-phrase isolation test reported 880 contaminated options; investigating
showed the test was wrong, not the code.

**Don't patch symptoms in data.** Shortening "Action item" to "Action" fixed a
display bug and created an audio mismatch. The real fix belonged in the engine.

**Push back is productive.** Olegi twice rejected a shallow diagnostic and
demanded depth; both times it surfaced something real.