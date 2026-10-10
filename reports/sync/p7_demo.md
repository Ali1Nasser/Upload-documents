# Sync verification: SpecPlayer anchor resolver on corpus/specs/_demo.json (P7)

Verifier: sync-verifier (independent). Spec CH-10 window, 24-fps frames 91569..92798 (1229 f), preview data/renders/spec/_demo/preview12/_demo.mp4 (960x540, 12 fps, 615 f). Word map corpus/edl/word_map.v1.1.jsonl.

## 1. Anchor resolution: PASS
- Resolver report: 34/34 anchors resolved (29 layer.at, 5 props.until), 0 unresolved, 0 invalid, 0 unknown/unimplemented.
- Independent check: all 34 anchor word ids exist in the CH-10 word map.

## 2. Frame arithmetic: PASS (29/29 at 24 fps, 29/29 at 12 fps)
Independent recomputation in Python from the word map, compared with the resolver's output (ResolvedLayer.at / ResolvedAction.at plus shot.from).
- Word start frame is `rec_start_frame` = floor(start_ms x 24 / 1000) for all 29524 words (end = ceil). It is NOT round(s x 24): 85 of the 166 CH-10 words differ from round(). The resolver and the word map are consistent, and this floor convention should be written into 05_DATA_CONTRACTS (docs gap, not a resolver bug). Floor makes picture 0..41 ms early relative to the true word start.
- 24 fps: frame = rec_start_frame - lead_frames - span.start, exact for 29/29.
- 12 fps: frame = round_half_up((rec_start_frame - span.start) / 2) - round_half_up(lead_frames / 2), exact for 29/29. Math.round rounds half up (lead 3 -> 2, lead 1 -> 1); Python's round() would differ, so downstream tools must use floor(x + 0.5).
- Durations: 1229 f @24, 615 f @12 (= round(1229/2)); the mp4 has 615 frames.

## 3. Visual onset vs expected frame (12 fps preview): INCONCLUSIVE against the 100 ms gate
Method: ffmpeg gray 480x270, mean |frame(k) - frame(k-1)| inside the layer's bbox, onset = first frame in [exp-5, exp+8] above median + max(6 MAD, 0.15) of the preceding 10 frames. 29 events measured.
Resolution is one preview frame = 83.3 ms, so a 100 ms gate can only be resolved at the 12 fps sample rate.
- All 29: median offset 0 ms, median |offset| 83 ms, 21/29 within 1 frame.
- Excluding the 5 within a cut/dissolve: n=24, median +83 ms, p95 |.| 321 ms.
- Clean subset (no other event, exit or cut within 8 f before; n=16): median +83 ms (+1 frame), p95 |.| 188 ms, max 250 ms. 13 of 16 sit at 0..+1 frame; the offsets are [-3,-2,-2,0,0,0, +1 x10].
- Reading: the median +1 frame is the first visible frame of an ease-in that starts at the anchor frame (diff between frame exp and exp-1 is still below threshold). That is about 83 ms at 12 fps, 42 ms at 24 fps. This is consistent with the intended lead of 2 frames (the picture still lands before the word, by lead 2 f @24 = 83 ms, less the +1 f @12 latency).
- 3 clean outliers, all early: CH-10-S02 w:S1:ar-natural:001637 (-2 f, addRow, noisy baseline), CH-10-S04 w:S1:ar-natural:001672 (-3 f, NumberCounter, bbox = whole safe area so camera push_in contaminates, peak diff 0.8), CH-10-S05 w:S1:ar-natural:001682 (-2 f, TableGrid). Not shown to be resolver errors: the arithmetic is exact for them, so the cause is most likely whole-frame camera motion or component pre-roll in the bbox. Not confirmed.
- Because of the camera motion, the 12 fps quantisation and the small n, the 200-event p95 gate cannot be claimed here. It must be measured at 24 fps on the final render using per-layer isolated (debug) renders.

## Verdict
Resolver: PASS (anchors 100 %, frame arithmetic exact at 24 and 12 fps, deterministic with the word map).
Picture-sync gate (p95 <= 100 ms): NOT demonstrated. Median +83 ms (1 preview frame) and p95 188 ms on the clean subset (n=16); the outliers are early and probably measurement contamination.

