# C6 ballot — lens: producer (council-member, blind to other members)

Recorded verbatim by the lead from the member's read-only report (2026-10-30).

| Q | CR | choice | confidence | rationale |
|---|---|---|---|---|
| Q1 | CR-003 | accept-modified (M): wire direction, colour and the cross-cut streak; remove the whole-frame blur below hero; MatchCut `from/to/kind` and hero `CameraMotionBlur` go to P9 behind a perf run; one timing-guard pass shared with Q2, using the Q3 two-shot demo. | 0.70 | Engine not frozen, no hash moves; dropping the 24/12 px blur at standard saves compute (helps R5, 0.201); `CameraMotionBlur` unmeasured; MatchCut in 73/73 packs stays mapped. |
| Q2 | CR-004 | accept (A) | 0.60 | `follow` in 73/73 packs (a lint warning would fire constantly); small camera-resolve change inside the truck envelope; batch with Q1 so the timing guard runs once. |
| Q3 | CR-005 | accept-modified (M): extend `DemoDef` with a second shot now; defer `features` (synthetic, labelled) to P9. | 0.60 | Q1 needs the second shot; `p7.ts` not frozen; AudioReactive in 0 packs, approved at 7.0. |
| Q4 | CR-006 | accept-modified (M): no schema change. | 0.65 | Only 3 packs; keeps the contract frozen and out of the batch. |
| Q5 | CR-007 | accept-modified (M): cap 9, demo kept at 8; before the re-freeze, one non-baselined nine-stage 1080p overflow still. | 0.60 | Nine counts in the source; 8 packs incl. CH-33 need nine; 8-stage demo keeps the approved baseline (verify 0 px). |
| Q6 | CR-008 | accept-modified (M): `{key, count}` multiset, demo unchanged. | 0.60 | Cap 8 cannot fit `d:6.4:1` (Amara 4 + Ravi 3 + Lena 4 + Yuki 2 = 13 order rows + 2 null = 15); no re-baseline. |
| Q7 | CR-009 | accept (A) | 0.85 | `5 000` placeholder breaks D8; optional, 0 px, same batch. |
| Q8 | CR-010 | accept (A) | 0.80 | Removes placeholder numbers; 0 px; same batch. |
| Q9 | CR-013 | defer (D) to P9, or to when a sourced list exists; positions stay mapped. | 0.60 | No token-id fact; a field with no consumer. |
| Q10 | CR-014 | accept-modified (M): `{value, ref}` per score at the contract's precision (0.165, 0.227); fact-checker ruling on the neighbour pairing before the re-freeze. | 0.75 | Both pilot packs; 0.17 / 0.23 break contract precision; two conditions need two refs. |
| Q11 | CR-015 | defer (D) until sizes are sourced (P9 at the latest); slot-count eviction stays. | 0.65 | No per-item token fact. |
| Q12 | CR-016 | accept-modified (M): opt-in fifth `beat` still, enabled only for FixSettle, Pulse, FailureGlitch, PathDraw; existing four stills kept. | 0.55 | A global `a1` change could move 91 stills (60 approved); G6b snapshots already under churn. |
| Q13 | CR-017 | accept-modified (M): DOF at hero only; `planes[].blur > 0` in a standard shot is a lint **error**, not a warning. | 0.80 | Standard: 0.311 with one plane vs 0.201; no-blur already 0.194 (0.007 headroom); R5 → FX3 fallback; hero 0.478 of 1.038. Departs from 04 §1.3 "fake (blurred layers)" at standard → record in the ADR. |
| Q14 | CR-018 | accept-modified (A, gated): cap 6 and `choose.index` ≤ 5; six-branch 1080p overflow still first; fall back to a two-row fan if it overflows. | 0.70 | Dropping branches contradicts the narration (`0546`/`0547`) and 04 §6; no baseline risk; the still is cheap. |

## Scores (C1 .30, C2 .25, C3 .25, C4 .20)
- Q1: A 6.0, **M 7.8**, D 5.5, R 4.0 · Q2: **A 7.4**, D 6.6, R 5.0 · Q3: A 5.0, **M 6.8**, D 6.0, R 5.5 · Q4: A 6.0, **M 7.4**, D 5.8, R 4.5
- Q5: A 6.4, **M 7.6**, D 5.0, R 3.0 · Q6: A 4.0, **M 7.4**, D 5.5, R 3.5 · Q7: **A 8.6**, D 5.0, R 3.0 · Q8: **A 8.4**, D 5.0, R 3.0
- Q9: A 6.0, **D 6.6**, R 5.8 · Q10: A 4.5, **M 7.8**, D 6.0, R 5.5 · Q11: A 5.2, **D 6.8**, R 6.2 · Q12: A 5.2, **M 6.8**, D 6.4, R 5.6
- Q13: A 5.0 (unmeasured), **M 8.0**, D 6.0, R 6.4 · Q14: **A 7.6**, D 4.5, R 3.5

## Producer summary
- One schema ADR and one re-freeze covers Q5, Q6, Q7, Q8, Q10, Q14, then `dc gate check G6a`; Q9 and Q11 deferred; Q4 no schema change. Each of the six must show 0 px on baselines when the demo omits the new prop.
- One timing-guard run covers Q1 and Q2.
- Experiments are tiny: a few single-frame 1080p stills plus ~47 s perf runs.
- Disk: 4.1 GB free at ballot time vs the 3.2 GB queue refusal (~0.9 GB headroom). Any 10 s two-shot hero render writes to scratch and is deleted after measuring.

## Flags
1. Free disk 4.1 GB, not ~4.5 GB; headroom is thinner than the brief implies.
2. The Consequences section lists Q4–Q11 as schema CRs, but Q4-M is no schema change; Q3-A and Q13-A are not labelled with their contract effect.
3. Q13 figures are CR text only (no perf JSON); the direction (reject at standard) is safe either way.
4. Q6: a plain row cap would need 15, not 13; the multiset is better.
5. CR file: 20 lines, 18 ids; the 14 in-scope CRs are all `open`.
6. G6b still fails 4/5; Q12 and Q14 add snapshot/perf load on the critical path → kept opt-in and gated.
