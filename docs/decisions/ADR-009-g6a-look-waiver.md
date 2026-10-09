# ADR-009 — G6a look close: scoped look/parity waiver (W-009-LOOK)

Status: decided (Council C3, 2026-10-09). Confidence: **medium** (mean member confidence 0.69).
Chair: council-chair. Brief: `docs/decisions/C3.brief.md`.

## Context

- **Loop cap:** look-dev ran r0..r3. The look mean rose 7.4 → 7.61 → 7.87 → 8.01, with gains of +0.26 and then +0.14 per round.
- **Critic r3** (`reports/lookdev/critic_r3.md`, a fresh invocation):
  - look mean **8.014** (561/70) against 8.0; F1–F6 standard alone 8.00;
  - parity read **7.50** against 7.5; min criterion **7** against 6;
  - 0 shaping errors; 5 of 5 motion shots inside R5;
  - the critic calls this "marginal" and says it should "not [be read] as headroom".
- **Arabic r3** (`reports/lookdev/arabic_r3.md`): **FAIL**, with blockers B1 and B2 and required fixes R1–R3. The type suite passes 38/38 because it is logic only. The F7 chip OCRs at 0.55. `dc qa arabic` is not implemented.
- **Derived:** without the render-cost column, the r3 look mean is (561 − 92)/60 = **7.82**. The G8 visual rubric (`06` §3.3) has no cost criterion.
- **Checker:** `harness/gates/g06a.py` is not implemented yet.

## Options

- **W1:** close on the r3 read under a scoped waiver. The Arabic fixes are prerequisites, not waived.
- **I1:** one more bounded round (Arabic plus critic issues 1–3), then a fresh critic re-score.
- **R1:** restart look-dev.

## Scores

The ballot collected a choice and a confidence per lens. Rule (computed task): majority decides, and a tie goes to I1. No per-criterion scores were collected, and no cross-review was run.

| Lens | Choice | Confidence |
|---|---|---|
| director | W1 | 0.72 |
| educator | W1 | 0.72 |
| motion-design | W1 | 0.72 |
| technical-accuracy | I1 | 0.60 |
| egyptian-arabic | I1 | 0.68 |
| audio-sync | W1 | 0.62 |
| producer | W1 | 0.78 |

| Option | Votes | Share | Confidence-weighted share |
|---|---|---|---|
| **W1** | 5 | 0.714 | **0.736** (3.56/4.84) |
| I1 | 2 | 0.286 | 0.264 (1.28/4.84) |
| R1 | 0 | 0 | 0 |

- **Margin:** 47.1 points confidence-weighted (42.9 raw), far above 5 %.
- **Mean confidence:** 0.691, which is ≥ 0.6, so no experiment is needed.
- **Taste:** the deciding judgement is that another round buys about +0.1. That is a trend estimate, carried by the director, motion-design and producer lenses.
- **Rejected options:** no lens chose R1. All 7 lenses agree that B1/B2/R1–R3 cannot be waived.

## Decision

**W1, as a conditional close.** The numbers met the thresholds; what is waived is the confirmatory re-score.

### W-009-LOOK (the only waiver in this ADR)

- **Thresholds covered:** G6a item 2 only: look rubric mean ≥ 8.0 and AI-Unpacked parity ≥ 7.5.
- **Scope:** the r3 style-frame set only:
  - stills F1–F9 and F4-hero;
  - strips MA, MB, MB-hero, MC, MD.
- **What is traded:**
  1. G6a may close on a single critic read with zero headroom (+0.014 and 0.00), with no further look re-score round after the Arabic patch and beyond the r0..r3 cap.
  2. Critic issues 1–6 and the Arabic advisories move from look-dev into P7/P8 acceptance tests (AT-1…AT-10), instead of being fixed in stills.
- **Why:** the trend is monotone with shrinking returns. The remaining gaps (real DOF, objects lit by scene lights, concrete metaphors for F2/F3/F8) need P7 components, not more stills.
- **Not lowered or waived:** no threshold changes anywhere. This ADR does not waive:
  - Arabic correctness;
  - the token freeze;
  - the G6a render-budget item;
  - G6b, G7 or G8.

### G6a close conditions (all required, in order; owners in brackets)

