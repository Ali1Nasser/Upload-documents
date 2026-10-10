# G6a independent verification

## Round 7 (workflow round 0 of the re-verification after the g06a.py per-artifact fix; supersedes Round 6 below)

Verifier: a separate invocation that did not author or fix any P6 work. Read-only except this report (scratch files in the session scratchpad; queue jobs 33 and 34). Date: 2026-10-10 07:20 to 07:30 UTC. Repo HEAD at start and end: 601613e. I did not edit `harness/gates/g06a.py`, `freeze_p6.py` or any frozen file.

### Verdict: PASS

`python3 tools/dc.py gate check G6a` returns **PASS 8/8** (runs 07:20:39Z and 07:26:14Z, both 8/8). I then re-derived every 06 section 1 G6a criterion and every ADR-009 / ADR-010 close condition from the artifacts, not from the checker, and each holds. The Round 6 defect (cond 3 read only the latest review) is fixed in commit 601613e and I confirmed the fix on the real files and with the test suite. Three non-blocking observations and the carried P7/P8 items are listed at the end.

### Criteria re-derived by me

| Criterion | My evidence | Status |
|---|---|---|
| 06 s1: ADR-002/003/004/005 decided | `harness/state/decisions.json`: ADR-001..005, 009, 010 all `decided`; `docs/decisions/ADR-00{2,3,4,5}-*.md` present | ok |
| Look mean >= 8.0 and parity >= 7.5 | Recomputed from `reports/lookdev/critic_r3.json` per-family scores: 10 families x 7 criteria, sum 561 / 70 = **8.0143**; parity read (7.5, 7.5, 7.5, 7.0, 8.0) = **7.50**; min criterion 7; F1-F6 standard 8.0017; without the cost column 7.817. Both meet the thresholds with zero headroom, and ADR-009 W-009-LOOK (decisions.json, scope "r3 style-frame set only: stills F1-F9 + F4-hero; strips MA, MB, MB-hero, MC, MD") explicitly covers r3. The critic wrote the scores (not the author) | ok |
| Tokens, presets, catalog frozen | `harness/state/freeze.json` `status: frozen`, `open_preconditions: []`, `frozen_at 2026-10-10T07:10:47Z`, base c45d1d2. **227 hashed files** (tokens 1, type 2, fonts 12, catalog_src 106, catalog_json 106); I re-hashed every one with sha256: **227/227 match, 0 missing**. `git diff c45d1d2 HEAD` on `studio/src`, `studio/public`, `studio/fonts`, `harness/schemas` is empty. 04 section 8 lists **104** names = 104 `studio/src/components/*/schema.ts` dirs = `_index.json` count = all 208 per-component entries present in the freeze; `tokens.ts` and `type/arabic.ts` are in it | ok |
| Freeze is newer than every `*_fix` still and strip | `frozen_at` 07:10:47Z vs newest artifact F7-standard_fix mtime 06:34:24 (commit 8ae7cc0, 06:35:14); the other six stills 23:01:46-23:03:14 on 10-09, MD strip 23:14:22. It is also newer than `regress.json` (07:09:07), `arabic_r5.md` (07:10:33), `fix.json` (06:34:58) and ADR-010 (06:12:54). The ADR-009 cond 5 ordering (freeze only after cond 1-4) holds | ok |
| Projected final render <= 24 h | `corpus/edl/lock.json`: **332,651 frames** @ 24 fps (3.850 h). ADR-002 band S 0.141-0.183 / H 0.904-1.038 box s/frame at RT5 (5 % hero): by hand **16.55-20.86 h**; measured blended 0.1339 box s/frame (`r3/perf.json`) = **12.37 h**; worst **20.86 h** vs 24 h pure P12 (ADR-002 reads the budget as pure P12). Break-even is 0.2597 box s/frame. The +25 % contingency read is 26.07 h, which is the ADR-002 R2 ladder, not a G6a miss. AT-9 (plate bake cost) is still open and blocks P10 | ok |
| ADR-009 cond 1 (fixes land) | Viewed my own crops of the delivered 1920x1080 stills: F3 title `الـ partition` shows a clear gap and the tatweel foot; F6 head and labels read `قسم الـ roadmap` / `قسم الـ idempotency`; F6 grid is RTL (`0.165`, arrow, `0.227`); F7 chip 6 reads `AI 6` with a serifed I; F8 ghost is two lines of 4 + 3 words; F5 unit 0.55 em (source and r3 re-check) | ok |
| ADR-009 cond 2 (OCR >= 0.90, suite) | `r3/fix.json`: the four `gate: true` strings F3-title, roadmap-72, idem-72, F7-chip6 all **1.00 exact**; the non-gate probes (F6-head 0.651, caps-AI-32 0.80) are recorded as non-gate. I re-ran the type suite through the queue (job 34): **43 ok, 0 fail, "all type checks passed"**. `reports/qa/arabic/adr009-gate.json` (`dc qa arabic`) is pass on 6 items | ok |
| ADR-009 cond 3 (re-render + fresh PASS review) | See the coverage table below: 8/8 artifacts, each covered by a PASS review by the arabic-typographer (not the author) that is newer than the artifact's current mtime and commit | ok |
| ADR-009 cond 4 (no-regression diff) | `r3/regress.json` by render-ops, `pass: true`, `outside_px: 0`, covers all 7 stills, mtime 07:09:07 / commit 07:09:14, newer than the newest still (F7 06:34:24). **I recomputed all 7 diffs myself** (`*_fix` vs the scored r3 JPG, LANCZOS to 960x540, max-RGB |delta| > 8, allowed area = the recorded boxes + 16 px): changed-pixel counts equal render-ops' exactly (5184, 2581, 2577, 76, 43475, 1327, 10064), **0 px outside** in every still, largest delta outside 3/255 (F6) | ok |
| ADR-009 cond 5 (freeze, then G6a only via the CLI) | Freeze after cond 1-4 (see ordering above); `g06a.py` cites W-009-LOOK in the look row and checks the evidence; the pass is from `dc gate check G6a` | ok |
| ADR-010 values = `studio/src/type/arabic.ts` | `arabic.ts:60`: `JOIN_GAP = {display: {caps: 0.2, latin: 0.25}, text: {caps: 0.25, latin: 0.3}}`, display band >= `FONT.arDisplay.minPx` = 56. Identical in ADR-010 (table and machine-readable form), `decisions.json` ADR-010 `decision.JOIN_GAP` and `freeze.json` `join_gap`. ADR-010 status decided, committed 06:13:20, before the freeze | ok |
| `g06a.py` tests | `python3 -I tools/tests/test_g06a.py`: **40 checks ok** (includes: older PASS stays valid after a newer unrelated PASS; a later FAIL re-opens only its artifact; an artifact newer than its only PASS is stale; unscoped FAIL after the last PASS; B-items inherit artifact coverage; regress.json older than the newest re-render fails cond 4) | ok |
| Catalog 104/104 compiles | Queue job 33 on a scratch copy of `export_catalog.ts` (esbuild bundle, zod 4 export): "all catalog checks passed; 104 schemas", 25 ok / 0 FAIL; the 106 regenerated JSON files are **byte-identical** to the frozen `harness/schemas/components/` (`diff -rq` clean); `tsc --noEmit -p studio/tsconfig.json` **exit 0**. Nothing in the repo was written | ok |

