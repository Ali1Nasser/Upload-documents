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
