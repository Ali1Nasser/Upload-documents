# C6 ballot — lens: motion-design (council-member, blind to other members)

Recorded verbatim by the lead from the member's read-only report (2026-10-30). The member read the brief, 00 §1, 04 §1.3, ADR-002 (hero share) and the CR-003/016/017/018 lines; not the per-CR evidence files; no perf run.

| Q | CR | choice | confidence | rationale |
|---|---|---|---|---|
| Q1 | CR-003 | accept-modified: wire direction, colour, MatchCut from/to geometry and the cross-cut streak; remove the whole-frame CSS blur below hero. Only hero `CameraMotionBlur` waits for P9 and a perf run. | 0.60 | The whole-frame blur at every tier breaks 04 §1.3 and the standard budget. MatchCut is in 73/73 packs and is the signature move; geometry is transforms only (no filter cost), so deferring it would leave a plain dissolve everywhere. The 2-shot strip and the timing guard still apply. |
| Q2 | CR-004 | accept | 0.75 | `follow` is in 73/73 packs; bounded change (target centre inside the 80 px truck envelope), no hash change, purposeful move instead of a silent truck fallback. |
| Q3 | CR-005 | accept-modified: the single `DemoDef` extension (features plus a second shot), with synthetic features labelled in the demo. The AudioReactive proof stays the real-P5 strip. | 0.65 | Q1 needs the second-shot demo; AudioReactive is in 0 packs, so it should not drive a re-baseline. |
| Q4 | CR-006 | accept: optional `ref` per zone | 0.60 | Binds the 500 ms label to `d:6.11:1` at the zone boundary (D4); optional prop, no baseline touch; P9 must verify (no baseline status). |
| Q5 | CR-007 | accept-modified: cap 9; a nine-stage demo as a separate strip, keep the 8-stage approved baseline; nine-stage 1080p overflow + perf render before the re-freeze. | 0.65 | `d:6.3:2` has nine counts and the narration says "nine"; CH-33 pilot needs it. |
| Q6 | CR-008 | accept-modified: multiset `{key, count}` with an unmatched/null flag, plus a cap on distinct keys (~8), so `d:6.4:1` (6 in, 15 out) is expressible. Reject the plain `rows` cap of 8. | 0.70 | 13 order rows / 15 output rows cannot fit 8 rows; a counted multiset draws the fan-in cleanly. |
| Q7 | CR-009 | accept | 0.85 | `5 000` placeholder is a false quantity (golden rule 10); optional, 0 px. |
| Q8 | CR-010 | accept | 0.80 | Ordinal bars without sourced digits beats invented numbers; 0 px. |
| Q9 | CR-013 | accept: optional `ids` plus `ids_ref`, lint blocking any use unless sourced | 0.55 | Low priority, additive and cheap inside the batch; avoids re-linting later. |
| Q10 | CR-014 | accept-modified: `{value, ref}` per score, printed at the contract's 3 decimals (0.165, 0.227); fact-checker to rule on the figure-to-neighbour pairing. | 0.80 | One `scores_ref` cannot tell the two conditions apart; 0.17 / 0.23 change sourced numbers; VectorGalaxy is in both pilot packs. |
| Q11 | CR-015 | accept: optional `tokens` with budget eviction, lint-blocked unless sizes are sourced | 0.50 | Teaches the real mechanic; until sourced, uniform widths and slot eviction stay; P9 must verify. |
| Q12 | CR-016 | accept-modified: an optional fifth `beat` still, keeping the existing four | 0.75 | Leaves approved stills untouched; FailureGlitch and PathDraw get beat evidence; critic asked for the f39 still. |
| Q13 | CR-017 | accept-modified: DOF at hero only, plus the lint warning for `planes[].blur > 0` in standard shots; also allow pre-blurred (baked) plate planes at standard; re-test the half-size idea in P9. | 0.65 | One blurred plane +0.117 box s/frame at standard (0.194 → 0.311 vs 0.201) → R5 would fire; 4× saving unmeasured; baked blur keeps the depth look at zero runtime cost. |
| Q14 | CR-018 | accept: cap 6 and `choose.index` ≤ 5; acceptance needs the six-branch 1080p layout, snap and perf. | 0.70 | Narration names six (`0546`/`0547`); 04 §6 asks for six lit paths; no baseline to protect (latest snap `pass: false`). |

## Scores (C1 0.30, C2 0.25, C3 0.25, C4 0.20; 1–10)
- Q1: A 6.5, M(brief) 6.8, M(mine) 7.4, D 5.0, R 3.5 · Q2: A 7.8, D 6.0, R 4.5 · Q3: A 5.5, M 7.0, D 6.0, R 5.5 · Q4: A 7.0, M 6.6, D 5.5, R 4.5
- Q5: A 7.2, M(brief) 6.3, M(mine) 7.5, D 4.5, R 3.5 · Q6: A 4.5, M 7.5, D 5.0, R 4.0 · Q7: A 8.3, D 4.8, R 4.0 · Q8: A 8.0, D 4.8, R 4.0
- Q9: A 6.5, D 6.8, R 6.0 (near tie; confidence 0.55) · Q10: A 4.5, M 8.0, D 5.5, R 5.0 · Q11: A 6.4, D 6.2, R 5.8 (near tie)
- Q12: A 6.0, M 7.8, D 5.8, R 5.0 · Q13: A 5.5, M(brief) 6.8, M(mine) 7.3, D 6.0, R 4.5 · Q14: A 7.6, D 5.0, R 3.8

## Flags
1. Q4-M changes no schema, so the "A/M on a schema CR → ADR and re-freeze" rule does not apply to it.
2. Q13 A's "~4× saving" is unmeasured; CR-017's "why" (0.6–2.4× budget) does not match its own per-plane increments (+0.117, +0.174); the brief's "CR text only; no perf JSON" is confirmed.
3. Q1 and Q3 are coupled (the Q1 demos need the DemoDef second shot); resolve together.
4. 04 §1.3 hero row says ≤ 15 %; "hero ≤ 5 %" holds only through ADR-002 (ADR-002:187, :259); the brief should cite it.
5. Q10: round-half-up gives 0.17 / 0.23 (brief arithmetic right); the objection is on principle.
6. Q6 arithmetic (4+3+4+2 = 13 + 2 null = 15) and CR-018 text (cap 4, `choose.index` 3) verified.

## Risk / experiment (where the member differs from the brief)
- Q1: MatchCut geometry may fail the onset check at the match boundary → 10 s two-shot render at standard and hero, with perf.
- Q5: nine-stage overflow at 1080p → one nine-stage render.
- Q13: baked plate vs live parallax mismatch → half-size two-plane perf run plus a critic A/B still.
- Q14: chip text clipping at six columns → one six-branch render.
