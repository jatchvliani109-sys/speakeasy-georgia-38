# SpeakBusy — CLAUDE CONTEXT (authoritative status)

Last updated: 2026-07-31. Source of truth for any new Claude conversation.
Where older docs or messages disagree, this wins.

## What SpeakBusy is

Business-English learning app for Georgian professionals. **Vocab-first**: daily
vocabulary sessions are the core loop, everything else supports it. Solo
non-technical founder (Olegi), phone-based workflow: Claude writes complete file
replacements → paste into GitHub → Lovable auto-deploys.

## Stack — IMPORTANT CORRECTION

- React/TS/Vite/Tailwind. Repo: `jatchvliani109-sys/speakeasy-georgia-38`
- **Backend is Lovable Cloud**, which provisions Supabase project
  `hmpwjhzrmfyapijikkuc`. **Olegi has NO supabase.com dashboard access to it** —
  the project belongs to Lovable's org, not his account. Everything (SQL editor,
  users, logs, edge functions, secrets, emails, storage) is reached through
  **Lovable → Cloud**. A personal Supabase project (`nlvjahbosrflbvryrecf`)
  exists but is EMPTY and unused — a costly detour, do not configure it.
- Edge functions require an explicit Lovable redeploy.
- OpenAI via edge functions. 980 word MP3s + 54 dialogue MP3s in `word-audio`.
- Auth email: **Lovable Emails**, sending from Olegi's own domain. Four Georgian
  HTML templates installed (confirm signup, reset password, magic link, change
  email). Resend account exists and is kept for future non-auth mail.

## GEORGIAN RULE (non-negotiable)

"პროფესიული" is ALWAYS WRONG → "პროფესიონალური". Scan every file, every
delivery. Also enforced inside AI prompts. The ONLY legitimate occurrence is
inside the prohibition rule itself, which must name the word.

Also settled: **"viral" → "პოპულარული (სწრაფად გავრცელებული)"**, never
"ვირუსული" (the medical sense). Caught by Olegi; the bug was in the original
bank, not just the enrichment.

## Vocabulary system (the core product)

- **980 words**, all enriched: second example (EN+KA), Georgian explanation, and
  two collocations each. 100% coverage, no gaps.
- **14 question types**: mc_meaning, fill_blank, tr_en_to_ka, tr_ka_to_en,
  true_false, sentence_correct, georgian_mistake, listening, type_word,
  context_cloze, odd_one_out, synonym_match, collocation, definition_match,
  sentence_definition.
- **Sessions are budgeted in QUESTIONS, not words** (~21–23 premium, ~19 free).
  A new word yields 2 questions and a review word 1, so a fixed word count still
  swung the quiz between 22 and 32.
- **Generator pools rotate from a random offset.** Previously indexed by word
  position, so generators past index (wordCount−1) never fired —
  sentence_definition was effectively unreachable.
- **Distractors are plausibility-ranked** (same topic cohort, word class, length)
  with a KA-collision guard so two options can never share a Georgian meaning.
- **Blanking uses EXACT word forms**; highlighting (sentence_definition) uses an
  inflection-tolerant matcher. Mixing these caused two shipped bugs:
  "action item items" and "Nino is chair today's meeting".
- Duolingo-style **mistake requeue**: a missed question is appended to the end of
  the session exactly once; the progress bar grows with it.
- **Session resume** via localStorage snapshot (24h expiry, version-stamped),
  cleared only when results actually save.
- Rotating **business-pun results messages** (43 across four score tiers). Streak
  banner fires only on the first completed session of the day.
- Progress saving **retries once and shows a Georgian toast on failure**; the
  resume snapshot survives a failed save.

## Security / infrastructure (audited 2026-07-31)

- **RLS verified on all 22 tables**, each with at least one policy.
- Indexes added on `user_id` for the five tables that lacked them.
- **Account deletion** (`delete-account` edge function) clears **21 locations**
  plus the auth user, verified with zero orphans. `suppressed_emails` is
  deliberately RETAINED — deleting it would let a bounced or complained address
  be emailed again.
- **AI quota is server-enforced**: `consume_ai_session` / `refund_ai_session` SQL
  functions (SECURITY DEFINER, row-locking, service_role only). Edge functions
  claim before generating and refund on failure. The client copy in `state.ts` is
  now READ-ONLY — if it also incremented, every use would cost two sessions.
  Client and server week keys must produce identical strings or the counter
  resets forever; verified hourly across 14 days.
- **Code splitting**: public pages eager, all authenticated routes lazy. The
  vocab bank (144 KB gzipped) previously downloaded for every visitor because
  BusinessHome imports vocabEngine.
- Seven word MP3s were silently empty (byte-identical at 5,760 bytes) and were
  regenerated. Future bulk generation should reject files under ~8 KB.

## Monetization (MOCK ERA — blocked on ინდ. მეწარმე registration)

- Price 8.99 GEL/month. Free: 1 AI session/week. Premium: 7/week, unified pool,
  Monday reset.
- `mockPro` flag in business state. **Premium cancel is still a mock** — it flips
  the local flag and must reach the payment provider once payments exist.

## Pending board

1. **Payments** — processor availability in Georgia still UNVERIFIED.
2. **Legal** — Privacy/Terms need the registered entity name and a real
   payments/subscription section. Georgian convention: "წესები და პირობები",
   "კონფიდენციალობის პოლიტიკა".
3. **Login/signup checkbox rendering bug** — `Auth.tsx` not yet reviewed.
4. **Add-to-home-screen prompt** for mobile (iOS + Android, mobile-only, hidden
   once installed).
5. **Borrowing terms awaiting Olegi's verdict**: ჰედჰანთინგი, ფრიმიუმ,
   ინფლუენსერი, ფიშინგი, სპრინტი, სტენდაპი, ფლაივილი, კოჰორტი, სქრამი, კანბანი,
   პაიპლაინი, ცივი ზარი / თბილი ლიდი.
6. **Favicon** — SVG delivered, still needs PNG sizes.
7. Error handling on remaining write paths (InterviewModule has ~12 unchecked
   Supabase calls).
8. **Dev RESET button removal — ABSOLUTELY LAST.**

## Removed 2026-07-31

Legacy routes from the pre-SpeakBusy lesson app deleted from `App.tsx`:
`/lesson`, `/summary/:id`, `/vocabulary`, `/mistakes`, `/progress`. Nothing
linked to them and nothing writes to the `lessons` table they read. The page
files remain in the repo but are unrouted. `/dashboard` was KEPT — it is a live
redirect to `/path/business`.

## Working style that has proven necessary

- Verify against the schema, not against frontend code. The first
  `delete-account` covered 10 tables because that is all the frontend
  referenced; the schema had 21.
- Claims need measurement. "113,680 questions, zero issues" was inflated and
  masked four untested question types; a corrected audit (9,207 distinct
  type × word combinations) found the real bug.
- Olegi finds real bugs by using the app. Take those reports seriously and look
  for the whole class, not the single instance.