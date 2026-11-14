// scripts/word-game/generate.mjs
//
// Builds every daily word-game puzzle in advance, from the app's own word bank.
// Nothing here runs on the website: it is a one-off tool. Run it again only if
// the word bank changes (node scripts/word-game/generate.mjs [enable1.txt]).
//
// It writes:
//   supabase/functions/_shared/wordGameData.ts   980 days, read only by the
//                                                edge function, so tomorrow's
//                                                answer never reaches a browser
//   public/wordlists/en-4.txt ... en-10.txt      valid English guesses for the
//                                                guess game (only when the
//                                                ENABLE word list is passed in)
//
// The script checks its own output and stops with an error instead of writing
// a broken day.

import { build } from "esbuild";
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const SEED = 20261114;

// ---------- seeded random ----------
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(SEED);
const ri = (n) => Math.floor(rnd() * n);
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = ri(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// ---------- load the bank ----------
const tmp = resolve(tmpdir(), `vb-${Date.now()}.cjs`);
await build({
  entryPoints: [resolve(ROOT, "src/pages/paths/business/lib/vocabBank.ts")],
  bundle: true, format: "cjs", outfile: tmp, logLevel: "error",
});
const BANK = createRequire(import.meta.url)(tmp).ALL_WORDS;
if (BANK.length !== 980) console.warn(`note: the bank has ${BANK.length} words, not 980`);

// ---------- word shapes ----------
/** "Book (reserve)" -> "Book", "CV / Resume" -> "Resume". */
function clean(en) {
  let s = en.replace(/\s*\(.*?\)\s*/g, " ").trim();
  if (s.includes(" / ")) s = s.split(" / ").pop().trim();
  return s.replace(/\s+/g, " ");
}
const noDash = (s) => (s || "").replace(/\s*—\s*/g, " - ").replace(/\s+/g, " ").trim();
/** The hint must not spell the answer out in English: "(Initial Public Offering)". */
function hintOf(expl) {
  return noDash(expl).replace(/\s*\([^)]*[A-Za-z]{2,}[^)]*\)/g, "").replace(/\s+([.,])/g, "$1").trim();
}

const W = BANK.map((b) => {
  const c = clean(b.en);
  const upper = c.toUpperCase();
  return {
    key: b.key,
    en: b.en,
    ka: noDash(b.ka),
    hint: hintOf(b.explanationKa),
    exEn: noDash(b.exampleEn),
    exKa: noDash(b.exampleKa),
    group: b.source === "core" ? `w${b.week}` : `f:${b.field}`,
    week: b.week ?? 99,
    guess: /^[A-Za-z]{4,10}$/.test(c) ? upper : null,
    scr: upper, // letters move, everything else stays put
    scrLetters: upper.replace(/[^A-Z]/g, "").length,
    find: upper.replace(/[\s-]/g, ""),
  };
});
const byKey = Object.fromEntries(W.map((w) => [w.key, w]));
const groups = {};
for (const w of W) (groups[w.group] = groups[w.group] || []).push(w);

// ---------- day order: an easy first two weeks, then mixed ----------
const starterPool = shuffle(W.filter((w) => w.week <= 2 && w.guess && w.guess.length >= 5 && w.guess.length <= 7));
const starters = starterPool.slice(0, 14);
const starterKeys = new Set(starters.map((w) => w.key));
const ORDER = [...starters, ...shuffle(W.filter((w) => !starterKeys.has(w.key)))];
const dayOf = Object.fromEntries(ORDER.map((w, i) => [w.key, i + 1]));

// ---------- picking a stand-in word from the same week or field ----------
const used = { guess: {}, scr: {}, find: {} };
const lastFind = {};
function pickSub(kind, day, head, ok) {
  const pool = groups[head.group].filter((w) => w.key !== head.key && ok(w));
  if (!pool.length) throw new Error(`no ${kind} stand-in for ${head.key}`);
  const scored = pool.map((w) => ({
    w,
    s: (used[kind][w.key] || 0) * 10 + (Math.abs(dayOf[w.key] - day) <= 30 ? 5 : 0) + rnd(),
  }));
  scored.sort((a, b) => a.s - b.s);
  const w = scored[0].w;
  used[kind][w.key] = (used[kind][w.key] || 0) + 1;
  return w;
}

