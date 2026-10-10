# ADR-011 — P7 timing conventions (word-map rounding, reveal onset, preview fps)
Status: decided
Council: C5 · Date: 2026-10-10 · Chair: council-chair
Ballot: the 4 lenses that own timing (audio-sync, motion-design, egyptian-arabic, technical-accuracy), choice and confidence per lens. Rule: majority per question. A tie goes to the option that keeps the frozen tokens and the G5-locked word map unchanged (Q1 RD1, Q2 RV2, Q3 P1). The tie rule was not needed.
Amends (plan text is not edited; this ADR is the amendment):
- `05_DATA_CONTRACTS` §0 (record-timeline rounding) and the word-map frame fields (Q1);
- `03_PIPELINE_RUNBOOK` P7.3 and P9.1 preview fps, 15 → 12 (Q3);
- the frozen token `studio/src/tokens.ts` `PREVIEW.fps`, 15 → 12 (Q3).

Resolves: CR-001 (Q3) and CR-002 (Q1) in `corpus/specs/_component_requests.jsonl`.

## Context (evidence)
- **Word map v1.1** (`corpus/edl/word_map.v1.1.jsonl`, locked at G5) writes `rec_start_frame = floor(start_ms × 24 / 1000)` and `rec_end_frame = ceil(end_ms × 24 / 1000)` for all 29,524 words. 85 of the 166 CH-10 words differ from `round()` (`reports/sync/p7_demo.md` §2).
- **Resolver = word map.** 29/29 anchors are exact at 24 fps and 29/29 at 12 fps (`p7_demo.md` §2). Python `round()` is banker's rounding; JS `Math.round` rounds half up.
- **Onset, 12 fps preview** (`p7_demo.md` §3), clean subset n = 16:
  - median +83 ms (+1 preview frame); p95 |offset| 188 ms; max 250 ms;
  - 13/16 events sit at 0..+1 f; offsets are [−3, −2, −2, 0, 0, 0, +1 × 10];
  - the verifier reads the +1 as the first visible step of an ease-in that starts on the anchor frame: about 42 ms at 24 fps;
  - verdict: p95 ≤ 100 ms is **not demonstrated**. It must be measured at 24 fps on per-layer isolated renders.
- **Metric and thresholds.**
  - `06` sync metric: visual onset − expected frame, where expected = `word_start − lead`.
  - `00` D5: within ±1 frame; median ≤ 40 ms; p95 ≤ 100 ms.
  - G8: sync p95 ≤ 100 ms per chapter.
- **Foundation review** (`reports/p7/foundation_review.md`):
  - M5: a dissolve fades the incoming shot in after the cut, so onset is about 190 ms late;
  - m6: the anchor was rounded twice.
  - Commit `87eb279` claims both fixed ("dissolve keeps copy opaque"; `resolve.ts:7-9,157` uses a single rounding). The sync-verifier has not re-measured either fix.
- **Frozen token.**
  - `studio/src/tokens.ts:40`: `PREVIEW = {960, 540, fps: 15, lite}`, hashed in `harness/state/freeze.json`.
  - `03` P7.3 and P9.1 say 15 fps; the P7 task and CR-001 say 12.
- **Python helpers already agree with RD1.**
  - `tools/dclib/timeutil.py`: `ms2frame` is half-up; `frame_start` is floor; `frame_end` is ceil.
  - `speclint.anchor_frame` is the integer `rec_start_frame − lead_frames`, with no rounding.

## Options
- **Q1, word-map frame rounding.**
  - RD1: floor for start, ceil for end, as locked in v1.1.
  - RD2: nearest rounding. This needs word map v1.2 and a G5 re-lock.
- **Q2, reveal onset.**
  - RV1: the engine makes a reveal's first visible step land on the anchor frame (non-zero first step).
  - RV2: the ease starts at progress 0 on the anchor frame, so the first visible step is at +1 f. This is documented, not compensated.
- **Q3, preview fps.**
  - P1: keep the frozen 15.
  - P2: change to 12 (CR-001).

## Scores
No per-criterion matrix was used. As in C4, this was a narrow ballot with choice and confidence per lens, and the options were posed inline, so there was no brief and no cross-review. The director, educator and producer lenses did not vote: the questions are outside their remit.

| Lens | Q1 | Q2 | Q3 | Confidence |
|---|---|---|---|---|
| audio-sync | RD1 | **RV1** | P2 | 0.75 |
| motion-design | RD1 | RV2 | **P1** | 0.62 |
| egyptian-arabic | RD1 | RV2 | P2 | 0.65 |
| technical-accuracy | RD1 | RV2 | P2 | 0.72 |

| Question | Vote share | Confidence-weighted (Σ = 2.74) | Margin |
|---|---|---|---|
| Q1 | RD1 4/4 = 1.00 · RD2 0.00 | RD1 1.000 · RD2 0.000 | 100 pts |
| Q2 | RV2 3/4 = 0.75 · RV1 0.25 | RV2 0.726 · RV1 0.274 | 45.3 pts |
| Q3 | P2 3/4 = 0.75 · P1 0.25 | P2 0.774 · P1 0.226 | 54.7 pts |

