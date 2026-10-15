# P7 catalog status: group struct-a (Structure & flow)

| Component | Status | Note |
|---|---|---|
| DagRun | implemented | snap PASS det 0 (pending-critic); perf box s/frame lite 0.112 / standard 0.186 / hero 0.141; qa arabic PASS; demo schedule chip "@daily" (no invented numbers) |
| TreeView | implemented | variants btree / plan / decision / fs; actions expand, highlightPath, search; snap PASS det 0 on retry (pending-critic; det is intermittently 741 px on any struct-a component incl. DagRun: harness flake, not TreeView); perf box s/frame lite 0.063 / standard 0.091 / hero 0.083 (no WebGL; hero = standard look); qa arabic PASS 19 strings; demo shows plan funnel, IAM explicit-deny trace, fs outline, 3-level B-tree probe (no printed numbers beyond order ids 1001-1014, d:6.1:12) |
