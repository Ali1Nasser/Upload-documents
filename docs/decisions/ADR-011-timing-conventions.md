# ADR-011 — P7 timing conventions (word-map rounding, reveal onset, preview fps)
Status: decided · Q2 amended 2026-10-10: RV2 → **RV1** by RT-011-2 (see §AT-13 result)
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

## AT-13 result (2026-10-10)
Chair: council-chair. This applies the pre-registered rule only. There is no new ballot.

**Evidence read:**
- `reports/sync/p7_demo.md` (24 fps section) and `reports/sync/p7_demo.events24.json` (commit `c26dc37`);
- queue log `harness/state/queue.json` (tsp 49–93) and `corpus/render/jobs.jsonl`;
- commit `5ce4555`, and `studio/src/type/reveal.ts` at `84f4e2f` (the RV2 engine).

**AT-13 conformance:**
- Separation is partial. All 14 solo renders went through the queue, but the sync-verifier submitted them, not render-ops. The motion-engineer did not grade. Non-material.
- Method is OK: `--fps 24 --nocam --nofx --cut --solo`, 29 events, expected frame = `rec_start_frame − lead_frames`.
  - The detector was adapted to the zero solo baseline (whole frame, window −6..+10, floor 0.05).
  - The 2 hard-cut re-picks are documented. Raw and corrected data lead to the same conclusions below.
- The report was not written to `at13.md`, a minor deviation. The renders were deleted: OK.
- **Engine under test: not controlled.**
  - `dc render spec` re-bundles `studio/src` from the shared working tree at every job. The motion-engineer's uncommitted RV1 edits entered that tree in the middle of the run.
  - Each render's engine can be read from its own data:
    - In RV2 `reveal.ts`, arrive and impact have opacity 0 on the anchor frame, so the onset reads +1 f.
    - Under RV1 the anchor frame already has p = ease(1/6) = 0.685, so the onset reads 0 f.
  - Renders started before 13:14:00Z (kw-only, rules, kw-constraints, kw-walls): every KineticWord reads +1 f. These are RV2.
  - Renders started 13:14–13:26Z: 7 of 7 KineticWords read 0 f. That includes kw-notfound, which has exactly the config of kw-constraints (kinetic, default arrive). These are RV1.
  - The NumberCounter and TableGrid RV1 edits were also in the tree: their snapshots were re-baselined at 13:18–13:19Z.
  - Split of +1 f: 9/15 (RV2 renders) vs 1/14 (RV1 tree). Fisher one-sided p = 0.0036.

| Set | n | median | p95 \|off\| | histogram (f) | at +1..+2 f |
|---|---|---|---|---|---|
| All 29 as submitted (mixed engines) | 29 | 0.0 ms | 41.7 ms | 0 ×19, +1 ×10 | 34.5 % |
| **RV2-valid** (kw-only, rules, kw-constraints, kw-walls) | 15 | **41.7 ms** | 41.7 ms | 0 ×6, +1 ×9 | **60.0 %** |
| RV2-valid, raw (no re-picks) | 15 | 41.7 ms | 125.0 ms | −3 ×2, 0 ×5, +1 ×8 | 53.3 % |
| RV1 working tree (uncontrolled) | 14 | 0.0 ms | 41.7 ms | 0 ×13, +1 ×1 | 7.1 % |

**AT-13 (RV2): FAIL (not passed).**
- The submitted 29-event "PASS" is not valid evidence about RV2.
- On the RV2-valid subset the median criterion fails: 41.7 ms > 40 ms. p95 (41.7 ms) is within its threshold.

**RT-011-2: TRIGGERED.**
- Median 41.7 ms > 40 ms, and 60.0 % of events are at +1 f (53.3 % raw), which is ≥ 50 %.
- Camera and M5 are excluded (`--nocam --nofx --cut`, solo layers).
- The excess is the documented RV2 ease onset, not dissolve, camera or pre-roll.
- Corroboration:
  - the pre-RV1 12 fps clean subset has a median of +1 f;
  - under RV2 the 14 RV1-tree events have zero ink on the anchor frame (reveal, counter roll value = a at t0, row birth ent = 0), so the RV2 median over all 29 would also be +1 f.
- Carried by data.