1. **Fixes land** [arabic-typographer specifies, motion-engineer implements]:
   - **B1:** F7 chip 6 becomes `6 AI` (the acronym stays Latin per the glossary). Fallback: mono `AI` with `margin-inline-start: 0.3em`.
   - **B2:** size-banded `JOIN_GAP` in `studio/src/type/arabic.ts`, with its test updated:
     - ≥ 56 px: caps 0.20 em, mixed case 0.14 em;
     - < 56 px: caps 0.25 em, mixed case 0.10 em.
   - **R1:** F6 grid set to `dir="rtl"`, with `←` and each number in its own LTR isolate; re-centre the labels.
   - **R2:** split the ghost title into `اللي أي حد شغال` / `في الداتا بيعمله`, each with its own `arrive`. The 6-word cut is allowed only with egyptian-arabic sign-off.
   - **R3:** F5 unit at 0.55 em (≈ 19 px).
2. **OCR check** [arabic-typographer]: run an isolated-render OCR (a one-off script, `python3 -I`, through the `tsp` queue). Each of these must score **≥ 0.90**:
   - `الترتيب داخل الـpartition`;
   - `قسم الـroadmap`;
   - `قسم الـidempotency`;
   - the F7 chip 6 text.

   The type suite must also pass with the new gap tests.
3. **Re-render and re-review** [render-ops, then arabic-typographer]:
   - re-render only the affected stills (F3, F4, F4-hero, F5, F6, F7, F8) and MD;
   - a fresh arabic-typographer review must return **PASS** (0 blocking, 0 required).
4. **No-regression diff** [render-ops]: diff the new stills against r3 at 960 px. Every pixel with |Δ| > 8/255 must lie inside the edited text boxes plus 16 px. Any change outside that triggers RT-2.
5. **Freeze and check** [motion-engineer, harness-engineer]:
   - freeze tokens, presets and the catalog only after conditions 1–4 hold;
   - harness-engineer implements `g06a.py`, which checks for this evidence and cites W-009-LOOK.
   - G6a passes only through `dc gate check G6a`.

### P7/P8 acceptance tests (carried; owner in brackets)

- **AT-1 MA opening** [scene-director, motion-engineer]: the `0.165` numeral is present from f0 (blur-in at its final position) and the title arrives by f10. No frame in the first 1 s may show only the caption.
- **AT-2 F4-hero** [motion-engineer]:
  - bokeh tinted cyan/violet with additive blend; large discs < 25 % opacity;
  - in MB-hero, one foreground element crosses the frame at about 3× plate speed.
- **AT-3 F3** [motion-engineer]: P2/P1 rows get 1.5–2 px blur and no digits, or digits at ≥ 24 px. The P1 cell must not be clipped at x 1100.
- **AT-4 F8/MD** [scene-director, visual-librarian]:
  - a receipt (F1 asset) travels gate to gate and changes state at each gate;
  - label baselines sit on one y;
  - the ghost title is not dimmed below 3.8:1.
- **AT-5 F1/F2/F5** [scene-director]:
  - F1: compose the empty bottom 250 px; the box interior must not be flat;
  - F2: animate the red rows or add parallax;
  - F5: show `5 s / 57 s` once only.
- **AT-6 Impact beats** [scene-director; sync-verifier checks]: MA `وغلط` and MD `كلها` become `{word, lead_frames}` anchors. Specs must contain no frame numbers.
- **AT-7 Arabic advisories** [arabic-typographer, scene-director]:
  - F5 chips at ≥ 28 px if the term is spoken (checked against the transcript);
  - F5 and F1 labels anchored to the right edge;
  - one chip-order rule (term at the RTL start).
- **AT-8 F7** [motion-engineer]: the leader line must not cross the tower base, and no far bars may sit behind the title tail.
- **AT-9 Plate cost** [render-ops; **blocks P10**]:
  - populate `perf.plates` (bake s/plate, MB per 10 s plate);
  - re-run the 24 h projection with the bake cost included;
  - write a disk plan against free space.
- **AT-10 `dc qa arabic`** [harness-engineer, arabic-typographer]: implement it with isolated-render OCR ≥ 0.9 and the open BiDi cases listed in `arabic_r3.md`. This is required for G6b; the one-off script from condition 2 is not G6b evidence.

### G8 no-waiver condition

