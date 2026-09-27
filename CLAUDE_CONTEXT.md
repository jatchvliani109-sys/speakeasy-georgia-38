# SpeakBusy — CLAUDE CONTEXT (authoritative status)

Last updated: 2026-09-27. Source of truth for any new Claude conversation.
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

**Committing is not publishing.** Lovable needs an explicit publish, and a
commit alone leaves the live site on the previous build. Before re-testing a
fix, confirm it is actually live — fetch the deployed bundle and grep for a
string only the new version contains. An hour was spent on 2026-09-27 measuring
a bug that had already been fixed but not published.

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
  **All 980 verified present 2026-09-27** (HEAD-checked every key; note Supabase
  storage rate-limits at high concurrency — throttle to ~4 parallel with retries
  on 429, or you get false "missing" results).
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

**⚠️ UNRESOLVED CONFLICT — ask Olegi to settle it.** The project instructions
say *"პროფესიული is always wrong — use პროფესიონალური."* This document has
said the opposite since August: that პროფესიული is a real word meaning
*profession-related* and is correct in some contexts, with
`"შენს პროფესიულ გამოცდილებას"` listed as approved-correct.

On 2026-09-27 Claude replaced **all six** remaining instances app-wide with
პროფესიონალური — including that exact approved phrase — and Olegi shipped it
without objection. The live app now uses პროფესიონალური everywhere. Until he
says otherwise, treat **the always-replace rule as the operative one**, and
delete this warning once he confirms.

**"viral" → "პოპულარული (სწრაფად გავრცელებული)", never "ვირუსული"** (that is
the medical sense). Caught by Olegi. The bug was in the ORIGINAL bank, not just
the enrichment — both the translation and its example were wrong.

**Register is informal (შენ) throughout the learning app.** Legal pages (Terms,
Privacy) and the regulated subscription-consent text on BusinessPremium stay
formal (თქვენ) deliberately. Auth, forgot-password and reset-password are still
formal and inconsistent with the rest — Olegi has not decided whether to change
them.

**Never call a session a "day".** Olegi's explicit instruction, 2026-09-27:
"გამეორების დღე", "დღევანდელი შედეგი", "დღევანდელი სიტყვები" were all wrong —
a session is a session. Now: "გამეორების სესია", "სესიის შედეგი",
"ახალი სიტყვები". "დღე" survives only where it genuinely means the calendar
day: the daily-mission label, the free-tier daily cap screen, and streak copy.

Olegi is the native speaker and the final authority on Georgian. When he says a
word is wrong, it is wrong; fix it and look for the whole class of that error.

### Georgian written by the AI — fixed label lists, not free prose

