# Idea-unit threshold calibration (G4)

Generated 2026-10-08T20:50:23Z by `dc graph apply`.

Labelled pairs: **200** (Educator lens; 63 same; kinds {'S4-S4': 90, 'S4-S1': 110}; relations {'subsumes': 21, 'related': 51, 'different': 42, 'same': 63, 'subsumed': 23}). Adjudicated borderline pairs: 1272. Missing batch outputs: none (34/34 batches judged).

## Result

| Rule | tau | Precision | Recall | F1 | 5-fold CV F1 |
|---|---|---|---|---|---|
| cosine only | 0.81 | 0.743 | 0.873 | 0.803 | 0.785 |
| cosine + adjudication + number veto (applied) | 0.81 | 0.811 | 0.952 | **0.876** | 0.876 |

Cosine alone peaks at F1 0.803 (target 0.85 not reached). The applied rule (claims with different numbers are never merged; a pair in the adjudication band 0.72-0.86 that is a best-S1 match takes the LLM adjudication; everything else uses cos >= tau) reaches F1 0.876 at tau 0.81. The CV column picks tau on 4/5 of the labels and scores the held-out 1/5 (pooled); CV taus: cosine [0.81, 0.81, 0.81, 0.83, 0.81], combined [0.81, 0.81, 0.81, 0.81, 0.81].

Adjudicator vs labels on the 44 pairs present in both: 38/44 agree. Number veto (disjoint or partially overlapping number sets) fired on 5 labelled pairs (0 of them labelled same). Nested number sets (one contains the other) are compatible: 2 labelled pairs, 0 labelled same.

## Confusion, applied rule at tau 0.81

| | gold same | gold not same |
|---|---|---|
| predicted same | TP 60 | FP 14 |
| predicted not same | FN 3 | TN 123 |

## Confusion, cosine only at tau 0.81

| | gold same | gold not same |
|---|---|---|
| predicted same | TP 55 | FP 19 |
| predicted not same | FN 8 | TN 118 |

## Label rate by cosine bin

| cos bin | pairs | same |
|---|---|---|
| 0.60 | 29 | 0 |
| 0.65 | 29 | 0 |
| 0.70 | 29 | 2 |
| 0.75 | 29 | 4 |
| 0.80 | 28 | 12 |
| 0.85 | 36 | 28 |
| 0.90 | 20 | 17 |

## Sweep (0.70-0.90)

| tau | cos P | cos R | cos F1 | rule P | rule R | rule F1 |
|---|---|---|---|---|---|---|
| 0.70 | 0.444 | 1.000 | 0.615 | 0.554 | 0.984 | 0.709 |
| 0.71 | 0.470 | 0.984 | 0.636 | 0.598 | 0.968 | 0.739 |
| 0.72 | 0.484 | 0.984 | 0.649 | 0.616 | 0.968 | 0.753 |
| 0.73 | 0.512 | 0.984 | 0.674 | 0.642 | 0.968 | 0.772 |
| 0.74 | 0.525 | 0.984 | 0.685 | 0.656 | 0.968 | 0.782 |
| 0.75 | 0.540 | 0.968 | 0.693 | 0.670 | 0.968 | 0.792 |
| 0.76 | 0.571 | 0.952 | 0.714 | 0.701 | 0.968 | 0.813 |
| 0.77 | 0.586 | 0.921 | 0.716 | 0.735 | 0.968 | 0.836 |
| 0.78 | 0.606 | 0.905 | 0.726 | 0.744 | 0.968 | 0.841 |
| 0.79 | 0.648 | 0.905 | 0.755 | 0.772 | 0.968 | 0.859 |
| 0.80 | 0.679 | 0.905 | 0.776 | 0.772 | 0.968 | 0.859 |
| 0.81 | 0.743 | 0.873 | 0.803 | 0.811 | 0.952 | 0.876 |
| 0.82 | 0.739 | 0.810 | 0.773 | 0.806 | 0.921 | 0.859 |
| 0.83 | 0.781 | 0.794 | 0.787 | 0.806 | 0.921 | 0.859 |
| 0.84 | 0.797 | 0.746 | 0.770 | 0.797 | 0.873 | 0.833 |
| 0.85 | 0.804 | 0.714 | 0.756 | 0.794 | 0.857 | 0.824 |
| 0.86 | 0.830 | 0.619 | 0.709 | 0.794 | 0.794 | 0.794 |
| 0.87 | 0.838 | 0.492 | 0.620 | 0.792 | 0.667 | 0.724 |
| 0.88 | 0.844 | 0.429 | 0.568 | 0.792 | 0.603 | 0.685 |
| 0.89 | 0.826 | 0.302 | 0.442 | 0.769 | 0.476 | 0.588 |
| 0.90 | 0.850 | 0.270 | 0.410 | 0.778 | 0.444 | 0.566 |

## Merge outcome

- merges by source: {'threshold': 60, 'adjudicated': 186, 'label': 63}
- pair edges by relation: {'same': 309, 'subsumes': 290, 'jointly_covers': 75, 'covers': 99}
- idea units: 2846 (217 multi-member; largest 19 sentences; size histogram {'1': 2629, '2': 190, '3': 16, '4': 3, '5': 5, '6': 1, '7': 1, '19': 1})
- novel vs trunk: 1979 of 2484 units with S4 audio; 306 units count as covered only because an S1 sentence subsumes them

Reversibility: every decision (label, adjudication or threshold) is in `data/derived/graph/decisions.jsonl` and on the edge evidence; re-running `dc graph apply --threshold X` rebuilds the units.