### Cond 3 and `arabic_review_pass`: per-artifact coverage by the true reviewing section (my reading of the reviews)

| Artifact (current mtime UTC; commit) | Covering PASS I read | Review commit | Newer? |
|---|---|---|---|
| F3, F4-standard, F4-hero, F5, F6 `_fix` (10-09 23:01:46-47; a3b86c1 23:03:30) | `arabic_r3.md` "Re-check of the r3 Arabic fixes: PASS" (tesseract OCR by the arabic-typographer, B1/B2/R1/R2/R3 closed) | d6ac265 10-09 23:05:03 | yes, by 93 s |
| F8 `_fix` (10-09 23:03:14; a3b86c1) | the same r3 re-check (R2 ghost) and `arabic_r4.md` (read on the F8 full-size still) | d6ac265 / 84ad38b | yes |
| F7 `_fix` (10-10 06:34:24; 8ae7cc0 06:35:14, re-rendered with cv08) | `arabic_r5.md` "PASS: F7-standard_fix", 0 blocking, 0 required (the r3 re-check and r4 predate the re-render and correctly do not count) | c45d1d2 10-10 07:10:33 | yes |
| MD-standard_fix strip (10-09 23:14:22; a773103) | `arabic_r4.md` "PASS (0 blocking, 0 required) ... scope MD-standard_fix" | 84ad38b 10-10 06:13:04 | yes |

No review after the last PASS contains a FAIL. The only FAIL headings (r2, r3 "Verdict: FAIL") precede the re-check PASS in the same file. The gate prints the same 8/8 "covered" outcome.

### Observations (non-blocking; none changes the verdict)

1. **Gate attribution is looser than the truth, with the same outcome.** `names_artifact` credits an artifact to any later verdict section that names it, even in passing. The gate therefore reports F3/F4-standard/F6/F8 as covered by `arabic_r4.md` (a passing "F3/F4/F6/F7 `_fix` stills are valid evidence" sentence) and F5 by `arabic_r5.md` (an advisory list), while their real review is the r3 re-check. Every one of those artifacts does have a true PASS that postdates it, so no result is wrong now. The weakness is that a later PASS that merely mentions an artifact could mask an earlier FAIL on it. Suggested hardening for harness-engineer: require the artifact in the section heading or a `Scope:` line (or an explicit `covers:` list). `freeze_p6.py` mirrors the same heuristic.
2. **Cond 4 row trusts the `pass` flag.** `g06a.py` requires `by == render-ops`, `pass is True`, the 7 stills and recency, and prints `outside_px`, but does not enforce `outside_px == 0`. I recomputed it (0), so the value is right.
3. **MD strip is not in `regress.json`** (ADR-009 cond 4 says "stills", so by the letter it is not required). My own diff of `MD-standard_fix.jpg` vs `MD-standard.jpg` (4x2 tile grid): the changes are the ghost phrase region and the burned-in caption labels; the scene content is unchanged. Outside the ghost box + 16 px and the caption band, 2,111 of 1,036,800 pixels (0.20 %) exceed 8/255, max 54/255, scattered on particle dots and label edges; the same shot as a full-size still (F8) has 0 px outside. I treat that as strip-render noise. render-ops may add the strip to `regress.json` for completeness.
4. **ADR-010 follow-up not yet in the harness:** `freeze_p6.py` still only checks that an amending ADR exists, and `g06a.py` relies on the `arabic.ts` hash; neither compares `JOIN_GAP` with the ADR-010 numbers. I compared them by hand (identical, above).

### Carried to P7/P8/P10 (not G6a conditions)

AT-1..AT-12 (AT-11 34 px join gap in motion with native-reader veto before G6b; AT-12 line-length at the 6-word limit), AT-9 plate bake cost (blocks P10), AT-10 full `dc qa arabic` for G6b, strips MA/MB/MB-hero/MC still pre-fix renders with the old gaps (ADR-010: re-render before any is cited as G6a/G8 evidence), canon drift `6 الـAI` vs the bare `AI 6` chip (scene-director to restore or log a pending-council override), F8 ghost line 1 measured 3.4:1 by the arabic-typographer against the AT-4 3.8:1 floor (do not dim further). G8 is not waivable under W-009-LOOK; the critic's r3 read is marginal (8.014 / 7.50) by its own words.

### Side effects of this verification

Wrote only this report. The gate runs refreshed `reports/gates/G6a.json`, `harness/state/progress.json` and `harness/state/queue.json` (uncommitted harness state, committed separately by the harness owner as in earlier rounds). Scratch under the session scratchpad only (`cat/`, `regress_check.py`, image crops). No repo file in the freeze set was touched.

---

## Round 6 (superseded by Round 7 above; kept for the record; it supersedes Round 5 below)

Verifier: a separate invocation that did not author or fix any P6 work. Read-only except this report. Date: 2026-10-10 07:11 to 07:25 UTC. Repo HEAD at start and end: 0ab837c ("P6.4 freeze final").

### Verdict: FAIL (not passed), on exactly one row, and that row is a checker defect