**The models cannot be trusted to write Georgian.** Asked for a one-line
Georgian explanation, gpt-4o produced things like *"ეს ფრაზა ნეიტრალურად ახსნა
გადავადების მიზეზი, რომელიც არ მომხდარა კონტროლირებადი"*, and gpt-5.4 mixed
untranslated English into Georgian sentences (*"მენეჯერის compliance
მოთხოვნაზე"*). Nobody can review every sentence a model will ever generate.

Olegi's instruction: **reasoning in English, Georgian only as short canned
labels.** Implemented 2026-09-27 in `business-docs` and `business-interview`:

- The prompt gives a closed list of Georgian labels and requires an EXACT copy.
- A sibling field carries the specific reasoning **in English**.
- The function then **clamps every label server-side** before responding —
  anything off-list is replaced. `clampWhyTags()` / `clampTags()`. This is the
  guarantee; the prompt alone is not.
- Positive and negative contexts clamp to different lists (`PRAISE_TAGS` vs
  `ISSUE_TAGS`), so a failure can't praise a weak answer.

The lists live at the top of each edge function and are Olegi's to edit.
Verified live: labels rendered correctly and no invented Georgian appeared.

Still model-written Georgian, and therefore still a risk: the `ka` **translation**
fields (key phrases, vocabulary). Short and mostly fine, occasionally clunky
("მე დავაყენე დაინტერესებული მხარეები საერთო მიწოდების გეგმის გარშემო").
Not yet constrained.

---

## 4. Vocabulary system (the core product)

### Data
- **980 words**: 806 core (curriculum, week 1–12) + 174 field (7 professions:
  marketing 31, remote_work 29, finance 27, management 24, hr 22, sales 21,
  project_management 20).
- **100% enriched**: every word has a second example (EN+KA), a Georgian
  explanation, and two collocations (EN+KA). Authored by Claude, reviewed by
  Olegi in batches via gold-column spreadsheets. Zero gaps.
- **Full human review DONE (2026-09-22).** Olegi reviewed all 980 words by hand
  in `SpeakBusy-vocabulary-final.xlsx` and it is merged into `vocabBank.ts`:
  298 words changed, keys / English / weeks / fields / order untouched.
  Collocations were NOT in it. `pronunciation` was dropped from the sheet
  (read-aloud replaces it); the field still exists in code but **is no longer
  rendered anywhere** — verified 2026-09-27.
- **Automated bank audit (2026-09-27)** found only two errors in all 980:
  `Reply → "პასუხის"` (a bare genitive) and `Disagree → "არ შეთანხმება"` (wrong
  verb — შეთანხმება is a deal; the example correctly used ვეთანხმები). Both
  fixed. The scans worth repeating after any bank edit: single-word translations
  ending in a case ending (-ის/-ას/-ებს), translations starting with a negation,
  duplicate keys, Georgian collisions, stray Latin, double spaces, ASCII quotes.
- **6 Georgian translation collisions remain, awaiting Olegi's decision**:
  bill/tax, goal/target, summary/summarize, wage/compensation,
  acquisition/procurement, lead/prospect. Harmless to the quiz (collision
  guards) but a learner cannot tell them apart from Georgian alone.
- Never reviewed by Olegi: collocations, and the `vocabContext.ts` paragraphs.
- **`vocabContext.ts` is CRLF.** Most of the repo is LF. Match each file's
  existing line endings exactly — a whole-file replacement that flips them
  produces a diff touching every line.
- Enrichment lives in an `ENRICHMENT` overlay map merged by key at load time.
- 9 duplicate word pairs were differentiated (not deleted) into distinct
  professional terms, e.g. `audit-fin` → "Financial audit".

### Engine (`lib/vocabEngine.ts`) — 14 question types
mc_meaning, fill_blank, tr_en_to_ka, tr_ka_to_en, true_false, sentence_correct,
georgian_mistake, listening, type_word, context_cloze, synonym_match,
collocation, definition_match, sentence_definition.

**odd_one_out was REMOVED** on Olegi's request.

**Insert-word questions hide the Georgian until answered** (fill_blank sentence
translation, collocation hint).

### Scheduling, confidence and mastery — two DIFFERENT measures
- **Confidence 0–5**: +1 after a session with the word all-correct, −1 after a
  session with any miss. Drives the ვიცი tab (≥4 or manual "easy"), the
  weighted progress %, and the trial AI unlock.
- **Mastery** (`checkMastery`): ≥4 correct total, correct sessions on 3
  different days, last 2 sessions correct, ≥2 production-type correct. Only
  affects scheduling.
- Any miss → due immediately. Correct → 1 / 3 / 7 / 14 days by confidence.
- **Mastered words get check-ups**: 14 days, then 30, then 60 (`meta.masteryStep`).
- **"ადვილი" is a SCHEDULING label only.** It does not count as a known word
  for the progress %, the trial gate or the emails. It only stops a word being
  used as early review filler; it still returns when genuinely due.
- **Review sessions draw on any word seen at least once**, weakest-confidence
  first — due words first, then not-yet-due as filler (excluding ადვილი). Words
  you are still learning are *preferred* over mastered ones. Never includes a
  word you have not met.
- Pace: new words per session 8 / 4 / 3 (paid, by session of the day), free 6;
  backlog governor; first encounter all-correct fast-tracks to confidence 3.

**Sessions are budgeted in QUESTIONS, not words.** Measured live 2026-09-27:
premium 22–27 questions, free 17. A new word yields 2 questions, a review word 1.

**Generator pools rotate from a random offset**, not by word position.

**All entry paths share a question floor**, topping up with different formats,
capped at 3 questions per word.

**Distractors are plausibility-ranked**, with a **KA-collision guard**: no
distractor may share the target's Georgian translation.

**Two matchers, and mixing them causes shipped bugs:**
- `exactPhraseRegex` — for BLANKING (fill_blank, context_cloze).
- `targetPhraseRegex` — for HIGHLIGHTING (sentence_definition).

**Other mechanics:** mistake requeue (once per question); session resume via
localStorage snapshot; 43 rotating business-pun results messages; streak banner
only on the first completed session of the day.

**The resume snapshot is cleared by the OFFLINE QUEUE too.** The save path keeps
the snapshot when a save fails so nothing is lost; without also clearing it when
the queued session finally syncs, the learner returns, is dropped into the last
question of a session that already saved, and finishes it a second time.
`SESSION_SNAPSHOT_KEY` is declared in `lib/offlineQueue.ts`; `VocabularyModule`
keeps a matching literal (deliberately not an import, so the offline queue and
its supabase client stay a dynamic import on that route).

**Session rows must not lie about review mode.** `new_words: reviewMode ? 0 : …`
and `review_words: reviewMode ? reviewWords.length : reviewKeys.length` — before
this, review sessions reported the planner's new words, which were never shown.

**Finishing is guarded against double-taps** (`finishingRef`). Three rows 250ms
apart were originally blamed on a code bug; they were actually caused by test
automation clicking fast — but a user double-tapping on a laggy phone does the
same thing, so the guard stays.

### Audio
`ReadAloudButton` plays a pre-generated MP3 keyed on the word's **`key`**, with
device speech synthesis as fallback. **Display text (`en`) and audio are keyed
separately** — editing a word's `en` silently desyncs it from its MP3.

Any future bulk generation must reject files under ~8 KB — seven MP3s were once
silently empty at 5,760 bytes.

---

## 5. Design tokens, dark mode and contrast

Dark mode has produced more shipped bugs than any other single area. Three rules,
all learned the hard way:

**1. Surface tokens are not text tokens.** `cream-2` is light in light mode and
near-black in dark mode. Used as *text* on a wine card it inverted and vanished
(1.28:1) across both lexicon tabs. Text that sits on a permanently-dark surface
uses `on-dark`, which is light in **both** themes.

**2. `wine` and `gold` flip to LIGHT in dark mode.** Any gradient running
through them puts near-white text on a light band. This shipped three times:
the gold CTAs (1.65:1), the interview completion card, and the streak banner —
twice, because the first "fix" swapped `via-wine` for `via-wine-deep`, which is
*also* light in dark mode. The pattern that works is `via-wine dark:via-wine-soft`.
A card with a fixed light background (`bg-gold-soft`, the `<mark>` highlight)
needs `dark:text-panel-deep`, not a theme-flipping text token.

**3. Some cards are deliberately theme-independent** — the dashboard focus card
has a fixed `#C4BBA8` background with hardcoded `#241F1A` / `#4A4238` text.
Any token-based colour placed inside one of those will break in one theme.
`text-gold-soft` inside it measured 1.30:1 in *both*.

**Tokens that fail as small text**: `sage` (3.65–3.95 in light — use `sage-deep`),
`gold` on cream (use `gold-deep`). `danger` passes everywhere. `--ink-subtle`
was darkened 54% → 44% and `--gold-deep` 36% → 34% to clear AA.

### The contrast checker — and its blind spots

Two tools, both worth rebuilding when needed:

- **Static**: parse `--token` HSL values out of `index.css` for `:root` and
  `.dark`, then scan every `className` for bg/text pairs and compute the ratio
  in both themes. **Must include `from-`, `via-` AND `to-` gradient stops** —
  omitting `via-` is what let the streak banner through twice. Treat `hover:`
  variants as their own state. Skip backgrounds with an `/alpha` suffix; they
  composite over a parent the scanner cannot know, and produce noise.
- **Live**: walk the DOM, resolve each text node's effective background (walking
  up, and reading gradient stops out of `backgroundImage`), toggle `.dark`, and
  compare. **Inject `* { transition: none !important }` before toggling.** Without
  it the scan samples mid-transition and reports colours from both themes mixed
  together — it produced a dozen false positives and hid two real bugs on
  2026-09-27.

