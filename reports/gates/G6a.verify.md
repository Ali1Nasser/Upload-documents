# G6a independent verification, round 0

Verifier: a separate invocation that did not author or fix any P6 work. Read-only except this report.
Date: 2026-10-09. Repo HEAD at start: a773103.

## Verdict: FAIL (not passed)

`python3 tools/dc.py gate check G6a` returns **FAIL 6/8**. I re-derived every 06 section 1 G6a criterion myself.
The four criteria in 06 section 1 hold on the evidence. The gate still fails, for a reason that is not the look/parity score:
the two **ADR-009 close conditions 3 and 4** that make the conditional close valid are not done.
No waiver covers them (ADR-009 states Arabic correctness and the ordering "freeze only after conditions 1-4 hold" are not waived).

## What fails

| # | Failing check | Evidence |
|---|---|---|
| 1 | ADR-009 cond 3: re-render **and** a fresh PASS Arabic review of the re-rendered set | All 7 fix stills exist (F3, F4, F4-hero, F5, F6, F7, F8 `_fix.jpg`). `reports/lookdev/r3/strips/MD-standard_fix.jpg` was rendered at 23:14 and committed in a773103, **after** the last Arabic review (d6ac265). That review's scope line covers only "the 7 `*_fix.jpg` stills"; its open item 2 says MD "still shows the 7-word ghost and old gaps. Re-render before any strip is used as G6a/G8 evidence". No review covers `MD-standard_fix`. `fix.json` says MD "awaits arabic-typographer review and the render-ops condition-4 diff". |
| 2 | ADR-009 cond 4: render-ops no-regression diff | `reports/lookdev/r3/regress.json` does not exist. The tool `studio/scripts/lookdev_regress.py` is written, but render-ops has not run it with edited-box coordinates (and the author must not run it as evidence). |
| 3 | Process order (ADR-009 cond 5) | The freeze (`freeze.json`, 23:17:17Z, a773103) was made while conds 3 and 4 were open. ADR-009 says: "freeze tokens, presets and the catalog only after conditions 1-4 hold". Not a numeric failure, but a recorded ADR-order breach. If cond 3 or 4 finds a defect in a frozen file, the re-freeze needs an ADR. |

## Criteria re-derived (06 section 1, G6a)

| Criterion | My result | Status |
|---|---|---|
| ADR-002/003/004/005 decided | `decisions.json`: all four `decided` (2026-10-09), and `docs/decisions/ADR-00{2,3,4,5}-*.md` exist | pass |
| Look rubric mean >= 8.0 | Recomputed from `critic_r3.json` per_family (70 scores): 561/70 = **8.014**. Per-family means match. Includes the cost column, which 06 section 3.2 lists as a look criterion | pass, zero headroom |
| AI-Unpacked parity >= 7.5 | Five-criterion read (06 section 3.3): (7.5+7.5+7.5+7.0+8.0)/5 = **7.50**. Min single criterion 7 (>= 6) | pass, zero headroom |
| Tokens, presets, catalog frozen | See "Freeze" below | pass |
| Projected final render <= 24 h | See "Projection" below | pass (pure P12), fails on the +25 % reading |

## Style frames viewed (own eyes, 1920x1080)

I viewed F7-standard_fix, F4-hero_fix, F1-standard, F6-standard_fix, F8-standard_fix, and the MD-standard_fix strip.

- F7 Holo-City: the strongest frame (three-state lit/warm/dim towers, glowing Kafka route). Seven canon-labelled chips. Chip 6 now reads `AI 6` (no join fusion). Critic 8.00 (light 8, legibility 7) is plausible.
- F4-hero: dense cyan/violet field, clean title band, readable cards. The large bokeh discs are still grey/tan and muddy (critic issue 3, carried as AT-2). The critic's 8.14 with parity 8 is on the generous side but within its stated calibration.
- F1: clean premium dark UI. The bottom 250 px is empty and the box interior is flat glass (critic issue 6). Composition 8 is generous; parity 7 is right.
- F6: the best typography in the set (typography 9 holds). Order and arrow are now RTL-correct.
- F8: three rings on a floor with reflections and a two-line ghost title. Metaphor-weak, as the critic says (7). Fine.
- MD strip: reads cleanly; the f262 flare on `كلها` is mid-wipe. This is my look at it, not the formal Arabic review that cond 3 requires.

