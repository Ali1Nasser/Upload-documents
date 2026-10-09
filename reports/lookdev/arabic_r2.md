# Arabic typography review, look-dev r2 (arabic-typographer)

Scope: `reports/lookdev/r2/stills/` F1-F9 (+F4-hero) and `reports/lookdev/r2/strips/` MA, MB, MB-hero, MC, MD, read at full size; text cross-read against `studio/src/lookdev/*.tsx`, `content.ts`, `studio/src/type/overrides.ts`; contrast sampled on pixels; tesseract `ara+eng` smoke on 30 crops of the glow-composited JPGs (smoke only: glow, JPG and mid-reveal depress scores; 14 of 30 at 1.00 to 0.92, the rest explained below).

## Test suite
`bash studio/scripts/check_type.sh` (studio/src/type/arabic.check.ts): **35/35 ok, "all type checks passed"**. This is the logic suite (tashkeel line-height, U+2212, faces, segmenting, caption breaking, arrows, units, overrides). It does not render, OCR, check cmap or overflow. `dc qa arabic` is still "not implemented" (P9), and fontTools is not installed here, so the cmap check was not run; visual tofu count is 0 (U+2212 and the Arabic question mark render).

## Verdict: FAIL (2 blocking spec/layout fixes, 1 required unit fix; r1 blockers B1-B3 confirmed fixed)

### r1 blockers: verified fixed
- F5: labels now y 345-395 against slab top ~422 (>= 24 px clear); `5 ثواني مقابل 57` (tanween removed), no tashkeel burden.
- F2 subtitle: 2 lines, 22 / 17 chars, verbatim.
- F4 / F4-hero / MB / MB-hero caption: 2 lines (24 / 16 visible chars), line-height 1.6, shadda clear.
- `قسم الـroadmap` consistent (MA f34..f105 now show the article); F4 note is 32 px ink2 (4.7:1 only because the card is intentionally dimmed; >= 4.5 holds); F2 chip gloss >= 28 px; F6 ghost 6 % and below the phrase; F8 labels complete and F9 is the style-lock still.

### Passes
Shaping and joins (all 30 distinct strings; shadda in بيحوّل/تحمّل/غيّر OK); tofu 0; digits Western only (no Eastern-Arabic anywhere); BiDi (`ست عمليات دفع من NilePay`, `SQL مش بتشتغل…`, `WHERE`/`offset` chips, `5 ثواني مقابل 57`, `lag = 11 − 7 = 4`, `13 → 11 rows`, district tags with the number at the RTL start); arrows only inside numeric/Latin isolates; no per-letter animation (grep of studio/src: no char splitting, no scramble/typewriter on Arabic; MA f103/f105, MD f262 show whole-word RTL clip wipes only); contrast 9.6-17.8:1 on all sampled labels; plates or halos on every text over busy ground; copy is short Egyptian, canon-verbatim (CH-00, CH-11, CH-34), <= 6 words, <= 32 chars/line, <= 2 lines.

## Blocking fixes
1. **F7-standard chip 6 `الـAI`** (x 405-495, y 490-525): `ال` + capital `AI` with no gap reads "AIJI" (alef/lam/I/I are four near-identical stems; OCR returned `الام`, 0.67). Fix in `world.tsx` (DISTRICT_AR / `Mix`): keep the tatweel but add `margin-inline-start: 0.12em` on the Latin isolate when it is ALL-CAPS and follows `الـ`. Re-render F7 and check at full size. Same stuck-join OCR noise (`partitiond!`, `roadmap!`, `idempotencyJ]`) appears on F3 title, F4 cards and F6 labels: apply `0.06em` there (rule: every `الـ`+Latin isolate gets a hair gap) and re-test in `dc qa arabic` isolated render.
2. **F2-standard / MC f108-f112 stage chips FROM..LIMIT** are 24 px (`frames.tsx:342`), below the ADR-003 28 px floor for labels tied to spoken terms. Raise to 28 (mono 0.6 em x 8 chars + 24 px padding = 158 px < 172 px pitch; keep padding 12 or less). Counts under them are 34 px, fine.

## Required (non-blocking) fix
3. **F5-standard top bars `5 s` / `57 s`** (`frames.tsx:583`) set the unit at the number's size and colour. Frozen r1 rule 11 says unit Latin, after the number, 0.42 em, muted ink (as the big `57 s` / `5 s` already do). Use the same unit span.

## Advisories
- F6 bottom labels `قسم الـroadmap` / `قسم الـidempotency` are left-aligned to their numbers; in an RTL frame centre them on the number (labels at x 215 and 905 sit left of the number centre).
- F7 district names are noun-only MSA canon (CH-01); acceptable as labels. `الـAI` stays in Latin per glossary.
- F3 faded P1/P2 row labels are decorative (about 18 px, blurred): keep >= 18 px.
- `CH-34:labels_ar:0` override (tanween drop) is still `pending-council`; egyptian-arabic lens must confirm before P8 (canon not edited).
- Mid-wipe frames (MA f34/f103, MD f160/f262) cut through a glyph: valid for `arrive`; do not use as style stills.

## Open BiDi cases for `dc qa arabic` (P9)
`%` and parentheses beside `،` `؛` `؟` at line end; Latin isolate wrapping across a 2-line caption break; `الـ` + ALL-CAPS Latin (AI, SQL, API); decimals in RTL parents; mirrored `؟` in RTL clip wipes; U+2212 inside Arabic sentences (F3 formula falls back to a short dash glyph: check which font supplies it).

## Presets and fonts
`arrive`, `impact`, `exit` accepted as in r1. `count` (F2 `11 rows`, F5 `57 s`) fine. ADR-003 T-A holds in glow and motion; no ر/ي collision seen in Alexandria at the strings in these frames (corpus-scale test still due, ADR-003 follow-up).