// ---------- unscramble ----------
function greedySwaps(cur, tgt) {
  cur = cur.slice();
  const n = cur.length;
  let swaps = 0;
  const wrong = (i) => cur[i] !== tgt[i];
  for (let guard = 0; guard < 500; guard++) {
    let done = false;
    outer: for (let i = 0; i < n; i++) {
      if (!wrong(i)) continue;
      for (let j = i + 1; j < n; j++) {
        if (wrong(j) && cur[i] === tgt[j] && cur[j] === tgt[i]) {
          [cur[i], cur[j]] = [cur[j], cur[i]]; swaps++; done = true; break outer;
        }
      }
    }
    if (done) continue;
    const i = cur.findIndex((_, k) => wrong(k));
    if (i < 0) return swaps;
    const j = cur.findIndex((c, k) => k !== i && wrong(k) && c === tgt[i]);
    [cur[i], cur[j]] = [cur[j], cur[i]]; swaps++;
  }
  throw new Error("greedy did not finish");
}
function makeScramble(ans) {
  const idx = [...ans].map((c, i) => (/[A-Z]/.test(c) ? i : -1)).filter((i) => i >= 0);
  const tgt = idx.map((i) => ans[i]);
  let best = null;
  for (let t = 0; t < 400; t++) {
    const cur = shuffle(tgt);
    const right = cur.filter((c, i) => c === tgt[i]).length;
    if (!best || right < best.right) best = { cur, right };
    if (right === 0) break;
  }
  if (best.cur.join("") === tgt.join("")) throw new Error(`cannot scramble ${ans}`);
  const g = greedySwaps(best.cur, tgt);
  // Putting the letters right one place at a time, left to right, is how most
  // people will play, and that can take one swap fewer than the letters that
  // are out of place. The limit allows that, plus two spare.
  const limit = Math.max(g + 2, tgt.length - best.right - 1 + 2);
  const out = [...ans];
  idx.forEach((pos, k) => (out[pos] = best.cur[k]));
  return { start: out.join(""), limit, greedy: g };
}

