# ADR-002 — Render stack: frame rate, GL backend, hero strategy, FX tiers

Status: decided (Council C2, 2026-10-09). Confidence: Q2.1 **low**, Q2.2 normal, Q2.3 normal, Q2.4 **low**.
Chair: council-chair. Brief: `docs/decisions/C2.brief.md`.

## Context

- **Evidence:**
  - `reports/perf/render_bench.md` and `reports/perf/lookdev.json` (swiftshader, concurrency 3);
  - `reports/lookdev/critic.md` and `reports/lookdev/README.md`;
  - `reports/story/E-001.md`;
  - `docs/plan/00` §1 (D1), §4, §7;
  - `docs/plan/04` §1.3, §4 and §5.
- **Runtime range:** planned at 4:02:00–4:10:07, because ADR-001 is still open.
- **Cost model** (brief §1): hours = frames × [(1−h)·S + h·H] / 3600, with S = 0.141–0.183 and H = 0.904–1.038 box s/frame. At 4:10:07 this gives:

  | Configuration | Pure render | With +25 % |
  |---|---|---|
  | 24 fps, 5 % hero | 17.9–22.6 h | 22.4–28.3 h |
  | 30 fps, 5 % hero | 22.4–28.3 h | 28.0–35.4 h |
  | 30 fps, 0 % hero | 17.7–22.9 h | 22.1–28.7 h |
- **Other measured evidence:**
  - CSS hero FX cost nothing extra (MA 0.398 vs 0.384 s/frame/slot). The critic finds them "not distinguishable at contact-sheet scale".
  - At 4,000 particles, F4 legibility scored 4.
  - MB-hero PSNR between swiftshader and swangle is 24.9 dB, and swangle is 2.3–5× slower.
  - With `@remotion/three` 4.0.534, the first frame in each tab renders blank. A warmup fix exists.
- **G6a is not waived by this ADR.** Today it measures look 7.4, parity 6.9 and lowest criterion 4.
- **Budget reading (chair, challengeable):**
  - The 24 h budget is read as the **pure P12 final-render projection**. Sources: `00` §7 lists "P12 Final render … 6–24 h CPU", and the plan text says "If the P0 benchmark projects more than 24 h".
  - The bench's +25 % (encode, conform, re-renders, retries) is tracked as contingency, not as part of the 24 h.
  - Reversal trigger R2 below covers the case where the harness reads the budget the other way.

## Options

| Question | Options |
|---|---|
| Q2.1 Frame rate | F30 · F24 (leads re-specified) |
| Q2.2 GL backend | GL-SS swiftshader everywhere, never mixed · GL-SW swangle · GL-AN angle |
| Q2.3 Hero strategy | RT15 · RT10 · RT5 (≤ 5 % real-time WebGL, standard 2.5D otherwise) · PL plates · HY hybrid |
| Q2.4 FX tiers | FX2 (standard lifted to the CSS hero values; hero = WebGL only) · FX3 (the tiers as authored) |

## Scores

- **Method:**
  - Each cell is the mean of the 7 lenses' 1–10 scores, weighted with the brief's weights (summing to 1.0).
  - The confidence-weighted total uses member confidences 0.60 / 0.60 / 0.68 / 0.62 / 0.60 / 0.70 / 0.68, with a mean of **0.64**.
- **Decision rule (computed task):**
  - Decide when at least 5 of 7 lenses agree and the top two differ by more than 5 %.
  - Otherwise take the higher weighted score, mark confidence low, and list reversal triggers.
- **Cross-review** was skipped for Q2.1, Q2.2 and Q2.3, where agreement was at least 5/7. For Q2.4 (4/7) it was not run in this workflow either. Q2.4 is settled by weighted score at low confidence.

### Q2.1 Frame rate (votes: F24 5/7 = director, educator, motion-design, technical-accuracy, producer; F30 2/7 = egyptian-arabic, audio-sync)

| Criterion (weight) | F30 | F24 |
|---|---|---|
| render hours vs budget (0.30) | 3.43 | 7.71 |
| motion cadence (0.20) | 7.71 | 6.57 |
| sync precision (0.20) | 8.29 | 6.71 |
| rework and conformance (0.15) | 8.86 | 5.00 |
| delivery size (n/m) (0.05) | 5.00 | 5.43 |
| reversibility (0.10) | 5.43 | 5.57 |
| **Weighted total** | **6.350** | **6.550** |
| Confidence-weighted | 6.344 | 6.554 |