**Decision: Q2 = RV1** (pre-authorised, no new ballot).
- The first visible step lands on the anchor frame (`REVEAL_ONSET_F = 1`). The preset lengths are unchanged.
- The effective visible lead is now `lead_frames`, not `lead_frames − 1`.
- The expected frame and the D5/G8 thresholds are unchanged.
- RT-011-2 conditions:
  - the engine change was made before the fan-out (`5ce4555`);
  - AT-11 was re-reviewed with the native reader's veto (`fc00f6d`: PASS, no veto);
  - the chair has recorded the switch in `decisions.json`.

**Erroneous application (INC-011-1) and its correction.**
- What happened: an orchestration script matched the ADR text "pre-authorised RV1 fallback" and had the motion-engineer apply RV1 in `5ce4555` (13:23:33Z). RT-011-2 had not been evaluated at that point. The uncommitted edits also contaminated 10 of the 14 AT-13 renders (14 of 29 events).
- Correction:
  - RV1 now rests on the RT-011-2 evaluation above, not on the text match.
  - `5ce4555` is retained, not reverted, because it implements the rule's outcome. Its ratification is conditional on AT-13R.
  - The `c26dc37` PASS is not acceptance evidence for either engine.
- Prevention:
  - fallbacks and reversal triggers fire only on a chair record in `decisions.json`, never on a text match in an ADR;
  - measurement renders pin the engine: a clean `studio/` tree, or a git worktree at a stated commit, with HEAD recorded in the report.

**AT-13R: 24 fps onset under RV1** [render-ops renders through the queue; sync-verifier measures; the motion-engineer does not grade. Due before any component beyond KineticWord, NumberCounter and TableGrid is merged, and before G6b.]
- Use the same 14 solo renders and 29 events as AT-13.
- Render from a clean, pinned engine at a commit ≥ `5ce4555`. Record HEAD and an empty `git status --porcelain studio/` in the report.
- **Pass:** median ≤ 40 ms, p95 |offset| ≤ 100 ms, and no event earlier than −1 f. Report the histogram in frames.
- Write `reports/sync/at13.md` plus JSON, then delete the renders.
- Flag every event still at +1 f under RV1 as a sub-threshold first step. One candidate: orders addRow `001684` read +1 f in the RV1 tree.

**RT-011-5 (new):** reopen Q2 with a new ballot if any of these happens:
- AT-13R fails median ≤ 40 ms or p95 ≤ 100 ms;
- any event lands earlier than −1 f because of the RV1 shift;
- the native reader vetoes the RV1 anchor frames in a production chapter.

RT-011-3 stays active.

**Follow-ups:**
- **render-ops and sync-verifier:** AT-13R. The sync-verifier also annotates the 24 fps section of `p7_demo.md` as mixed-engine. Its "highlight/counter/hard-pop" explanation does not hold for the 7 arrive KineticWords.
- **motion-engineer:** keep RV1. No fan-out until AT-13R passes.
- **critic:** rule on the NumberCounter and TableGrid snapshot re-baselines, which `5ce4555` left pending-critic.
- **harness-engineer:** add engine provenance to `dc render spec`: record HEAD and a dirty flag, and refuse `--solo` measurement renders on a dirty `studio/` tree. Make orchestration triggers read only from `decisions.json`.
- **scene-director:** the effective visible lead is now `lead_frames`.

## AT-13R ruling (2026-10-10)
Chair: council-chair. This applies the AT-13R rule exactly as pre-registered above. There is no ballot, and taste decided nothing here.

**Evidence read:**
- `reports/sync/at13r_renders.md` (render-ops, `f2739d7`);
- `reports/sync/at13.md` and `reports/sync/at13.events.json` (sync-verifier, `f35254b`);
- `harness/state/queue.json` (jobs 0–13, labels `at13r-*`), `reports/sync/p7_demo.events24.json` (`c26dc37`), and `studio/src/components/TableGrid/TableGrid.tsx`.
- The chair recomputed every statistic below from `at13.events.json`.

**Role separation: OK.**
- render-ops rendered: queue jobs 0–13, 22:18:14–22:27:00Z, all exit 0, report `f2739d7`.
- The sync-verifier measured independently: report `f35254b`.
- The motion-engineer did neither. There is no motion-engineer commit or queue job between `011cae1` (22:15:46Z) and `f35254b` (22:33:01Z).
- This corrects the AT-13 deviation, where the verifier submitted the renders. The queue does not record the submitting role, so this finding rests on the commit trail.