`python3 tools/dc.py gate check G6a` returns **FAIL 7/8** (run 07:12:17Z). The failing row is `ADR-009_cond_3_rerender_review`: "fix stills 7/7; MD strip present; latest PASS Arabic review covers MD-standard_fix: False". I re-derived every G6a criterion and every ADR-009 close condition myself (below). **All of them hold in substance, including condition 3.** The row is false because `harness/gates/g06a.py` (cond 3 block, `md_reviewed`) asks only the single latest review file (`arabic_r5.md`, which reviews F7-standard_fix alone) to name `MD-standard_fix`. ADR-009 condition 3 asks for "a fresh arabic-typographer review [that] must return PASS (0 blocking, 0 required)" for the re-rendered stills and MD. It does not ask one review to cover all eight. `arabic_r3.md` (re-check, PASS) covers six stills and F7's first render, `arabic_r4.md` (PASS) covers MD, and `arabic_r5.md` (PASS) covers the re-rendered F7.

I am not passing G6a, for two reasons. Golden rule 7: a gate passes only through `dc gate check G6a`, and is waived only by a Council ADR. And a verifier must not patch the checker it is grading. The numeric gate therefore has to be fixed by its owner and re-run. No threshold needs to change and no ADR is needed: the checker contradicts the ADR text, not the other way round.

| # | Failing item | Evidence | Owner |
|---|---|---|---|
| 1 | `ADR-009_cond_3_rerender_review` is False although the condition is met | `g06a.py` lines 239-245 (`FIX_STILLS` / `md_reviewed`): `md_reviewed = os.path.exists(md) and "MD-standard_fix" in sec and arabic_verdict(a_text)[0] == "PASS"`, where `sec` is the last verdict section of the latest file only. The coverage table below shows all 8 artifacts covered by a PASS review that postdates them | harness-engineer |

### What is needed for a pass (smallest route)

1. **harness-engineer:** replace the cond 3 test in `harness/gates/g06a.py` with a per-artifact rule, the same one `studio/scripts/freeze_p6.py:52-72` already uses: for each of the 7 `*_fix.jpg` stills and `MD-standard_fix.jpg`, the LATEST PASS verdict section over ALL `arabic_r*.md` (round order, then position) that names the artifact (long name, or the short name in its scope line: F3, F4, F4-hero, F5, F6, F7, F8, MD) must exist, with no later FAIL section naming it, and must be committed (or modified, if dirty) at or after the artifact. Keep "fix stills 7/7" and "MD strip present". Add tests to `tools/tests/test_g06a.py`: (a) latest review covers only F7 and an older one covers the rest -> pass; (b) a still re-rendered after its review -> fail; (c) a later FAIL section naming a still -> fail; (d) an artifact that no review names -> fail. The current suite has 20 checks, all on cond 1-2 and none on cond 3. Optional, same pass: add the recency rule to cond 4 (`regress.json` newer than the newest still), which Round 5 asked for and which is still absent.
2. **harness-engineer or motion-engineer:** `python3 tools/dc.py gate check G6a`, commit the refreshed `reports/gates/G6a.json`. I expect 8/8: every other row already passes, and the table below is the input the new rule must reproduce.
3. **A short fresh verifier delta** after 1-2 (re-run the gate, re-run `test_g06a.py`, confirm the 8 artifacts are still older than their covering reviews and that `freeze.json` hashes still match). I expect it to pass.

### Criteria re-derived by me (06 section 1, G6a; not read from the checker)

| Criterion | My result | Status |
|---|---|---|
| ADR-002/003/004/005 decided | `harness/state/decisions.json`: ADR-002, 003, 004, 005 `decided` (2026-10-09); ADR-009 `decided` (gate G6a, waiver W-009-LOOK); ADR-010 `decided` (2026-10-10). `docs/decisions/ADR-0{02,03,04,05,09,10}-*.md` exist | pass |
| Look rubric mean >= 8.0 | `critic_r3.json`, recomputed from `per_family`: 10 families x 7 criteria = 70 scores, sum **561**, mean **8.0143** (file field 8.01), min 7 | pass, zero headroom |
| AI-Unpacked parity >= 7.5 | `parity_read` 7.5, 7.5, 7.5, 7.0, 8.0 = **7.50** | pass, zero headroom |
| W-009-LOOK covers that read | scope "r3 style-frame set only: stills F1-F9 + F4-hero; strips MA, MB, MB-hero, MC, MD" names the r3 set; `critic_r3.json` families are exactly F1-F9 + F4-hero. The waiver covers only the confirmatory re-score; Arabic, freeze, render budget, G6b, G7, G8 are not waived (ADR-009) | pass |
| Tokens, presets, catalog frozen | see Freeze below | pass |
| Projected final render <= 24 h | see Projection below | pass (pure-P12 reading) |

### Freeze (re-derived with my own script, not the gate's)

- `harness/state/freeze.json`: `status: frozen`, `open_preconditions: []`, `frozen_at 2026-10-10T07:10:47Z`, `base_commit c45d1d2`, `cond3_reviews` r3, r4, r5. Groups: tokens 1, type 2, fonts 12, catalog_src 106, catalog_json 106 = **227** entries.
- I recomputed SHA-256 of all 227 files: **0 missing, 0 mismatched**. `git status` is clean for `studio/`, `reports/lookdev/` and `harness/` apart from queue/progress timestamps.
- `frozen_at` is newer than every `*_fix` still (newest: F7 06:34:24), every strip (newest: `MD-standard_fix.jpg` 23:14:22 on Oct 9), `regress.json` (07:09:07) and `arabic_r5.md` (07:10:33). Commit times agree: stills committed 23:03:30 (a3b86c1) and 06:35:14 (8ae7cc0), `freeze.json` 07:11:48.

### ADR-009 close conditions vs the fix set (UTC; mtime, with commit time in brackets)

