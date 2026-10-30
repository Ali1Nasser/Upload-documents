# C6 ballot — lens: technical-accuracy (council-member, blind to other members)

Recorded verbatim by the lead from the member's read-only report (2026-10-30).

| Q | CR | choice | confidence | rationale |
|---|---|---|---|---|
| Q1 | CR-003 | accept-modified: take the brief's M, but also require the whole-frame CSS blur (24 px / 12 px) to be removed at every tier below hero in the same change. Keep MatchCut geometry and hero `CameraMotionBlur` for P9 after the two-shot perf experiment. | 0.70 | The current blur breaks 04 §1.3, which allows motion blur only as `CameraMotionBlur` on hero whips. Dropping `direction` and `color` makes the spec misstate the transition. The hero blur cost is unmeasured, so wiring it now would be a guess. |
| Q2 | CR-004 | accept (A) | 0.60 | `move:'follow'` silently renders as `truck`, so the spec says one thing and the picture shows another. It is in 73/73 packs, so a lint warning would fire everywhere. No hash changes, and the timing guard covers it. |
| Q3 | CR-005 | accept-modified: extend `DemoDef` with a second shot now, since Q1's demos need it. Do not add synthetic features. `features` waits for real P5 features in P9. | 0.55 | AudioReactive is in 0 packs, so there is no P8 or accuracy urgency. Synthetic "labelled" features risk being read as real audio data. |
| Q4 | CR-006 | accept (A): optional `ref` per zone | 0.60 | `d:6.11:1` (the 500 ms gate) is a spoken number that must bind to its own zone; shot-level `data_refs` leave it unbound. Optional, expected 0 px. |
| Q5 | CR-007 | accept (A): cap 9 and a nine-stage demo, gated on the overflow render | 0.65 | `d:6.3:2` is "14 → 13 → 11 → 2 → 2 → 2 → 2 → 2 → 1" (nine counts) and `d:6.3:16` says "nine"; cap 8 cannot draw the contract. |
| Q6 | CR-008 | accept-modified (M): `rows:[{key,count}]` multiset, not a bare cap | 0.80 | `d:6.4:1`: 6 customers in, 15 rows out (4+3+4+2 = 13 order rows + 2 null rows); a cap of 8 (or 13) cannot draw it; a `{key,count}` multiset fits any size. |
| Q7 | CR-009 | accept (A) | 0.90 | D2 says n must never be shown; the placeholder `5 000` is a false quantity in spec data. Optional `sample`, 0 px expected. |
| Q8 | CR-010 | accept (A), on the condition that it does not ratify `add:6.12:10..13` | 0.85 | Optional `users`/`rate` with ordinal bars removes placeholder numbers without inventing facts; digits stay refused until the additions are ratified. |
| Q9 | CR-013 | defer to P9, or until a token-id fact is sourced. Positions stay (`#3`). | 0.65 | No token-id fact exists among the 127 contract facts or the 9 additions; the prop would only invite invented ids. |
| Q10 | CR-014 | accept-modified (M): `{value, ref}` per score, printed at the contract's precision | 0.90 | Contract values 0.165 (`d:6.18:1`) and 0.227 (`d:6.18:2`); a single `scores_ref` printing 2 decimals shows 0.17 / 0.23 (altered figures), and one ref cannot bind two conditions. |
| Q11 | CR-015 | defer to P9, or until sourced. Slot-count eviction stays. | 0.65 | Only sourced figure is the 4,000–128,000 range (`s:S4:P22:0074`); per-item sizes would be invented. |
| Q12 | CR-016 | accept-modified (M): optional fifth `beat` still, keeping the existing four | 0.70 | `a1` falls before the beat for FixSettle, Pulse, FailureGlitch, PathDraw; an added still leaves all existing stills and approved baselines unchanged. |
| Q13 | CR-017 | accept-modified (M): DOF at hero only, plus a lint warning for `planes[].blur > 0` in standard shots | 0.80 | Standard: one plane 0.311, two 0.485 vs 0.201; even a 4× saving gives ≈ 0.223 / 0.267 > 0.201. Hero 0.478 of 1.038 is safe. |
| Q14 | CR-018 | accept (A): cap 6 and `choose.index` ≤ 5, after the six-branch overflow render | 0.75 | `s:S1:ar-natural:0547` says "six destinations"; 04 §6 asks for six lit paths; pack check agrees (CH-35, DD-P25). |

## Scores (1–10; weights C1 0.30 / C2 0.25 / C3 0.25 / C4 0.20)
- Q1: A 7.0, M 8.0, D 5.5, R 3.0 · Q2: A 7.5, D 5.5, R 3.5 · Q3: A 4.5, M 7.0, D 6.0, R 5.5 · Q4: A 7.5, M 6.5, D 4.5, R 4.0
- Q5: A 8.0, M 6.0, D 3.0, R 2.0 (a nine-stage 1080p overflow render gates A) · Q6: A 3.5, M 8.5, D 5.0, R 4.0 · Q7: A 9.0, D 4.0, R 3.0
- Q8: A 8.5, D 4.5, R 3.5 · Q9: A 5.5, D 7.0, R 6.0 · Q10: A 3.0, M 9.0, D 5.5, R 4.5 · Q11: A 5.5, D 7.0, R 6.0
- Q12: A 5.0, M 7.5, D 5.5, R 4.5 · Q13: A 4.5, M 8.0, D 6.0, R 5.5 · Q14: A 8.0, D 4.5, R 3.5

## Flags
1. Q10 departs from the `docs/plan/05_DATA_CONTRACTS.md` line 141 example (single `scores_ref`); needs an ADR amendment (plan text is never edited).
2. Q13 arithmetic: the ~4× saving is insufficient (≈ 0.223 one plane, ≈ 0.267 two planes > 0.201); the CR's 0.194 / 0.311 / 0.485 figures have no perf JSON behind them.
3. Q6 wording: `d:6.4:1` has 15 output rows (13 + 2 null); a cap would need ≥ 15, or the multiset form.
4. Q8: `add:6.12:10..13` are still proposed; the ADR must say A does not ratify them.
5. Verified: `d:6.3:2` nine counts; `s:S1:ar-natural:0547` "six destinations"; 73 pack files contain MatchCut and 73 contain "follow" (146 files in corpus/packs/, assumed 73 packs × 2).
6. Voting mechanics: D-leaning votes (Q9, Q11) and accept-modified votes (Q1, Q3, Q6, Q10, Q12, Q13) must not be tallied as plain A.

Evidence: `corpus/canon/data_contract.json` (d:6.3:2 l.604, d:6.4:1 l.869, d:6.11:1 l.1379, d:6.18:1/2 l.1712/1727), `docs/plan/05_DATA_CONTRACTS.md` l.141, `corpus/packs/DD-P25.json`.