Mean confidence is 0.685 (≥ 0.6), and every margin is above 5 %. No experiment is needed to decide. Q2 carries a pre-registered acceptance test (AT-13) and a pre-authorised fallback (RT-011-2).

## Decision
**Q1 = RD1.** `05` is amended to read as follows. This text is normative.
1. `rec_start_frame = floor(start_ms × 24 / 1000)` and `rec_end_frame = ceil(end_ms × 24 / 1000)`, in integer arithmetic. A word's frame span always covers its audio. From rounding alone, picture is 0..41 ms early and never late.
2. Anchor in 24 fps record frames = `rec_start_frame − lead_frames`. This is exact, with no rounding. The `06` sync metric's "expected frame" is this value.
3. At fps F ≠ 24, the shot-local frame is `round_half_up((rec_start_frame − lead_frames − span.start) × F / 24)`. This is **one** rounding of the whole quantity; Δ and lead are never rounded separately (m6). `round_half_up(x) = floor(x + 0.5)`. This equals JS `Math.round`. Python must never use `round()`.
4. Every other ms → frame conversion that `05` §0 writes as `round(ms × fps / 1000)` means round half up through `tools/dclib/timeutil.ms2frame`.

**Q2 = RV2.**
- A reveal's progress is 0 on its anchor frame. Its first visible step comes at anchor + 1 f: 42 ms at 24 fps, 83 ms at 12 fps.
- Scene-directors choose `lead_frames` knowing that the lead to the first visible change is `lead_frames − 1`.
- **No threshold or metric changes.** The expected frame stays `word_start − lead`, with no latency allowance, and D5 and G8 stay exactly as written.

**Q3 = P2.**
- `PREVIEW.fps = 12`. Width 960, height 540 and tier `lite` are unchanged.
- `--fps N` stays available as an override. `03` P7.3 and P9.1 now read "12 fps".

## Rationale
- **Q1 was carried by data.** v1.1 is locked at G5. The resolver matches it 29/29, and RD1 is the only option under which rounding can never make picture late. RD2 would cost a v1.2 map and a re-lock for no measured gain.
- **Q2 was carried by taste, plus one data gap.**
  - The majority (motion-design, egyptian-arabic, technical-accuracy) weighed three things: a popped first frame, re-opening the reviewed AT-11 clips, and the RTL wipe. They valued these above an engine shift.
  - **Chair's note (data, not a vote):** the `06` metric measures onset against `word_start − lead`. So a systematic +1 f at 24 fps (42 ms) counts as error. On its own it sits 2 ms above the D5 median budget of 40 ms.
  - "lead_frames covers it" is true for perception (picture is still before the word) but not for the metric. This is the audio-sync dissent, and it is unmeasured at 24 fps.
  - It is therefore tested before the component fan-out (AT-13), with RV1 pre-authorised as the fallback.
- **Q3 was carried by data.**
  - 12 divides 24, so every preview frame is a film frame and anchors halve exactly.
  - At 15 fps the fractional part of `x × 15/24` is a multiple of 1/8. The single-rounding error is therefore up to 0.5 preview frame, which is 33 ms, not the ≤ 21 ms that the P1 rationale states.
  - P1's argument that 66.7 ms resolves the sync gate better carries little weight. All four lenses agree that neither preview rate can prove p95 ≤ 100 ms; proof comes from 24 fps measurement renders.

## Dissent (verbatim)
- **Q2, audio-sync (RV1):** "Q2 RV1: a systematic +1 frame (42 ms at 24 fps, 83 ms at 12 fps) is the clean-subset median (13 of 16 events at 0..+1). It uses the whole D5 median budget of 40 ms before any jitter. Fix it once in the engine, before the 104-component fan-out."
- **Q3, motion-design (P1):** "Q3 P1: keep the frozen 15 fps token. A 66.7 ms step resolves the 100 ms sync gate better than 83.3 ms, which the verifier called inconclusive. Rounding error at most 21 ms is negligible once the single-rounding formula is used. Keep --fps 12 as an option. No re-freeze."
- Risks recorded by the lenses (verbatim, abridged to the ones not already covered above):
  - audio-sync: "RV1 changes every reveal ease-in. Components whose first step is sub-threshold may still read as late in the isolated 24 fps measurement, so the p95 gate is not guaranteed."
  - audio-sync: "Early picture is acceptable by design (0..41 ms from floor, plus lead). Tools that read the word map must use floor(x+0.5), or they will drift silently."
  - motion-design: "Documented +1 frame onset means the 24 fps final-render p95 sync is untested; it must be measured with isolated per-layer debug renders."
  - motion-design: "Camera push (B3) still moves copy outside the title-safe area, regardless of these timing choices."
  - egyptian-arabic: "Reviewers may judge RTL clip-wipe smoothness at 12 fps and flag choppiness that will not exist in the 24 fps final; the preview must be labelled lite."
  - egyptian-arabic: "Floor start frames mean the picture runs up to 41 ms early. An early Arabic reveal is mild, but combined with lead_frames of 3 or more it could pre-empt the preceding word."
  - technical-accuracy: "Q3 P2 changes a frozen token. It needs a freeze.json re-hash and a G6a re-check, and any P6 or P9 preview already made at 15 fps must be regenerated."
  - technical-accuracy: "Python tools that use round() will drift from the JS resolver unless dc spec lint enforces floor(x+0.5)."