| Artifact | Artifact mtime [commit] | Covering PASS review (mtime [commit]) | Review after artifact? |
|---|---|---|---|
| F3-standard_fix | Oct 9 23:01:46 [23:03:30] | `arabic_r3.md` re-check, PASS, scope names F3 (23:05:03 [23:05:03]) | yes |
| F4-standard_fix | 23:01:46 [23:03:30] | same re-check | yes |
| F4-hero_fix | 23:01:46 [23:03:30] | same re-check (scope line names F4-hero) | yes |
| F5-standard_fix | 23:01:47 [23:03:30] | same re-check | yes |
| F6-standard_fix | 23:01:47 [23:03:30] | same re-check | yes |
| F8-standard_fix | 23:03:14 [23:03:30] | same re-check | yes |
| F7-standard_fix | Oct 10 06:34:24 [06:35:14] | `arabic_r5.md`, PASS 0/0, names the 06:34 re-render and chip 6 `cv08` (07:10:33 [07:10:33]) | yes |
| MD-standard_fix (strip) | Oct 9 23:14:22 [23:17:30] | `arabic_r4.md`, PASS 0/0 (Oct 10 06:13:04 [06:13:04]) | yes |

| Cond | Evidence | Status |
|---|---|---|
| 1 fixes land | B1 chip 6 `AI 6` (+ `cv08`); B2 `JOIN_GAP` per ADR-010; R1-R3 closed in the `arabic_r3.md` re-check; R2 ghost split re-confirmed in `arabic_r4.md` (2 lines, 4 + 3 words, flush right). `check_type.sh`: **43 ok**, "all type checks passed" (my run). `tsc --noEmit` exit **0** (queue job 32) | met |
| 2 isolated OCR >= 0.90 on the 4 gate strings | `r3/fix.json` `typeprobe_ocr`: F3-title 1.00, roadmap-72 1.00, idem-72 1.00, F7-chip6 1.00, all exact, 4/4 gate. Caveat carried: chip 6 passes only with `cv08` (control `F7-chip6-nocv08` reads `Al 6`, 0.75), which is ADR-009's own serifed-I fallback for B1. Non-gate items below 0.90 (F6-head 0.651, caps-AI-32 0.80) do not block | met |
| 3 re-render + fresh Arabic PASS (0 blocking, 0 required) | table above: 8 of 8 covered after their mtime and commit time | **met (the gate row is wrong)** |
| 4 no-regression diff | `regress.json` by render-ops, mtime 07:09:07 [07:09:14] after the newest still (06:34:24), `pass: true`, covers all 7 stills, `outside_px: 0` for each (max |delta| outside the boxes: 3/255 F6, 2 F3/F8, 1 F4, 0 F5/F7) | met |
| 5 freeze after 1-4; `g06a.py` cites W-009-LOOK | `freeze.json` frozen 07:10:47 after r5 (07:10:33), regress (07:09:07) and every fix; `g06a.py` look_parity row cites ADR-009 W-009-LOOK | met, apart from the row 1 defect |

B-item lookup in `g06a.py` (`b_item_status`, `cond12`): my reading of the five reviews gives B1 chip 6, B2 F3 title, B2 F4 card, B2 F6 head, B2 F6 labels all `fixed`, by the `| ... | fixed |` rows of the `arabic_r3.md` re-check PASS section, after that file's earlier FAIL section re-opened them (latest section wins). The lookup returns exactly that, so it is **correct**. `python3 -I tools/tests/test_g06a.py` prints "20 checks ok" (later FAIL re-opens only its item, later PASS closes it, non-`fixed` result re-opens, unnamed item is missing, OCR 0.89 fails, missing gate string fails, suite not ok fails, non-gate probes do not block). One caveat, not blocking: the lookup has no recency, so B1 is cited to `arabic_r3.md`, whose B1 evidence (`Al 6`) is for the pre-`cv08` F7 still. The review that actually judged the current F7 still is `arabic_r5.md`, which has a rule table row "Chip 6 glyphs ... ok" and no `B1 ... fixed` row. The conclusion is right because the cond 2 OCR row (F7-chip6 1.00) and `arabic_r5.md` back it, but it is another reason for the per-artifact recency rule in step 1.

### ADR-010 (JOIN_GAP amendment)

- `decisions.json` and `docs/decisions/ADR-010-join-gap-amendment.md`: `Status: decided`, option A1, 3 of 3 owning lenses (egyptian-arabic 0.78, motion-design 0.72, technical-accuracy 0.82), mean confidence 0.773, amends ADR-009 B2 values only. Table: display (>= 56 px) caps 0.20 / mixed 0.25 em; text (< 56 px, and unknown size) caps 0.25 / mixed 0.30 em.
- `studio/src/type/arabic.ts:60`: `JOIN_GAP = {display: {caps: 0.2, latin: 0.25}, text: {caps: 0.25, latin: 0.3}}`; `joinGapEm` uses the display band when `sizePx >= FONT.arDisplay.minPx` (56) and only after a tatweel (`/ـ$/`). `freeze.json.join_gap` is the same table, and `arabic.ts` is among the 227 hashes, unchanged.

### Catalog and compile (re-derived)

- `gate`: 04 section 8 has **104** names, 0 not frozen, 0 unlisted component dirs, 7 fonts, presets table ok.
- Queue job 32 (`dc q submit` then `q wait`): `tsc --noEmit -p studio/tsconfig.json` exit **0**.
- `export_catalog.ts` bundled with esbuild and run into a scratch root (so no repo file was written): "104 catalog components (04 §8)", all 6 preset f24 checks, anchor checks, "no numeric time fields in any component schema", "all catalog checks passed; 104 schemas". The 106 exported JSON files are **byte-identical** to `harness/schemas/components/` (`diff -rq`).

### Projection for the locked runtime

- `corpus/edl/lock.json`: `total_ms` 13,860,430 (3 h 51 min), `total_frames` **332,651** at 24 fps (13,860,430 x 24 / 1000 = 332,650.3, ceil). EDL and word map SHA-256 equal the lock's.
- ADR-002 model (RT5, h = 0.05; S 0.141-0.183, H 0.904-1.038 box s/frame), recomputed: **16.55 h** to **20.86 h**. Measured (`r3/perf.json` blended 0.1339 box s/frame): **12.37 h**. Worst 20.86 h <= 24 h on the pure-P12 reading. Carried caveats: 20.86 h x 1.25 contingency = 26.07 h (ADR-002 R2 ladder applies on that reading), and `perf.plates` is empty, so plate bake cost and the disk plan are not in the projection (ADR-009 AT-9, blocks P10, not a G6a row). Disk is 4.0 GB free at 90 % use.