// ---------- find: a snake through every cell, cut into the words ----------
function hamiltonian(w, h) {
  // start from a simple back-and-forth path, then "backbite" it into a random one
  let path = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) path.push(y * w + (y % 2 ? w - 1 - x : x));
  const nb = (c) => {
    const x = c % w, y = (c / w) | 0, out = [];
    if (x > 0) out.push(c - 1); if (x < w - 1) out.push(c + 1);
    if (y > 0) out.push(c - w); if (y < h - 1) out.push(c + w);
    return out;
  };
  const steps = w * h * 30;
  for (let s = 0; s < steps; s++) {
    if (rnd() < 0.5) path.reverse();
    const end = path[path.length - 1];
    const opts = nb(end).filter((c) => c !== path[path.length - 2]);
    const pick = opts[ri(opts.length)];
    const i = path.indexOf(pick);
    // link end -> pick, drop pick -> next, reverse the tail
    path = [...path.slice(0, i + 1), ...path.slice(i + 1).reverse()];
  }
  return path;
}
function adjacent(a, b, w) {
  const ax = a % w, ay = (a / w) | 0, bx = b % w, by = (b / w) | 0;
  return Math.abs(ax - bx) + Math.abs(ay - by) === 1;
}
/** Every set of cells along which `word` can be traced in the grid. */
function tracings(grid, w, h, word, cap = 50) {
  const sets = new Set();
  const n = w * h;
  const seen = new Uint8Array(n);
  const path = [];
  const go = (c, k) => {
    if (sets.size >= cap) return;
    seen[c] = 1; path.push(c);
    if (k === word.length - 1) sets.add(path.slice().sort((a, b) => a - b).join(","));
    else {
      const x = c % w, y = (c / w) | 0;
      const next = [];
      if (x > 0) next.push(c - 1); if (x < w - 1) next.push(c + 1);
      if (y > 0) next.push(c - w); if (y < h - 1) next.push(c + w);
      for (const d of next) if (!seen[d] && grid[d] === word[k + 1]) go(d, k + 1);
    }
    seen[c] = 0; path.pop();
  };
  for (let c = 0; c < n; c++) if (grid[c] === word[0]) go(c, 0);
  return sets;
}
function makeFind(day, head, fixed, taken) {
  // `fixed`: the day's word, when it lives in this game. `taken`: the words of
  // the day's other two games, which must not show up here as well.
  const L = fixed ? fixed.find.length : 0;
  const [w, h] = [6, 6];
  const need = w * h - L;
  const fits = (p) =>
    p.key !== head.key && !taken.some((t) => t.find === p.find) && p.find.length >= 3 && p.find.length <= 10 && /^[A-Z]+$/.test(p.find);
  const own = groups[head.group].filter(fits);
  // a small field (HR has 22 words, many of them long phrases) may not have
  // four partners of the right lengths: then borrow from the other fields, or
  // from the neighbouring weeks
  const wider = W.filter(
    (p) => fits(p) && p.group !== head.group &&
      (head.group.startsWith("f:") ? p.group.startsWith("f:") : Math.abs(p.week - head.week) <= 1),
  );
  for (let attempt = 0; attempt < 400; attempt++) {
    const pool = attempt < 120 ? own : [...own, ...wider];
    // four partners whose lengths add up to exactly the cells that are left;
    // of many random sets keep the one whose words have been seen least, and
    // least recently, so the same partner does not keep coming back
    const cost = (p) => {
      const n = used.find[p.key] || 0;
      const last = lastFind[p.key] || -999;
      return n * n + (day - last < 25 ? 40 : 0) + (Math.abs(dayOf[p.key] - day) <= 15 ? 12 : 0);
    };
    const byLen = {};
    for (const p of pool) (byLen[p.find.length] = byLen[p.find.length] || []).push(p);
    let chosen = null, bestCost = Infinity;
    for (let t = 0; t < 250; t++) {
      const picks = [pool[ri(pool.length)], pool[ri(pool.length)], pool[ri(pool.length)]];
      if (!fixed) picks.push(pool[ri(pool.length)]);
      const rest = need - picks.reduce((n, p) => n + p.find.length, 0);
      const last = byLen[rest];
      if (!last) continue;
      const set = [...picks, last[ri(last.length)]];
      if (new Set(set.map((p) => p.find)).size !== set.length) continue;
      const total = set.reduce((n, p) => n + cost(p), 0) + rnd();
      if (total < bestCost) { bestCost = total; chosen = set; }
    }
    if (!chosen) continue;
    const words = shuffle(fixed ? [fixed, ...chosen] : chosen);
    for (let g = 0; g < 60; g++) {
      const path = hamiltonian(w, h);
      const grid = new Array(w * h);
      const placed = [];
      let at = 0;
      for (const p of words) {
        let cells = path.slice(at, at + p.find.length);
        at += p.find.length;
        if (rnd() < 0.5) cells = cells.reverse();
        cells.forEach((c, k) => (grid[c] = p.find[k]));
        placed.push({ key: p.key, form: p.find, cells });
      }
      const unique = placed.every((pl) => {
        const sets = tracings(grid, w, h, pl.form);
        return sets.size === 1 && sets.has(pl.cells.slice().sort((a, b) => a - b).join(","));
      });
      if (!unique) continue;
      for (const p of chosen) { used.find[p.key] = (used.find[p.key] || 0) + 1; lastFind[p.key] = day; }
      return { w, h, grid: grid.join(""), words: placed };
    }
  }
  throw new Error(`no grid for day ${day} (${head.key})`);
}