**Engine pinning: accepted, with two recorded deviations.**
- The pin is `011cae1`, which was HEAD when the worktree was cut (commit 22:15:46Z; first job 22:18:14Z).
  - It descends from `5ce4555`, and its `reveal.ts` has `REVEAL_ONSET_F = 1`.
  - The chair re-ran `git diff 011cae1 HEAD -- studio/ corpus/specs/_demo.json corpus/edl`: the diff is empty.
  - All 14 jobs use the same `DC_REPO_ROOT` worktree.
- Behaviour matches RV1. All 10 KineticWord events read 0 f. The five `rules` events that read +1 f on the RV2 engine in `c26dc37` (001611 ×2, 001616, 001630, 001643) all read 0 f now.
- **Deviation 1.** The report records `git status --short` with three untracked symlinks (`studio/node_modules`, `studio/src/lookdev/data`, `data`) instead of an empty `git status --porcelain studio/`.
  - All three paths are git-ignored in the main tree (`.gitignore` lines 2 and 13); `dir/` patterns do not match symlinks.
  - None of them is engine source. Non-material.
- **Deviation 2.** The worktree was deleted before the sync-verifier could re-read it.
  - `resolver.json` and the queue `engine` field store no SHA.
  - The `corpus/render/jobs.jsonl` labels named in the report do not exist in the main tree (0 `at13r` lines).
  - The pin is therefore attested by render-ops and corroborated, but it cannot be re-verified independently. This is non-material to this ruling, which does not rest on the pin. It is **not acceptable for AT-13R2** (below).

**Result against the pre-registered rule** (median ≤ 40 ms, p95 |offset| ≤ 100 ms, and no event earlier than −1 f; the `c26dc37` method):

| Reading | n | median | p95 \|off\| | min | histogram (f) | rule |
|---|---|---|---|---|---|---|
| Raw detector (pre-registered method) | 29 | 0.0 ms | 91.7 ms | −3 f | −3 ×2, 0 ×26, +1 ×1 | **FAIL** (−1 f clause) |
| Re-pick rule A (mask the cut frame only) | 29 | 0.0 ms | 66.7 ms | −2 f | −2 ×2, 0 ×26, +1 ×1 | **FAIL** (−1 f clause) |
| Re-pick rule B (fixed after seeing the data) | 29 | 0.0 ms | 25.0 ms | 0 f | 0 ×27, +1 ×2 | pass |
| The 27 events not near a cut (same under every reading) | 27 | 0.0 ms | 0.0 ms | 0 f | 0 ×26, +1 ×1 | pass |

**AT-13R: NOT PASSED.**
- The median and p95 clauses pass under every reading. The −1 f clause is undetermined for exactly 2 of the 29 events:
  - event 8: CH-10-S02 TableGrid.addRow `w:S1:ar-natural:001624`, expected frame 221;
  - event 14: CH-10-S03 TableGrid.highlightRows `w:S1:ar-natural:001644`, expected frame 482.
  - Both sit 3 f after a hard cut, and their raw onsets are exactly the cut frames, 218 and 479.
- The pre-registered method reads both events at −3 f.
- The `c26dc37` correction ("first post-cut local spike") is not an operational rule: its two formalisations disagree (rule A fails, rule B passes).
- The verifier states that rule B was fixed after seeing these events and that the verdict depends on it. A verdict that turns on a rule chosen after the data is not a pre-registered pass.
- Rule B cannot be validated on these renders. It picks frames 221 and 483, the same frames as on the RV2 engine in `c26dc37`, yet RV1 moved all five non-cut `rules` events that read +1 f under RV2 to 0 f. Rule B may therefore follow the shot-entry transient rather than the event.
- `c26dc37` itself asked for a re-check on a non-cut render.
- The sync-verifier's `"pass": true` is not adopted. Its own list of failures is accepted as the evidence.

**RT-011-5: not triggered, so Q2 is not reopened.**
- The median and p95 clauses pass.
- The −3 f readings are not "caused by the RV1 shift". `REVEAL_ONSET_F = 1` moves a first step by exactly 1 f, and both readings coincide with cut frames.
- There is no native-reader veto.

**RT-011-3: stays active, not triggered.** It acts on G8/G10a chapter sync, which has not run, so it requires nothing now.

