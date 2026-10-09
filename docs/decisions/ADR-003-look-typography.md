# ADR-003 — Look and typography: type pairing, look baseline, minimum label size

Status: decided (Council C2, 2026-10-09). Confidence: typography **low**; look baseline normal; label floor normal for spoken labels, **low** for the 18 px secondary floor.
Chair: council-chair. Brief: `docs/decisions/C2.brief.md` §2.

## Context

- **Evidence:**
  - `reports/lookdev/critic.md`, `reports/lookdev/README.md` and `reports/lookdev/contact.jpg`;
  - `docs/plan/04` §1, §3.2, §3.4 and §11;
  - `docs/plan/00` §4, row 003.
- **Candidate fonts:** all three share JetBrains Mono and Plex Sans Arabic 500–600 for labels. All fonts are OFL.
- **Look means:** T-A 7.50 (hero 7.55), T-B 7.40, T-C 7.15. The critic ranks them A > B > C.
- **Shaping:** 0 errors. There is one tashkeel collision (F5, ثوانٍ), and it comes from the layout.
- **G6a fails today** (look 7.4, parity 6.9, lowest criterion 4). The causes are composition, depth and micro-legibility, not the fonts:
  - labels are about 11–12 px, while `04` §3.2 sets object labels at 28–40 px.
- **G6a is not waived by this ADR.**

## Options

- **Typography:**
  - T-A: Alexandria 700 at ≥ 56 px, Plex 600 below that, with word-spacing 0.08 em; Inter Tight 700 for Latin.
  - T-B: Readex Pro 700 with Space Grotesk 700.
  - T-C: Plex Sans Arabic 700 with Inter Tight 700.
- **Baseline:**
  - LK-F: freeze now; critic fixes 1–5 become P7 requirements.
  - LK-H: hold the freeze until a re-scored set reaches ≥ 8.0.
- **Minimum label size:** 18 px or 28 px.

## Scores

Method and decision rule are as in ADR-002: the mean of 7 lenses, weighted by the brief, with mean confidence 0.64. Cross-review was skipped because agreement was 7/7 on both scored questions.

### Typography (votes: T-A 7/7)

| Criterion (weight) | T-A | T-B | T-C |
|---|---|---|---|
| impact and look (0.30) | 8.14 | 7.00 | 4.71 |
| Arabic legibility and shaping (0.30) | 7.00 | 7.29 | 8.43 |
| parity (0.15) | 6.86 | 6.14 | 5.29 |
| digit/Latin/mono pairing (0.10) | 7.57 | 7.29 | 7.00 |
| engineering risk (0.15) | 6.43 | 7.14 | 8.71 |
| **Weighted total** | **7.293** | **7.007** | **6.743** |
| Confidence-weighted | 7.289 | 6.995 | 6.736 |

Per-lens weighted totals:

| Lens | T-A | T-B | T-C |
|---|---|---|---|
| director | 7.45 | 6.85 | 7.05 |
| educator | 7.25 | 7.40 | 6.40 |
| motion-design | 7.40 | 6.85 | 6.70 |
| technical-accuracy | 7.25 | 7.00 | 7.10 |
| egyptian-arabic | 7.40 | 7.40 | 6.85 |
| audio-sync | 7.15 | 6.85 | 6.55 |
| producer | 7.15 | 6.70 | 6.55 |

Top two: T-A 7.293 vs T-B 7.007, margin 4.08 %.

- On their own weighted scores, the educator's lens ranks T-B first (7.40 vs 7.25) and the egyptian-arabic lens ties A and B (7.40). Both still chose T-A.

### Look baseline (votes: LK-F 7/7)

| Criterion (weight) | LK-F | LK-H |
|---|---|---|
| G6a risk (0.35) | 5.57 | 7.14 |
| schedule and token risk (0.35) | 8.00 | 3.43 |
| reversibility (0.30) | 6.43 | 8.00 |
| **Weighted total** | **6.679** | **6.100** |
| Confidence-weighted | 6.671 | 6.089 |

Per-lens weighted totals:

| Lens | LK-F | LK-H |
|---|---|---|
| director | 6.70 | 5.90 |
| educator | 7.00 | 6.25 |
| motion-design | 6.70 | 5.90 |
| technical-accuracy | 6.35 | 6.25 |
| egyptian-arabic | 7.00 | 6.60 |
| audio-sync | 6.65 | 5.90 |
| producer | 6.35 | 5.90 |

Top two: LK-F 6.679 vs LK-H 6.100, margin 9.49 %.

### Minimum label size (unscored)

