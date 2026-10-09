# PHASE-06 (motion-engineer): P6 look-dev freeze, gate G6a

**G6a: FAIL (6/8)** on `python3 tools/dc.py gate check G6a` → `reports/gates/G6a.json`. The checker is `harness/gates/g06a.py`.

The look, the ADRs, the freeze and the render budget all pass. The two failing checks are the ADR-009 close conditions owned by other roles. No threshold is changed or waived here.

| # | Check | Result |
|---|---|---|
| 1 | ADR-002..005 decided | ok |
| 2 | look ≥ 8.0, parity ≥ 7.5 (latest `critic_r3.json`) | ok: 8.01 / 7.5, min 7. ADR-009 W-009-LOOK covers r3, a single read with zero headroom |
| 3 | latest Arabic review | ok: `arabic_r3.md` re-check PASS (d6ac265) |
| 4 | tokens, presets and catalog frozen | ok: 227 files hashed in `harness/state/freeze.json`, 0 changed, 104/104 catalog names |
| 5 | projected final render ≤ 24 h | ok: 332,651 f @ 24 fps. ADR-002 model RT5 gives 16.6–20.9 h; measured r3 blended 0.1339 box s/f gives 12.4 h. The +25 % read is 26.1 h (ADR-002 R2 ladder). Plate bake cost is not included yet (AT-9) |
| 6a | ADR-009 cond 1–2 | ok: the 3 Arabic OCR gate strings score 1.00. The F7 chip is now Latin `AI 6`, so there is no isolated score; B1 was closed by the Arabic re-check. Type suite 43 ok |
| 6b | ADR-009 cond 3 | **FAIL**: MD was re-rendered (below), but no Arabic review covers `MD-standard_fix` yet |
| 6c | ADR-009 cond 4 | **FAIL**: there is no `reports/lookdev/r3/regress.json` (the render-ops no-regression diff) |

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
- **`fx_tier` naming mismatch**: `harness/schemas/scene_spec.schema.json` uses `fx_tier` enum `light`, while tokens and 04 use `lite`. harness-engineer should align it to `lite` before P8 specs are written.
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