Both were clean across every page, both themes, base and hover, as of the end of
that session.

---

## 6. Dates, numbers and formatting

**Never use `toLocaleDateString("ka-GE")`.** Many browsers ship no Georgian
locale data and silently fall back to the default, so a Georgian-only app
printed `7/31/2026` and `July 31, 2026` to Georgian users — including the next
card-charge date on the premium page. Verified on a real device:

```
Intl.DateTimeFormat("ka-GE").resolvedOptions().locale  →  "en-US"
```

Use `src/lib/formatDate.ts`: `formatDateKa` ("27 სექტემბერი, 2026"),
`formatDateShortKa` ("27.09.2026"), `formatDateTimeKa` (24-hour), and
`formatCardMask` (`548888XXXXXX8590` → `•••• 8590`). The long form matches
`formatGeorgianDate` in the subscription emails so an email and the screen it
refers to agree.

**One denominator for vocabulary progress.** `vocabTotalFor(fields, goals)` =
core words + the learner's own field words. Three different denominators were in
use at once: 980 in the trial emails, 1500 on the trial-ended screen, and
`vocabTotalFor` in the app. The edge function now mirrors `vocabTotalFor` with a
hardcoded count map — **if words are added to the bank, update
`CORE_WORD_COUNT` / `FIELD_WORD_COUNTS` in `daily-tasks/index.ts` too.**