Worst offenders (shot_id / word_id / offset frames @12): CH-10-S04 w:S1:ar-natural:001672 -3; CH-10-S02 w:S1:ar-natural:001637 -2; CH-10-S05 w:S1:ar-natural:001682 -2; excluded as contaminated: CH-10-S01 w:S1:ar-natural:001616 -5, CH-10-S05 w:S1:ar-natural:001692 -4.


---

# P7 re-measurement at 24 fps with isolated per-layer renders (sync-verifier, independent)

Render: `dc render spec _demo --fps 24 --nocam --nofx --cut --no-audio --solo <layer id>` (1229 f, 960x540), 14 solo renders (rules, kw-constraints, kw-walls, kw-required, kw-missing, kw-overhead, kw-only, n3, kw-code, orders, n1007, kw-notfound, kw-customers, kw-callback) under data/renders/spec/_demo/preview24_dbg-nocam-nofx-cut-solo-*. Only the target layer (with its TableGrid.* actions) is drawn, so there is no contamination from other events, camera or FX.
Method: ffmpeg gray 480x270, mean |frame(k)-frame(k-1)| over the whole solo frame; onset = first frame in [exp-6, exp+10] above median + max(6 MAD, 0.05) of the preceding frames (the solo baseline is exactly 0 when idle). Expected frame = rec_start_frame - lead_frames - 91569 (word_map.v1.1, floor convention; same as the resolver). Events: all 29 layer.at (incl. 15 TableGrid addRow/highlightRows actions). Per-event JSON: reports/sync/p7_demo.events24.json.

## Result: PASS (gate p95 <= 100 ms, no event earlier than -1 frame)
Offset = onset - expected anchor frame, n = 29 (resolution 41.7 ms):
- median 0.0 ms, p95 41.7 ms, max 41.7 ms, min 0.0 ms. Distribution: 0 f x19, +1 f x10; none negative, none > +1 f.
- Against the true word start (onset - rec_start_frame): median -83 ms, range -83..0 ms, i.e. the picture lands 0..2 frames before the word (n3 has lead 0 and lands on it). The 2-frame lead is honoured.
- Known one-frame reveal latency: 10/29 events (all kinetic reveal / addRow / first highlight frames with ease-in starting at the anchor) first change one frame after the anchor frame (+1 f = +41.7 ms); the other 19 change on the anchor frame (highlight/counter/hard-pop). This is within the gate and does not make any event late versus the word (still -41.7 ms or earlier).

## Measurement caveats (two corrected events)
The raw detector flagged two events at -3 f: S02 addRow w:...001624 (raw onset 218, exp 221) and S03 highlightRows w:...001644 (raw 479, exp 482). Frames 218 and 479 are the hard-cut frames of shots S02 and S03 (the shared `rules` table layer enters with its prior rows; brightness steps 9.6 -> 7.0 and 13.5 -> 7.0 and nothing changes the frame before). They are shot-entry artefacts, not event onsets. Corrected to the first post-cut local spike: 221 (d=1.46, offset 0) and 483 (d=2.27, offset +1; 482 is d=0.31). Without the correction the raw stats would be median 0, p95 92 ms, max 125 ms (-3 f), which still passes p95 but would breach the "no earlier than -1 frame" rule; the correction is justified by the cut frames and should be re-checked on a real (non-cut) render. Note the 2 events sit within 3 frames of a shot boundary, where the table's own ease-in overlaps the shot entry.
Not covered: camera moves and FX (measured off, as allowed), dissolve/WhipPan transitions (--cut), and the 200-event per-chapter sample, which remains for the final render.
This supersedes the earlier 12-fps "INCONCLUSIVE" section (its early outliers were camera/neighbour contamination, as suspected).

