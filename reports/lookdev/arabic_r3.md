# Arabic typography review, look-dev r3 (arabic-typographer)

Scope: `reports/lookdev/r3/stills/` F1-F9 (+F4-hero) at 1920x1080 full size, and `reports/lookdev/r3/strips/` MA, MB, MB-hero, MC, MD. Strip tiles are 480x270, so strips were judged only for mid-wipe shaping, collisions and layout; size floors and joins were judged on the stills. Source cross-read: `studio/src/lookdev/{content,frames,kit,world}.ts*`, `studio/src/type/{arabic,overrides}.ts`. Contrast sampled on pixels. Tesseract `ara+eng` smoke on 35 crops of the glow-composited JPGs (smoke only; glow and JPG depress scores).

## Test suite
- `bash studio/scripts/check_type.sh` (`studio/src/type/arabic.check.ts`): **38 ok, "all type checks passed"**. It is a logic suite (tashkeel line-height, U+2212, faces, segmenting, caption breaking, arrows, units, J1 gap values, overrides). It does not render, so it passes while the J1 gap is visually ineffective (B1, B2 below).
- `python3 tools/dc.py qa arabic`: still "not implemented yet" (P9). Blocks G6b/G8 until built.
- cmap (fontTools installed to scratchpad, not the repo): 49 distinct on-screen Arabic strings in `studio/src/lookdev` and `overrides.ts`; **0 missing codepoints** in Alexandria, Plex Sans Arabic 500/600. U+2212, U+2192, U+2190, U+061F, tanween, shadda and tatweel are all covered. The U+2212 open case from r2 is closed: it is not tofu and not a fallback font.
- OCR smoke: 22 of 35 crops at >= 0.90. The misses are glow/crop noise (F8 labels, F6 impact word, F7 title) EXCEPT every `الـ`+Latin case, which returns `J|`, `d!|` or `JI` noise (F3 title, F4 idempotency card, F6 title and both labels, F7 chip 6). That pattern is the stuck join, see B1/B2.

## Verdict: FAIL (2 blocking, 3 required; r2 blockers partly fixed)

### r2 items verified fixed
- F2 stage chips FROM..LIMIT are now about 28 px (cap height 21 px), no overlap at the 172 px pitch; counts 14/13/11 at 34 px.
- F5 labels clear of the stack; `5 ثواني مقابل 57` has no tanween and Western digits.
- F6 bottom labels are now centred under their own numbers (x 390-610 under 0.165, x 990-1270 under 0.227).
- F5 top bars use the small muted unit (frozen rule 11).
- F4 / F4-hero caption: 2 lines, shadda clear. F4 and F6 `قسم الـroadmap` consistent, MA f34..f105 show the article.
- Digits Western only everywhere. No Arabic letter-spacing (grep: the only `letterSpacing` is on Latin `NilePay` in the receipt, `frames.tsx:64`). No per-letter split, scramble or typewriter anywhere in `studio/src`. MA f103/f105 and MD f262 are whole-element RTL clip wipes (valid `arrive`).
- Tashkeel clear: F4 `بيحوّل` (92 px, line-height 1.6), `تحمّل`, `وسّع`, F5 `غيّر`.
- Mixed-string BiDi correct in F1 (`NilePay` at the left end of an RTL line), F2 (`SQL` at the right start), F3 formula and `=`/`−`, F5 title digit order, F6 `أعلى نتيجة:` colon placement, F7 district tags (number at the RTL start), F1 `؟` at the line end.
- Contrast on sampled Arabic labels 4.6 to 17.6:1 (lowest: F4 roadmap card note `أعلى نتيجة` 4.6, F8 ghost title 3.8 at 72 px, accepted as an intentional ghost).

