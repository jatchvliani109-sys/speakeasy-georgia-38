# SpeakBusy — CLAUDE CONTEXT (authoritative status)

Last updated: 2026-09-08. Source of truth for any new Claude conversation.
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

**This is NOT a find-and-replace rule.** It was treated as one for months and
that was wrong.

**პროფესიული is a real Georgian word** meaning *profession-related* (as in
პროფესიული განათლება, vocational education). It is only incorrect when used to
mean *professional* in the polished / skilled sense — there the word is
**პროფესიონალური**.

Judge each instance in context, and when unsure ASK OLEGI — he is the native
speaker and the final authority.

Examples he approved as CORRECT and which must not be "fixed":
  "500+ პროფესიული სიტყვა და ფრაზა"  ·  "პროფესიული ლექსიკა"
  "შენს პროფესიულ გამოცდილებას"      ·  "პროფესიული ინტერესები"

Examples that were genuinely wrong (now fixed):
  "აირჩიე ყველაზე პროფესიული პასუხი" (= most polished answer)
  "პროფესიული ტონი"  ·  "პროფესიული ბიო"  ·  "პროფესიული წერა"

Also: a naive grep for the exact string misses every declined form
(პროფესიულ, პროფესიულად). Search the STEM. Olegi has since said this is low
priority and not worth stressing over — do not re-litigate it unprompted.

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

## 6. Legal entity — READ THIS BEFORE TOUCHING THE LEGAL PAGES

**Registered 2026-08-03 as ინდივიდუალური მეწარმე ნინო ჯაჭვლიანი**, ID
62009004530, ქ. თბილისი, ეკა ბეჟანიშვილის ქუჩა №104. Nino is a co-creator; she
is the registered entrepreneur.

**An ინდივიდუალური მეწარმე is NOT a legal person** (მეწარმეთა შესახებ, art. 2).
There is no company. Earlier versions of these documents said "replace the
placeholder with the registered entity name once registration completes" — that
instruction was **wrong**, because no entity name exists. The correct
identification is the individual's name + "ინდივიდუალური მეწარმე" + ID number,
and that is what now appears in `PrivacyPolicy.tsx` and `TermsOfUse.tsx`.

"SpeakBusy" is a **trade name** (სავაჭრო სახელწოდება), not a registered entity.
Never write "SpeakBusy LLC" or "შპს SpeakBusy" anywhere — it would name a
company that does not exist.

Two consequences worth carrying forward:

- **Personal, unlimited liability.** An ინდ. მეწარმე answers for business
  obligations with all personal property. Given the app stores CVs, takes
  consumer payments and sends data abroad, converting to an შპს becomes worth
  pricing once there is real revenue.
- **Small business status (1% turnover tax) is a SEPARATE application** to the
  Revenue Service, capped at 500,000 GEL/yr. Registration alone does not grant
  it; without it the rate is 20%. VAT registration becomes mandatory above
  100,000 GEL of taxable turnover in any rolling 12 months.

Full research: `IE_LEGAL_ALIGNMENT.md`.

## 7. Payments (REAL, via Flitt)

Price **13.99 GEL/month**. Raised from 8.99 on 2026-08-02 after measuring cost:
~4.7c per AI interview, so a maximum-usage subscriber costs roughly 5 GEL/month.
Testers consistently read 8.99 as too low for a career product.

### Provider

**Flitt** (`pay.flitt.com`), TBC's e-commerce partner. Merchant 4058017, live
mode. NOT TBC's own Checkout API: different credentials, different signature.

Secrets: `FLITT_MERCHANT_ID`, `FLITT_PAYMENT_KEY`, `SITE_URL`, `CRON_SECRET`.
The "credit payment key" is for payouts and is deliberately NOT stored.

### The signature, and the thing that cost days

SHA1 of the payment key, then every NON-EMPTY value sorted by KEY name, joined
with `|`. Empty values are omitted including their separator. Lowercase hex.

**`subscription: "Y"` + `recurring_data` DOES NOT WORK on this merchant.** Every
signature encoding was tried, including Flitt's own documented example verbatim;
all return `1014 Invalid signature`. Proven not to be a signature fault: sending
`recurring_data` while EXCLUDING it from the signature produces a string
identical to a working plain payment, and still fails.

**Do not retry this.** The route that works is different:

- **`required_rectoken: "y"`** on the checkout request saves the card and
  returns a `rectoken`. A plain scalar, so it signs cleanly. CONFIRMED WORKING.
- **`POST /api/recurring`** charges that token later. All scalars.
  **Requires Flitt to enable it in production** (their docs say so explicitly).

So SpeakBusy does not use Flitt's scheduler. It saves the card and charges it
monthly itself, via `daily-tasks`.

**Amounts are in tetri.** 13.99 GEL is `1399`. Getting this wrong charges 1,399.

### Flow

```
subscribe -> flitt-subscribe -> Flitt checkout page (card never touches our site)
          -> flitt-callback (PUBLIC, verify_jwt=false, signature-verified)
          -> subscriptions row + business_state.mockPro = true
          -> payment-confirmation email
```

`mockPro` is now the real premium flag, not a dev switch. Every access check
reads it: `aiLocked()`, `hasUnlimitedVocab()`, `isTrialActive()`. The callback
sets it; `BusinessGate` clears it when the period lapses.

### Regulation (National Bank of Georgia)

Binding on merchant-initiated recurring payments:

- **One-time consent** describing the terms. The checkbox on BusinessPremium;
  terms stored verbatim in `subscriptions.consent_terms` with a timestamp.
