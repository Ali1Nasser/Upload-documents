# G6a independent verification

## Round 4 (the task's "Round 1" of the third verification workflow; supersedes Round 3 below)

Verifier: a separate invocation that did not author or fix any P6 work. Read-only except this report.
Date: 2026-10-10 06:35 to 06:40 UTC. Repo HEAD at start: 8ae7cc0 (cond 2 chip 6 probe), 06:37 re-check at c8d4387.

### Verdict: FAIL (not passed)

`python3 tools/dc.py gate check G6a` returns **FAIL 7/8** (run at 06:35:35Z and again 06:37:5xZ, same result). The failing check is `ADR-009_cond_1_2_fixes_ocr`. Beyond that check, I found that the evidence behind two rows the checker marks green (cond 3, cond 4) and behind the freeze row is **older than the fix set**, which is exactly what the task asks me to confirm. By golden rule 7 the gate passes only through `dc gate check`, and only a Council ADR waives an item, so I cannot pass it.

| # | Failing item | Evidence | Owner |
|---|---|---|---|
| 1 | Checker logic, B1 lookup (unchanged since round 3) | `harness/gates/g06a.py` computes `b1` from `arabic_verdict(a_text)[1]`, the **latest section of the latest review** only. The latest review is `arabic_r4.md` (MD strip; `grep B1` finds nothing). The B1 row `\| B1 F7 chip 6 \| ... \| fixed \|` lives in the "Re-check" section of `arabic_r3.md`. So `b1` is False by construction. `git status` shows `harness/gates/g06a.py` unmodified, and the detail string still carries the hard-coded text "no isolated-render score" although `fix.json` now has one. Round 3 asked for this fix; it has not landed. | harness-engineer |
| 2 | ADR-009 cond 3, 4 and 5 evidence predates the fix set (the checker does not test recency) | The F7 chip 6 change (commit 8ae7cc0, Inter Tight `cv08` serifed `I` on the Latin run of `TagContent` in `studio/src/lookdev/world.tsx`) re-rendered `reports/lookdev/r3/stills/F7-standard_fix.jpg` at **06:34:24** (queue job 18). That is newer than every piece of evidence that claims to cover it: `arabic_r3.md` re-check PASS (7 stills, 23:05 on Oct 9), `arabic_r4.md` (06:13), `regress.json` (06:14:30, commit 06:14:41) and `freeze.json` `frozen_at` (06:17:31). `reports/lookdev/r3/fix.json` `b1_chip6_r3b.needs` itself lists the three open items: render-ops refresh of `regress.json` for F7 (cond 4), arabic-typographer re-check of chip 6 in the new still (cond 3), critic approval of the changed F7 baseline. I ran a dry copy of `studio/scripts/freeze_p6.py` (scratchpad, file write disabled, `freeze.json` md5 unchanged): it computes status **provisional** with two open preconditions: "cond 3: the PASS Arabic review predates the re-rendered still/strip for F7-standard_fix" and "cond 4: regress.json predates the newest re-rendered still". The committed `freeze.json` says `frozen` only because it was written before the F7 re-render. The gate rows `cond_3_rerender_review` and `cond_4_no_regression_diff` are green only because they test that files exist, not that they are newer than the stills. Also, cond 5 ordering: ADR-009 says freeze only after cond 1-4 hold, and cond 2 (all four strings, chip 6 included) was not evidenced until 06:34-06:35, 17 minutes after the 06:17:31 freeze. This is the same ordering rule that voided the freeze in round 0 (commit 1570317). | arabic-typographer (cond 3), render-ops (cond 4), motion-engineer (re-freeze), harness-engineer (recency checks) |

What I checked on the substance of item 2 so the owners know it is an evidence gap and not a regression: I diffed the current `F7-standard_fix.jpg` against the scored r3 `F7-standard.jpg` (960x540, LANCZOS, max-RGB |d| > 8/255, outside the chip box [376,264,544,319] + 16 px): 1,327 changed px, **0 outside**; against the previous fix still: 296 changed px (bbox 1080p (424,276)-(496,304)), 0 outside, matching the author's note. I viewed the old and new chip side by side at 3x: both read `AI 6` with no join; the new `I` has serifs. RT-2 is not triggered. I expect cond 3 and cond 4 to pass once they are refreshed.

### What is needed for a pass (smallest route)

1. **render-ops:** refresh `reports/lookdev/r3/regress.json` so it is newer than the F7 still and covers it (my reproduction above gives the numbers to expect: 0 px outside).
2. **arabic-typographer:** add a verdict section to a new `arabic_r*.md` that names `F7-standard_fix` (chip 6, `cv08`), PASS, committed after the still. Make sure the B1 row is where the checker can see it (see item 4).
3. **critic (recommended, from `fix.json` needs; not a G6a text criterion):** record that the glyph-only F7 change keeps the baseline.
4. **harness-engineer:** (a) read B1 per artifact across all `arabic_r*.md` (the rule `freeze_p6.py` already uses), and drop the stale hard-coded "no isolated-render score" text; (b) make the cond 3 and cond 4 rows test recency against the stills (the rule `freeze_p6.py` already has), so green means the evidence is current.
5. **motion-engineer:** re-run `python3 -I studio/scripts/freeze_p6.py` after 1-2, so `frozen_at` is later than all evidence; then `dc gate check G6a`.
6. A fresh verifier round after 1-5.

### Criteria re-derived by me (06 section 1, G6a; not read from the checker)

| Criterion | My result | Status |
|---|---|---|
| ADR-002/003/004/005 decided | `docs/decisions/ADR-00{2,3,4,5}-*.md` present; `decisions.json` lists all four `decided` (2026-10-09); ADR-009 and ADR-010 also `decided` | pass |
| Look mean >= 8.0 | `critic_r3.json`: 10 families x 7 criteria = 70 scores, sum 561, **8.0143**, min 7 | pass, zero headroom (one point = 0.014) |
| AI-Unpacked parity >= 7.5 | `parity_read` 7.5, 7.5, 7.5, 7.0, 8.0 = 37.5/5 = **7.50** | pass, zero headroom |
| W-009-LOOK covers that read | `decisions.json` ADR-009 waiver W-009-LOOK scope "r3 style-frame set only: stills F1-F9 + F4-hero; strips MA, MB, MB-hero, MC, MD"; critic_r3 is that set. Item 2 numbers are met, only the confirmatory re-score is waived. The F7 glyph change is outside the scored baseline by 296 px and 0 px outside the chip box, so RT-2 is not triggered | pass |
| Tokens, presets, catalog frozen | hashes: see below (227/227). `status: frozen` is stale per failing item 2 | **hash pass; freeze currency fails** |
| Projected final render <= 24 h | see Projection | pass on the ADR-002 pure-P12 reading |

### Freeze, catalog, compile (re-derived)

- `harness/state/freeze.json`: `status frozen`, `frozen_at 2026-10-10T06:17:31Z`, `base_commit df2ee0d`, `open_preconditions []`, `join_gap_amendment` ADR-010.
- My own SHA-256 pass (`python3 -I`, every path in `groups`): tokens 1, type 2, fonts 12, catalog_src 106, catalog_json 106 = **227 files, 0 changed, 0 missing**. `git diff --stat df2ee0d HEAD -- studio harness/schemas` touches no frozen file (only `studio/src/lookdev/*`, `studio/scripts/lookdev_typeprobe*`, `freeze_p6.py`, `scene_spec.schema.json`).
- 04 section 8: I parsed the table myself: **104 distinct names**, each with `studio/src/components/<Name>/schema.ts` and `harness/schemas/components/<Name>.json`, each present in the freeze; 0 unlisted component dirs. All 106 JSON files pass `Draft202012Validator.check_schema` (0 bad).
- Compile, queue job 23 (`dc q submit` then `q wait`, exit 0): `tsc -p studio/tsconfig.json --noEmit` exit 0; `export_catalog.ts` (esbuild bundle, scratch root, so the repo files are not overwritten) ends "all catalog checks passed; 104 schemas"; the 106 exported files are **byte-identical** (`diff -rq`) to the committed `harness/schemas/components/`; `check_type.sh` ends "all type checks passed" (the gate detail records 43 ok).