## Blocking fixes
**B1. F7-standard chip 6 `6 الـAI`** (crop x 375-545, y 268-318). Still renders as `AIJI`; OCR gave `اذالم` (0.55). The r2 fix (J1 gap 0.12 em, about 4 px at 32 px) did not separate the lam foot from the capital `I`. Fix (spec edit in `world.tsx`, `DISTRICT_AR[5]`): replace `'الـAI'` with `'AI'` (acronym stays Latin per glossary; district tags are noun labels, so the article is not needed) and keep the number `6`. If the article must stay: set `AI` in the mono face (serifed `I`) with `margin-inline-start: 0.3em`.
**B2. F3-standard title `الترتيب داخل الـpartition`** (x 790-1230, y 70-170, 92 px). The lam foot touches the `n` (J1 gap 0.06 em is about 5 px, visually fused; OCR `partitiond!|`). The same class of noise appears on F4 `قسم الـidempotency` and F6 `قسم الـroadmap` / `الـidempotency`. Fix in `studio/src/type/arabic.ts` `JOIN_GAP` and its test: size-banded gaps, display (>= 56 px) caps 0.20 em / mixed-case 0.14 em; below 56 px caps 0.25 em / mixed-case 0.10 em. The gate for "fixed" is the isolated-render OCR in `dc qa arabic` (>= 0.9 on `الترتيب داخل الـpartition`, `قسم الـroadmap`, `قسم الـidempotency`), not the logic test.

## Required fixes
**R1. F6-standard flow direction and arrow.** `frames.tsx:659-668` lays the two score columns in `dir="ltr"` with `→` (90 px): `0.165` roadmap at the left, `0.227` idempotency at the right. In an RTL frame, and against F4 (roadmap right, idempotency left), the order is mirrored and the arrow breaks the "no `→` between Arabic blocks" rule. Fix: `dir="rtl"` on the grid so roadmap is at the right, replace the glyph with `←`, keep each number in its own LTR isolate; re-centre the two labels under the numbers.
**R2. F8-standard / MD f0..f210 ghost title** `اللي أي حد شغال في الداتا بيعمله`: 7 words (limit 6 per kinetic phrase; 31 chars and 1 line are fine). Fix in `world.tsx` (carry-over line): split into two phrases `اللي أي حد شغال` / `في الداتا بيعمله` each with its own `arrive`, or show `أي حد شغال في الداتا بيعمله` (6 words). The second form drops a canon word, so the egyptian-arabic lens must confirm. Contrast 3.8:1 is acceptable only because it is a receding ghost; do not dim further.
**R3. F5-standard bar-end units `s`** (x 805-840, y 190 and 250). About 14 px, below the ADR-003 18 px floor. Fix `frames.tsx:~583`: unit 0.42 em to 0.55 em (about 19 px at 34 px), same muted ink.

## Advisories (non-blocking)
- F5 status chips `CACHED` / `EDITED` / `REBUILT` are about 20 px. They pass the 18 px floor only if they are not tied to a spoken term. If the narration says "cached" or "rebuilt", they need 28 px (scene-director to confirm).
- F5 column labels `نسخ الكود فوق تنصيب التبعيات` (x 120-625) and `بترتيب layers عاقل` (x 1010-1312) are left-aligned within their columns. In an RTL frame, anchor them to the column's right edge (x 890 and x 1780). Same for F1 `ست عمليات دفع من NilePay` (x 120-685), anchor to the table's right edge (x 978).
- Chips such as `WHERE أرخص مكسب` (F2) and `offset الإزاحة` (F3) read gloss first, term second in RTL order. The spoken term arrives first; consider `term` at the right (RTL start). Keep one rule for all chips.
- F4 `أعلى نتيجة` note is 4.6:1 because the roadmap card is intentionally dimmed; do not dim it further.
- MA f103 (`وغل` mid-wipe with the red flash bloom) is acceptable for `impact` (3-frame flash); do not use as a style still. Same for MD f262 `كلها`.
- F3 faded P2/P1 cell indices are about 14 px and decorative; they are not spoken and may stay.
- Open: `CH-34:labels_ar:0` override is still `pending-council` (egyptian-arabic lens before P8).

## Presets and fonts
`arrive`, `impact`, `exit` unchanged and accepted; `count` fine (F2 `11 rows`, F5 `57 s`). T-A (Alexandria 700 display, Plex 600 below 56 px) holds in glow and in the wipe frames; no ر/ي collision in these strings (corpus-scale test still due). Interaction note for ADR-003: a tatweel join into a Latin glyph is the one place T-A is fragile; the cure is spacing, not a font change.

## Open BiDi cases for `dc qa arabic` (P9)
`الـ` + ALL-CAPS Latin (AI, SQL, API) and `الـ` + mixed-case at display sizes; Latin isolate wrapping across a 2-line caption break; `%` and parentheses beside `،` `؛` `؟` at line end; decimals in RTL parents; `←`/`→` placement between Arabic blocks (F6); mirrored `؟` under the RTL wipe.