---

## 7. Security & infrastructure (deep audit, 2026-07-31 → 08-01)

**All verified passing:** RLS on all 22 tables; indexes on `user_id`; unique
constraint on `business_vocab_progress (user_id, word_key)`; zero malformed data;
zero orphaned rows; `resumes` bucket private.

**Account deletion** (`delete-account`) clears **21 locations** plus the auth
user. Must be an edge function (service role key). `suppressed_emails` is
**deliberately NOT cleared**.

**AI quota is server-enforced.** `consume_ai_session` / `refund_ai_session`
(SECURITY DEFINER, row-locking, `service_role` only).

The client's `tryConsumeAiSession` is **READ-ONLY** — a UI pre-check that does
NOT increment. Client and server week keys must produce IDENTICAL strings
(client local Tbilisi, edge functions UTC +4).

**`business-interview` charges on the FIRST `reply`**, gated on a persisted
`quota_charged` flag. Verified live 2026-09-27: a complete interview
(warm-up → 5 stages → verdict → debrief) cost exactly one session, and resuming
an abandoned interview costs nothing extra.

**`business-self-intro` must NOT charge for rewrites.** It called
`consumeAiSession` before checking whether the request was a rewrite, so each of
the four refine buttons — which the UI presents as free — burned a weekly
session. One intro plus three tweaks was 4 of 7. Fixed: only a fresh generation
is charged; rewrites are bounded by a 2000-char `baseText` limit instead.

**The quota counter must be re-read into React state after a generation.**
`pullBusinessFromSupabase` updates the cache, not the component, so the header
still read 7/7 after spending one. DocumentHelper dispatches a
`speakbusy:ai-budget` window event (six child tool components, one parent
counter); InterviewModule re-reads on the charging turn.

**`business-resume-parse` is deliberately FREE of quota**, rate-limited to 5/day.
`supabase.functions.invoke` surfaces non-2xx as `error` without the parsed body —
read `error.context.json()` to reach `messageKa`.

**Code splitting**: public pages eager, all authenticated routes lazy.

---

## 8. Auth (Google, email confirmation)

**Google sign-in is LIVE and goes through Lovable's broker, not Supabase's.**
`Auth.tsx` calls `lovable.auth.signInWithOAuth("google", …)` from
`src/integrations/lovable/index.ts` — an auto-generated file marked *do not
modify* — which brokers the handshake and then hands the tokens to
`supabase.auth.setSession()`.

**The callback is NOT `…supabase.co/auth/v1/callback`.** Claude asserted that
and was wrong. Lovable's own redirect URIs, all four of which belong in the
Google client:

```
https://oauth.lovable.app/callback
https://speak-busy.lovable.app/~oauth/callback
https://speakbusy.com/~oauth/callback
https://www.speakbusy.com/~oauth/callback
```

Olegi switched from Lovable's managed credentials to his own Google Cloud client
on 2026-09-27 (for SpeakBusy branding on the consent screen). **Rollback is one
radio button** — "Managed by Lovable" in Lovable → Auth → Google settings.

**Brand verification is PENDING.** Uploading a logo to an external production
app triggers Google brand verification (minutes if automated, 2–3 business days
if reviewed). Until it clears, a user cap applies to his own client. Requires
domain ownership of speakbusy.com verified in Google Search Console.

