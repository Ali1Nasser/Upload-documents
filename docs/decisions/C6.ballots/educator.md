# C6 ballot — lens: educator (council-member, blind to other members)

Recorded verbatim by the lead from the member's read-only report (2026-10-30). Lens: can P8 scene-directors express each teaching beat, and does every spoken number and term get drawn with a ref (D4/D8)?

| Q | CR | choice | confidence | rationale |
|---|---|---|---|---|
| Q1 | CR-003 | accept-modified (the brief's M): wire direction, colour, no blur below hero, the cross-cut streak; defer MatchCut geometry and hero blur to P9 after the 10 s two-shot perf run; MatchCut stays a dissolve with a 1.04 scale meanwhile. | 0.60 | Always-RTL direction and whole-frame blur at lite/standard break the cause-then-effect reading and 04 §1.3; engine-only, no hash change; geometric MatchCut not needed to express a beat, and unmeasured. |
| Q2 | CR-004 | defer (P9); until then `follow` maps to `truck` with a lint warning. | 0.55 | Learners are guided by spotlight, CalloutArrow and dim, not camera drift; not worth a timing-guard re-run before the pilot. |
| Q3 | CR-005 | defer (P9); the real-P5 strip stays the proof. | 0.80 | AudioReactive in 0 packs; synthetic features would re-baseline an approved component; the Q1 two-shot need can be handled inside Q1's experiment. |
| Q4 | CR-006 | accept-modified (the brief's M): no schema change; lint accepts the shot's `data_refs` for the printed boundaries. | 0.60 | "500 ms" is spoken and the boundary printed, so the beat is expressible; per-zone refs stronger but not needed; cheap to fold into the batch if others want A. |
| Q5 | CR-007 | accept-modified (M): cap 9, with a nine-stage 1080p overflow render as a condition of the ADR; the demo may stay at 8 if no overflow. | 0.70 | Narration says "nine stages" and counts 14, 13, 11, 2, 2, 2, 2, 2, 1 (`d:6.3:2`, `d:6.3:16`); dropping DISTINCT fails D4 on CH-11 and 8 packs. |
| Q6 | CR-008 | accept-modified (M): multiset `{key, count}` per table, ≤ 8 keys and counts ≥ 4 allowed, so 13 order rows fit; a ref for the counts. | 0.70 | The beat is the fan-out: 6 in, 15 out (Amara 4, Ravi 3, Lena 4, Yuki 2, Tom and Sara null); an 8-row cap cannot show it. |
| Q7 | CR-009 | accept (A) | 0.85 | `5 000` is a false quantity; D2 says n is never shown; pure removal, 0 px. |
| Q8 | CR-010 | accept (A) | 0.80 | Ordinal bars teach A/B splitting without digits while `add:6.12:10..13` are unratified. |
| Q9 | CR-013 | defer (until sourced, P9 at the latest); positions (#3) stay mapped. | 0.80 | No token-id fact; positions teach tokenisation fully. |
| Q10 | CR-014 | accept-modified (M): `{value, ref}` per score at the contract's precision (0.165, 0.227). | 0.85 | Narration says 0.165 and 0.227; 2-decimal printing breaks D4/D8; two conditions need two refs; in both pilot packs. |
| Q11 | CR-015 | defer (until sourced, P9 at the latest); slot-count eviction (5 cards) stays, with the 4,000–128,000 range on the gate (`s:S4:P22:0074`). | 0.75 | Cards teach "oldest drops out"; per-item sizes would be invented. |
| Q12 | CR-016 | accept-modified (the brief's M): optional fifth `beat` still, keeping the existing four; no global rule change. | 0.60 | For FixSettle and Pulse the a1 still is pre-beat; tooling only, no P8 effect. |
| Q13 | CR-017 | accept-modified (the brief's M): DOF at hero only, plus a lint warning for `planes[].blur > 0` in standard shots; focus guidance at standard uses dim, scale, CalloutArrow. | 0.65 | 0.311 (one plane) / 0.485 (two) vs 0.201 → R5; half-size saving unmeasured; the learner loses nothing. Deviates from 04 §1.3 → ADR must amend or waive. |
| Q14 | CR-018 | accept-modified (A, conditional): cap 6 and `choose.index` ≤ 5 in the same re-freeze as a measured six-branch layout (no overflow, snap and perf pass); if the render fails, fall back to D (two layers). | 0.65 | Narration says "six destinations" (`0546`, `0547`); 04 §6 six lit paths; only CH-35, DD-P25 affected. |

## Scores (C1 0.30 / C2 0.25 / C3 0.25 / C4 0.20; educator reading)
- Q1: A 6.0, M 7.4, D 5.0, R 3.5 · Q2: A 6.0, D 6.8, R 5.0 · Q3: A 3.5, M 4.5, D 7.5, R 6.5 · Q4: A 6.8, M 7.0, D 5.5, R 4.5
- Q5: A 6.8, M 7.4, D 3.5, R 2.5 · Q6: A 5.0, M 7.6, D 5.0, R 3.5 · Q7: A 8.8, D 5.0, R 4.5 · Q8: A 8.0, D 5.5, R 4.5
- Q9: A 5.0, D 7.8, R 7.0 · Q10: A 4.5, M 8.5, D 5.5, R 5.0, Experiment 6.0 · Q11: A 5.0, D 7.5, R 6.5
- Q12: A 5.5, M 7.2, D 5.5, R 4.0 · Q13: A 5.0, M 7.4, D 6.0, R 5.5, Experiment 6.0 · Q14: A 7.0, A-conditional 7.5, D 5.0, R 4.0, Experiment 6.5

## Flags
1. Verified in `corpus/canon/data_contract.json`: `d:6.3:2`/`d:6.3:16` (nine stages); `d:6.4:1` (15 rows out; 13 order rows); `d:6.18:1` = 0.165 and `d:6.18:2` = 0.227 are different items under different conditions (roadmap section vs idempotency section), not ranks in one query, so CR-014's rank-ordered `scores` array misrepresents them (supports M).
2. Q5: the funnel's home chapter is CH-11 (where the "nine" fact lives); test the nine-stage overflow against the CH-11 spec shape, not only the demo.
3. Q1: the brief calls WhipPan / LightStreakTransition / MatchCut "mapped (unmountable)" while MatchCut is in 73/73 packs; the ADR must state what P8 does with an unmountable pack component (e.g. "P8 uses a plain cut or dissolve").
4. Q13: M and R deviate from 04 §1.3 "standard DOF: fake (blurred layers)"; the ADR must amend 04 or waive.
5. Q10: with D4 (spoken numbers on screen at spoken precision), 2-decimal printing is a correctness defect.
6. Batch scope from this lens: re-freeze Q5, Q6, Q7, Q8, Q10, Q14 (Q4 optional); Q9 and Q11 wait for sourced facts.