### Other observations (non-blocking)

- **MD strip vs its pre-fix render is not in `regress.json`.** Cond 4 and the gate cover the 7 stills; the MD strip is cond 3 only, and `arabic_r4.md` observation 2 passed the pixel-diff question to render-ops, with no record that anyone answered it. I measured it: both 1920x540 strips (4 x 2 tiles of 480x270), per tile, |delta| > 8/255, caption band (y >= 243, the debug label "MD-standard" vs "MD-standard_fix") excluded, allowed area = ghost box (585,78,1800,296) at 1080p scaled to the tile + 16 px. Outside it: 40, 40, 246, 323, 684 changed px in tiles f0, f20, f33, f160, f210 (of 129,600 px) with max |delta| 13 to 54, and 110 to 117 px in f260, f262, f287 (ghost gone) with max 40. I viewed both strips: the layout, orbs, labels and title are the same, and the only visible edit is the ghost title split into two lines. This looks like render noise from moving particles and glow, not a layout change, so I do not read it as an RT-2 trigger. render-ops should record the MD result once (the coarse 480 px tile scale is why the threshold is looser than in `regress.json`).
- The look pass has no margin (8.0143, 7.50); the like-for-like G8 start is 7.82; no G8 waiver may cite W-009-LOOK.
- Strips MA, MB, MB-hero, MC are still pre-fix renders (old gaps; MA shows `قسم الـroadmap`): not valid Arabic evidence for G8 until re-rendered.
- Canon drift `6 الـAI` (`chapters.json:196`, glossary) vs look-dev `6 AI`: scene-director restores the article or logs a `pending-council` override in P8. `AI`/`API`/`KPI` need the `cv08` serifed `I` or the tool's I/l normalisation (`arabic_r5.md` item 2).
- Open P7/P8 tests carry as in ADR-009/010: AT-4, AT-9 (plate cost, blocks P10), AT-10, AT-11 (34 px join gap in motion), AT-12.

### Side effects of this verification

- `dc gate check G6a` rewrote `reports/gates/G6a.json` and `harness/state/progress.json` (timestamps only); I restored both with `git checkout`, so the committed `G6a.json` is still the 07:10:51Z run (FAIL 7/8).
- `dc q submit` (job 32) updated `harness/state/queue.json`; left uncommitted because other agents also write it. Scratch files (compile output, scratch catalog export, strip diff) are in the session scratchpad only. I did not edit `g06a.py`, `freeze.json`, any frozen file or any other agent's file.
- I committed only this report.

---

## Round 5 (superseded by Round 6 above; kept for the record; it supersedes Round 4 below)

Verifier: a separate invocation that did not author or fix any P6 work. Read-only except this report.
Date: 2026-10-10 06:40 to 06:50 UTC. Repo HEAD at start and end: ae51212 ("P6.4 freeze re-run: status provisional").

### Verdict: FAIL (not passed)

`python3 tools/dc.py gate check G6a` returns **FAIL 6/8** (run 06:39:59Z). It is one check worse than Round 4 because motion-engineer honestly re-ran the freeze in ae51212 and it came back `provisional`. The two failing rows are `tokens_presets_catalog_frozen` and `ADR-009_cond_1_2_fixes_ocr`. I re-derived each criterion myself (below) and the failure is real, not a checker artefact: the F7 chip 6 glyph change (06:34:24) has neither a post-change Arabic review (ADR-009 cond 3) nor a post-change no-regression diff (cond 4), so the freeze cannot be `frozen` (cond 5 orders it after cond 1-4). Nothing has changed in the repo between Round 4 and now except the freeze going honest; none of the Round 4 "needed for a pass" items 1, 2, 4, 5 has landed.

| # | Failing item | Evidence (my own checks) | Owner |
|---|---|---|---|
| 1 | Freeze is not `frozen` | `harness/state/freeze.json`: `status: provisional`, `hashed_at 2026-10-10T06:39:36Z`, `base_commit d6f0740`, no `frozen_at`. `open_preconditions`: (a) "cond 3: the PASS Arabic review predates the re-rendered still/strip for F7-standard_fix", (b) "cond 4: regress.json predates the newest re-rendered still". G6a needs "tokens, presets and component catalog frozen" (06 section 1); a provisional freeze is not frozen. Hashes themselves are intact: my own SHA-256 pass gives **227/227 match, 0 changed, 0 missing** (tokens 1, type 2, fonts 12, catalog_src 106, catalog_json 106). | motion-engineer (re-freeze, after items 2-4) |
| 2 | ADR-009 cond 3 open for F7 | `reports/lookdev/r3/stills/F7-standard_fix.jpg` mtime **06:34:24** (queue job 18, `cv08` serifed `I` on the chip 6 Latin run). Newer than `arabic_r3.md` re-check (23:05 Oct 9) and `arabic_r4.md` (06:13). `grep -l "cv08\|F7-standard_fix" reports/lookdev/arabic_r*.md reports/lookdev/*.md` returns nothing: no Arabic review has looked at the new still. `fix.json` `b1_chip6_r3b.needs` lists it as open. | arabic-typographer |
| 3 | ADR-009 cond 4 stale for F7 | `reports/lookdev/r3/regress.json` file time **06:14:30**, i.e. 20 minutes before the F7 re-render; its `covers` lists `F7-standard` but it compared the older fix still. Substance reproduced by me (not a substitute for render-ops evidence): `F7-standard.jpg` vs the current `F7-standard_fix.jpg` at 960x540 (LANCZOS, max-RGB threshold 8/255): 1,327 px changed, **0 px outside** the chip 6 box [376,264,544,319] + 16 px. RT-2 is not triggered. | render-ops |
| 4 | Checker row `ADR-009_cond_1_2_fixes_ocr` is False | `harness/gates/g06a.py` is unchanged since a773103 (2026-10-09). Line 177: `b1 = re.search(r"(?m)^\| B1[^\n]*\|\s*fixed\s*\|", arabic_verdict(a_text)[1])`, i.e. only the latest section of the **latest** review (`arabic_r4.md`, the MD strip, which has no B1 row). The B1 "fixed" row is in `arabic_r3.md`'s Re-check section, so `b1` is False by construction. Line 180 still prints the hard-coded text "no isolated-render score" although `fix.json` now carries one. Substance of cond 2 is met (below), so the row can only go green after a new Arabic review that closes B1 on the `cv08` chip **and** the checker reads B1 per artifact across reviews. | harness-engineer (lookup), arabic-typographer (B1 on the new glyph) |
| 5 | Checker rows cond 3 / cond 4 are green by existence, not recency | Unchanged since Round 4: the rows test that the files exist and name the stills, not that they are newer than the stills. They are green while items 2 and 3 are open. `studio/scripts/freeze_p6.py` has the correct recency rule and is the reason the freeze is provisional. Non-blocking for this verdict but it is how a stale freeze got through once. | harness-engineer |