- **Exact amount and day** stated: "თქვენ ჩამოგეჭრებათ 13.99 ლარი ყოველი თვის N რიცხვში."
- **Notice at least 4 weeks before each charge.** Satisfied by sending the
  payment-confirmation email on the day of each payment: a monthly cycle is
  always at least 28 days, so this always clears the bar. No separate reminder,
  and no scheduler that could silently fail.
- Trials of 7 days or fewer are exempt from the trial-reminder rule.

## 8. Where things stand (2026-09-08)

### Product work since the audit

**Trial as a gift.** Offered once after setup, accepted or declined explicitly.
7 days, unlimited vocabulary, **3 AI sessions total** (not 7/week: AI output is
kept by the user, so a full allowance would reward re-registering). Guarded at
three layers, including a `trial_claims` table the client cannot write.

**AI is premium-only.** Free tier gets zero AI sessions; the trial is the only
free taste. Locked-but-visible cards on all three AI surfaces, since you cannot
want what you cannot see.

**Progress and milestones.** Weighted percentage by exact confidence level
(0.15 / 0.30 / 0.50 / 0.75 / 1.0). Mastery needs correct answers across three
separate days, so counting only mastered words showed ~1% after 18 sessions;
weighting shows ~5% for the same work. Milestones every 10% reveal one letter of
"ბიზნესმენი", which is exactly ten letters.

**Streak break recovery.** A broken streak of 3+ days is acknowledged once,
leading with what was KEPT. Deliberately not guilt: this fires at the moment of
highest churn risk.

**Themed session rotation.** Scenario sessions used `SITUATION_CLUSTERS.find()`,
which returns the first cluster with any unmastered word, and drew ONLY from
that cluster's 6-9 words. Result: the same 8 words every other session for
weeks. Now scored by remaining value, rotated, and topped up from the normal
plan.

**Read-only question review.** Answers cannot be changed; they have already fed
the scheduler.

**Onboarding.** Six mandatory screens reduced to one. Placement test optional.

### Blocked

**Flitt enabling `/api/recurring`.** Everything else is built and deployed.
See `WHEN_FLITT_CONFIRMS.md` for exactly what to do when they reply.

### Content exhaustion, decide by ~October 2026

980 words. Mastery is calendar-gated, so exhaustion is further out than a naive
estimate suggests, but still finite. Undecided:

- What happens at 100%. Currently a generic "come back tomorrow" card.
- Olegi wants a bigger completion message: "შენ დაეწაფე სიტყვების 100%ს!!"
  with "ბიზნესმენი" fully spelled.
- Tell users near the end that vocabulary stays after cancelling.
- Olegi plans similar apps for other fields. **Recommending the next app at 100%
  is the natural ending**: the completed user becomes the first customer of the
  next product rather than a cancellation.

### Next

1. **Real users.** Everything above is unvalidated by anyone but Olegi, and the
   analytics are instrumented and measuring nothing.
2. Analytics review once events accumulate: funnel, D1/D7/D30, per-user cost.
3. Remaining open questions in `OPEN_QUESTIONS.md`: lapsed-user re-engagement,
   content error follow-up, offline tolerance, accessibility.

## 9. Removed / deleted (2026-07-31 → 08-01)

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

## 10. Live edge functions

| Function | Auth | Purpose |
|---|---|---|
| `business-docs` | JWT + quota | CV, cover letter, bio |
| `business-self-intro` | JWT + quota | Self-introduction |
| `business-interview` | JWT + quota on first reply | Interview simulation |
| `business-resume-parse` | JWT, 5/day rate limit | CV parsing. Deliberately free |
| `delete-account` | JWT, service role | Clears 21 locations + auth user |
| `flitt-subscribe` | JWT | Creates the payment, saves the card |
| `flitt-callback` | **PUBLIC**, signature-verified | Grants premium. `verify_jwt=false` |
| `flitt-cancel` | JWT | `cancel` or `delete_card`, reaches Flitt |
| `daily-tasks` | `x-cron-secret` | Trial reminders + renewal charges |
| `send-transactional-email` | service role | Renders templates, enqueues |
| `process-email-queue` | service role | Delivers, retries, rate limits |
| `generate-word-audio` | service role | Ops only |

### Email

React Email components in `_shared/transactional-email-templates/`, registered
in `registry.ts`. Send with `sendAppEmail({ templateName, ... })`.

**Template names use HYPHENS.** Calling `payment_confirmation` instead of
`payment-confirmation` fails silently: the lookup 404s and `sendAppEmail`
swallows errors by design, so nothing sends and nothing is logged as wrong.

Templates: `payment-confirmation`, `subscription-cancelled`, `trial-day-2`,
`trial-day-5`, `trial-ended`.

Trial reminders carry an unsubscribe link; the gift screen states that they will
be sent, so accepting the gift is the consent.

## 11. Working principles that have proven necessary

**Ask before assuming, especially about state.** Repeatedly asserted "the
fallback is the only path that runs" after Olegi had said live mode was on. One
query would have settled it. When something is checkable, check it.

**Upload the live file before editing it.** Olegi's habit of sending the current
version first has caught real losses at least five times: the "Streak" wording,
Profile's password and delete sections, BusinessPremium's copy, and a full
TrialGift rewrite. Rebuilding from a stale copy destroys work silently.

**A misleading error is still evidence.** Flitt returned "Invalid signature" for
a problem that was not the signature. Isolating it (send the parameter, exclude
it from the signature, observe the same failure with a byte-identical signature
string) proved the error message wrong and redirected the whole investigation.

**Probe rather than guess in sequence.** After three wrong guesses at the
signature encoding, testing five encodings in one request against the live API
was faster than three more round trips, and cost nothing.

**Leftover dev switches become production holes.** The mock premium toggle was
harmless until `mockPro` started meaning "has paid". Then it was a paywall
bypass sitting in the UI.

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