Judgement: the critic's per-criterion numbers are plausible and not inflated beyond its own calibration, but the set is "premium dark UI with glow", and the pass is **thin**:
- One score point is 0.0143 of the look mean, so 8.014 vs 8.0 is a one-point margin in 70.
- The per-family parity column averages 7.3. Only the five-criterion read reaches 7.5 (the gate reads the five-criterion read, as 06 section 3.3 defines it).
- Without the cost column the look mean is 7.82.
- The critic scored the **pre-fix** stills (22:45). The fix stills (23:01-23:03) were not re-scored; cond 4 exists to show that the score still applies.
- The critic reports "0 shaping errors" on stills where the Arabic review found blocking B1/B2. The critic does not run OCR, so its look scores are not shaping evidence.

## Informal diff probe (not render-ops evidence)

I diffed r3 vs `_fix` at 960 px (|delta| > 8/255) with a scratch script. Changed regions in 1920x1080 coordinates:

| Still | Changed region(s) | Reading |
|---|---|---|
| F3 | (760,64)-(1146,192) | title only |
| F4 / F4-hero | (1448,436)-(1594,502); (288,758)-(540,870) | the two cards only |
| F5 | two ~42 px boxes near (790-854, 176-278) | bar-end unit only |
| F6 | header, `0.165`/`0.227` grid, labels (43,475 px changed) | the R1 grid rework; large but inside the edited area |
| F7 | (362,250)-(556,330) | chip 6 only |
| F8 | four boxes in y 66-308 | ghost title only |

Nothing changed in backgrounds or untouched elements, which is consistent with a pass. It does not replace `regress.json` (render-ops, with declared boxes, pad 16 px).

## Freeze

- `freeze.json` has `status=frozen`, 227 hashed files (tokens 1, type 2, fonts 12, catalog_src 106, catalog_json 106). I recomputed every SHA-256: **227/227 match, 0 missing, 0 changed**. `git status` shows no uncommitted change under `studio/` or `harness/schemas/`.
- Catalog: I parsed 04 section 8 myself: **104 distinct component names**. All 104 have `studio/src/components/<Name>/schema.ts` and `harness/schemas/components/<Name>.json`. No extra component directories. The two extra JSON files are `_WordAnchor` and `_index`.
- Compile:
  - I re-ran the zod-to-JSON export into a scratch directory: all 25 contract checks `ok`, and the output is **byte-identical** to the committed `harness/schemas/components/` mirror.
  - All 106 JSON files parse and pass `Draft202012Validator.check_schema` (0 bad).
  - `tsc -p studio/tsconfig.json --noEmit` (via `dc q`, job 10): exit 0, no diagnostics.
- Anchor contract: `{word, lead_frames}` required; seconds, frames and bad word ids are rejected; no numeric time field in any schema.

## tokens.ts vs ADR-002 / ADR-003 / 04

| Token | Value | Source | OK |
|---|---|---|---|
| FPS, W, H | 24, 1920, 1080 | ADR-002 Q2.1 F24 | yes |
| GL | `swiftshader` | Q2.2 GL-SS | yes |
| HERO_SHARE_MAX | 0.05 | Q2.3 RT5 | yes |
| LEAD_FRAMES | kinetic 2, state 2, cut 3-5, sfx 3, hold 29, pause 144 | ADR-002 conversion table | yes |
| FX standard | glow 10/32, grain 1.5 %, vignette 15 %, haze 8 %, particles 1,500, CA 0.6 | Q2.4 FX2 | yes |
| FX hero | bloom 1.0 (0.8-1.2), particle cap 1,500, WebGL on | Q2.4 | yes |
| FX lite | CSS glow, grain 0, vignette 10 %, CA 0, 300 particles | 04 section 1.3 (unchanged) | yes |
| textSafe / `caOnArabic` | on / 0 | Q2.4 chair conditions | yes |
| Palette | all 13 hexes of 04 section 1.1 match | ADR-003 LK-F | yes |
| Fonts | Alexandria 700 at >= 56 px; Plex 600 below, word-spacing 0.08 em; Inter Tight 700; JetBrains Mono; labels Plex 500-600 | ADR-003 T-A | yes |
| Labels | 28 px spoken, 18 px non-spoken floor | ADR-003 | yes |
| LINE | tashkeel 1.6, title-sub gap 0.3 em | ADR-003 | yes |
| PRESETS f24 | arrive 6, impact 3-4, label 4, morph 7-12, exit 5-10 | `msToFrames(ms, 24)`, 6/6 check ok | yes |

