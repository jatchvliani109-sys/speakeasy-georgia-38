# Dark mode: replace the pink accent with steel + gold

Dark mode currently borrows the light theme's wine colour, which turns rosy-pink on a dark background (headings, links, card titles, the premium banner, the wordmark). Replace that with a cool steel/platinum secondary while gold stays the lead accent. Light mode is untouched.

## New dark palette

- Background charcoal `#141416`, surfaces `#1E1E21` (unchanged)
- Lead accent: gold `#C9A84C`
- Secondary accent: steel/platinum `#8592A6` (replaces the pink), with a deeper `#6B7A8F` for hovers and a very dark steel for tinted backgrounds
- Text: cream `#EFE7D6`, muted grey-blue

## Where it shows up

- Page headings and section titles: steel instead of pink
- Card titles, module links, inline links, arrows: steel, gold on hover
- Premium/trial banner: deep steel-to-charcoal band with a gold star, instead of the pink band
- Wordmark "Busy" and the top-bar highlight: steel
- Hero band and gradients on the landing page: charcoal into steel with a gold edge, no rose
- Danger red and success green stay as they are

## Technical notes

Edit only the `.dark` block in `src/index.css`: repoint `--wine`, `--wine-deep`, `--wine-soft`, `--accent`, and the dark `--gradient-hero` / `--gradient-accent` to the steel ramp; keep the gold, ink, panel, danger, and sage tokens as-is. No component files change, since screens already read these tokens. Then re-screenshot home, vocabulary, interview, profile, auth, and the landing page in both themes to confirm contrast and that light mode is unchanged.