// ---------- build every day ----------
// Every day introduces one word of the bank (so 980 words give 980 days). It
// lives in the game that suits it: a single word of 4 to 10 letters is the
// guess word; a phrase or a longer word is the one to unscramble; the short
// rest (KPI, Q&A) hide in the grid. The day's other two games use other words
// of the same week or field, so finishing one game never gives away the next.
const DAYS = ORDER.map((head, i) => {
  const day = i + 1;
  const home = head.guess ? "guess" : head.scrLetters >= 5 ? "scramble" : "find";
  const g = home === "guess" ? head : pickSub("guess", day, head, (w) => !!w.guess);
  const s = home === "scramble"
    ? head
    : pickSub(
        "scr", day, head,
        // a gentle first two weeks: one plain word of 6 to 8 letters
        (w) => (day <= 14 ? /^[A-Z]{6,8}$/.test(w.scr) : w.scrLetters >= 6 && w.scrLetters <= 12) && w.key !== g.key && w.find !== g.find,
      );
  const sc = makeScramble(s.scr);
  const f = makeFind(day, head, home === "find" ? head : null, [g, s]);
  return { day, head, home, g, s, sc, f };
});

// ---------- self-check ----------
const fail = (m) => { throw new Error(`CHECK FAILED: ${m}`); };
if (new Set(DAYS.map((d) => d.head.key)).size !== W.length) fail("every bank word must be the day's word exactly once");
for (const d of DAYS) {
  const tag = `day ${d.day} (${d.head.key})`;
  if (!/^[A-Z]{4,10}$/.test(d.g.guess)) fail(`${tag}: guess answer ${d.g.guess}`);
  const sortL = (s) => [...s].filter((c) => /[A-Z]/.test(c)).sort().join("");
  if (sortL(d.sc.start) !== sortL(d.s.scr)) fail(`${tag}: scramble is not the same letters`);
  if (d.sc.start === d.s.scr) fail(`${tag}: scramble starts solved`);
  [...d.s.scr].forEach((c, k) => { if (!/[A-Z]/.test(c) && d.sc.start[k] !== c) fail(`${tag}: a fixed character moved`); });
  if (d.sc.limit <= d.sc.greedy) fail(`${tag}: swap limit too low`);
  const { w, h, grid, words } = d.f;
  if (grid.length !== w * h || /undefined/.test(grid)) fail(`${tag}: grid size`);
  if (words.length !== 5) fail(`${tag}: needs 5 words`);
  const spots = [d.g.key === d.head.key, d.s.key === d.head.key, words.some((x) => x.key === d.head.key)].filter(Boolean).length;
  if (spots !== 1) fail(`${tag}: the day's word must be in exactly one game`);
  if (d.g.find === d.s.find) fail(`${tag}: guess and unscramble share a word`);
  if (words.some((x) => x.form === d.g.find || x.form === d.s.find)) fail(`${tag}: a grid word repeats another game`);
  const all = words.flatMap((x) => x.cells);
  if (new Set(all).size !== w * h) fail(`${tag}: words must cover every cell once`);
  for (const x of words) {
    if (x.cells.map((c) => grid[c]).join("") !== x.form) fail(`${tag}: ${x.form} is not on its cells`);
    for (let k = 1; k < x.cells.length; k++) if (!adjacent(x.cells[k - 1], x.cells[k], w)) fail(`${tag}: ${x.form} path breaks`);
    if (tracings(grid, w, h, x.form).size !== 1) fail(`${tag}: ${x.form} can be traced two ways`);
  }
}
for (const w of W) {
  for (const f of ["ka", "hint", "exEn", "exKa"]) {
    if (!w[f]) fail(`${w.key}: empty ${f}`);
    if (w[f].includes("—")) fail(`${w.key}: em dash in ${f}`);
  }
  if (new RegExp(`\\b${clean(w.en).replace(/[^A-Za-z ]/g, "")}\\b`, "i").test(w.hint) && clean(w.en).length > 2)
    fail(`${w.key}: the hint contains the answer`);
}