**Email confirmation is still ON** (`mailer_autoconfirm: false`, checked live).
Recommended to keep it: the regulated pre-charge notices mean an unreachable
address is a legal problem, and the `gamil.com → gmail.com` typo suggester on
the signup form mitigates the main downside. Google sign-in skips confirmation
entirely, so promoting it is the way to reduce signup friction.

Live auth providers: `email: true`, `google: true`, everything else false.

**Apple sign-in: deferred.** Lovable's SDK supports it, but it needs an Apple
Developer Program membership at $99/year, and the Georgian market is
Android-dominant. Revisit only if an iOS app ships (which makes it mandatory
alongside other social logins) or if analytics show heavy iOS traffic.

---

## 9. Legal entity — READ THIS BEFORE TOUCHING THE LEGAL PAGES

**Registered 2026-08-03 as ინდივიდუალური მეწარმე ნინო ჯაჭვლიანი**, ID
62009004530, ქ. თბილისი, ეკა ბეჟანიშვილის ქუჩა №104. Nino is a co-creator; she
is the registered entrepreneur.

**An ინდივიდუალური მეწარმე is NOT a legal person.** There is no company. The
correct identification is the individual's name + "ინდივიდუალური მეწარმე" + ID
number, as now appears in `PrivacyPolicy.tsx` and `TermsOfUse.tsx`.

"SpeakBusy" is a **trade name**, not a registered entity. Never write
"SpeakBusy LLC" or "შპს SpeakBusy".

- **Personal, unlimited liability.** Converting to an შპს becomes worth pricing
  once there is real revenue.
- **Small business status (1% turnover tax) is a SEPARATE application**, capped
  at 500,000 GEL/yr. Without it the rate is 20%. VAT becomes mandatory above
  100,000 GEL in any rolling 12 months.

Full research: `IE_LEGAL_ALIGNMENT.md`.

---

## 10. Payments (REAL, via Flitt)

Price **13.99 GEL/month**. Raised from 8.99 on 2026-08-02 after measuring cost:
~4.7c per AI interview.

### Provider

**Flitt** (`pay.flitt.com`), TBC's e-commerce partner. Merchant 4058017, live
mode. NOT TBC's own Checkout API.

Secrets: `FLITT_MERCHANT_ID`, `FLITT_PAYMENT_KEY`, `SITE_URL`, `CRON_SECRET`.

### The signature, and the thing that cost days

SHA1 of the payment key, then every NON-EMPTY value sorted by KEY name, joined
with `|`. Empty values omitted including their separator. Lowercase hex.

**`subscription: "Y"` + `recurring_data` DOES NOT WORK on this merchant.** Every
encoding was tried; all return `1014 Invalid signature`. Proven not to be a
signature fault. **Do not retry this.** The route that works:

- **`required_rectoken: "y"`** saves the card and returns a `rectoken`. WORKING.
- **`POST /api/recurring`** charges it later. Flitt enabled this 2026-09-22.
  **Still not verified with a real charge.**

**Amounts are in tetri.** 13.99 GEL is `1399`.

### Flow

```
subscribe -> flitt-subscribe -> Flitt checkout page (card never touches our site)
          -> flitt-callback (PUBLIC, verify_jwt=false, signature-verified)
          -> subscriptions row + business_state.mockPro = true
          -> payment-confirmation email
```

`mockPro` is the real premium flag. `BusinessGate` clears it when the period
lapses.

### Regulation (National Bank of Georgia)

- **One-time consent** describing the terms, stored verbatim in
  `subscriptions.consent_terms` with a timestamp.
- **Exact amount and day** stated.
- **Notice at least 4 weeks before each charge**, satisfied by the
  payment-confirmation email on the day of each payment.
- Trials of 7 days or fewer are exempt from the trial-reminder rule.

---

## 11. Where things stand (2026-09-27)

### ⚠️ NEXT, and blocking launch: `daily-tasks` is NOT SCHEDULED

Lovable confirmed on 2026-09-27: *"nothing is scheduled. The cron job list is
empty."* That one function does **both** renewal charges and the day-2/5/7 trial
emails, which means **no trial email has ever been sent to anyone.**