| Position | Lenses |
|---|---|
| 28 px for object labels and any label tied to a spoken term or number | 7/7 |
| 18 px hard lint floor, for non-spoken secondary microcopy only | 5/7: motion-design, technical-accuracy, egyptian-arabic, audio-sync, producer |
| 28 px as the only minimum | director |
| 24 px hard floor, for tertiary text only ("none planned") | educator |

## Decision

### Typography: T-A (low confidence; 7/7 agree, margin 4.08 %)

| Use | Font and setting |
|---|---|
| Arabic display | Alexandria 700 at ≥ 56 px |
| Arabic below 56 px | IBM Plex Sans Arabic 600, word-spacing 0.08 em |
| Latin | Inter Tight 700 |
| Mono | JetBrains Mono |
| Labels | Plex Sans Arabic 500–600 |

- Any Arabic line with diacritics uses line-height ≥ 1.6.
- Title and subtitle are separated by at least +0.3 em. This fixes the F5 ثوانٍ collision.
- **Never mix T-A and T-B within a chapter.** A fallback to T-B, if one is triggered, swaps the whole film.

### Baseline: LK-F (decided; 7/7 agree, margin 9.49 %)

- Palette, tokens and pairing are frozen now.
- Critic fixes 1–5 are P7 requirements. They cover composition, depth and rim light, receipts, empty rows, haze and parallax planes, and label size.
- The 3 missing frames are built in P7: Holo-City, portal ignition, and an orbit with a kinetic word.
- G6a is re-scored after those fixes. **This freeze does not waive G6a.**

### Minimum label size: 28 px, with an 18 px secondary floor

- **28 px** is the minimum for object labels and for any label tied to a spoken term or number. Agreement is 7/7, and this matches `04` §3.2.
- **18 px** is a hard `dc spec lint` floor for non-spoken secondary microcopy only (5/7). This part is low confidence.

## Rationale

- **T-A** leads on impact and look (8.14 vs 7.00 vs 4.71), which is the criterion the critic says carries parity.
- T-C is the safest for Arabic legibility (8.43) and engineering risk (8.71), but "the impact word is visibly lighter and smaller".
- The 0.10 measured lead over T-B is within noise. For that reason confidence is low, and the post-preview re-score is the planned check.
- **LK-F** wins on schedule and token risk (8.00 vs 3.43). Tokens are the binding constraint at 5–8 k tokens per EDL sentence. The G6a gap is in composition, not in the tokens.

## Dissent (verbatim)

- **educator (labels):** "minimum label size = 28 px (hard floor 24 px only for tertiary captions-of-captions, none planned)"
- **director (labels):** "minimum label size 28 px"
- **egyptian-arabic (risk):** "Alexandria ر/ي collisions at real script are not yet tested; the fallback is T-B, but B and A must not be mixed within a chapter."
- **egyptian-arabic (risk):** "Microcopy such as 'بيشيل قبل أي حساب' and 'كاش الطبقات' is authored, not canon. It may not be natural Egyptian and needs an Egyptian-Arabic and fact-check pass before freeze."
- **technical-accuracy (risk):** "LK-F freezes tokens while look is 7.4, parity 6.9 and the lowest criterion 4. G6a must still be re-scored, and the ADR must say that it does not waive G6a."

## Reversal triggers

- **T-A → T-B (whole film).** Either of the following:
  - arabic-typographer finds ≥ 1 ر/ي (or other) collision in Alexandria at real script that line-height or spacing cannot fix;
  - the re-score after three preview chapters puts T-B ≥ T-A + 0.20.
- **LK-F → LK-H, for the failing tokens only.** The re-scored G6a set (fixes 1–5 plus the 3 missing frames) has look < 8.0 or parity < 7.5, **and** the critic attributes the gap to tokens (palette, type or FX) rather than to composition.
- **Label floor.** If 28 px labels push D6 density below 20 events/min in ≥ 2 chapters, review the per-scene label caps. The 28 px floor for spoken labels is not lowered.

## Consequences and follow-ups

- **arabic-typographer:**
  - ر/ي collision test on real script;
  - line-height and spacing tokens;
  - an Arabic CA = 0 check (ADR-002).
- **motion-engineer:** freeze the font, size and colour tokens in `studio/`, and implement critic fixes 1–5.
- **visual-librarian and scene-director:** build the 3 missing frames.
- **loop-engineer:** `dc spec lint` checks:
  - labels ≥ 28 px when spoken;
  - text ≥ 18 px otherwise;
  - no mixing of T-A and T-B in a chapter.
- **egyptian-arabic reviewer and fact-checker:** a dialect and fact pass on the authored microcopy before P8.
- **critic:** re-score G6a after P7.
