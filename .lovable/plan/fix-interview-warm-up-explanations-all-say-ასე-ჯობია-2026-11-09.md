# Fix: interview warm-up explanations all say "ასე ჯობია"

## Problem
In the interview warm-up, every answer option shows the same line "ასე ჯობია" — even under the weaker option — so learners get no real feedback and the wrong answer looks correct.

## Fix
Bring the warm-up instructions in line with the mini-quiz ones that already work:
- Better option: Georgian label picked from the approved praise list, plus a short English reason.
- Weaker option: Georgian label picked from the approved issue list, plus a short English reason.
- Safety net: if the AI still writes a label that isn't on the list, fall back to a label that matches the option (issue label for the weaker one, praise label for the better one) instead of always praise.

No screen changes needed — the warm-up already shows the English reason when it's present.

## Technical details
- `supabase/functions/business-interview/index.ts`
  - Session prompt `warmUp` options (~line 395): `whyKa` = one label copied exactly from PRAISE_LIST / ISSUE_LIST; add `"why": "1 short English sentence"`.
  - `clampTags`: when an object has `isBetter === false`, use ISSUE_TAGS[0] as the fallback for `whyKa`.
- Redeploy `business-interview`; resolve the Project monitoring finding after checking a session response.