The corrected `daily-tasks/index.ts` (delivered 2026-09-26) fixes three things
and needs a redeploy before it is scheduled:
- The renewal due-query was `current_period_end <= now()`, so a subscription
  ending in the evening was charged the *next* day, drifting a day later every
  month. Now a "ends any time today (Tbilisi)" window.
- The email percentage divided by 980 and counted "ადვილი" as known. Now mirrors
  `vocabTotalFor` and confidence only.
- Reminders matched the trial day exactly (`dayNum === 2`), so one missed run
  dropped that reminder forever. Now `>=`, guarded by the sent-list.

Then: `WHEN_FLITT_CONFIRMS.md` step 1 (backdated renewal test) → only if it
passes, schedule daily at 07:00 Tbilisi with the `x-cron-secret` header.

### DONE since 2026-09-22

**The ბიზნესმენი ladder can now reach 100%.** `summarizeVocabProgress` divides
by `vocabTotalFor(fields, goals)` — core + the learner's own fields — not by all
980. The remaining open question is unchanged: what the completion experience
*is* (Olegi wants "შენ დაეწაფე სიტყვების 100%ს!!"), telling users vocabulary
survives cancellation, and recommending the next app at 100%.

**The trial-ended screen showed everyone 0 words / 0%.** It queried a
`vocabulary_progress` table that does not exist in this project and divided by
1500; the query threw, the catch swallowed it. Now uses `loadProgress` +
`summarizeVocabProgress`. Verified live: "21 სიტყვა დაიწყე / 0.5%". *Open
question for Olegi: 0.5% is honest but weak on a paywall — drop the percentage
or show the ვიცი count instead?*

**The modules page linked to a 404** (`/path/business/scenarios`, the biggest
card, badged "ახალი"). Card removed; the English "Oops! Page not found" 404 page
translated. A dead-link scan over all `to=` / `navigate()` targets vs the router
now comes back clean.

**Free tier verified end to end (2026-09-27)**: daily cap holds, review sessions
bypass it and don't count, all three AI modules correctly locked, free session
is 17 questions vs 22–27 premium. The cap screen now also offers the review
session — it previously offered only "come back tomorrow" and an upsell, next to
something the learner was allowed to do all along.

**Interview has an exit.** There was no way out once started. `გასვლა` in the
header, with honest copy either way: before the first answer nothing has been
charged; after it, the transcript is checkpointed and resuming costs no second
session. Round-trip verified.

**Copy and localisation**: "Score:"/"1 pt"/"Debrief"/"Improve/Simpler/More pro/
Shorter"/"Read aloud" all Georgian now; `"გამოგვიგზავნეთ დადასტურების ბმული ,"`
on the signup confirmation screen (wrong verb — *you sent us* — plus a floating
comma) rewritten; the raw lowercase `beginner` in the self-intro header now uses
`LEVEL_LABELS`; `„Streak"` in proper Georgian quotes; the unlabelled gold bar
under the streak now says `კიდევ N დღე → M-დღიანი „Streak"`; the focus card said
"დღეს 21 სიტყვა იცი" when it meant every word ever touched, now
"ლექსიკონში N სიტყვა გაქვს".

**Offline tolerance** verified live by killing the network mid-session: 6 writes
parked in `speakbusy:pending-writes`, all flushed on reconnect.

### After that
1. **Real users.** Analytics are instrumented and still measuring almost nothing.
2. Analytics review: funnel, D1/D7/D30, per-user cost.
3. Decide the 6 Georgian collisions (section 4) and the პროფესიული rule (section 3).
4. Tiki the cat: confirm the per-user visit key and yawn cadence shipped; he was
   reported missing on an iPhone (first suspect: `prefers-reduced-motion`).
5. Remaining `OPEN_QUESTIONS.md`: lapsed-user re-engagement, accessibility.

---

## 12. Removed / deleted

**Legacy routes**: `/lesson`, `/summary/:id`, `/vocabulary`, `/mistakes`,
`/progress`. `/dashboard` was KEPT — a live redirect to `/path/business`.

**Dead frontend files**: `Lesson.tsx`, `Vocabulary.tsx`, `Summary.tsx`,
`SpeakButton.tsx`, `EmailsModule.tsx`.

