# AT-11 review (ADR-010): 34/32 px الـ+Latin labels in motion

Reviewer: arabic-typographer (the author, motion-engineer, did not grade). Result: **PASS** (with two scope notes below).

## Evidence
- Frames: `reports/p7/at11/{wipe,arrive}_{t1,t2,t3,settled}.jpg`, labels at 34 px and 32 px, JOIN_GAP text band (caps 0.25 em, mixed 0.30 em).
- `python3 tools/dc.py qa arabic --frames <items> --label at11-settled`, 24 items (2 presets x 2 sizes x 6 labels) cropped from the settled frames: **PASS, 24/24 OCR 1.0 (min 1.0, exact 24)**, tofu 0, overflow 0, bidi 0, joins 0. Report: `reports/qa/arabic/at11-settled.json`.

## Criteria
1. OCR >= 0.90 on settled frame: PASS (1.0 everywhere, including `6 الـAI`, `الـAPI`, `الـKPI`, `قسم الـidempotency`, `الترتيب داخل الـpartition`).
2. No join junk (`J|`, `d!`, `JI`, `]`): PASS on settled frames (exact matches). On mid-wipe frames (t1-t3) `ara` OCR returns garbage only on the clipped Latin half-glyphs (e.g. `:031161011`, `/إ01616`), which is a wipe-mask artefact on a mixed-script row, not a join defect. The Arabic prefix (`الترتيب داخل ال`, `قسم ال`) reads correctly in every sampled frame.
3. Gap vs two words (native-reader judgement): PASS.
   - Measured on the settled 34 px frame (ink gaps, px): word space between Arabic words 13-14; article-to-Latin gap 10-11 for mixed case (about 75-80 % of a word space) and 8 for caps (about 60 %). So the Latin is bound closer to `ال` than any word is to its neighbour.
   - `ال` has no stand-alone meaning, so even with a visible gap a native reader parses it as the article prefixed to the Latin term, not as a detached word. The tatweel foot is short but visible in the zoomed crop.
   - In RTL wipe/arrive the article is revealed before the Latin; the brief frame of `ال` plus empty space plus first Latin letter (`ال n`, `ال I`) reads as "article, then term arriving", not as a stranded word. No frame reads as the Latin being two words.
   - Caps rows (`الـAPI`, `الـKPI`, `6 الـAI`) at 0.25 em are tight and clean at 32 and 34 px; RT-010-4 is not triggered.

## Notes and limits
- Do not widen the text band above 0.30 em: the mixed-case gap is already near the upper limit of "one unit".
- Scope: this review covers the 34/32 px labels. The 92 px display case `الترتيب داخل الـpartition` (AT-11 string 3) is not in `reports/p7/at11/`; it is covered by the r3 re-check (OCR 1.00) but not in motion here.
- Sampled progress is 0.685 / 0.90 / 0.97 / 1.0, not 25/50/75/100 %. The earlier half of the wipe (Latin barely revealed) was not sampled; it only shows the article, so it cannot create a gap defect, but it is stated for the record.
- Native-reader veto: none raised.

---

# AT-11 re-review after ADR-011 RV1 (`*_rv1` clips and frames)

Reviewer: arabic-typographer (the author, motion-engineer, did not grade). Result: **PASS**.

RV1 moves the first visible reveal step onto the anchor frame (REVEAL_ONSET_F = 1). The wipe starts at progress 0.685 on frame 8 instead of one frame later. That changes only the timing of the reveal. The glyph layout, join gap (0.25 / 0.30 em) and fonts are unchanged.

## Evidence
- Frames: `reports/p7/at11/{wipe,arrive}_{t0,t1,t2,settled}_rv1.jpg` (t0 = anchor frame 8, t1 = frame 9, t2 = frame 10, settled = frame 47). Labels at 34 and 32 px, 6 strings.
- Settled frames: `dc qa arabic --frames ... --label at11-rv1-settled` gave **PASS, 24/24 OCR 1.0 (exact 24)**. Tofu 0, overflow 0, bidi 0, joins 0. Report: `reports/qa/arabic/at11-rv1-settled.json`. Identical to the RV2 result.
- Reveal frames (informational, not a gate): `--label at11-rv1-midwipe`, 72 crops.
  | frame | min OCR | range |
  |---|---|---|
  | t0 (anchor) | 0.545 | 0.545-0.909 |
  | t1 | 0.909 | 0.909-1.0 |
  | t2 | 0.957 | 0.957-1.0 |
  The tool flags 17 t0 crops as RT-010-2 "Latin damaged". This is expected. At 0.685 progress the Latin half is only partly revealed, so the OCR is scored against the full string and the clipped glyphs (`n`, `nap`, `PI`, `I`) read as junk, for example `PT JI`. I read the crops by eye and the `ال` is not damaged in any of them. From t1 on, every crop is >= 0.9.

## Native-reader judgement
1. **Anchor frame (new in RV1).** The Arabic prefix is complete and sharp in all 12 rows (`الترتيب داخل ال`, `قسم ال`, `ال`, `6 ال`). The Latin shows only a 1-frame sliver (42 ms at 24 fps) at the end of the line. A reader takes this as the term arriving, not as a broken word, and no Arabic letter is cut mid-glyph. The sliver is a Latin-only mask edge, which is allowed.
2. **Article gap.** Settled gaps are unchanged: 8.5 / 10.2 px at 34 px and 8 / 9.6 px at 32 px (caps / mixed). `ال` still binds to the Latin term more tightly than any word space, which is 13-14 px. RT-010-4 is not triggered.
3. **Arrive preset at t0.** The blur and 0.92 scale soften the Arabic, but it stays readable. The OCR at t0 matches the wipe within 0.03. By t1 the min OCR is 0.909 and by t2 it is 0.957. No halo or legibility veto.
4. **Join junk (`J|`, `d!`, `]`).** Not seen visually in any frame at any step. The tool's `JI` strings at t0 come from the clipped Latin, not from the join.

## Limits
- The wipe is sampled at progress 0.685, 0.90, 0.97 and 1.0. Before the anchor (progress < 0.685) nothing is drawn, so there is nothing to review.
- The 92 px display case is still covered by r3 (OCR 1.00) and not in motion here.
- Native-reader veto: none. The RV1 AT-11 clips are accepted for the arabic-typography criteria of ADR-010.
