# P7 snapshot baselines review (critic)

Date: 2026-10-10. Reviewer: critic (did not author). Scope: studio/test/baselines/{KineticWord,NumberCounter,TableGrid}/ p0, a1, p50, p100 at full size (960x540 lite tier), judged against 06 section 3.2 and 04.

Verdict: all three APPROVED (status approved-critic). Scores: KineticWord 7, NumberCounter 7, TableGrid 8. No blocking issues.

Note: p0 is byte-identical across the three (empty backdrop, sha 84797c...). That is correct (nothing has entered yet) but p0 carries no regression signal; a1/p50/p100 do.

## KineticWord (7/10)
- Good: clear three-level hierarchy (white upper-third, cyan impact KPI, dim sub-label); whole-word units; BiDi "الـpartition" lays out correctly (Arabic right, Latin left); tanween on ثوانٍ shaped correctly; palette limited to ink / signal cyan / ink2.
- Issue (non-blocking, KineticWord p50/a1): a faint hard-edged rectangle sits behind KPI and ثوانٍ (luminance steps 17 to 14 across a straight edge). Reads as a clipped shadow or scrim. Fix: blurred/radial scrim or remove the box.
- Issue (non-blocking): impact word has no visible bloom or light in p50, so "impact" is carried by color only. Fix: add the FX-tier bloom at the impact frame.
- Depth comes only from the shared backdrop; acceptable for a component still.

## NumberCounter (7/10)
- Good: crisp tabular numerals, unit subordinate (% and EGP in ink2), Arabic labels correct (نسبة النجاح, الإجمالي), counter end-state clear, second counter enters without moving the first (stable layout).
- Issue (non-blocking): the card plate is almost invisible with a hard edge (same artifact family as above); decimal point has a wide gap ("59 . 32") because of the tabular dot cell; labels are small at 960 px. Fix: kern the dot cell, raise label size about 1.25x, soften the plate.
- Mid-count (p50) already shows the final value, so the baselines do not capture an in-flight count; consider moving p50 earlier for this component in a later re-baseline (not blocking).

## TableGrid (8/10)
- Good: correct RTL column order (T1 rightmost, الحالة leftmost), BiDi title "إيصالات NilePay", mono numerics, failed rows in token red with a leading-edge bar (cause visible), p100 shows filter + sort result (T3/T6 removed, T5 first) so the mechanism is readable from stills; card border and shadow give real depth.
- Issue (non-blocking): the card spans only about 31% of frame width; body text about 15 px at 960. Fix: let the component scale to a larger slot for hero use. Header ink is dim but legible.

## Actions
Metas updated: approval and status = approved-critic, with score, date and notes. Hashes untouched. Non-blocking fixes should go through a re-baseline with --approve and a new critic pass.