**Edge functions deleted** (all orphaned, all holding live API keys): `tts`,
`level-reaction`, `ai-tutor`, `openai-text-to-speech`, `speech-to-text`,
`business-emails`.

**Emails module** deleted entirely.

**36 AI-ingested pseudo-vocabulary rows purged** from `business_vocab_progress`.
`ingestExternalPhrases()` harvested phrases from transcripts, bypassing every
quality gate — the source of the long-unexplained "explore" question. The call
site is commented out.

**Scenarios module** removed from the modules list (2026-09-27) — the route no
longer exists.

---

## 13. Live edge functions

| Function | Auth | Purpose |
|---|---|---|
| `business-docs` | JWT + quota | CV, cover letter, bio |
| `business-self-intro` | JWT + quota (generation only, NOT rewrites) | Self-introduction |
| `business-interview` | JWT + quota on first reply | Interview simulation |
| `business-resume-parse` | JWT, 5/day rate limit | CV parsing. Deliberately free |
| `delete-account` | JWT, service role | Clears 21 locations + auth user |
| `flitt-subscribe` | JWT | Creates the payment, saves the card |
| `flitt-callback` | **PUBLIC**, signature-verified | Grants premium |
| `flitt-cancel` | JWT | `cancel` or `delete_card`, reaches Flitt |
| `daily-tasks` | `x-cron-secret` | Trial reminders + renewals. **NOT SCHEDULED** |
| `send-transactional-email` | service role | Renders templates, enqueues |
| `process-email-queue` | service role | Delivers, retries, rate limits |
| `generate-word-audio` | service role | Ops only |

### Email

React Email components in `_shared/transactional-email-templates/`, registered
in `registry.ts`. Send with `sendAppEmail({ templateName, ... })`.

**Template names use HYPHENS.** `payment_confirmation` instead of
`payment-confirmation` fails silently — the lookup 404s and `sendAppEmail`
swallows errors by design.

Templates: `payment-confirmation`, `subscription-cancelled`, `trial-day-2`,
`trial-day-5`, `trial-ended`.

---

## 14. Working principles that have proven necessary

**Keep it simple.** Prefer the smallest change that does the job, and short,
plain Georgian copy with no em dashes (—) and no long explanations. Use
"Streak", never "სერია".

**Verify the tool before trusting the tool.** The contrast scanner had two blind
spots — it ignored `via-` gradient stops and sampled colours mid-transition —
which both hid real bugs and invented false ones. When a scan comes back clean,
ask what it structurally cannot see.

**Check the fix is actually live before measuring it.** Committed ≠ published.

**Don't assert an integration's URL from the shape of the stack.** Claude gave
the Supabase callback for a flow that runs through Lovable's own broker. Read
the integration code, or the provider's own dashboard.

**Think before asserting numbers.** Claimed "paid users are capped at 12 words a
day" (wrong) and argued three times that the 20-word trial gate was unreachable
(wrong). Read the code, then answer.

**Ask before assuming, especially about state.** When something is checkable,
check it — `/auth/v1/settings` answered two questions in one request that had
been open for weeks.

**Distinguish what you caused from what the code does.** Duplicate session rows
were reported as a code bug; they were caused by test automation clicking fast.
The guard was still worth shipping, but the report needed correcting.

**Upload the live file before editing it.** Olegi's habit of sending the current
version first has caught real losses at least five times.

**A misleading error is still evidence.** Flitt returned "Invalid signature" for
a problem that was not the signature.

**Probe rather than guess in sequence.** Testing five encodings in one request
beat three more round trips.

**Leftover dev switches become production holes.** `mockPro` was harmless until
it started meaning "has paid".

**Verify against the schema, not the frontend.** The first `delete-account`
covered 10 tables; the schema had 21.

**Measure claims before making them.** "113,680 questions, zero issues" was
inflated; a corrected audit immediately found a real bug.

**Olegi finds real bugs by using the app.** When he reports something, look for
the whole CLASS of that error, not the single instance — he reported one dark
lexicon tab, and the same token misuse turned out to be in six places.

**A wrong test that fails is far better than a wrong test that passes.**

**Don't patch symptoms in data.** Shortening "Action item" to "Action" fixed a
display bug and created an audio mismatch.

**Push back is productive.** Olegi twice rejected a shallow diagnostic and
demanded depth; both times it surfaced something real.