Per-lens weighted totals:

| Lens | F30 | F24 |
|---|---|---|
| director | 6.50 | 6.85 |
| educator | 6.30 | 6.55 |
| motion-design | 6.10 | 6.95 |
| technical-accuracy | 6.20 | 6.60 |
| egyptian-arabic | 6.80 | 5.85 |
| audio-sync | 6.70 | 6.05 |
| producer | 5.85 | 7.00 |

Top two: F24 6.550 vs F30 6.350, margin 3.15 %.

### Q2.2 GL backend (votes: GL-SS 7/7)

| Criterion (weight) | GL-SS | GL-SW | GL-AN |
|---|---|---|---|
| speed (0.40) | 7.71 | 3.14 | 7.43 |
| pixel parity and determinism (0.30) | 8.29 | 5.14 | 5.43 |
| evidence depth and operational risk (0.30) | 7.43 | 5.57 | 2.71 |
| **Weighted total** | **7.800** | **4.471** | **5.414** |
| Confidence-weighted | 7.793 | 4.473 | 5.396 |

Per-lens weighted totals:

| Lens | GL-SS | GL-SW | GL-AN |
|---|---|---|---|
| director | 7.70 | 4.50 | 5.90 |
| educator | 7.90 | 4.90 | 5.20 |
| motion-design | 7.60 | 4.20 | 5.20 |
| technical-accuracy | 8.00 | 4.20 | 5.60 |
| egyptian-arabic | 8.00 | 4.20 | 5.90 |
| audio-sync | 7.70 | 4.80 | 4.90 |
| producer | 7.70 | 4.50 | 5.20 |

Top two: GL-SS 7.800 vs GL-AN 5.414, margin 44.07 %.

### Q2.3 Hero strategy (votes: RT5 7/7)

| Criterion (weight) | RT15 | RT10 | RT5 | PL | HY |
|---|---|---|---|---|---|
| render hours at chosen fps (0.25) | 1.86 | 3.29 | 6.57 | 6.71 | 6.00 |
| look and parity (0.25) | 7.43 | 7.43 | 6.57 | 5.57 | 7.29 |
| legibility and word anchoring (0.15) | 3.86 | 5.00 | 7.71 | 7.57 | 7.57 |
| engineering and token risk (0.15) | 4.86 | 5.43 | 7.43 | 4.14 | 4.14 |
| repetition risk (0.10) | 7.14 | 7.00 | 6.57 | 3.14 | 5.29 |
| reversibility (0.10) | 4.00 | 5.43 | 7.86 | 4.43 | 5.71 |
| **Weighted total** | **4.743** | **5.486** | **7.000** | **5.586** | **6.179** |
| Confidence-weighted | 4.735 | 5.476 | 6.998 | 5.583 | 6.172 |

Per-lens weighted totals:

| Lens | RT15 | RT10 | RT5 | PL | HY |
|---|---|---|---|---|---|
| director | 5.05 | 5.70 | 7.50 | 5.65 | 6.40 |
| educator | 4.80 | 5.55 | 6.65 | 5.35 | 6.15 |
| motion-design | 4.55 | 5.55 | 7.75 | 5.25 | 5.90 |
| technical-accuracy | 5.20 | 5.60 | 6.90 | 5.35 | 6.30 |
| egyptian-arabic | 4.45 | 5.60 | 6.90 | 6.15 | 6.25 |
| audio-sync | 4.65 | 5.30 | 6.40 | 5.90 | 6.10 |
| producer | 4.50 | 5.10 | 6.90 | 5.45 | 6.15 |

Top two: RT5 7.000 vs HY 6.179, margin 13.29 %.

### Q2.4 FX tiers (votes: FX2 4/7 = director, motion-design, egyptian-arabic, producer; FX3 3/7 = educator, technical-accuracy, audio-sync)

| Criterion (weight) | FX2 | FX3 |
|---|---|---|
| look gain (0.35) | 6.57 | 4.71 |
| legibility (0.30) | 6.14 | 7.43 |
| cost (0.20) | 7.57 | 7.57 |
| simplicity (0.15) | 6.71 | 6.71 |
| **Weighted total** | **6.664** | **6.400** |
| Confidence-weighted | 6.666 | 6.403 |

Per-lens weighted totals:

