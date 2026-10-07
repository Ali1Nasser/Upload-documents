# G1 reconcile: catalog vs docs/plan/inventory/unique_files.tsv

Generated 2026-10-07T12:55:07Z by `dc ingest catalog`.

| Measure | Inventory | Catalog |
|---|---|---|
| unique files (sha1) | 1119 | 1119 |
| total file copies | 5645 | 5645 |
| in inventory, not on disk | 0 | |
| on disk, not in inventory | 0 | |
| copy-count differences | 0 | |
| byte-size differences | 0 | |
| canonical-path differences | 1 | |
| unexplained (excl. canonical) | 0 | |
| unexplained canonical-path differences | 0 | |

## Category counts

| category | inventory | catalog |
|---|---|---|
| audio | 71 | 71 |
| code | 37 | 37 |
| data | 9 | 9 |
| doc | 62 | 62 |
| font | 10 | 10 |
| html | 23 | 23 |
| image | 576 | 576 |
| log | 4 | 4 |
| other | 3 | 3 |
| subtitle | 49 | 49 |
| text | 220 | 220 |
| video | 50 | 50 |
| wheel | 5 | 5 |

## In inventory but not on disk

none

## On disk but not in inventory

none

## Copy-count differences (sha1, inventory, catalog)

none

## Canonical-path differences (sha1, inventory, catalog)

- `('c5fbb8f759ab0b9839c196145d574eb2afd6ffb2', 'DA_Camp_HUB.zip.d/DA Camp HUB/baseline_M12_RC.html', 'DA_Camp_HUB.zip.d/DA Camp HUB/DA-Camp-Lab_M12.html')`

## Explanations on record

- `c5fbb8f759ab0b9839c196145d574eb2afd6ffb2`: Same bytes under two names with equal path length (20 chars). Rule is shortest path, then lexicographic by code point: 'DA-Camp-Lab_M12.html' < 'baseline_M12_RC.html' because 'D' (0x44) sorts before 'b' (0x62). The recon inventory broke the tie differently (case-insensitive). Content and copy count are identical; only the canonical label differs. dc rule is authoritative.

**Result:** RECONCILED; unique count 1119 vs expected 1119.