### What is needed for a pass (smallest route)

1. **arabic-typographer:** new `arabic_r5.md` (or an appended section) that names `F7-standard_fix` and chip 6 with `cv08`, verdict heading PASS (0 blocking, 0 required), and a `| B1 ... | fixed |` row, committed after 06:34:24.
2. **render-ops:** re-run `studio/scripts/lookdev_regress.py` through the queue so `regress.json` is newer than the F7 still and covers it (expect 0 px outside; my reproduction above).
3. **harness-engineer:** (a) take B1 per artifact across all `arabic_r*.md`, drop the hard-coded "no isolated-render score"; (b) add recency to the cond 3 / cond 4 rows (same rule as `freeze_p6.py`).
4. **critic (recommended, from `fix.json` needs; not a text criterion of G6a):** note that the glyph-only F7 change keeps the baseline.
5. **motion-engineer:** after 1-3, `python3 -I studio/scripts/freeze_p6.py` (status must come back `frozen`, `open_preconditions: []`), commit `freeze.json`, then `python3 tools/dc.py gate check G6a` and commit the refreshed `reports/gates/G6a.json` (the committed one is stale: it still shows the freeze row passing from 06:17).
6. A fresh verifier round after 1-5. I expect it to pass: every other criterion below holds.

### Criteria re-derived by me (06 section 1, G6a; not read from the checker)

| Criterion | My result | Status |
|---|---|---|
| ADR-002/003/004/005 decided | `harness/state/decisions.json`: ADR-002, 003, 004, 005 `decided` (2026-10-09); ADR-009 `decided`; ADR-010 `decided` (2026-10-10, `amends` ADR-009). `docs/decisions/ADR-00{2,3,4,5}-*.md` exist | pass |
| Look rubric mean >= 8.0 | `reports/lookdev/critic_r3.json`, recomputed from `per_family`: 10 families x 7 criteria = 70 scores, sum **561**, mean **8.0143**, min 7 | pass, zero headroom (one point = 0.014) |
| AI-Unpacked parity >= 7.5 | `parity_read` 7.5, 7.5, 7.5, 7.0, 8.0 = 37.5/5 = **7.50** | pass, zero headroom |
| W-009-LOOK covers that read | `decisions.json` ADR-009 waiver W-009-LOOK, scope "r3 style-frame set only: stills F1-F9 + F4-hero; strips MA, MB, MB-hero, MC, MD". `critic_r3.json` families are exactly F1-F9 + F4-hero (10 entries). The ADR frames it as a conditional close (numbers met, only the confirmatory re-score waived). The F7 glyph change is 0 px outside the chip box, so RT-2 is not triggered | pass |
| Tokens, presets, catalog frozen | hashes intact (227/227); **status is provisional** | **FAIL** (item 1) |
| Projected final render <= 24 h | see Projection | pass (ADR-002 pure-P12 reading) |

### Catalog and compile (re-derived)

- 04 section 8: I parsed the table myself: **104 distinct component names**; each has `studio/src/components/<Name>/schema.ts` and `harness/schemas/components/<Name>.json`, both present in the freeze groups; `studio/src/components` has 104 directories, **0 unlisted**. All 106 JSON files in `catalog_json` (104 components + `_WordAnchor` + `_index`) pass `Draft202012Validator.check_schema`.
- Queue job 24 (`dc q submit` then `q wait`, exit 0; scratch export root so no repo file is overwritten): `tsc -p studio/tsconfig.json --noEmit` exit **0**; `export_catalog.ts` bundled with esbuild ends "all catalog checks passed; 104 schemas"; the 106 exported files are **byte-identical** to the committed `harness/schemas/components/` (`diff -rq`); `studio/scripts/check_type.sh` ends "all type checks passed".

### ADR-010 (JOIN_GAP amendment)

- `decisions.json` and `docs/decisions/ADR-010-join-gap-amendment.md`: `Status: decided`, option A1, 3 of 3 owning lenses, mean confidence 0.773, `Amends: ADR-009 B2` (values only; W-009-LOOK, conditions 2-5 and AT-1..AT-10 stand).
- Implementation matches: `studio/src/type/arabic.ts:60` `JOIN_GAP = {display: {caps: 0.2, latin: 0.25}, text: {caps: 0.25, latin: 0.3}}`, display band from `FONT.arDisplay.minPx` (56 px), unknown size = text band, applied only after a tatweel (`/ـ$/`); ADR-010 table: display 0.20/0.25, text 0.25/0.30. `freeze.json.join_gap` is the same table; `arabic.ts` hash is among the 227 and unchanged.

### ADR-009 conditions 1-5, evidence vs the fix set (UTC; fix set includes the 06:29-06:34 chip 6 change)