| Lens | FX2 | FX3 |
|---|---|---|
| director | 7.05 | 5.60 |
| educator | 5.70 | 6.80 |
| motion-design | 7.50 | 6.35 |
| technical-accuracy | 5.90 | 6.50 |
| egyptian-arabic | 7.55 | 6.65 |
| audio-sync | 5.90 | 6.75 |
| producer | 7.05 | 6.15 |

Top two: FX2 6.664 vs FX3 6.400, margin 4.12 %.

**Unscored sub-choices (7/7):** a hero particle cap of 1,500, and text-safe masks on.

## Decision

### Q2.1: F24, 1080p24 (low confidence; 5/7 agree, margin 3.15 %)

- D1's clause "24 fps only if ADR-002 says so" is hereby invoked.
- **Specs keep the `{word, lead_frames}` contract.** `lead_frames` are 24 fps frames. This ADR amends the `04` §4 timing table for this film by preserving milliseconds: `lead_frames_24 = round(lead_frames_30 × 33.333 / 41.667)`.

| Event (`04` §4) | 30 fps value | 24 fps value |
|---|---|---|
| Kinetic word or phrase | 3 frames (100 ms) | **2 frames (83 ms)** |
| Graphic state change | 2 frames (67 ms) | **2 frames (83 ms)** |
| Shot cut | 4–6 frames (133–200 ms) | **3–5 frames (125–208 ms)** |
| SFX lead (`05` example) | 4 frames (133 ms) | **3 frames (125 ms)** |
| Result hold | ≥ 1.2 s | **≥ 29 frames** |
| Prediction pause | ≤ 6 s | **≤ 144 frames** |

- Counters still land at the end of the number word.
- Worst-case rounding is 20.8 ms, against the G10a median target of ≤ 40 ms.

### Q2.2: GL-SS (unanimous; margin 44.1 %)

- swiftshader is used for every render class: previews, pilot and final.
- Backends are **never mixed** within a shot, chunk set or chapter.
- This replaces the `--gl=swangle` assumption in the `00` §4 default.

### Q2.3: RT5 (unanimous; margin 13.3 %)

- Real-time WebGL (R3F) is capped at **≤ 5 % of film runtime**.
- That share is spent first on CH-00, CH-33 and 3–4 part transitions (director), and then on word-anchored hero beats.
- All other hero moments use the standard 2.5D tier with CSS hero FX.
- This amends the `04` §1.3 hero row ("≤ 15 % of film") and the `04` §5 per-chapter limit of 15 % for this film.
- The R3F first-frame warmup fix is **mandatory** before any R3F shot is queued.
- **Projection** (F24 + RT5): 17.9–22.6 h pure at 4:10:07, and 17.3–21.9 h at 4:02:00.

### Q2.4: FX2 (low confidence; 4/7 agree, margin 4.12 %)

- **Amended standard row of `04` §1.3** for this film:
  - glow 10/32 px (inner/outer);
  - grain 1.5 %;
  - vignette 15 %;
  - haze 8 %;
  - particles ≤ 1,500;
  - **chromatic aberration ≤ 0.6 px on Latin and numeral impact words only, and 0 on every Arabic glyph run.**
- The CA scoping is a chair condition taken from the egyptian-arabic lens, whose stated reason is that CA "would fringe nuqat and diacritics". The chair applies that reason to all Arabic runs, because nuqat are present everywhere. This is taste, carried by the egyptian-arabic lens. It also answers the FX3 dissent below.
- **Hero tier** = WebGL only: bloom 0.8–1.2, with the particle cap lowered from 5k to **1,500**.
- **Text-safe masks are ON:** particles, haze and bloom are masked out of every text box plus padding.
- **Lite** is unchanged and used for previews.

## Rationale

- **F24.** It is the only frame rate whose measured band fits a 24 h pure render with any hero share. At 30 fps the RT5 band is 22.4–28.3 h, which is over budget in the worst case.
  - Its 3.15 % lead comes almost entirely from render hours (7.71 vs 3.43).
  - F30 leads on sync (8.29 vs 6.71) and rework (8.86 vs 5.0).
  - The rework cost is contained by keeping `lead_frames` and converting the `04` §4 table once, before P8 specs exist.
- **GL-SS.** It is fastest-equal, deterministic, and avoids the 24.9 dB MB-hero divergence.
- **RT5.** It ranks first for every lens. It protects legibility, given that 4,000 particles produced legibility 4, and it keeps the projection inside budget.
- **FX2.** This is the critic's own recommendation: "Lift the CSS glow/haze/CA toward the hero values inside 'standard'" (`reports/lookdev/critic.md`). Its cost is measured as about zero.

