# Dark mode for SpeakBusy (full version)

Add a proper light/dark theme across the whole app, with a toggle in the top navigation that remembers the user's choice and follows the phone's system setting by default.

## What the user gets

- A sun/moon toggle in the top bar, available on every screen.
- Three states: follow system, always light, always dark. Choice is saved on the device and survives reload.
- No white flash on load — the theme is applied before the first paint.
- Dark theme keeps the SpeakBusy identity: deep charcoal surfaces, gold as the lead accent, burgundy as a supporting accent, cream text.

## Scope of the visual work

Roughly 1,100 hardcoded colour usages across ~30 screens are baked in as fixed hex values, so they ignore any theme. Each one gets converted to a theme-aware token. Heaviest screens:

- Vocabulary, Interview, Document Helper, Home, Self-introduction (the bulk of the work)
- Profile, My Lexicon, landing page, sign-in, scenarios, resume upload
- Trial/premium screens, setup, placement test, reassessment, plan, modules
- Shared pieces: navigation, add-to-home-screen prompt, read-aloud button, locked-AI card, auth gate

The dark palette itself already exists in the stylesheet, so no new colour design is needed — but it will be reviewed and tuned (contrast, gold on charcoal, success/error states, gradients and shadows) once screens are converted.

## Order of work

1. Theme plumbing: theme provider, persisted preference, system detection, pre-paint script, toggle in the navigation.
2. Token pass over the shared design layer: gradients, shadows, success/warning colours, card surfaces, so dark equivalents exist for everything components use.
3. Screen-by-screen conversion, grouped: home and navigation → vocabulary → interview → documents and self-introduction → profile and lexicon → onboarding, trial, premium, legal, auth.
4. Visual review of every screen in both themes, fixing contrast and any element that reads wrong in dark.

## Technical notes

- Tailwind is already configured with `darkMode: ["class"]`, and `.dark` overrides exist in `src/index.css`; the toggle adds/removes the class on `<html>`.
- Preference stored in `localStorage` (`theme` = `light` | `dark` | `system`), with a small inline script in `index.html` to set the class before React mounts.
- Conversion replaces arbitrary utilities (`bg-[#1C1C1E]`, `text-[#F8F5F0]`, `border-[#E4E2DF]`, etc.) with semantic tokens: `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`, `text-accent`, and so on. Where a colour has no matching token (e.g. gold-on-charcoal chips, Giorgi character states, quiz feedback colours), new semantic tokens are added to `index.css` and `tailwind.config.ts` with light and dark values.
- Extra dark values added for `--gradient-hero`, `--gradient-soft`, `--gradient-accent`, `--gradient-card`, `--shadow-soft/warm/card`, `--success`, and body background.
- Inline `style` colour values and SVG assets (`logo.svg`, `s-icon.svg`) that assume a light background are handled with `currentColor` or theme-aware wrappers.
- No backend, data, or business-logic changes.

## Out of scope

- Redesigning any layout or copy.
- Per-account theme sync across devices (device-local only).