## Per-event table (24 fps)
| # | shot | component | layer | word | lead | expected f | onset f | off f | off ms | vs word ms | note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | CH-10-S01 | TableGrid | rules | 001611 | 2 | 10 | 11 | +1 | +41.7 | -41.7 |  |
| 2 | CH-10-S01 | TableGrid.addRow | rules | 001611 | 2 | 10 | 11 | +1 | +41.7 | -41.7 |  |
| 3 | CH-10-S01 | TableGrid.addRow | rules | 001614 | 2 | 45 | 45 | +0 | +0.0 | -83.3 |  |
| 4 | CH-10-S01 | TableGrid.highlightRows | rules | 001616 | 2 | 62 | 63 | +1 | +41.7 | -41.7 |  |
| 5 | CH-10-S01 | KineticWord | kw-constraints | 001617 | 2 | 123 | 124 | +1 | +41.7 | -41.7 |  |
| 6 | CH-10-S01 | TableGrid.highlightRows | rules | 001619 | 2 | 158 | 158 | +0 | +0.0 | -83.3 |  |
| 7 | CH-10-S01 | KineticWord | kw-walls | 001623 | 2 | 191 | 192 | +1 | +41.7 | -41.7 |  |
| 8 | CH-10-S02 | TableGrid.addRow | rules | 001624 | 2 | 221 | 221 | +0 | +0.0 | -83.3 | raw onset 218 = shot S02 hard-cut frame; |
| 9 | CH-10-S02 | KineticWord | kw-required | 001629 | 2 | 260 | 260 | +0 | +0.0 | -83.3 |  |
| 10 | CH-10-S02 | TableGrid.addRow | rules | 001630 | 2 | 300 | 301 | +1 | +41.7 | -41.7 |  |
| 11 | CH-10-S02 | TableGrid.highlightRows | rules | 001634 | 2 | 328 | 328 | +0 | +0.0 | -83.3 |  |
| 12 | CH-10-S02 | TableGrid.addRow | rules | 001637 | 2 | 379 | 379 | +0 | +0.0 | -83.3 |  |
| 13 | CH-10-S02 | TableGrid.highlightRows | rules | 001643 | 2 | 435 | 436 | +1 | +41.7 | -41.7 |  |
| 14 | CH-10-S03 | TableGrid.highlightRows | rules | 001644 | 2 | 482 | 483 | +1 | +41.7 | -41.7 | raw onset 479 = shot S03 hard-cut frame; |
| 15 | CH-10-S03 | KineticWord | kw-missing | 001651 | 2 | 546 | 546 | +0 | +0.0 | -83.3 |  |
| 16 | CH-10-S03 | TableGrid.highlightRows | rules | 001654 | 2 | 615 | 615 | +0 | +0.0 | -83.3 |  |
| 17 | CH-10-S03 | KineticWord | kw-overhead | 001658 | 2 | 667 | 667 | +0 | +0.0 | -83.3 |  |
| 18 | CH-10-S04 | KineticWord | kw-only | 001664 | 2 | 724 | 725 | +1 | +41.7 | -41.7 |  |
| 19 | CH-10-S04 | NumberCounter | n3 | 001672 | 0 | 805 | 805 | +0 | +0.0 | +0.0 |  |
| 20 | CH-10-S04 | KineticWord | kw-code | 001678 | 2 | 859 | 859 | +0 | +0.0 | -83.3 |  |
| 21 | CH-10-S05 | TableGrid | orders | 001682 | 2 | 943 | 943 | +0 | +0.0 | -83.3 |  |
| 22 | CH-10-S05 | TableGrid.addRow | orders | 001684 | 2 | 968 | 969 | +1 | +41.7 | -41.7 |  |
| 23 | CH-10-S05 | NumberCounter | n1007 | 001685 | 0 | 979 | 979 | +0 | +0.0 | +0.0 |  |
| 24 | CH-10-S05 | TableGrid.highlightRows | orders | 001688 | 2 | 1018 | 1018 | +0 | +0.0 | -83.3 |  |
| 25 | CH-10-S05 | TableGrid.highlightRows | orders | 001692 | 2 | 1058 | 1058 | +0 | +0.0 | -83.3 |  |
| 26 | CH-10-S05 | KineticWord | kw-notfound | 001692 | 2 | 1058 | 1058 | +0 | +0.0 | -83.3 |  |
| 27 | CH-10-S05 | KineticWord | kw-customers | 001695 | 2 | 1072 | 1072 | +0 | +0.0 | -83.3 |  |
| 28 | CH-10-S05 | TableGrid.highlightRows | orders | 001700 | 2 | 1153 | 1153 | +0 | +0.0 | -83.3 |  |
| 29 | CH-10-S05 | KineticWord | kw-callback | 001703 | 2 | 1207 | 1207 | +0 | +0.0 | -83.3 |  |