### ADR-010 (JOIN_GAP amendment)

- `decisions.json`: ADR-010 `decided` 2026-10-10, `amends` ADR-009; `ADR-010-join-gap-amendment.md` says `Status: decided`, option A1, 3 of 3 owning lenses, mean confidence 0.773.
- Implementation matches: `studio/src/type/arabic.ts:60` `JOIN_GAP = {display: {caps: 0.2, latin: 0.25}, text: {caps: 0.25, latin: 0.3}}`, display band from 56 px (`FONT.arDisplay.minPx`), unknown size = text band, applied only after a tatweel; `arabic.check.ts:73-79` asserts exactly those values; `freeze.json.join_gap` is the same table; `arabic.ts` hash unchanged since the freeze.
- Non-blocking, from ADR-010: `freeze_p6.py` and `g06a.py` still only check that an amending ADR exists, not that the values equal ADR-010 (the hash freeze still catches any edit); `reports/lookdev/r3/typeprobe_sweep.json` is not checked in; AT-11 and AT-12 are P7/P8 tests.

### ADR-009 conditions 1-5, evidence vs the fix set (UTC; "fix set" now includes the 06:29-06:34 chip 6 change)

| Cond | Evidence and time | Newer than the fix set? | Status |
|---|---|---|---|
| 1 fixes land | B1 `AI 6` chip (now with `cv08`), B2 `JOIN_GAP` per ADR-010, R1-R3 as in round 3; type suite passes after the chip change; tsc 0 (my job 23) | n/a | met |
| 2 isolated OCR >= 0.90 on 4 strings | `fix.json` `typeprobe_ocr` (queue jobs 14 render, 19 score, 06:34-06:35): F3-title, roadmap-72, idem-72, **F7-chip6** all 1.00 exact (4/4). Caveats: chip 6 passes with `cv08` (control `F7-chip6-nocv08` reads `Al 6`, 0.75), and the scorer was changed in the same commit (size-aware upscale, screen-order expected reading for no-Arabic wants), so the pass depends on a serifed `I`, which ADR-009 B1 allows as its fallback | yes | **substance met**; the checker still reports False because of failing item 1 |
| 3 re-render + fresh Arabic PASS | MD strip 23:14:22 (reviewed by `arabic_r4.md`, 06:13, PASS 0/0); F3-F6, F8 stills 23:01-23:03 (reviewed by the `arabic_r3.md` re-check, 23:05, PASS); **F7 still re-rendered 06:34:24, no review after it** | no, for F7 | **not met for F7-standard_fix** |
| 4 no-regression diff | `regress.json` 06:14:30 covers 7 stills; **predates the F7 re-render**. My own diff of the current F7 still: 0 px outside | no, for F7 | **not met as evidence (stale); substance reproduced** |
| 5 freeze after 1-4, `g06a.py` cites W-009-LOOK | `frozen_at` 06:17:31 predates the cond 2 chip 6 evidence (06:34-06:35), the F7 re-render and the cond 3/4 refresh needed above; `freeze_p6.py` dry run says provisional; `g06a.py` look_parity detail does cite W-009-LOOK | no | **not met** |

### Projection for the locked runtime (3:51:00)

- `corpus/edl/lock.json`: 13,860,430 ms = **3 h 51 min 0.43 s** = 3.8501 h; 332,651 frames at 24 fps (13,860,430 x 24 / 1000 = 332,650.32, ceil matches).
- ADR-002 model (RT5, h = 0.05; S 0.141-0.183, H 0.904-1.038 box s/frame): low **16.55 h**, high **20.86 h**; high + 25 % contingency 26.07 h (fails the 24 h line on that reading, where the ADR-002 R2 ladder applies).
- Measured, `reports/lookdev/r3/perf.json`: blended 0.1339 box s/frame, so 0.1339 x 332,651 / 3600 = **12.37 h**; the 24 h line at this runtime is 0.2597 box s/frame.
- Worst 20.86 h <= 24 h on the ADR-002 reading that the 24 h is the pure P12 projection. Caveat carried: `perf.plates` is `{}`, so plate bake cost and the disk plan are not in the projection (ADR-009 AT-9, blocks P10, not a G6a row). Disk is 4.1 GB free at 90 % use.

### Other observations (non-blocking)

- Non-gate OCR items in `fix.json`: `caps-AI-32` 0.80 raw and `F6-head` 0.65 raw, both non-gate; the `الـAI` 32 px case is AT-11 (P7) with I/l normalisation, and `dc qa arabic` (commit 4c04a1f, b308dce) now scores the ADR-009 gate fixture 6/6 including chip 6.
- Strips MA, MB, MB-hero, MC are still the pre-fix renders (stale gaps); not valid Arabic evidence for G8 until re-rendered (arabic_r3 open item 2, ADR-010 follow-up for render-ops).
- Canon drift `6 الـAI` vs look-dev `6 AI`: the scene-director must restore the article or log a `pending-council` override in P8.
- The look pass has no real margin (8.0143, 7.50). The like-for-like G8 starting point stays 7.82 (no cost column); no G8 waiver may cite W-009-LOOK.

### Side effects of this verification

- `dc gate check G6a` rewrote `reports/gates/G6a.json` and `harness/state/progress.json` (timestamps and detail text only); I restored both with `git checkout`.
- `dc q submit` (job 23) updated `harness/state/queue.json`; left uncommitted because other agents also write it. Scratch files are in the session scratchpad only. No frozen file, `freeze.json`, or other agent's file was written; the freeze dry run used a scratchpad copy with the write removed.
- I committed only this report.

---

## Round 3 (superseded by Round 4 above; kept for the record; it supersedes Round 2 below)

Verifier: a separate invocation that did not author or fix any P6 work. Read-only except this report.
Date: 2026-10-10 06:2x UTC. Repo HEAD at start: d281e58 (freeze closed). Prior rounds 0-2 (Oct 9) are kept below for the record.

### Verdict: FAIL (not passed)

`python3 tools/dc.py gate check G6a` returns **FAIL 7/8** (run twice, 06:18:54Z and 06:23:52Z, same result). The one failing check is `ADR-009_cond_1_2_fixes_ocr`. Everything else I was asked to confirm holds. By golden rule 7 a gate passes only through `dc gate check`, and only a Council ADR can waive an item, so I cannot pass it.

| # | Failing item | Evidence | Owner |
|---|---|---|---|
| 1 | Checker logic: B1 lookup | `harness/gates/g06a.py` (cond 1-2 block) computes `b1` from `arabic_verdict(a_text)[1]`, where `a_text` is the **latest** review only. The latest is now `arabic_r4.md` (MD strip only), which has no B1 row. The B1 row (`\| B1 F7 chip 6 \| ... \| fixed \|`) is in the "Re-check" section of `arabic_r3.md`. So `b1` is False by construction, whatever the evidence says. `freeze_p6.py` already reads cond 3 per artifact across reviews (`cond3_reviews` in freeze.json); `g06a.py` does not. The HEAD commit message already records "G6a 7/8 (g06a.py B1 lookup only in latest review)". | harness-engineer |
| 2 | Substance: ADR-009 cond 2, fourth string | ADR-009 cond 2 requires an isolated-render OCR >= 0.90 on four strings: three Arabic+Latin strings **and the F7 chip 6 text**. `reports/lookdev/r3/fix.json` `typeprobe_ocr` has 3 gate items (F3-title, roadmap-72, idem-72, each 1.00 exact) and **no F7 chip item**; the gate's own detail says "no isolated-render score". The substitute is the arabic-typographer's OCR on a still crop (`Al 6`, the Inter I/l ambiguity), which is not an isolated render. Fixing item 1 alone would turn the gate green on that substitute, but ADR-009 says all conditions are required and a departure from its text is for the Council (precedent: ADR-010 for B2). | arabic-typographer (probe) or council-chair (ADR) |

