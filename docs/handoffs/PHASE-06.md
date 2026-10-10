# PHASE-06 (motion-engineer): P6 look-dev freeze, gate G6a

**Final state (2026-10-10T07:10Z, base c45d1d2): freeze `status: frozen`; G6a FAIL 7/8.** The only failing row is `ADR-009_cond_3_rerender_review`, a checker lookup defect in `g06a.py` (see the last section). The evidence for every ADR-009 condition is in place. No threshold is changed or waived here.

| # | Check (`reports/gates/G6a.json`) | Result |
|---|---|---|
| 1 | ADR-002..005 decided | ok |
| 2 | look ≥ 8.0, parity ≥ 7.5 (`critic_r3.json`) | ok: 8.01 / 7.5, min 7; ADR-009 W-009-LOOK covers r3 (zero headroom) |
| 3 | latest Arabic review | ok: `arabic_r5.md` PASS (F7-standard_fix, c45d1d2) |
| 4 | tokens, presets and catalog frozen | ok: 227 files hashed, 0 changed, 104/104 catalog names |
| 5 | projected final render ≤ 24 h | ok: worst 20.9 h (measured 12.4 h); +25 % read 26.1 h; plate bake cost not in yet (AT-9) |
| 6a | ADR-009 cond 1–2 | ok (fixed in 6431893): OCR gate strings 4/4 = 1.00, B-items closed per artifact, type suite 43 ok |
| 6b | ADR-009 cond 3 | **FAIL (checker)**: MD-standard_fix was passed in `arabic_r4.md` (84ad38b, after the strip at a773103, unchanged since); g06a reads only the latest review (`arabic_r5`, F7 only) |
| 6c | ADR-009 cond 4 | ok: render-ops `regress.json` pass=true, 7 stills, 0 px outside boxes (queue job 31) |

## To close G6a (owners)
1. **render-ops** derives the edited text boxes from the source diff `8f245ee..a3b86c1`, in 1920×1080 coordinates, for F3, F4, F4-hero, F5, F6, F7 and F8. Then run:
   `python3 -I studio/scripts/lookdev_regress.py --boxes <boxes.json> --by render-ops`
   This writes `regress.json`.
   - The r3 PNGs were overwritten by the fix render, so the diff runs on the r3 JPGs and expects some JPEG noise.
   - Any pixel outside a box triggers RT-2, a critic re-score of the changed stills.
2. **arabic-typographer** reviews `reports/lookdev/r3/strips/MD-standard_fix.jpg` and appends a `## …: PASS` section to `arabic_r3.md` that names `MD-standard_fix`.
3. Re-run `dc gate check G6a`. No re-freeze is needed unless a contract file changes.

## Frozen (P6.4, the P7↔P8 contract)
- **`studio/src/tokens.ts`**: existing values are unchanged. Added:
  - `PRESETS`: arrive, impact, label, count, morph and exit, in ms plus 24 fps frames (`f24` = `msToFrames`, tested);
  - `IMPACT`, `TEXT_SAFE` and `TOKENS_VERSION`.
  - Already present: palette `C`, `SIZE` (28 px spoken / 18 px secondary floors), `FONT` (T-A), `LINE`, `LEAD_FRAMES` at 24 fps, and `FX` with lite / standard / hero at FX2 numbers (hero particle cap 1,500, text-safe pad).
- **`studio/src/type/arabic.ts`**: `JOIN_GAP` is display 0.20 / 0.25 em and text 0.25 / 0.30 em (caps / mixed), as accepted at d6ac265. Both it and `overrides.ts` are hashed.
- **Fonts**: `studio/fonts/LICENSES.md` covers Alexandria 700 (≥ 56 px), IBM Plex Sans Arabic 600, Inter Tight 700 and JetBrains Mono, all OFL 1.1. 7 TTFs and 4 licence texts are hashed.
- **Catalog**: the 104 components of 04 §8 each have `studio/src/components/<Name>/schema.ts`, exporting `props` (zod 4, strict) and `actions` (`"<Name>.<action>"` layers).
  - Shared primitives live in `components/contract.ts`. They include `WordAnchor {word, lead_frames}`, with `lead_frames` an integer 0–90 and required, as in `scene_spec.schema.json`.
  - Shown numbers must carry a `d:` or `s:` ref. Colours, sizes and presets are token enums only. Western digits are enforced and text must be NFC.
  - The JSON mirror is `harness/schemas/components/<Name>.json`, plus `_WordAnchor.json` and `_index.json`.
  - Regenerate and test with `bash studio/scripts/check_catalog.sh` (25 checks ok), then re-hash with `python3 -I studio/scripts/freeze_p6.py`. Both require an ADR first.
  - Implementations, demos, snapshots and perf are P7 work.