## Dissent (verbatim)

- **egyptian-arabic (F30):** "F30 keeps lead_frames precise for word-anchored Arabic reveals (16.7 ms vs 20.8 ms worst rounding) and matches D1."
- **audio-sync (F30):** "F30 gives worst-case frame rounding of 16.7 ms against 20.8 ms at 24 fps. The 04 section 4 leads (-3 to -6 frames) mean 100-200 ms at 30 fps but 125-250 ms at 24 fps, so F24 re-tunes every lead."
  - Chair note: the conversion table above keeps the leads at 83–208 ms, not 125–250 ms.
- **educator (FX3):** "FX3 with a 1,500-point cap and text-safe masks avoids freezing a new CA number against 04 §1.3."
- **technical-accuracy (FX3):** "FX2's 0.6 px CA breaks the 04 §1.3 cap of 0.5 px, and 4,000 particles scored legibility 4."
- **audio-sync (FX3):** "FX3 keeps the onset frame crisp. CA 0.6 px blurs impact-word onsets."
- **technical-accuracy (risk):** "F24 and RT5 may still miss 24 h in the worst band (22.4–28.3 h with +25%). The plan does not say whether the 24 h budget includes the +25%, so ADR-002 needs a measured per-chunk benchmark at the first chapter render. ADR-002 should not claim G6a passes."

## Reversal triggers

Owners are named in brackets.

- **R1 (F24 → F30).** Any one of the following, evaluated at the G8 pilot:
  - (a) sync-verifier measures median > 40 ms or p95 > 100 ms, and ≥ 50 % of the excess is attributable to frame quantisation;
  - (b) the critic scores motion cadence ≤ 6 on kinetic Arabic type or whip-pans and attributes it to 24 fps;
  - (c) the measured blended rate is ≤ 0.170 box s/frame, so F30 would project ≤ 21.3 h pure.

  Reversal means a deterministic spec migration: `lead_frames × 1.25`, rounded.
- **R2 (budget).**
  - If the measured blended rate at the first chapter render exceeds 0.240 box s/frame (more than 24 h pure at 24 fps), cut the hero share to 3 %, then to 1 %, and only then open a scale-up ADR, which needs the user. [render-ops]
  - If the harness reads the 24 h as including the +25 %, use the same ladder: the worst band fits only at a hero share ≤ 1.0 %.
- **R3 (GL).** Move to GL-AN only if angle is measured ≥ 1.5× faster on ≥ 3 classes **and** reaches PSNR ≥ 40 dB against swiftshader on MB-hero. GL-SW stays out. [render-ops]
- **R4 (RT5 → RT10 in arc peaks only).** Allowed if the G6a re-score has parity < 7.5 with depth or light as the lowest criterion, **and** R2 shows ≥ 2 h of headroom. Each +1 % costs 0.72–0.90 box-h. [critic, render-ops]
- **R5 (FX2 → FX3).** Any one of the following:
  - the critic re-scores legibility < 7 on an FX2 standard frame and names glow, haze or grain as the cause;
  - arabic-typographer reports fringing or bleed on nuqat or tashkeel;
  - the measured FX2 standard rate exceeds 0.201 box s/frame (S-hi + 10 %).

  Reversal is a token swap with no component change. [motion-engineer]

## Consequences and follow-ups

- **render-ops:**
  - set the render config to `fps: 24` and `gl: swiftshader` for all queues, and record both in the spec-pack metadata;
  - run the per-chunk benchmark at the first chapter render and re-project hours with and without +25 %.
- **motion-engineer:**
  - R3F warmup fix;
  - FX2 standard tokens;
  - hero particle cap 1,500;
  - text-safe masks;
  - the CA run-scoping (Latin and numerals only).
- **loop-engineer / harness-engineer:** `dc spec lint` must enforce:
  - hero share ≤ 5 % per film (budgeted to CH-00, CH-33 and transitions first);
  - particle cap ≤ 1,500;
  - the 24 fps `lead_frames` table;
  - no backend mixing.
- **sync-verifier:** measure G8 pilot sync at 24 fps against S5 word times (R1a).
- **critic:** check cadence in the pilot (R1b), and re-score G6a after the P7 fixes. G6a remains open.