Notes (non-blocking):
- `JOIN_GAP` is `display {caps 0.20, latin 0.25}`, `text {caps 0.25, latin 0.30}`. ADR-009 cond 1 (B2) text says mixed case 0.14 / 0.10. The arabic-typographer, who owns the spec, accepted the wider values after a measured OCR sweep. The token is frozen on a value that differs from the ADR text, so the Council should record this by amendment or note.
- `SIZE.hero` is 176 px, above the 04 section 3.2 impact range of 96-160 px. No component uses it yet.
- ADR-009 cond 2 lists four OCR gate strings. Three have isolated-render scores of 1.00 (`F3-title`, `roadmap-72`, `idem-72`). The fourth, F7 chip 6, has no isolated-render score; it was closed by the Arabic re-check's frame-crop read (`Al 6`, an I/l ambiguity). `g06a.py` accepts that explicitly. It is a documented substitution, not the ADR's literal wording.

## Projection (locked runtime)

- `corpus/edl/lock.json`: 332,651 frames, 13,860,430 ms, fps 24 (`332650.32` frames from ms, consistent). Runtime 3.850 h.
- ADR-002 model, RT5 (h = 0.05), S 0.141-0.183 and H 0.904-1.038 box s/frame:
  low = 332,651 x (0.95 x 0.141 + 0.05 x 0.904) / 3600 = **16.55 h**;
  high = 332,651 x (0.95 x 0.183 + 0.05 x 1.038) / 3600 = **20.86 h**.
- Measured: `reports/lookdev/r3/perf.json` standard mean (MA, MB, MC, MD) = 0.1304, hero (MB-hero) 0.2011; blended = 0.95 x 0.1304 + 0.05 x 0.2011 = **0.1339** (as stated) -> 12.37 h. All five motion shots are inside R5 (0.201). The 24 h limit at this runtime is 0.2597 box s/frame (ADR-002 R2 uses 0.240 for the old 4:10:07 plan).
- Worst case **20.86 h pure P12 <= 24 h**. Headroom 3.14 h.
- Caveats, all already logged:
  - ADR-002 reads the budget as pure P12. On the +25 % reading the worst case is **26.07 h**, over budget; the R2 ladder (hero share 3 %: 24.1 h; 1 %: 22.1 h) applies.
  - The measured rate uses CSS-hero shots for the hero share, not real-time WebGL (the H band covers WebGL), so the ADR model is the binding figure.
  - `perf.plates` is empty. The P10 plate bake cost and disk are not in the projection (AT-9, which blocks P10 and is not a G6a item).

## What the fix agent needs to do (and who may not)

1. arabic-typographer: a fresh review covering `MD-standard_fix.jpg` (and any other re-rendered strip used as evidence). It must end with a PASS heading that names `MD-standard_fix`. The fix agent must not self-grade.
2. render-ops: run `python3 -I studio/scripts/lookdev_regress.py --boxes <boxes.json> --by render-ops` with the edited text boxes (my probe regions above are a starting point), producing `reports/lookdev/r3/regress.json` with `pass=true` and `covers` including the 7 stills.
3. Council or chair: note the `JOIN_GAP` deviation and the freeze-before-cond-3/4 ordering. If cond 3 or 4 turns up a defect that changes a frozen file, RT-1/RT-2 of ADR-009 apply (waiver lapses, one bounded round with a fresh critic re-score).
4. Re-run `python3 tools/dc.py gate check G6a`; verify again.

## Side effects of this verification

- Running `dc gate check G6a` rewrote only the `created` timestamp of `reports/gates/G6a.json` and `harness/state/progress.json`; I restored both with `git checkout`.
- `dc q submit` (tsc job 10) updated `harness/state/queue.json`; I left that live queue state untouched and uncommitted.
- Scratch files are in the session scratchpad only.