| Cond | Evidence and time | Newer than the fix set? | Status |
|---|---|---|---|
| 1 fixes land | B1 `AI 6` chip (+ `cv08`), B2 `JOIN_GAP` per ADR-010, R1-R3 as in arabic_r3 re-check; `check_type.sh` passes; tsc 0 (my job 24) | n/a | met |
| 2 isolated OCR >= 0.90 on the 4 gate strings | `fix.json` `typeprobe_ocr` (jobs 14 render, 19 score, 06:34-06:35, commit 8ae7cc0): F3-title, roadmap-72, idem-72, **F7-chip6** all 1.00 exact (gate 4/4, all 8/11 pass). `dc qa arabic` fixture `adr009_gate.json` scores 6/6 incl. chip 6 (commit b308dce). Caveat: chip 6 passes only with `cv08` (control `F7-chip6-nocv08` reads `Al 6`, 0.75), which is ADR-009's own serifed-I fallback for B1 | yes | **substance met**; row False because of item 4 |
| 3 re-render + fresh Arabic PASS | MD strip 23:14:22 reviewed by `arabic_r4.md` 06:13 (PASS 0/0); F3-F6, F8 stills 23:01-23:03 reviewed by the `arabic_r3.md` re-check 23:05 (PASS); **F7 still 06:34:24, no review after it** | no, for F7 | **not met for F7-standard_fix** |
| 4 no-regression diff | `regress.json` 06:14:30, 7 stills, 0 px outside; **predates the F7 re-render**. My diff of the current F7: 0 px outside | no, for F7 | **not met as evidence (stale)**; substance reproduced |
| 5 freeze after 1-4; `g06a.py` cites W-009-LOOK | `freeze.json` is `provisional` (correctly); `g06a.py` look_parity detail cites W-009-LOOK | n/a | **not met** (freeze not closed) |

### Projection for the locked runtime (3:51:00)

- `corpus/edl/lock.json`: `total_ms` 13,860,430 = **3 h 51 min 0.43 s**; `total_frames` 332,651 at 24 fps (13,860,430 x 24 / 1000 = 332,650.32, ceil matches).
- ADR-002 model (RT5, h = 0.05; S 0.141-0.183, H 0.904-1.038 box s/frame), recomputed: low **16.55 h**, high **20.86 h**; high + 25 % contingency **26.07 h** (over 24 h on that reading, where the ADR-002 R2 ladder applies).
- Measured, `reports/lookdev/r3/perf.json`: blended 0.1339 box s/frame x 332,651 / 3600 = **12.37 h**; the 24 h line at this runtime is 0.2597 box s/frame.
- Worst 20.86 h <= 24 h on the ADR-002 reading that 24 h is the pure P12 projection. Caveat carried: `perf.plates` is `{}`, so plate bake cost and the disk plan are not in the projection (ADR-009 AT-9, blocks P10, not a G6a row). Disk is 4.1 GB free at 90 % use.

### Other observations (non-blocking)

- The look pass has no real margin (8.0143, 7.50); the like-for-like G8 starting point stays 7.82 (no cost column); no G8 waiver may cite W-009-LOOK.
- Strips MA, MB, MB-hero, MC are still the pre-fix renders (stale gaps); not valid Arabic evidence for G8 until re-rendered.
- Canon drift `6 الـAI` vs look-dev `6 AI`: scene-director must restore the article or log a `pending-council` override in P8.
- `caps-AI-32` (0.80) and `F6-head` (0.65) are non-gate OCR items in `fix.json`; the `الـAI` 32 px case is AT-11 (P7).

### Side effects of this verification

- `dc gate check G6a` rewrote `reports/gates/G6a.json` and `harness/state/progress.json` (timestamps and detail text only); I restored both with `git checkout`. The committed `G6a.json` is therefore still the 06:17 version (freeze row passing); the next gate run by the owners refreshes it.
- `dc q submit` (job 24) updated `harness/state/queue.json`; left uncommitted because other agents also write it. Scratch files (compile script, hash/catalog script) are in the session scratchpad only; the scratch export tree was deleted. No frozen file, `freeze.json` or other agent's file was written.
- I committed only this report.

---

## Round 4 (superseded by Round 5 above; kept for the record; it supersedes Round 3 below)

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

---

## Re-check after ADR-011

Verifier: a separate invocation that did not author or fix any P6 or P7 work. Read-only except this section. Date: 2026-10-10 17:08 to 17:20 UTC. Repo HEAD: 2c5ea84 ("P7 engine: ADR-011 Q3 P2 PREVIEW.fps 12 + re-freeze"). I did not edit `harness/gates/g06a.py`, `freeze_p6.py` or any frozen file.

### Verdict: PASS

`python3 tools/dc.py gate check G6a` returns **PASS 8/8** (runs at 17:08:22Z and again at the end of this check, both 8/8; the committed `G6a.json` from 17:07:38Z is also 8/8). I then re-derived the freeze, the one contract change, the ADR-009 / ADR-010 conditions and the look/parity evidence from the files and from git, not from the checker. Each holds. The only frozen-file change since the 07:10:47Z freeze (base c45d1d2) is `PREVIEW.fps 15 -> 12` in `studio/src/tokens.ts`, plus its `TOKENS_VERSION` marker, and ADR-011 Q3 authorises exactly that.

### Freeze (own script, not the gate's)

| Check | Result |
|---|---|
| `freeze.json` status | `frozen`, `open_preconditions: []` |
| `frozen_at` vs the change | `tokens.ts` mtime 17:00:02Z < `frozen_at` 17:03:36Z < commit 2c5ea84 at 17:08:06Z. The freeze post-dates the change. |
| Hashed files | 227 (tokens 1, type 2, fonts 12, catalog_src 106, catalog_json 106). I recomputed every SHA-256 from the working tree: **227/227 match, 0 missing, 0 changed**. I repeated it against the `HEAD` blobs: **0 changed**. |
| Path set old vs new | Identical (227 vs 227). Old freeze read with `git show 0ab837c:harness/state/freeze.json`. |
| Hash differences old -> new | **Exactly one: `studio/src/tokens.ts`.** Fonts, `type/arabic.ts`, `type/overrides.ts` and all 212 catalog files are byte-identical to the 07:10:47Z freeze. |
| `contract_changes[0]` | `from` fc7f05ca...1090 equals the SHA-256 of `tokens.ts` at 0ab837c; `to` e679727e...cc95d equals the SHA-256 of the working file. |
| Other `freeze.json` keys that moved | `frozen_at`, `base_commit` (c45d1d2 -> 08882ce), `adrs` (+ADR-011), `tokens_version`, `contract_changes` (new). `join_gap`, `cond3_reviews`, `counts` (104 components, 106 schemas) unchanged. |
| Unlisted component dirs | `[]`. KineticWord, NumberCounter and TableGrid are in the 104-name catalog. Their `schema.ts` hashes are unchanged; only new `.tsx` implementations, `families/{data,type-ui}.ts` and demos were added, none of which is hashed. |

