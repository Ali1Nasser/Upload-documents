# P7 catalog status: Data family

| Component | Status | Notes |
|---|---|---|
| RowFunnel | implemented | One dot per surviving row (<= 30, else proportional bar with the dropped share in crit), funnel bands with directional light, dropped rows tumble out of the wall (arc, spin, trail), counter rolls on the `advance` word (RV1 onset, lands on the word end), stage rail, under-light pool. Demo = CH-11 funnel d:6.3:2 (14, 13, 11, 2, 2, 2, 2, 1; 8 stages, DISTINCT omitted because the frozen schema caps stages at 8: CR-007). Baselines pending-critic. Perf box s/frame at 3 slots: lite 0.106, standard 0.136, hero 0.136 (budgets 0.201 / 0.201 / 1.038). 2D SVG, no WebGL, so hero equals standard. |