My own look at B1: the chip now reads `AI 6` with no join (old still `AIJI 6`); tesseract `eng --psm 7` on my crop gives `Al 6`; `ara+eng --psm 7` gives `6 الم` (Latin `AI` read as Arabic `ال`+`م`). So a scored isolated render of this chip needs the I/l and Al/AI normalisation that the one-off script lacks (that normalisation is AT-10, `dc qa arabic`, not yet committed; an untracked `tools/dclib/qa_arabic.py` is another agent's work in progress and I did not touch it).

### What is needed for a pass (smallest route)

1. **arabic-typographer (with render-ops, via `dc q`):** add one gate probe `F7-chip-6` (`AI 6`, 32 px, the chip's face) to the isolated-render set, score it with I/l/1 and Al/AI normalisation, and record it in `reports/lookdev/r3/fix.json` with score >= 0.90 (or run it through `dc qa arabic` once AT-10 lands and cite that). **Or council-chair:** a decided ADR that records that a Latin-only chip has no join to test and that B1 is closed by the Arabic review.
2. **harness-engineer:** make the B1 lookup in `g06a.py` read the latest verdict section **per artifact** across `arabic_r*.md` (the same rule as `freeze_p6.py`), and, if route 1 is taken, require the F7 chip item in `fix.json`; then `dc gate check G6a`.
3. A fresh verifier round (not me, or a new invocation) after items 1 and 2. Nothing else is open.

### Criteria re-derived by me (06 section 1, G6a; not read from the checker)

| Criterion | My result | Status |
|---|---|---|
| ADR-002/003/004/005 decided | `docs/decisions/ADR-00{2,3,4,5}-*.md` present; `decisions.json` shows all four `decided` (Council C2, 2026-10-09) | pass |
| Look mean >= 8.0 | `critic_r3.json`: 10 families x 7 criteria = 70 scores, sum 561, **8.0143**; min 7; column means composition 8.0, palette 8.1, light/depth 7.6, typography 8.0, legibility 7.9, parity 7.3, cost 9.2 | pass, zero headroom (one point = 0.014) |
| AI-Unpacked parity >= 7.5 | `parity_read` 7.5, 7.5, 7.5, 7.0, 8.0 = 37.5/5 = **7.50** | pass, zero headroom |
| W-009-LOOK covers this read | ADR-009 waiver scope "r3 style-frame set only: stills F1-F9 + F4-hero; strips MA, MB, MB-hero, MC, MD"; critic_r3 is that set; thresholds are met on the numbers, only the confirmatory re-score is waived; no G8 waiver may cite it. RT-2 not triggered (cond 4: 0 px outside). I did not re-score the set; the critic's read is the gate input | pass |
| Tokens, presets, catalog frozen | see Freeze below | pass |
| Projected render <= 24 h | see Projection below | pass (ADR-002 pure-P12 reading) |

### Freeze, catalog, compile (re-derived)

- `harness/state/freeze.json`: `status: "frozen"`, `frozen_at 2026-10-10T06:17:31Z`, `base_commit df2ee0d`, `open_preconditions []`, `join_gap_amendment` ADR-010, `cond3_reviews` arabic_r3 + arabic_r4.
- My own SHA-256 pass (`python3 -I`, every path in `groups`): tokens 1, type 2, fonts 12, catalog_src 106, catalog_json 106 = **227 files, 0 changed, 0 missing**. `git status` shows no uncommitted change under any frozen path.
- 04 section 8: I parsed the table myself: **104 distinct component names**; each has `studio/src/components/<Name>/schema.ts` and `harness/schemas/components/<Name>.json` (0 missing).
- Compile, queue job 5 (`dc q submit` then `q wait`, exit 0): `tsc -p studio/tsconfig.json --noEmit` exit 0; `export_catalog.ts` bundled with esbuild and run against a scratch root: "all catalog checks passed; 104 schemas"; the 106 exported files are **byte-identical** to the committed `harness/schemas/components/` (`diff -rq`); type suite `check_type.sh` **43 ok**, all passed. All 106 JSON files pass `Draft202012Validator.check_schema` (0 bad).

### ADR-009 conditions 1-5, evidence vs the fix set (UTC)

Fix set: source edits 22:57 to 23:02:09 (frames.tsx 22:57:29, kit/TypeProbe 22:59:26, arabic.ts 23:01:07, world.tsx 23:02:09), commit a3b86c1 23:03:30. `tokens.ts` changed later at 23:10:32 (a773103) but is **+24/-0 lines, additive** (presets, text-safe), so no visual change to the rendered stills.

| Cond | Evidence and time | Newer than the fix set? | Status |
|---|---|---|---|
| 1 fixes land | B1 `DISTRICT_AR[5] = 'AI'` (world.tsx:49); B2 `JOIN_GAP` (arabic.ts:60); R1 F6 `dir="rtl"`, `←`, LTR isolates; R2 ghost split in two phrases; R3 F5 `s` 0.55 em. I viewed F6, F7 chip, F8, and F3/F4/F5 crops at full size: lam foot clearly separated from `partition`, `roadmap`, `idempotency`; grid RTL (0.165 right, `←`, 0.227 left); ghost on two lines flush right; `5 s`/`57 s` unit visible. Type suite 43 ok (my run) | n/a (this is the fix set) | met |
| 2 isolated OCR >= 0.90 | queue `typeprobe-final` 23:01:07-23:01:33 ran after the last arabic.ts edit; 3/3 gate strings 1.00 exact, F4/F6 34-36 px labels 1.00 | yes | **3 of 4 strings; F7 chip 6 has no isolated-render score (failing item 2)** |
| 3 re-render + Arabic PASS | stills F3-F7 23:01:46, F8 23:03:14 (after the last world.tsx edit, which is the F8/MD ghost block; the F7 tag code is untouched by it), MD strip 23:14:22. Reviews: `arabic_r3.md` re-check (7 stills, mtime 23:05, PASS) and `arabic_r4.md` (MD-standard_fix, mtime 06:13, PASS, 0 blocking, 0 required) | yes, both | met |
| 4 no-regression diff | `regress.json` 06:14:30, by render-ops, pass true, covers all 7. I **reproduced** it: each `*_fix.jpg` vs the scored r3 `.jpg` at 960x540 (LANCZOS, max-RGB \|d\| > 8/255): changed px F3 5184, F4 2577, F4-hero 2581, F5 76, F6 43475, F7 1332, F8 10064 (identical to theirs), **0 px outside** the edited boxes + 16 px in all 7; F7 changed bbox is the chip only | yes (after all stills) | met |
| 5 freeze after 1-4, `g06a.py` cites W-009-LOOK | `frozen_at` 06:17:31 is after regress 06:14:30, arabic_r4 06:13, ADR-010 06:13:20; `g06a.py` look_parity detail cites W-009-LOOK | yes | met, subject to item 1 (the gate it feeds is red) |

### ADR-010 (JOIN_GAP amendment)

- `decisions.json`: ADR-010 `decided`, `amends` ADR-009 B2, A1 3/3 owning lenses, mean confidence 0.773; `docs/decisions/ADR-010-join-gap-amendment.md` says `Status: decided`.
- Implementation matches: `studio/src/type/arabic.ts:60` `JOIN_GAP = {display: {caps: 0.2, latin: 0.25}, text: {caps: 0.25, latin: 0.3}}`; display band starts at 56 px (`FONT.arDisplay.minPx`); `freeze.json.join_gap` is the same table; `arabic.check.ts` asserts the same values (display 0.20/0.25 at 92 px and at 56 px, text 0.25/0.30 at 34-36 px and unknown size), and it passes (43 ok). Frozen hash of arabic.ts is unchanged.
- Non-blocking: ADR-010 asks the harness-engineer to make `freeze_p6.py` and `g06a.py` **compare** `JOIN_GAP` with the ADR-010 values. `freeze_p6.py` still only checks that an amending ADR exists (`if jg != ADR9_B2 and not amend`) and `g06a.py` has no JOIN_GAP check. The hash freeze still catches any edit of arabic.ts, so this is governance, not a hole today. Also carried from ADR-010: the raw sweep outputs are not on disk and `typeprobe_sweep.json` is not yet checked in; AT-11 and AT-12 are P7/P8 tests, not G6a.

### Projection for the locked runtime (3:51:00)

- `corpus/edl/lock.json`: 13,860,430 ms = **3 h 51 min 0.43 s** = 3.8501 h; 332,651 frames at 24 fps (13,860,430 x 24 / 1000 = 332,650.3, ceil matches).
- ADR-002 model (RT5, h = 0.05; S 0.141-0.183, H 0.904-1.038 box s/frame): low **16.55 h**, high **20.86 h**; high + 25 % contingency 26.07 h (fails the 24 h line on that reading, where the ADR-002 R2 ladder applies).
- Measured, `reports/lookdev/r3/perf.json`: blended 0.1339 box s/frame, so 0.1339 x 332,651 / 3600 = **12.37 h**; the 24 h line at this runtime is 0.2597 box s/frame.
- Worst 20.86 h <= 24 h on the ADR-002 reading that 24 h is the pure P12 projection; ADR-002 is also itself a decided ADR on fps and FX share (the "or an ADR" prong of 06). Caveat carried: `perf.plates` is `{}`, so plate bake cost and the disk plan are not in the projection (ADR-009 AT-9, blocks P10, not a G6a row). Disk is 4.1 GB free at 90 % use.

### Other observations (non-blocking)

- **MD strip vs the pre-fix render, outside the ghost box.** `arabic_r4.md` item 2 asks render-ops to explain it, and `regress.json` covers the 7 stills only (the ADR-009 cond 4 text says stills). I diffed 8 frames of `MD-standard_swiftshader_r3pre.mp4` against the post-fix `MD-standard_swiftshader.mp4` (960x540, thr 8/255, ghost box + 16 px excluded): outside px f0 0, f20 15, f33 191, f160 228, f210 1,488 (0.29 %), f260/f262/f287 **0** (identical); max \|d\| outside 22/255. The growth with frame index and exact identity after the ghost leaves look like H.264 inter-frame drift, not a layout change, but this is inference from the pattern; render-ops should confirm on pre-encode frames, then delete the 33 MB `..._r3pre.mp4`.
- Strips MA, MB, MB-hero, MC are still the pre-fix renders (stale gaps); not valid Arabic evidence for G8 until re-rendered (arabic_r3 open item 2, ADR-010 follow-up for render-ops).
- Canon drift `6 الـAI` vs look-dev `6 AI`: the scene-director must restore the article or log a `pending-council` override in P8 (ADR-010 follow-up).
- The look pass has no real margin (8.0143, 7.50). The like-for-like G8 starting point stays 7.82 (no cost column); no G8 waiver may cite W-009-LOOK.

### Side effects of this verification

- `dc gate check G6a` rewrote `reports/gates/G6a.json` and `harness/state/progress.json` (timestamps only); I restored both with `git checkout`. The committed G6a.json (7/8, 06:17:45Z) is current.
- `dc q submit` (job 5) updated `harness/state/queue.json`; that live queue state is left uncommitted because other agents are also writing it. Scratch files are in the session scratchpad only; no temp files left in the repo.
- I committed only this report. Uncommitted work by other agents (`tools/dclib/cli.py`, `tools/dclib/qa_arabic.py`, `tools/tests/`, `reports/qa/arabic/`) was not touched.

---

## Round 2 (superseded by Round 3 above; kept for the record)

Verifier: a separate invocation that did not author or fix any P6 work. Read-only except this report.
Date: 2026-10-09. Repo HEAD at start: 086bb6f (round 1 report f9f00b7).

### Verdict: FAIL (not passed)

`python3 tools/dc.py gate check G6a` returns **FAIL 5/8**, the same three failures as round 1. Nothing the fix owners had to deliver has landed.
`git diff --stat 1570317..HEAD` (the commit round 1 started from) touches only `docs/handoffs/PHASE-06.md` and this report; nothing under `studio/`, `harness/`, `reports/lookdev/` or `docs/decisions/` changed.
The look/parity score is **not** a failing item (8.014 and 7.50 hold on the critic's r3 read), so the "report it, no waiver" clause does not apply. The fix agent must still not self-grade cond 3 (arabic-typographer) or cond 4 (render-ops).

| # | Failing item | My own evidence |
|---|---|---|
| 1 | 06 criterion 3, "tokens, presets and component catalog frozen" | `harness/state/freeze.json` is `status: "provisional"`, `hashed_at 23:23:14Z`, `open_preconditions` lists 3 items. Not `frozen`. |
| 2 | ADR-009 cond 3, re-render plus a fresh Arabic PASS | `reports/lookdev/arabic_r3.md` still ends with the PASS heading of 23:05:03 (commit d6ac265). `grep MD-standard_fix arabic_r3.md` finds nothing. `strips/MD-standard_fix.jpg` was rendered at 23:14:22, after that review. `arabic_r4.md` does not exist. |
| 3 | ADR-009 cond 4, render-ops no-regression diff | `reports/lookdev/r3/regress.json` does not exist. |
| (3b) | JOIN_GAP amendment (freeze precondition, not a gate row) | `studio/src/type/arabic.ts` has display {caps 0.20, latin 0.25}, text {caps 0.25, latin 0.30}; ADR-009 B2 says display {0.20, 0.14}, text {0.25, 0.10}. `grep -rl JOIN_GAP docs/decisions` finds only ADR-009. No amending ADR exists (`ls docs/decisions`: ADR-001..005, ADR-009, briefs). Owner council-chair. |

Cond 5 of ADR-009 says freeze "only after conditions 1-4 hold", so the freeze row cannot pass until items 2, 3 and 3b are done and `studio/scripts/freeze_p6.py` exits 0 with `status: frozen`.

### Gate checker, as run now

| Check | Result |
|---|---|
| adr_002_005_decided | ok |
| look_parity | ok (critic_r3 8.01 / 7.5, W-009-LOOK scope covers r3) |
| arabic_review_pass | ok (the 7 fix stills only) |
| tokens_presets_catalog_frozen | **fail** (`status` is `provisional`) |
| projected_render_le_24h | ok (pure P12 reading) |
| ADR-009_cond_1_2_fixes_ocr | ok |
| ADR-009_cond_3_rerender_review | **fail** (MD-standard_fix not covered) |
| ADR-009_cond_4_no_regression_diff | **fail** (`regress.json` missing) |

### 06 section 1 criteria, re-derived by me (not read from the checker)

| Criterion | My result | Status |
|---|---|---|
| ADR-002/003/004/005 decided | `docs/decisions/ADR-00{2,3,4,5}-*.md` exist, each states "decided (Council C2, 2026-10-09)"; `harness/state/decisions.json` lists ADR-002..005 as `decided` (C2) | pass |
| Look rubric mean >= 8.0 | `critic_r3.json` per_family, 10 families x 7 criteria = 70 scores, sum 561, **8.0143**. Column means: composition 8.0, palette 8.1, light/depth 7.6, typography 8.0, legibility 7.9, parity 7.3, cost 9.2. Min score 7 | pass, zero headroom (one score point = 0.014) |
| AI-Unpacked parity >= 7.5 | `parity_read` (7.5, 7.5, 7.5, 7.0, 8.0) = **7.50**; min criterion 7 | pass, zero headroom |
| Tokens, presets, catalog frozen | Hashes match (below), status `provisional` | **fail** |
| Projected final render <= 24 h | 16.55-20.86 h pure (below); fails on a +25 % reading (26.07 h), where the ADR-002 R2 ladder applies | pass on the ADR-002 pure-P12 reading |

### Style frames viewed (1920x1080, r3 fix round; round 1 viewed F2, F3 fix, F9; round 0 viewed F7, F4-hero, F1, F6, F8, MD)

- **F4-hero_fix (critic 8.14):** dense cyan/violet field, a clean title band `بيحوّل النص لموضع`, two result cards `0.165` (red) and `0.227` (green) with `قسم الـ roadmap` / `قسم الـ idempotency` showing a visible tatweel gap and no fusion with the Latin (B2 closed). The large bokeh discs at about x 1200-1350 / y 650-780 and x 390-465 / y 500-575 are still grey/tan and off palette (critic issue 3, carried as AT-2). I would score palette 7 rather than 8, so 8.00 instead of 8.14 for this family. Parity 8 is on the generous side.
- **F5-standard_fix (critic 8.14):** the strongest of these three on palette. Red (rebuilt) against green (cached) against cyan (edited) slabs read at once, `5 ثواني مقابل 57` is RTL-correct, the unit is small, the counters `57 s` and `5 s` are large. The lower-left quarter below the left stack is empty. Typography 8 and palette 9 hold.
- **F7-standard_fix (critic 8.00):** the best depth read in the set (lit, warm and dim towers, glowing Kafka route). Chip 6 now reads `AI 6` with no join (B1 closed). The three dim chips (`7 الدليل`, `AI 6`, `5 المجال`) are low-contrast, so legibility 7 is right.

Judgement: the critic's per-criterion scores are plausible and inside its stated calibration (9 = AI-Unpacked, 7 = premium dark UI with glow). The set is "glowing dashboard plus one real 3D scene (F7)", not parity. The pass is marginal. Round 1 and this round each found one score I would lower by a point (F3 legibility 8 to 7; F4-hero palette 8 to 7). Applied together they give 559/70 = **7.986**, under 8.0. I do not substitute my score for the critic's: the gate and ADR-009 W1 work from the critic's single read. The consequence is that the look pass has no real margin, which is why cond 4 and the ADR-009 RT-2 clause (a fresh critic re-score if the fix stills changed anything outside the edited boxes) matter.

### Freeze, catalog, compile (re-derived)

- `freeze.json` groups: tokens 1, type 2, fonts 12, catalog_src 106, catalog_json 106 = **227 files**. My own script (`python3 -I`, SHA-256 of every path): **227/227 match, 0 missing, 0 changed**. `git status` shows no uncommitted change under `studio/`, `harness/schemas/` or `reports/lookdev/`.
- 04 section 8: I parsed the catalog table myself and got **104 distinct component names**. Every one has `studio/src/components/<Name>/schema.ts` and `harness/schemas/components/<Name>.json`. No missing files. Extras are only `catalog.ts` and `contract.ts` (studio) and `_WordAnchor.json` and `_index.json` (schemas).
- Compile (queue job 12, `dc q submit` then `q wait`, exit 0): `tsc -p studio/tsconfig.json --noEmit` exits 0; `export_catalog.ts` bundled with esbuild and run against a scratch root exits 0 (it ends with `process.exit(fails ? 1 : 0)` after its contract checks); the 106 exported files are **byte-identical** to the committed `harness/schemas/components/` (`diff -rq`). All 106 JSON files pass `Draft202012Validator.check_schema` (0 bad).

### tokens.ts vs ADR-002 / ADR-003 (read from the files)

FPS 24, 1920x1080 (ADR-002 Q2.1 F24). `GL = 'swiftshader'` (Q2.2). `HERO_SHARE_MAX 0.05` (Q2.3 RT5). Lead frames kinetic 2, state 2, cut 3-5, SFX 3, hold 29, pause 144 (ADR-002 Q2.1 table, same numbers). FX standard: glow 10/32, grain 1.5 %, vignette 15 %, haze 8 %, particles 1,500, CA 0.6 px (Q2.4 FX2). Hero: bloom 1.0 (inside the 0.8-1.2 band), WebGL on, particle cap 1,500. `TEXT_SAFE.on` true and `caOnArabic 0` (Q2.4 chair conditions). Alexandria 700 at >= 56 px, Plex Arabic 600 with 0.08 em below that, Inter Tight 700, JetBrains Mono (ADR-003 T-A); labels 28 px spoken and 18 px secondary floor; tashkeel line 1.6; title/subtitle gap 0.3 em (ADR-003). Palette hexes are the 04 section 1.1 set. No mismatch with ADR-002 or ADR-003.
Non-blocking: `SIZE.hero` 176 px is above the 04 section 3.2 impact range (96-160 px) and unused; `JOIN_GAP` is the item 3b deviation above.

### Projection for the locked runtime

- `corpus/edl/lock.json`: 332,651 frames, 13,860,430 ms, 24 fps = 3.850 h (13,860,430 ms x 24 / 1000 = 332,650.3, ceil matches).
- ADR-002 model, h = 0.05, S 0.141-0.183 and H 0.904-1.038 box s/frame: low = 332,651 x (0.95 x 0.141 + 0.05 x 0.904) / 3600 = **16.55 h**; high = 332,651 x (0.95 x 0.183 + 0.05 x 1.038) / 3600 = **20.86 h**; high +25 % = 26.07 h.
- Measured (`reports/lookdev/r3/perf.json`): blended 0.1339 box s/frame, which is 0.1339 x 332,651 / 3600 = 12.37 h. The 24 h limit at this runtime is 0.2597 box s/frame.
- Worst 20.86 h <= 24 h on the ADR-002 reading that the 24 h is the pure P12 projection (ADR-002 lines 29-30). Caveat carried: `perf.plates` is empty, so the plate bake cost and disk plan are not in the projection (ADR-009 AT-9, blocks P10, not a G6a row).

### What is needed for a pass (unchanged from round 1)

1. **arabic-typographer:** a fresh review naming `MD-standard_fix` and the 7 `*_fix` stills, ending with a PASS heading, dated after 23:14:22.
2. **render-ops:** `python3 -I studio/scripts/lookdev_regress.py --boxes <boxes.json> --by render-ops` through the queue, writing `reports/lookdev/r3/regress.json` with `pass=true` covering the 7 stills. Then delete `data/renders/lookdev/r3/MD-standard_swiftshader_r3pre.mp4`.
3. **council-chair:** a decided ADR that names `JOIN_GAP`, says "amends ADR-009", and records the 0.25 / 0.30 mixed-case values (or revert `arabic.ts` to B2 and re-run the OCR gate).
4. **motion-engineer:** re-run `studio/scripts/freeze_p6.py` (must exit 0, `status: frozen`), then `dc gate check G6a`, then a round 3 verification.

### Side effects of this verification

- `dc gate check G6a` rewrote `reports/gates/G6a.json` and `harness/state/progress.json`; I restored both with `git checkout` (the committed G6a.json, 6/8 at 23:17:17Z, is stale; the harness should regenerate it on the fix agent's next run).
- `dc q submit` (job 12) updated `harness/state/queue.json`; that live queue state is left uncommitted, as round 1 left it. Scratch files are in the session scratchpad only.

---

## Round 1 (superseded by Round 2 above; kept for the record)

Verifier: a separate invocation that did not author or fix any P6 work. Read-only except this report.
Date: 2026-10-09. Repo HEAD at start: 1570317 (round 0 report cebb302; the only change since is the freeze void in 1570317).

### Verdict: FAIL (not passed)

`python3 tools/dc.py gate check G6a` returns **FAIL 5/8**. I re-derived every 06 section 1 G6a criterion myself and the gate's own checks.
The look/parity score is **not** the failing item: 8.014 and 7.50 hold on the critic's r3 read (zero headroom).
The gate fails on three items that the checker and I both find open, none of which any waiver covers (ADR-009 states Arabic correctness, the freeze ordering and the render budget are not waived):

| # | Failing item | Evidence (my own) |
|---|---|---|
| 1 | 06 criterion 3, "tokens, presets and component catalog frozen" | `harness/state/freeze.json` has `status: "provisional"` (voided in 1570317 on purpose, ADR-009 cond 5 ordering), not `frozen`. The 227 hashes still match the files, but the contract is not frozen until cond 3, cond 4 and the JOIN_GAP record below are done and `freeze_p6.py` is re-run. |
| 2 | ADR-009 cond 3, re-render plus a fresh Arabic PASS | All 7 `*_fix.jpg` stills exist and `arabic_r3.md` ends with a PASS heading (23:05:03). It names the 7 stills only. `strips/MD-standard_fix.jpg` was rendered at 23:14:22, after that review, and no review covers it. The review's own open item 2 says the strips were not re-rendered and must not be used as G6a/G8 evidence until they are. |
| 3 | ADR-009 cond 4, render-ops no-regression diff | `reports/lookdev/r3/regress.json` does not exist. The critic scored the pre-fix stills (22:45); nothing yet shows the fix stills changed only inside the edited text boxes plus 16 px. |

A fourth open item is recorded by the freeze script itself: `JOIN_GAP` is `display {caps 0.20, latin 0.25}`, `text {caps 0.25, latin 0.30}`, against ADR-009 B2 `display {0.20, 0.14}`, `text {0.25, 0.10}`. The arabic-typographer accepted the wider values after a measured OCR sweep (`arabic_r3.md`), but no decided Council ADR amends B2 yet (`ls docs/decisions`: ADR-001..005 and ADR-009 only). This is owner `council-chair`.

The only failure is therefore not the look/parity score, and the rule "report it and do not let the fix agent self-grade" does not apply. The fix agent must still not self-grade cond 3 (arabic-typographer) or cond 4 (render-ops).

### Gate checker, as run now

| Check | Result |
|---|---|
| adr_002_005_decided | ok |
| look_parity | ok (critic_r3 8.01 / 7.5, W-009-LOOK scope covers r3) |
| arabic_review_pass | ok (7 fix stills only) |
| tokens_presets_catalog_frozen | **fail** (`status` is not `frozen`) |
| projected_render_le_24h | ok (pure P12) |
| ADR-009_cond_1_2_fixes_ocr | ok |
| ADR-009_cond_3_rerender_review | **fail** (MD-standard_fix not covered) |
| ADR-009_cond_4_no_regression_diff | **fail** (`regress.json` missing) |

My independent reads agree with each row. I did not rely on the checker for any row below.

### 06 section 1 criteria, re-derived

| Criterion | My result | Status |
|---|---|---|
| ADR-002/003/004/005 decided | `decisions.json`: all four `decided` (C2, 2026-10-09); `docs/decisions/ADR-00{2,3,4,5}-*.md` exist | pass |
| Look rubric mean >= 8.0 | `critic_r3.json` per_family: 10 families x 7 criteria = 70 scores, sum 561, **8.0143**. Every family mean matches its stated value. Column means: composition 8.0, palette 8.1, light/depth 7.6, typography 8.0, legibility 7.9, parity 7.3, cost 9.2. Min score 7. 06 section 3.2 lists cost (inverse) as a look criterion, so 70 scores is the right set. Without cost: 7.817 | pass, zero headroom (one score point is 0.014) |
| AI-Unpacked parity >= 7.5 | Five-criterion read (06 section 3.3): (7.5 + 7.5 + 7.5 + 7.0 + 8.0) / 5 = **7.50**; min criterion 7. The per-family parity column mean is 7.3 | pass, zero headroom |
| Tokens, presets, catalog frozen | Hashes match (below) but `status` is `provisional` | **fail** |
| Projected final render <= 24 h | See Projection | pass on the ADR-002 pure-P12 reading; fails on a +25 % reading |

### Style frames viewed (1920x1080, r3 round)

I viewed `F2-standard`, `F3-standard_fix` and `F9-standard`. (Round 0 viewed F7, F4-hero, F1, F6, F8 and MD.)

- **F2 SQL funnel (critic 7.86):** dot columns drop 14 to 13 to 11, two red rows fall out, `13 -> 11 rows` numeral reads strongly, the clause rail and the code panel are clean. It is a glowing dashboard, so parity 7 is right. The two red-row arcs are static in the still (critic issue 6). Scores plausible.
- **F3 Kafka lag, fix still (critic 7.86, pre-fix):** the title now reads `الترتيب داخل الـ partition` with a visible tatweel gap and no lam-to-Latin fusion (B2 closed). The P1/P2 rows are nearly as sharp as P0, and their 0-9 digits are about 14 px; the P1 cell at x 1010-1100 is still clipped by the cyan offset line. This is exactly critic issue 4 / AT-3. The critic still gave F3 legibility 8 while naming those digits "noise"; I would score legibility 7 and the F3 mean 7.71. That is a 0.014 effect on the 70-score mean (8.014 to 8.000), so it does not change the pass, but it shows the margin is thinner than the number reads.
- **F9 orbit + kinetic word (critic 8.14):** three rings on a floor with light cones and reflections, `كلها` lit in signal cyan, particles in flight. Depth and light 8 is generous (rings are lit by cones, not by scene lights) but within the critic's calibration; cost 10 is fine.

Judgement: the critic's per-criterion scores are plausible, not inflated beyond its stated calibration, and the set is "premium dark UI with glow". The pass is marginal and rests on the pre-fix stills; that is why cond 4 matters.

### Freeze (re-derived)

- `freeze.json` groups: tokens 1, type 2, fonts 12, catalog_src 106, catalog_json 106 = **227 files**. I recomputed every SHA-256 with my own script (`python3 -I`): **227/227 match, 0 missing, 0 changed**. All 227 are git-tracked. `git status` shows no uncommitted change under `studio/` or `harness/schemas/`.
- Catalog: I parsed 04 section 8 myself and got **104 distinct component names**. All 104 have `studio/src/components/<Name>/schema.ts` and `harness/schemas/components/<Name>.json`; no extra dirs, no missing ones. The two extra JSON files are `_WordAnchor` and `_index`.
- Compile (queue job 11, `dc q submit` then `q wait`):
  - `tsc -p studio/tsconfig.json --noEmit`: exit 0, no diagnostics.
  - zod-to-JSON export into a scratch root (repo untouched): 25 contract checks `ok`, `all catalog checks passed; 104 schemas`, and the output tree is **byte-identical** (`diff -rq`) to the committed `harness/schemas/components/`.
  - All 106 JSON files pass `Draft202012Validator.check_schema` (0 bad).

### tokens.ts vs ADR-002 / ADR-003 / 04

All values read from `studio/src/tokens.ts` itself: FPS 24, 1920x1080 (ADR-002 Q2.1 F24); `GL = 'swiftshader'` (Q2.2); `HERO_SHARE_MAX 0.05` (Q2.3 RT5); lead frames kinetic 2, state 2, cut 3-5, sfx 3, hold 29, pause 144 (Q2.1 table); FX standard glow 10/32, grain 1.5 %, vignette 15 %, haze 8 %, particles 1,500, CA 0.6 px (Q2.4 FX2); hero bloom 1.0 (04 section 1.3: 0.8-1.2), WebGL on, cap 1,500; `TEXT_SAFE.on` and `caOnArabic 0` (Q2.4 chair conditions); the 13 palette hexes of 04 section 1.1 all match; Alexandria 700 at >= 56 px, Plex Arabic 600 with 0.08 em word-spacing below, Inter Tight 700, JetBrains Mono (ADR-003 T-A); labels 28 px spoken and 18 px secondary floor; tashkeel line 1.6, title-subtitle gap 0.3 em (ADR-003). PRESETS f24 equals `msToFrames(ms, 24)` and the catalog check covers it. No mismatch.

Non-blocking notes: `SIZE.hero` 176 px is above the 04 section 3.2 impact range (96-160 px) and no component uses it yet; the JOIN_GAP deviation above.

### Projection (locked runtime)

- `corpus/edl/lock.json`: 332,651 frames, 13,860,430 ms, 24 fps, so 3.850 h.
- ADR-002 model, RT5 (h = 0.05), S 0.141-0.183 and H 0.904-1.038 box s/frame:
  - low = 332,651 x (0.95 x 0.141 + 0.05 x 0.904) / 3600 = **16.55 h**;
  - high = 332,651 x (0.95 x 0.183 + 0.05 x 1.038) / 3600 = **20.86 h**.
- Measured (`reports/lookdev/r3/perf.json`): I recomputed (wall - overhead) / (frames - 1) for all five shots (0.1135, 0.1324, 0.2011, 0.1435, 0.1322; they match). Blended 0.95 x 0.1304 + 0.05 x 0.2011 = 0.1339 box s/frame, so **12.37 h**. The 24 h limit at this runtime is 0.2597 box s/frame.
- Worst case 20.86 h <= 24 h on the ADR-002 pure-P12 budget reading, headroom 3.1 h. On a +25 % contingency reading the worst case is 26.07 h and the ADR-002 R2 ladder applies.
- Caveats, already logged: the measured hero shot uses CSS hero FX, not real-time WebGL (the H band covers WebGL, so the model is the binding figure); `perf.plates` is empty, so plate bake cost and disk are not in the projection (ADR-009 AT-9, which blocks P10 and is not a G6a item).

### Other observations (non-blocking)

- ADR-009 cond 2 names four OCR gate strings; `fix.json` `typeprobe_ocr` has three isolated-render gate scores (all 1.00). The fourth, F7 chip 6, was closed by the Arabic re-check from a frame crop (`Al 6`, an I/l ambiguity), and the chip is now Latin `AI 6`. A documented substitution, not the ADR's literal wording.
- The isolated probe `F6-head` (72 px) scored 0.651 (non-gate; the Arabic re-check reports 1.00 on its own frame crop). Worth a look when `dc qa arabic` exists (AT-10).
- The cond 4 evidence field `by: "render-ops"` is self-declared in the freeze script's check; independence rests on the process, not the file.
- The committed `reports/gates/G6a.json` (23:17:17Z, 6/8) predates the freeze void and is stale. I restored it after running the checker, per the read-only rule. The harness should regenerate it when the fix agent re-runs the gate.

### What the fix agent needs (and who may not self-grade)

1. **arabic-typographer:** a fresh review naming `MD-standard_fix` (and any other re-rendered strip used as evidence), ending with a PASS heading, dated after the strip render.
2. **render-ops:** `python3 -I studio/scripts/lookdev_regress.py --boxes <boxes.json> --by render-ops` with the edited text boxes, writing `reports/lookdev/r3/regress.json` with `pass=true` and `covers` including the 7 fix stills.
3. **council-chair:** a decided ADR that names `JOIN_GAP`, says "amends ADR-009", and records the 0.25/0.30 mixed-case values (or revert `arabic.ts` to B2 and re-run the OCR gate).
4. **motion-engineer / harness-engineer:** re-run `python3 -I studio/scripts/freeze_p6.py` (it must exit 0 with `status: frozen`), then `python3 tools/dc.py gate check G6a`, then a round 2 verification.
5. If cond 3 or 4 changes any hashed file, the freeze needs an ADR first, and ADR-009 RT-1/RT-2 apply.

### Side effects of this verification

- `dc gate check G6a` rewrote the `created` and `checked` timestamps of `reports/gates/G6a.json` and `harness/state/progress.json`; I restored both with `git checkout`.
- `dc q submit` (job 11, tsc plus a scratch catalog export) updated `harness/state/queue.json`. That file was already modified by the round 0 verifier's job; I left the live queue state uncommitted.
- All other scratch files are in the session scratchpad.

---

## Round 0 (superseded by Round 1 above; kept for the record)

### Round 0 report

Verifier: a separate invocation that did not author or fix any P6 work. Read-only except this report.
Date: 2026-10-09. Repo HEAD at start: a773103.

## Verdict: FAIL (not passed)

`python3 tools/dc.py gate check G6a` returns **FAIL 6/8**. I re-derived every 06 section 1 G6a criterion myself.
The four criteria in 06 section 1 hold on the evidence. The gate still fails, for a reason that is not the look/parity score:
the two **ADR-009 close conditions 3 and 4** that make the conditional close valid are not done.
No waiver covers them (ADR-009 states Arabic correctness and the ordering "freeze only after conditions 1-4 hold" are not waived).

## What fails

| # | Failing check | Evidence |
|---|---|---|
| 1 | ADR-009 cond 3: re-render **and** a fresh PASS Arabic review of the re-rendered set | All 7 fix stills exist (F3, F4, F4-hero, F5, F6, F7, F8 `_fix.jpg`). `reports/lookdev/r3/strips/MD-standard_fix.jpg` was rendered at 23:14 and committed in a773103, **after** the last Arabic review (d6ac265). That review's scope line covers only "the 7 `*_fix.jpg` stills"; its open item 2 says MD "still shows the 7-word ghost and old gaps. Re-render before any strip is used as G6a/G8 evidence". No review covers `MD-standard_fix`. `fix.json` says MD "awaits arabic-typographer review and the render-ops condition-4 diff". |
| 2 | ADR-009 cond 4: render-ops no-regression diff | `reports/lookdev/r3/regress.json` does not exist. The tool `studio/scripts/lookdev_regress.py` is written, but render-ops has not run it with edited-box coordinates (and the author must not run it as evidence). |
| 3 | Process order (ADR-009 cond 5) | The freeze (`freeze.json`, 23:17:17Z, a773103) was made while conds 3 and 4 were open. ADR-009 says: "freeze tokens, presets and the catalog only after conditions 1-4 hold". Not a numeric failure, but a recorded ADR-order breach. If cond 3 or 4 finds a defect in a frozen file, the re-freeze needs an ADR. |

## Criteria re-derived (06 section 1, G6a)

| Criterion | My result | Status |
|---|---|---|
| ADR-002/003/004/005 decided | `decisions.json`: all four `decided` (2026-10-09), and `docs/decisions/ADR-00{2,3,4,5}-*.md` exist | pass |
| Look rubric mean >= 8.0 | Recomputed from `critic_r3.json` per_family (70 scores): 561/70 = **8.014**. Per-family means match. Includes the cost column, which 06 section 3.2 lists as a look criterion | pass, zero headroom |
| AI-Unpacked parity >= 7.5 | Five-criterion read (06 section 3.3): (7.5+7.5+7.5+7.0+8.0)/5 = **7.50**. Min single criterion 7 (>= 6) | pass, zero headroom |
| Tokens, presets, catalog frozen | See "Freeze" below | pass |
| Projected final render <= 24 h | See "Projection" below | pass (pure P12), fails on the +25 % reading |

## Style frames viewed (own eyes, 1920x1080)

I viewed F7-standard_fix, F4-hero_fix, F1-standard, F6-standard_fix, F8-standard_fix, and the MD-standard_fix strip.

- F7 Holo-City: the strongest frame (three-state lit/warm/dim towers, glowing Kafka route). Seven canon-labelled chips. Chip 6 now reads `AI 6` (no join fusion). Critic 8.00 (light 8, legibility 7) is plausible.
- F4-hero: dense cyan/violet field, clean title band, readable cards. The large bokeh discs are still grey/tan and muddy (critic issue 3, carried as AT-2). The critic's 8.14 with parity 8 is on the generous side but within its stated calibration.
- F1: clean premium dark UI. The bottom 250 px is empty and the box interior is flat glass (critic issue 6). Composition 8 is generous; parity 7 is right.
- F6: the best typography in the set (typography 9 holds). Order and arrow are now RTL-correct.
- F8: three rings on a floor with reflections and a two-line ghost title. Metaphor-weak, as the critic says (7). Fine.
- MD strip: reads cleanly; the f262 flare on `كلها` is mid-wipe. This is my look at it, not the formal Arabic review that cond 3 requires.

Judgement: the critic's per-criterion numbers are plausible and not inflated beyond its own calibration, but the set is "premium dark UI with glow", and the pass is **thin**:
- One score point is 0.0143 of the look mean, so 8.014 vs 8.0 is a one-point margin in 70.
- The per-family parity column averages 7.3. Only the five-criterion read reaches 7.5 (the gate reads the five-criterion read, as 06 section 3.3 defines it).
- Without the cost column the look mean is 7.82.
- The critic scored the **pre-fix** stills (22:45). The fix stills (23:01-23:03) were not re-scored; cond 4 exists to show that the score still applies.
- The critic reports "0 shaping errors" on stills where the Arabic review found blocking B1/B2. The critic does not run OCR, so its look scores are not shaping evidence.

## Informal diff probe (not render-ops evidence)

I diffed r3 vs `_fix` at 960 px (|delta| > 8/255) with a scratch script. Changed regions in 1920x1080 coordinates:

| Still | Changed region(s) | Reading |
|---|---|---|
| F3 | (760,64)-(1146,192) | title only |
| F4 / F4-hero | (1448,436)-(1594,502); (288,758)-(540,870) | the two cards only |
| F5 | two ~42 px boxes near (790-854, 176-278) | bar-end unit only |
| F6 | header, `0.165`/`0.227` grid, labels (43,475 px changed) | the R1 grid rework; large but inside the edited area |
| F7 | (362,250)-(556,330) | chip 6 only |
| F8 | four boxes in y 66-308 | ghost title only |

Nothing changed in backgrounds or untouched elements, which is consistent with a pass. It does not replace `regress.json` (render-ops, with declared boxes, pad 16 px).

## Freeze

- `freeze.json` has `status=frozen`, 227 hashed files (tokens 1, type 2, fonts 12, catalog_src 106, catalog_json 106). I recomputed every SHA-256: **227/227 match, 0 missing, 0 changed**. `git status` shows no uncommitted change under `studio/` or `harness/schemas/`.
- Catalog: I parsed 04 section 8 myself: **104 distinct component names**. All 104 have `studio/src/components/<Name>/schema.ts` and `harness/schemas/components/<Name>.json`. No extra component directories. The two extra JSON files are `_WordAnchor` and `_index`.
- Compile:
  - I re-ran the zod-to-JSON export into a scratch directory: all 25 contract checks `ok`, and the output is **byte-identical** to the committed `harness/schemas/components/` mirror.
  - All 106 JSON files parse and pass `Draft202012Validator.check_schema` (0 bad).
  - `tsc -p studio/tsconfig.json --noEmit` (via `dc q`, job 10): exit 0, no diagnostics.
- Anchor contract: `{word, lead_frames}` required; seconds, frames and bad word ids are rejected; no numeric time field in any schema.

## tokens.ts vs ADR-002 / ADR-003 / 04

| Token | Value | Source | OK |
|---|---|---|---|
| FPS, W, H | 24, 1920, 1080 | ADR-002 Q2.1 F24 | yes |
| GL | `swiftshader` | Q2.2 GL-SS | yes |
| HERO_SHARE_MAX | 0.05 | Q2.3 RT5 | yes |
| LEAD_FRAMES | kinetic 2, state 2, cut 3-5, sfx 3, hold 29, pause 144 | ADR-002 conversion table | yes |
| FX standard | glow 10/32, grain 1.5 %, vignette 15 %, haze 8 %, particles 1,500, CA 0.6 | Q2.4 FX2 | yes |
| FX hero | bloom 1.0 (0.8-1.2), particle cap 1,500, WebGL on | Q2.4 | yes |
| FX lite | CSS glow, grain 0, vignette 10 %, CA 0, 300 particles | 04 section 1.3 (unchanged) | yes |
| textSafe / `caOnArabic` | on / 0 | Q2.4 chair conditions | yes |
| Palette | all 13 hexes of 04 section 1.1 match | ADR-003 LK-F | yes |
| Fonts | Alexandria 700 at >= 56 px; Plex 600 below, word-spacing 0.08 em; Inter Tight 700; JetBrains Mono; labels Plex 500-600 | ADR-003 T-A | yes |
| Labels | 28 px spoken, 18 px non-spoken floor | ADR-003 | yes |
| LINE | tashkeel 1.6, title-sub gap 0.3 em | ADR-003 | yes |
| PRESETS f24 | arrive 6, impact 3-4, label 4, morph 7-12, exit 5-10 | `msToFrames(ms, 24)`, 6/6 check ok | yes |

Notes (non-blocking):
- `JOIN_GAP` is `display {caps 0.20, latin 0.25}`, `text {caps 0.25, latin 0.30}`. ADR-009 cond 1 (B2) text says mixed case 0.14 / 0.10. The arabic-typographer, who owns the spec, accepted the wider values after a measured OCR sweep. The token is frozen on a value that differs from the ADR text, so the Council should record this by amendment or note.
- `SIZE.hero` is 176 px, above the 04 section 3.2 impact range of 96-160 px. No component uses it yet.
- ADR-009 cond 2 lists four OCR gate strings. Three have isolated-render scores of 1.00 (`F3-title`, `roadmap-72`, `idem-72`). The fourth, F7 chip 6, has no isolated-render score; it was closed by the Arabic re-check's frame-crop read (`Al 6`, an I/l ambiguity). `g06a.py` accepts that explicitly. It is a documented substitution, not the ADR's literal wording.

## Projection (locked runtime)

- `corpus/edl/lock.json`: 332,651 frames, 13,860,430 ms, fps 24 (`332650.32` frames from ms, consistent). Runtime 3.850 h.
- ADR-002 model, RT5 (h = 0.05), S 0.141-0.183 and H 0.904-1.038 box s/frame:
  low = 332,651 x (0.95 x 0.141 + 0.05 x 0.904) / 3600 = **16.55 h**;
  high = 332,651 x (0.95 x 0.183 + 0.05 x 1.038) / 3600 = **20.86 h**.
- Measured: `reports/lookdev/r3/perf.json` standard mean (MA, MB, MC, MD) = 0.1304, hero (MB-hero) 0.2011; blended = 0.95 x 0.1304 + 0.05 x 0.2011 = **0.1339** (as stated) -> 12.37 h. All five motion shots are inside R5 (0.201). The 24 h limit at this runtime is 0.2597 box s/frame (ADR-002 R2 uses 0.240 for the old 4:10:07 plan).
- Worst case **20.86 h pure P12 <= 24 h**. Headroom 3.14 h.
- Caveats, all already logged:
  - ADR-002 reads the budget as pure P12. On the +25 % reading the worst case is **26.07 h**, over budget; the R2 ladder (hero share 3 %: 24.1 h; 1 %: 22.1 h) applies.
  - The measured rate uses CSS-hero shots for the hero share, not real-time WebGL (the H band covers WebGL), so the ADR model is the binding figure.
  - `perf.plates` is empty. The P10 plate bake cost and disk are not in the projection (AT-9, which blocks P10 and is not a G6a item).

## What the fix agent needs to do (and who may not)

1. arabic-typographer: a fresh review covering `MD-standard_fix.jpg` (and any other re-rendered strip used as evidence). It must end with a PASS heading that names `MD-standard_fix`. The fix agent must not self-grade.
2. render-ops: run `python3 -I studio/scripts/lookdev_regress.py --boxes <boxes.json> --by render-ops` with the edited text boxes (my probe regions above are a starting point), producing `reports/lookdev/r3/regress.json` with `pass=true` and `covers` including the 7 stills.
3. Council or chair: note the `JOIN_GAP` deviation and the freeze-before-cond-3/4 ordering. If cond 3 or 4 turns up a defect that changes a frozen file, RT-1/RT-2 of ADR-009 apply (waiver lapses, one bounded round with a fresh critic re-score).
4. Re-run `python3 tools/dc.py gate check G6a`; verify again.

## Side effects of this verification

- Running `dc gate check G6a` rewrote only the `created` timestamp of `reports/gates/G6a.json` and `harness/state/progress.json`; I restored both with `git checkout`.
- `dc q submit` (tsc job 10) updated `harness/state/queue.json`; I left that live queue state untouched and uncommitted.
- Scratch files are in the session scratchpad only.