// ---------- write the data file ----------
const q = JSON.stringify;
const lines = [];
lines.push("// supabase/functions/_shared/wordGameData.ts");
lines.push("//");
lines.push("// AUTO-GENERATED by scripts/word-game/generate.mjs. Do not edit by hand:");
lines.push("// change the word bank, then run the script again.");
lines.push("//");
lines.push("// Lives on the server only. The browser is handed one day at a time by the");
lines.push("// word-game edge function, so future answers cannot be read from the site.");
lines.push("");
lines.push("/** [english, georgian, hint (explanation), example EN, example KA] */");
lines.push("export type WgWord = [string, string, string, string, string];");
lines.push("/** [word key, letters, cells in tracing order] */");
lines.push("export type WgFindWord = [string, string, number[]];");
lines.push("/** [day's word, guess word, guess answer, scramble word, scramble answer, scramble start, swap limit, grid w, grid h, grid letters, grid words] */");
lines.push("export type WgDay = [string, string, string, string, string, string, number, number, number, string, WgFindWord[]];");
lines.push("");
lines.push("export const WG_WORDS: Record<string, WgWord> = {");
for (const w of W) lines.push(`  ${q(w.key)}: ${q([w.en, w.ka, w.hint, w.exEn, w.exKa])},`);
lines.push("};");
lines.push("");
lines.push("export const WG_DAYS: WgDay[] = [");
for (const d of DAYS) {
  lines.push(
    `  ${q([d.head.key, d.g.key, d.g.guess, d.s.key, d.s.scr, d.sc.start, d.sc.limit, d.f.w, d.f.h, d.f.grid, d.f.words.map((x) => [x.key, x.form, x.cells])])},`,
  );
}
lines.push("];");
lines.push("");
const outFile = resolve(ROOT, "supabase/functions/_shared/wordGameData.ts");
writeFileSync(outFile, lines.join("\n"));

// ---------- word lists for the guess game ----------
const enablePath = process.argv[2];
if (enablePath && existsSync(enablePath)) {
  const byLen = {};
  const add = (word) => {
    const s = word.trim().toLowerCase();
    if (!/^[a-z]{4,10}$/.test(s)) return;
    (byLen[s.length] = byLen[s.length] || new Set()).add(s);
  };
  readFileSync(enablePath, "utf8").split(/\r?\n/).forEach(add);
  // every bank word is a valid guess, even the ones a general dictionary lacks
  for (const w of W) {
    if (w.guess) add(w.guess);
    clean(w.en).split(/[^A-Za-z]+/).forEach(add);
  }
  mkdirSync(resolve(ROOT, "public/wordlists"), { recursive: true });
  for (let n = 4; n <= 10; n++) {
    // fixed-width, no separators: the browser slices it every n letters
    writeFileSync(resolve(ROOT, `public/wordlists/en-${n}.txt`), [...byLen[n]].sort().join(""));
  }
  for (const d of DAYS) if (!byLen[d.g.guess.length].has(d.g.guess.toLowerCase())) fail(`day ${d.day}: answer not in the word list`);
  console.log("word lists:", Object.entries(byLen).map(([n, s]) => `${n}:${s.size}`).join(" "));
} else {
  console.log("no ENABLE list given: word lists left as they are");
}

// ---------- report ----------
const at = (k) => DAYS.filter((d) => d.home === k).length;
console.log(`days: ${DAYS.length}`);
console.log(`the day's word is the guess word on ${at("guess")} days, the one to unscramble on ${at("scramble")}, in the grid on ${at("find")}`);
console.log(`most-used grid word appears ${Math.max(...Object.values(used.find))} times, guess stand-in ${Math.max(...Object.values(used.guess))}, unscramble stand-in ${Math.max(...Object.values(used.scr))}`);
console.log(`first 14 days: ${DAYS.slice(0, 14).map((d) => d.head.en).join(", ")}`);
console.log(`wrote ${outFile} (${(lines.join("\n").length / 1024).toFixed(0)} KB)`);