- **Thresholds:** the pilot (CH-33 + DD-P23) and every chapter must reach:
  - visual mean ≥ 8.0 and min ≥ 6 (as in `06`);
  - for the pilot, also a parity read ≥ 7.5 on the same five sub-criteria as r3.
- **No waiver:** no G8 waiver may cite W-009-LOOK or "marginal pass" reasoning. A miss means a fix loop.
- **Note:** the like-for-like starting point is 7.82, because the G8 rubric has no cost column.

## Rationale

- The thresholds were met on the evidence. A fifth look round would fix the Arabic, which all options require anyway, and otherwise re-measure noise-level margins at token cost.
- The dissent's core demand is adopted as close conditions 1–3: fix and verify the Arabic, and freeze `JOIN_GAP` only after OCR ≥ 0.9.
- What is rejected is only the unconditional full re-score. It returns automatically under RT-1 or RT-2.

## Dissent (verbatim)

- **technical-accuracy (I1, 0.60):** "The look numbers technically pass: mean 8.014 (sum of family means 80.15/10) and parity 7.50 (7.5, 7.5, 7.5, 7.0, 8.0), min 7. So W1 would "waive" thresholds that were not missed. Both margins are zero on one critic read, and r3 explicitly warns against reading them as headroom. The real blocker is Arabic: B1 (F7 chip "AIJI") and B2 (F3/F4/F6 lam-to-Latin fusion, OCR "partitiond!|") are in the JOIN_GAP token ADR-003 would freeze. The 38/38 logic suite passes while the render fails. I1 as one bounded round: fix B1, B2, R1-R3 and critic issues 1-3, verify with isolated-render OCR >= 0.9, re-score once. Freeze only afterward." Risk: "W1 would freeze a known-bad JOIN_GAP token."
- **egyptian-arabic (I1, 0.68):** "Arabic review is FAIL with 2 blocking defects (arabic_r3.md). […] Blocking Arabic defects can't be waived, so a re-render and re-review is needed whatever we choose. W1 would waive thresholds that already pass (8.01, 7.5), and it would defer B2, a global JOIN_GAP change in arabic.ts that moves every mixed-string still. 22 of 35 OCR crops passed at 0.90 or higher, and the misses were mostly the الـ+Latin pattern. Run I1 as a narrow round: Arabic fixes only, plus critic issues 1-3. Don't touch anything else, so the 8.01 and 7.5 margins are re-measured and not eroded." Risk: "a JOIN_GAP change could shift look scores by 0.1 or more in either direction."
- **producer (W1, caveat):** "The W1 wording suggests the thresholds were missed when they were met. Record the ADR as a conditional close with the Arabic fixes as hard prerequisites, not as a waiver of Arabic." This is adopted in the Decision.

## Reversal triggers

- **RT-1:** if any of close conditions 1–4 fails after two fix attempts, W-009-LOOK lapses and I1 runs (one bounded round with a fresh critic re-score).
- **RT-2:** if the condition 4 diff shows a layout change outside the edited boxes, a fresh critic re-scores the changed stills. If the full-set look falls below 8.0 or parity below 7.5, the waiver lapses and I1 runs.
- **RT-3:** if AT-9 pushes the projection above 24 h, ADR-002 reopens (fps, FX share or scale-up), per G6a item 4.
- **RT-4:** if the first previewed chapter or the pilot misses visual mean 8.0 after its loop cap, the Council reopens the look direction (R1 back on the table) before more chapters are previewed. G8 is not waived.
- **RT-5:** if a fresh critic scores the P7 component equivalents of F1–F9 below look 8.0 or parity 7.5, G6a reopens for those components only.

## Consequences / follow-ups

- **arabic-typographer and motion-engineer:** close conditions 1–3.
- **render-ops:** condition 4 and AT-9.
- **harness-engineer:** `g06a.py` and AT-10.
- **scene-director:** AT-1, AT-4–AT-7 in P8 specs.
- **egyptian-arabic lens (before P8):** `5 ثواني مقابل 57`, `CH-34:labels_ar:0`, and R2 only if the 6-word cut is chosen.
- **fact-checker:** F7 district order and names, `Kafka` on district 4. The F3/F4 positions stay unlabeled as data.
- **critic:** pilot parity read at G8.
