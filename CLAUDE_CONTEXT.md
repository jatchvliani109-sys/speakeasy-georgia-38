Done and verified:

Email module: 28 pre-made lessons (7 topics × 4 levels) in emailLessons.ts, Georgian-audited. Hybrid architecture: pre-made lessons (free), gpt-5.4 for first feedback, cheap verdict retries with pre-written Georgian (feedbackMessages.ts).
Vocab: vocabBank.ts audited (114 fixes) + expanded to 990 words, zero duplicate keys, zero Georgian collisions. vocabEngine.ts redesigned (free = 6 new/session, paid = decreasing daily budget, double-exposure for new words, 3-layer review).
Pre-generated word audio: all 980 words → MP3s in Supabase Storage bucket word-audio, served free. ReadAloudButton tries stored MP3 → live TTS fallback.
Streak bugs fixed (real numbers, readable burgundy/charcoal colors).
Interview module: 3 written modes (real = resume+pasted posting, matched = AI-invented posting, random = 10 pre-made role cards in roleCards.ts). Model split: session/debrief gpt-5.4, loop gpt-4o, verdict gpt-5-mini. Debrief includes model answers for 2 weakest responses.
Privacy Policy + Terms of Use (Georgian) as pages. Forgot-password added. Logo designed (charcoal+gold S monogram), favicon/meta fixed — speakbusy.com shows correct branding.

In flight / to confirm:

Email feedback "invalid feedback" bug: patched business-emails/index.ts with auto-fallback gpt-5.4 → gpt-4o. Needs deploy confirmation + check logs whether gpt-5.4 is dead (if so, same fix needed in business-interview).
Login/signup checkbox bug fix (Lovable).
Duplicate onboarding question removal + first-name personalization (Lovable prompts given).

Queued:

Remove live read-aloud buttons everywhere except vocab (save TTS tokens).
Remove dev "reset progress" button — LAST, before launch.

Waiting on external:

Payments (#9) — pending ინდ. მეწარმე / LLC registration. After it: update Privacy + Terms entity name + payments section.
Post-launch: Google/Apple sign-in, native iOS/Android (PWA wrap), ads decision (leaning no).

Voice interview (Phase 2, post-payments): real-resume+posting only. Cost ≈0.9 GEL/session. Plan: "unlimited written + 1 voice/week" at 9.99 GEL.