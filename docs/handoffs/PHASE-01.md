# PHASE-01 handoff: ingest and forensics (G1 PASS, 6/6 checks)

## Done
- 6/6 archives downloaded and SHA-256 verified (corpus/catalog/archives_verify.json).
- Extracted with path sanitising; nested archives expanded and removed. Disk: data/raw 3.7G, data/extracted 4.9G.
- Catalog: 1119 unique files vs 1119 in inventory (missing 0, extra 0; 1 canonical-path difference, explained in corpus/catalog/reconcile_explained.json and reports/gates/G1_reconcile.md).
- Quarantine: 15 secret-bearing names listed by path only; 0 present on disk.
- Media probe (`dc ingest probe`, via tsp, 1751 s): 121 unique audio/video files, all probed; 3 flagged decode_ok=false:
  - LmArena.zip.d/DA_Camp_Master_70m05_v5_Qh3k.mp4 (197,975 error lines)
  - LmArena.zip.d/DA_Camp_Master_70m05_v6_9Kp2.mp4 (239,707)
  - LmArena.zip.d/DA_Camp_Master_70m05_v7_final.mp4 (209,558; the known-corrupt one)
  Note: v5 and v6 are also corrupt (not only v7). Do not use any of them as picture or audio sources.
- Lineage (corpus/catalog/lineage.json): master.md runtimes 59:30 / 70:05 / unknown; 19 HTML families; narration groups narration_named, nblm_parts_25, nblm_unified, partA_F.

## Open issues
- Master 70:05 video variants v5/v6/v7 are unusable; use the other 70m05 masters (Picture_Master, Natural_Voice) if needed.
- Disk free ~7.4 GB; keep derived output small.