- **MD re-render** (ADR-009 cond 3) ran through queue job 9.
  - 0.1369 box s/frame against R5 0.201; it was 0.1322 at r3.
  - The strip is `strips/MD-standard_fix.jpg`, with the same frames as r3.
  - The pre-fix mp4 is kept at `data/renders/lookdev/r3/MD-standard_swiftshader_r3pre.mp4` (33 MB; delete after the diff).

## Open issues for P7/P8
- ~~**`fx_tier` naming mismatch**~~ fixed in the freeze-close commit: the enum is now `lite | standard | hero` (it was `hero, standard, light, hold`).
- **Canon drift**: the canon says `6 الـAI`, but the look-dev shows `6 AI`. The scene-director must decide or log an override (`arabic_r3.md` Open 1).
- **Carried work**: AT-1..AT-10 from ADR-009, with AT-9 (plate bake cost and disk plan) blocking P10. `dc qa arabic` (AT-10) is still unimplemented, which blocks G6b and G8.

## G6a verifier round 0 (cebb302): freeze voided, ordering enforced (motion-engineer)
- **Freeze order fixed**: the a773103 freeze ran while ADR-009 conditions 3 and 4 were still open, so it is void.
  - `studio/scripts/freeze_p6.py` writes `status: frozen` only when all of these hold; otherwise it writes `provisional` (hashes kept, `open_preconditions` listed) and exits 2:
    - (1-2) OCR gate strings ≥ 0.90 and the type suite passes;
    - (3) the latest `arabic_r*.md` verdict is PASS, names `MD-standard_fix` and all 7 `*_fix` stills, and is committed after the newest of them;
    - (4) `regress.json` is by render-ops, has `pass=true`, covers the 7 stills and is newer than them;
    - `JOIN_GAP` equals ADR-009 B2, or a decided ADR amends B2 (it must name `JOIN_GAP` and `amends ADR-009`).
  - Re-run now: `provisional`, with 3 preconditions open. G6a is 5/8, which is expected until the freeze is re-run.
- **Next, in order:**
  1. arabic-typographer reviews `strips/MD-standard_fix.jpg` (R2 two-phrase ghost, B2 gaps) together with the 7 fix stills, and appends a PASS or FAIL heading to `arabic_r3.md` (or writes `arabic_r4.md`).
  2. render-ops derives the edited text boxes from the 8f245ee..a3b86c1 source diff and runs `python3 -I studio/scripts/lookdev_regress.py --boxes <boxes.json> --by render-ops` through the queue. Then delete `data/renders/lookdev/r3/MD-standard_swiftshader_r3pre.mp4`.
  3. Council records the JOIN_GAP amendment: mixed case display 0.25 / text 0.30 em, against B2's 0.14 / 0.10 em, as accepted by the arabic-typographer OCR sweep at d6ac265.
  4. motion-engineer re-runs `freeze_p6.py`, which must exit 0, then runs `dc gate check G6a`.

## G6a verifier round 1 (f9f00b7): motion-engineer check, nothing for this role to fix
- Re-ran `freeze_p6.py` on f9f00b7. It exits 2 with status `provisional`. All 227 hashes are unchanged, and the same 3 preconditions are open. The re-run file was not kept, because only `hashed_at` changed.
- All 4 failures depend on evidence owned by other roles. The motion-engineer must not produce that evidence (golden rule 4: the author does not grade their own fix):
  1. **arabic-typographer:** write a PASS or FAIL heading that names `MD-standard_fix` and the 7 `*_fix` stills.
  2. **render-ops:** write `regress.json`, using the boxes from the 8f245ee..a3b86c1 source diff.
  3. **council-chair:** decide an ADR that amends ADR-009 B2 `JOIN_GAP`.
- I did not revert `JOIN_GAP` to the B2 text (0.14 / 0.10). The measured OCR sweep showed those values still fuse the lam into the Latin word, so reverting would bring back blocker B2. It would also make the 7 fix stills and MD stale.
- After 1-3 land, the motion-engineer re-runs `freeze_p6.py`, which must exit 0, and then runs `dc gate check G6a`.

## Freeze closed after ADR-010, ADR-009 cond 3 (r4) and cond 4 (df2ee0d) (motion-engineer)
- **ADR-010 = the implemented values** (display 0.20 / 0.25 em, text 0.25 / 0.30 em). `arabic.ts` is unchanged, so nothing was re-rendered.
- **`freeze_p6.py` cond-3 check, aligned to the ADR-009 text** ("re-render F3..F8 and MD; a fresh review returns PASS"). The old check needed the *latest* `arabic_r*.md` to name all 8 artifacts. Coverage is split across two arabic-typographer PASS sections:
  - the 7 `*_fix` stills: `arabic_r3.md` re-check (d6ac265 is newer than the stills at a3b86c1);
  - MD: `arabic_r4.md` (84ad38b is newer than the strip at a773103).