**Consequences now:**
- Q2 = RV1 stays in the engine (`5ce4555` is retained), and its ratification stays conditional.
- **INC-011-1 stays open.**
- **The fan-out bar stays.** No component beyond KineticWord, NumberCounter and TableGrid is merged, and G6b is not run, until the chair records an AT-13R pass in `decisions.json`.
- The engine is frozen for the test. Nothing changes in `studio/src/type/`, `studio/src/spec/` or `studio/src/components/TableGrid/` until AT-13R2 is reported. Any change there voids the 27 standing events and requires the full 14-layer AT-13R on the new commit.

**AT-13R2: the smallest experiment that settles the clause.** It is pre-registered here, before any data. [render-ops renders through the queue; the sync-verifier measures; the motion-engineer neither renders nor grades.]
- **Scope:** events 8 and 14 only. The other 27 events stand as measured in AT-13R (raw: 0 ×26, +1 ×1).
- **Engine:** a git worktree at a commit whose `studio/` equals `011cae1`, so that `git diff 011cae1 <HEAD> -- studio/` is empty.
  - render-ops writes HEAD, the full `git status --porcelain` output and the SHA-256 of every spec into the report.
  - render-ops keeps the worktree until the sync-verifier has re-read and countersigned those values.
- **Stimuli:** three solo renders, each made with `dc render spec <id> --fps 24 --nocam --nofx --cut --solo rules`:
  - T = `_demo`, unchanged;
  - C8 and C14 = worktree-only copies of `_demo.json`. In each, only the target action (event 8 or event 14) is re-anchored to a later word in the same shot whose anchor frame is ≥ expected + 17 f, outside the window.
  - Action type, rows and `lead_frames` stay unchanged, so the row count and layout are identical. Deletion is not used because `TableGrid.tsx:93,96` sizes and keys the table on its final row count.
  - The sync-verifier names the two words before rendering.
  - `corpus/specs/_demo.json` is not edited.
- **Measurement:**
  - d_k = mean |gray(T_k) − gray(C_k)| at 480×270, as in `at13.md` §1. The target action's timing is the only difference between T and C.
  - Onset = the first k in [expected − 6, expected + 10] with d_k ≥ 0.05. Offset = onset − expected.
- **Validity.** A validity failure voids the run; it is not a fail.
  - max d_k ≤ 0.025 over [expected − 30, expected − 7]. If this fails, the run is repeated from the same engine with lossless frames for [expected − 30, expected + 10], and then onset = the first k ≥ expected − 30 with d_k ≥ 0.05, with no void.
  - T reproduces the AT-13R raw onsets of the other 10 `rules` events exactly (engine identity).
  - An onset exists in the window.
- **Pass:** substitute the two offsets into the 29-event set. The set must then meet median ≤ 40 ms, p95 |offset| ≤ 100 ms and no event earlier than −1 f. This is the AT-13R rule, unchanged.
- **Cost:** 3 × 1,229 f at about 0.063 s/f (about 4 min of queue time) and about 7 MB. The renders are deleted after the report.
- **Outcomes:**
  - **Pass:** the chair records the AT-13R pass, ratifies Q2 = RV1, closes INC-011-1 and lifts the bar. This happens by a chair record in `decisions.json`, never by an automatic trigger.
  - **An event earlier than −1 f:** if it is attributable to the RV1 shift (with `REVEAL_ONSET_F = 0` the event would be at −1 f or later), RT-011-5 applies and Q2 goes to a new ballot. Otherwise the motion-engineer fixes TableGrid and the full AT-13R is re-run on the new commit.
  - **Void:** repeat as stated.

**Follow-ups:**
- **render-ops:** AT-13R2 renders and provenance, as above.
- **sync-verifier:**
  - name the C8 and C14 anchor words;
  - measure AT-13R2 and append the result to `reports/sync/at13.md` and the JSON;
  - keep the event 22 flag.
- **harness-engineer:** this repeats the AT-13 follow-up, and it now blocks any further measurement render.
  - `dc render spec` writes engine HEAD and the `studio/` dirty flag into `resolver.json` and the queue `engine` field;
  - it refuses `--solo` on a dirty `studio/`.
- **motion-engineer:**
  - make no change to the frozen paths until AT-13R2 is reported;
  - then examine event 22, orders addRow `001684`. Its d is 0.01 on the anchor frame 968 and its visible step is at 969, so it reads +1 f under every reading. It is a sub-threshold first step, within all thresholds and non-blocking.
  - Any later change re-runs the affected layers (`rules`, `orders`).
- **council-chair:** rule on AT-13R2 by the rule above.
