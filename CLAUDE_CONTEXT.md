# SpeakBusy — CLAUDE CONTEXT (authoritative status)
Last updated: 2026-07-18. This file is the source of truth for any new Claude
conversation. Older docs/messages contradict it → this wins.

## What SpeakBusy is
Business-English learning app for Georgian professionals. **Vocab-first**:
daily vocabulary sessions are the core loop; everything else supports it.
Solo non-technical founder (Olegi), phone-based workflow:
Claude writes complete file replacements → paste into GitHub → Lovable
auto-deploys. **Edge functions need explicit Lovable redeploy.**

## Stack
- React/TS/Vite/Tailwind → Lovable Cloud. Repo: jatchvliani109-sys/speakeasy-georgia-38
- Supabase (ref hmpwjhzrmfyapijikkuc): auth, DB, storage, edge functions
- OpenAI API (gpt-4o everywhere; interview uses gpt-5.4 w/ gpt-4o fallback)
- 980 word MP3s + 54 dialogue MP3s pre-generated in `word-audio` bucket

## Design system — "quiet luxury" (repainted 2026-07-18)
- Surfaces: neutral #F5F4F2 bg, white cards, #E4E2DF borders
- Dark cards: #232323→#161616 gradients (mission, premium, milestone)
- Burgundy #5C1A2E = TEXT/BORDER ACCENT ONLY (never large surfaces)
- Gold #C9A84C = rewards, premium, CTAs on dark
- Brand mark (logo/favicon/ads) stays burgundy+gold — intentional split
- On dark cards: informational text = light #F5F4F2/70-85, celebratory = gold

## GEORGIAN RULE (non-negotiable)
"პროფესიული" is ALWAYS WRONG → "პროფესიონალური". Scan every file, every
delivery. Also enforced inside AI prompts (business-docs, business-self-intro
system prompts forbid it). 36+ instances eliminated to date.

## Monetization (MOCK ERA — real payments blocked on ინდ. მეწარმე registration)
- Price: **8.99 GEL/month** (final; ad slides may still say 6.99 — Olegi updates)
- Free forever: vocab 1 session/day, scenarios, notebook, streak (zero serve cost)
- Premium: unlimited vocab + **7 AI sessions/week** unified pool
- **Weekly AI budget**: ALL AI features share one pool (any interview mode,
  any document generation, self-intro generation). Free = 1/week. Resets Monday.
  Client-enforced via state blob (mock era); moves server-side at payments build.
  Future tier idea (remembered): sell a bigger weekly pool.
- Mock premium: `mockPro` flag in business state JSON; ⭐ page at
  /path/business/premium with placeholder unlock. Real build swaps unlock for
  payment + server `is_pro`; comp accounts for ~10 family/friends via is_pro.
- Interview costs are the expensive unit (~$0.05-0.10); docs ~$0.02. 7/week
  worst case ≈ $1.50-3/mo vs $3.33 revenue — safe. NO donate button (decided).
- Trial: 7-day everything-unlocked planned; style (card vs account-age) TBD.

## Product state (all live unless noted)
- **Vocab**: 990-word bank; free 6 new + ≤8 review, paid budget 30→floor 10,
  new cap 12; question types incl. listening (reveals EN word after answer),
  type_word, context_cloze; adaptive format tier; claim fast-track; mastery
  needs 2+ production correct. **Wrong answers due IMMEDIATELY** (same-day
  repeat sessions drill mistakes first).
- **Scenario-of-the-day**: every 2nd completed session auto-themed
  (totalCompleted % 2 === 1), curriculum order, themed-review fallback.
  UI: gold-bordered intro block + persistent 🎬 chip during quiz + dashboard
  preview (incl. done-state for premium). Browse page exists but UNLINKED
  (paradox of choice) — route /path/business/scenarios alive for deep links.
- **Streak**: 5-tier escalating card; freeze system (2 banked, auto-consume,
  +1 per 7 days cap 2, persisted in state JSON incl. freezeDays); ❄ markers;
  decluttered card (number, msg, dots, bar, tiny ❄N suffix).
- **Session-complete celebration**: StreakTick banner, honest before/after calc.
- **Interview**: 3 modes; real = premium-gated; realism via two-stage plan
  extraction; all modes consume AI budget at startSession; sessions stamp mode.
- **Documents assistant**: 5 tools (email, email_fix, cover_letter,
  resume_improve, bio) + AI adjust on saved docs — all budget-gated via
  callDocsWithBudget. ?tool= deep links from menu. Resume prefills from
  profile.rawResumeText.
- **Self-intro**: generation consumes budget (rewrites ride free); device-voice
  TTS only.
- **Audio policy**: NO paid live TTS anywhere. Stored MP3 → device
  SpeechSynthesis (iOS-hardened: delayed speak, global utterance ref, resume,
  safety timeout). openai-text-to-speech fn orphaned.
- **Nav**: GlobalNav = core four inline (desktop) + hamburger on ALL
  breakpoints with full list (6 features, premium, profile, logout). Dashboard:
  no modules section; მეტი rows: გასაუბრება, documents, assessment, plan,
  premium. Premium banner above daily focus (hidden when premium). Premium
  users get "კიდევ ერთი სესია ⭐" on done mission card.
- **Notebook (MyLexicon)**: answered-only visibility (phantom-word root cause
  ingestExternalPhrases email branch REMOVED), mastery tabs w/ counts.
- **Landing (Index)**: vocab-first hero "დღეში 5 წუთში", 6-feature grid.
- **Onboarding**: placement test → name step (auto-username filtered) → plan.

## Edge functions (supabase/functions)
- business-interview: gpt-5.4→gpt-4o fallback, interviewPlan realism. LIVE.
- business-docs: gpt-4o, 6 actions, Georgian rule in prompt. NO fallback (queued).
- business-self-intro: gpt-4o, Georgian rule in prompt. NO fallback (queued).
- business-resume-parse: gpt-4o + Lovable gemini fallback. Outside AI budget.
- Orphan suspects (verify refs then delete): ai-tutor, level-reaction, tts,
  business-emails, openai-text-to-speech; speech-to-text maybe used by SpeakButton.

## Emails module: FULLY REMOVED (UI, routing, queries, ingestion). Only the
dev RESET handler touches business_email_sessions (intentional).

## Pending board
1. Olegi confirmations: scenario 🎬 in 1 of 2 back-to-back sessions; sounds
   audible; read-aloud stable; resume prefill filled; sister palette verdict;
   landing page ACTUALLY deployed (was silently missed once).
2. Lovable searches: project-wide პროფესიული; orphan fn references; auth
   autocomplete prompt.
3. Buildable: gpt-4o fallback for business-docs + business-self-intro.
4. Batch D (post-registration): processor (Georgia availability UNVERIFIED —
   check early), server is_pro, real trial, comp accounts, server-side AI
   budget, Privacy/Terms entity + payments section.
5. Native phase (archived): Capacitor wrap, stores ($25/$99), push notifications.
6. **Dev RESET button removal — ABSOLUTELY LAST.**