## Acceptance tests
**AT-13: 24 fps onset under RV2** [render-ops renders through the queue; sync-verifier measures; the motion-engineer does not grade. Due in P7, before any component beyond KineticWord, NumberCounter and TableGrid is merged, and before G6b.]
- Render `_demo` with `dc render spec _demo --fps 24 --nocam --nofx --cut --solo <layer>` for every anchored layer: 29 events.
- Measure with the `p7_demo.md` §3 onset method. The expected frame is `rec_start_frame − lead_frames`.
- **Pass:** median ≤ 40 ms and p95 |offset| ≤ 100 ms. Report the offset histogram in frames.
- Delete the renders afterwards; keep only `reports/sync/at13.md` plus JSON.

**AT-14: rounding agreement** [harness-engineer]
- Add a check to `dc spec lint` or the tests: `timeutil` and `resolve.ts` give identical frames on a fixture. The fixture covers the .5 boundaries, odd leads 1/3/5, and F ∈ {12, 15, 24}.
- Grep `tools/` for `round(` applied to frame or fps quantities; there must be none.

**AT-15: M5 and m6 re-measure** [sync-verifier]
- Confirm on the post-`87eb279` engine:
  - the first anchored word after a dissolve has its onset within +1 f of expected;
  - the 12 fps anchors still match the formula on odd leads (29/29).

## Reversal triggers
- **RT-011-1 (Q1):** any word whose `rec_start_frame` lies after its true audio onset, or a resolver/word-map mismatch on any anchor. Reopen Q1 and fix the producer of the bad value. RD1 itself is not reopened unless G3/G5 alignment is re-run.
- **RT-011-2 (Q2, pre-authorised):** AT-13 median > 40 ms, with ≥ 50 % of events at +1..+2 f after M5 and camera effects are excluded.
  - Q2 switches to **RV1** without a new ballot: the first visible step lands on the anchor frame.
  - The motion-engineer implements this in the engine before the fan-out. The AT-11 clips are re-reviewed (arabic-typographer, with the native reader's veto). The chair records the switch in `decisions.json`.
  - If the excess comes from other causes (dissolve, camera, pre-roll), fix those first and re-run AT-13.
- **RT-011-3 (Q2/Q3):** G8 or G10a sync on 24 fps measurement renders fails p95 ≤ 100 ms or median ≤ 40 ms in any chapter because of onset latency. Reopen Q2.
- **RT-011-4 (Q3):** after the re-freeze, `dc gate check G6a` fails. Alternatively, critics file at least 3 motion defects in one chapter that a 24 fps clip shows to be 12 fps cadence artefacts. Reopen Q3 (P1, or 24 fps short clips for motion review).

## Consequences / follow-ups
- **motion-engineer:**
  - set `PREVIEW.fps = 12` in `studio/src/tokens.ts` (contract change authorised here; CR-001);
  - add a note to `docs/tools/component_guide.md` §Anchors covering the RV2 +1 f and the RD1 formulas, and change its preview line from 15 to 12;
  - append resolution records for CR-001 and CR-002 to `corpus/specs/_component_requests.jsonl` (`"status":"resolved","by":"ADR-011"`). The chair does not edit `corpus/`.
- **harness-engineer:**
  - re-run the freeze for the changed `tokens.ts` hash only, citing ADR-011;
  - then run `python3 tools/dc.py gate check G6a` and commit the report;
  - AT-14.
- **render-ops:**
  - render AT-13 through the queue;
  - label previews "lite · 12 fps";
  - existing P6 evidence at 15 fps is regenerated only if the G6a re-check requires it;
  - size the cost of G8 sync evidence from 24 fps measurement renders in the P9 plan.
- **sync-verifier:** AT-13 and AT-15. G8 sync evidence comes from 24 fps measurement renders, not 12 fps previews.
- **critic:** do not file judder or choppiness from 12 fps previews; verify on a 24 fps clip of ≤ 10 s first.
- **scene-director:** treat `lead_frames − 1` as the effective visible lead. Leads ≥ 3 on adjacent words must not pre-empt the previous word (P8 lint candidate).
- **Open and not decided here:** B3 (camera push outside title-safe; `87eb279` claims a fix, not re-verified here), and the 3 early outliers in CH-10. Both stay with the motion-engineer and the sync-verifier.
