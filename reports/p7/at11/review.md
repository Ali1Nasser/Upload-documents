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