### The diff of the frozen file (`git diff 0ab837c 2c5ea84 -- studio/src/tokens.ts`)

Two lines change, nothing else:

```
-export const PREVIEW = deepFreeze({width: 960, height: 540, fps: 15, tier: 'lite' as const});
+export const PREVIEW = deepFreeze({width: 960, height: 540, fps: 12, tier: 'lite' as const}); // ADR-011 Q3 P2 (CR-001): 12 fps, an exact divisor of the 24 fps film rate
-export const TOKENS_VERSION = 'P6-freeze-1 (...)';
+export const TOKENS_VERSION = 'P6-freeze-2 (... ; ADR-011 Q3 PREVIEW.fps 12)';
```

Width, height and tier of `PREVIEW`, `FPS` (24), `W`/`H`, `GL`, `HERO_SHARE_MAX`, the FX tiers, palette, sizes and presets are untouched. The `TOKENS_VERSION` change is the freeze marker that the P6.4 freeze defines for itself, and `freeze.json` declares it in `contract_changes[0].what`.

### Authorisation

- `docs/decisions/ADR-011-timing-conventions.md`: `Status: decided`. `harness/state/decisions.json` ADR-011: `decision.Q3 = "P2"`, `decision.PREVIEW = {width 960, height 540, fps 12, tier lite}`, `replaces: {PREVIEW.fps: 15}`. Ballot in the ADR: P2 3/4, confidence-weighted 0.774 vs 0.226.
- The ADR names this change itself (its "frozen token ... 15 -> 12" scope line) and requires a `freeze.json` re-hash and a G6a re-check (technical-accuracy lens note). Both are done.
- ADR-011 RT-011-4 (reopen Q3 if `dc gate check G6a` fails after the re-freeze) is **not triggered**: G6a passes 8/8.
- `studio/scripts/freeze_p6.py` gained an `AUTHORISED` table in this change. I read it: it accepts a hash change only if the ADR is decided, the chair record holds the value, and undoing exactly the listed line replacements reproduces the previously frozen hash. It is narrow. Note that the motion-engineer wrote both the change and this mechanism, so I relied on my own diff and hash comparison above, not on the script.
- Only `PREVIEW.fps` is read by the lite preview path: `grep PREVIEW` finds users only in `studio/src/spec/{resolve,SpecPlayer,resolve.check}.ts` and `studio/src/type/p7.check.ts`. Nothing under `studio/scripts/` (look-dev and regress scripts) reads it, so the 12 fps token cannot affect the 24 fps look-dev stills.

### ADR-009 / ADR-010 conditions still hold

- The checker `harness/gates/g06a.py` is unchanged since 601613e (the version Round 7 verified); nothing under `harness/gates/` or `harness/schemas/` changed after that commit.
- **Evidence files unchanged:** `git diff --stat 601613e HEAD` (and `0ab837c HEAD`) over `reports/lookdev/`, ADR-002/003/009/010, `corpus/edl/` and `harness/schemas/` is empty. `git status` shows nothing uncommitted under `reports/lookdev`, `studio/` or `harness/schemas`.
- **Cond 1 and 2 (fixes, OCR):** gate row passes: isolated-render OCR 4/4 >= 0.90 (F3-title 1.00, roadmap-72 1.00, idem-72 1.00, F7-chip6 1.00). I re-ran the type suite after the tokens change through the queue (job 7, `bash studio/scripts/check_type.sh`): **exit 0, 43 `ok`, 0 other lines, "all type checks passed"**.
- **Cond 3 (re-render review):** 8/8 `*_fix` artifacts covered by a PASS verdict that is the latest naming each and is newer than it (arabic_r3, r4, r5), unchanged.
- **Cond 4 (no-regression diff):** `reports/lookdev/r3/regress.json` by render-ops, pass=True, 7 stills covered, outside-box 0 px, unchanged.
- **ADR-010:** `join_gap` in `freeze.json` is still display {caps 0.20, latin 0.25}, text {caps 0.25, latin 0.30}; `tokens.ts` `JOIN_GAP` is untouched (not in the diff).
- **Look / parity:** `reports/lookdev/critic_r3.json` look 8.01 (>= 8.0), parity 7.5 (>= 7.5), min criterion 7, covered by ADR-009 W-009-LOOK scope "r3 style-frame set only". Unchanged file, same scores.
- **ADR-002 / ADR-003 / ADR-004 / ADR-005 rows:** still decided; `adr_002_005_decided` ok.
- **Projection:** `corpus/edl/lock.json` unchanged. Gate row: 332,651 frames @ 24 fps (3.85 h); ADR-002 model worst 20.9 h vs 24.0 h pure P12; measured blended 0.1339 box s/frame -> 12.4 h. The +25 % contingency reading (26.1 h, ADR-002 R2 ladder) and the missing plate bake cost (ADR-009 AT-9, blocks P10) are the same non-blocking caveats as in Round 7.

### Non-blocking observations

1. `freeze.json` `base_commit` is 08882ce, the parent of 2c5ea84. The `tokens.ts` change was uncommitted when the freeze was written and was committed together with `freeze.json` in 2c5ea84. At `HEAD` all 227 blobs match, so the committed tree is consistent; only the `base_commit` label lags by one commit.
2. The Round 7 observations (tokens `SIZE.hero` 176 px above the 04 section 3.2 range, JOIN_GAP text differing from ADR-009 B2 by amendment, F7 chip 6 closed by frame-crop read) are unchanged and still not G6a conditions.
3. ADR-011's consequence "any P6 or P9 preview already made at 15 fps must be regenerated" has no P6 target: the P6 evidence is 24 fps standard-tier stills and strips. P9 previews do not exist yet.

### Side effects of this verification

- `dc gate check G6a` rewrites only the `created` timestamp of `reports/gates/G6a.json` and touches `harness/state/progress.json`; I restored `G6a.json` with `git checkout`. I left `progress.json`, `queue.json` and `corpus/render/jobs.jsonl` alone (live state of other agents, not mine to commit).
- Queue job 7 (type suite) was the only compute; its temp output in `/tmp` is deleted. No renders, no `/tmp/remotion-webpack-bundle-*` created by me.