---

## Re-check of the r3 Arabic fixes (arabic-typographer, after a3b86c1): PASS

Scope: the 7 `*_fix.jpg` stills at 1920x1080 (F3, F4, F4-hero, F5, F6, F7, F8) plus source diff 8f245ee..a3b86c1. Author (motion-engineer) did not grade; OCR below is my own, run on crops of the delivered stills (tesseract ara+eng, 3x, autocontrast; smoke only; score = Arabic-letter stream + non-Arabic stream, tatweel/bidi marks dropped).

Test suite: `bash studio/scripts/check_type.sh` 43 ok (was 38; adds banded J1 gaps, min 18 px at 92 px). Logic only. `dc qa arabic` still "not implemented yet" (P9): G6b and G8 stay blocked on it. cmap unchanged (no new codepoints; `AI` and `←` are covered).

| Fix | Evidence | Result |
|---|---|---|
| B1 F7 chip 6 | chip now `AI 6`, same number-at-RTL-start layout as the other six chips; OCR `Al 6` (no `AIJI`; Al/AI is the Inter I-vs-l ambiguity, not a join) | fixed |
| B2 F3 title | lam foot and `partition` visibly separated, tatweel stroke readable; OCR before 0.91 `partitiond!`, now 1.00 `الترتيب داخل ال partition` | fixed |
| B2 F4 card `قسم الـidempotency` / `قسم الـroadmap` | 1.00 / 1.00 | fixed |
| B2 F6 head 72 px `أعلى نتيجة: قسم الـroadmap` | 1.00 | fixed |
| B2 F6 labels 34 px | roadmap 1.00 (was 0.85 `roadmapJ\|`); idempotency 1.00 on psm 13, psm 7 reorders and misreads the dim 85 % ink `قسم` (`a.nd`), no join junk | fixed (dim-ink noise only) |
| R1 F6 order and arrow | `0.165` roadmap at the right, `←`, `0.227` at the left (same sides as F4); each label centred under its number (idem x 250-540 vs number 205-585; roadmap x 905-1140 vs 735-1310) | fixed |
| R2 F8 ghost | two phrases, 4 + 3 words, one line each (15 and 16 chars), right edges 1795/1797 (aligned), no canon word dropped; OCR l2 0.93, l1 0.59 at 3.8:1 ghost ink on the beam (accepted as a receding ghost, not an OCR gate) | fixed |
| R3 F5 bar-end `s` | source 0.55 em x 36 px = 19.8 px (floor 18); still shows a larger muted `s` at both bars, no collision with the numbers | fixed |

Join-gap values are now 0.20/0.25 em (display caps/mixed) and 0.25/0.30 em (text). They are visibly wider than the 0.14/0.10 I asked for, but the measured isolated OCR sweep showed the asked values still fused, so I accept the author's values. The gap reads as a word space plus the tatweel foot; no stretched-word look at 34 px or 92 px. Watch the 34 px labels in motion (wipe) for a gap that looks like two words.

### Open (non-blocking, carry to P8/P9)
1. Canon drift: `corpus/canon/chapters.json:196` and the glossary say `6 الـAI`. The look-dev now shows `6 AI`. At the new 0.25 em caps gap the article probably reads clean at 32 px (probe `caps-AI-32`: `Al ال`, no join noise, score 0.80 only from I/l), so the production spec should restore `الـAI` or log a `pending-council` override for the bare form. Scene-director to decide; do not ship the bare form silently.
2. Strips MA/MB/MC/MD were not re-rendered (author's note): MD still shows the 7-word ghost and old gaps. Re-render before any strip is used as G6a/G8 evidence; the F8 still proves the source change.
3. `dc qa arabic` must normalize I/l/1 and Al/AI confusion in OCR, and score the isolated render at full contrast (not the glow-composited frame); the F8 ghost line 1 and dim-ink labels fail frame-crop OCR for contrast reasons.
4. Earlier advisories stand: F5 chips `CACHED`/`EDITED`/`REBUILT` 20 px; RTL anchoring of F5 column labels and F1 `ست عمليات دفع من NilePay`; chip order term-first; `CH-34:labels_ar:0` override pending-council; the open BiDi list above.

Verdict: B1, B2, R1, R2, R3 all closed. The Arabic r3 FAIL is lifted for the look-dev set. G6b and G8 remain blocked on a real `dc qa arabic`.