- **New rule:** for each artifact, the latest verdict section naming it must be PASS and committed after the artifact. A name matches either in full, or by its short ID (F4 = F4-standard) inside a section that scopes `_fix`. A later FAIL that names an artifact still re-opens it.
- **`freeze_p6.py` record keeping:** it now writes `cond3_reviews` and adds the amending ADR to `adrs`.
- **Result:** `status: frozen`, `frozen_at` 2026-10-10T06:17:31Z @ df2ee0d. The 227 hashes match the provisional set exactly (0 contract drift).
- **`scene_spec.schema.json` `fx_tier`:** now `lite | standard | hero`. No spec used `light` or `hold`.
- **`dc gate check G6a`: FAIL 7/8.** Freeze, cond 3 and cond 4 are ok. `ADR-009_cond_1_2_fixes_ocr` fails only because `g06a.py:177` looks for the `| B1 … | fixed |` row in the latest review (`arabic_r4`), and that row is in the `arabic_r3` re-check table. The OCR gate is 3/3 ≥ 0.90 and the type suite is 43 ok.
  - **harness-engineer** owns `g06a.py` (ADR-010 follow-ups). Fix: search every `arabic_r*.md` PASS section for B1, as the freeze does now. Then re-run the gate.
  - The motion-engineer did not edit the gate, because it grades motion-engineer work (golden rule 4).
- **Still open:**
  - AT-11 (P7, before G6b): motion-engineer renders the 34 px labels in motion.
  - `dc qa arabic` (AT-10): harness-engineer.
  - `6 الـAI` canon override: scene-director.
  - Delete the 33 MB pre-fix mp4 now that the regress diff is done: render-ops.

## Final freeze after F7 re-render, arabic_r5 and regress refresh (motion-engineer, c45d1d2)
- Inputs, all newer than the F7-standard_fix re-render: `g06a.py` cond 1-2 fix (6431893, harness-engineer), `arabic_r5.md` PASS for F7-standard_fix (c45d1d2, arabic-typographer), and the `regress.json` refresh (render-ops, queue job 31: pass=true, 0 px outside boxes, only F7 moved).
- `python3 -I studio/scripts/freeze_p6.py` exited 0: `status: frozen`, `frozen_at` 2026-10-10T07:10:47Z @ c45d1d2, `open_preconditions` [], `cond3_reviews` r3+r4+r5. Hash counts: tokens 1, type 2, fonts 12, catalog src 106, catalog json 106 (227 files, 0 contract drift).
- **`dc gate check G6a`: FAIL 7/8.** The failing row is `ADR-009_cond_3_rerender_review`. `g06a.py:240-242` requires the *latest* `arabic_r*.md` (now r5, scope F7) to name `MD-standard_fix`, but MD was reviewed and passed in `arabic_r4.md`. This is the same defect class that 6431893 fixed for cond 1-2.
  - **harness-engineer** owns `g06a.py`. Fix: judge cond 3 per artifact across all reviews, as `freeze_p6.py` does: the latest section naming each artifact must be PASS and committed after the artifact. Then re-run the gate.
  - The motion-engineer did not edit the gate (golden rule 4), and there is nothing to re-render.
- **Open P7/P8 acceptance tests:**
  - **AT-4** (P8) [scene-director, visual-librarian, motion-engineer]: F8/MD gate labels on one baseline y, or a minimum 40 px horizontal gap (arabic_r4 obs 1).
  - **AT-9** [render-ops; **blocks P10**]: plate bake cost and disk plan, to be added to the G6a item 5 projection (RT-3 if > 24 h).
  - **AT-10** [harness-engineer, arabic-typographer]: full `dc qa arabic` with isolated-render OCR ≥ 0.9, per-line psm for mixed strings (F6-head 0.651 probe), I/l normalisation for Latin caps. `--frames` exists; G6b and G8 still need the full run. Keep the chip 6 isolated fixture in the G6b/G8 set.
  - **AT-11** (P7, before G6b) [motion-engineer renders, arabic-typographer reviews, native reader veto]: 34 px join gap in motion (ADR-010; RT-010-1/4).
  - **AT-12** (P8, inside `dc spec lint`) [arabic-typographer, scene-director]: line-length check for the gap (RT-010-3).
- **Canon drift `الـAI`**: `chapters.json:196` (CH-34) says `6 الـAI`, the look-dev chip shows `AI 6`. The scene-director restores `الـAI` (ADR-010 caps gap 0.20 / 0.25 em; RT-010-4 if it fails AT-11 at 32 px) or logs a `pending-council` override. Do not ship the bare form silently. Any other caps acronym with `I` (API, KPI) needs the `cv08` serifed I or the I/l normalisation.
- **Stale strips**: MA, MB, MB-hero and MC are pre-fix renders (old J1 gaps; MA shows `قسم الـroadmap`). They are not valid evidence; re-render them in P7 (motion-engineer, queue) before any is cited at G6b/G8.
- **Housekeeping** [render-ops]: delete `data/renders/lookdev/r3/MD-standard_swiftshader_r3pre.mp4` (33 MB) if it is still present.
