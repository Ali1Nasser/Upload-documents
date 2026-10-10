# `dc qa arabic`: Arabic on-screen text suite

Owner: arabic-typographer. Code: `tools/dclib/qa_arabic.py` (wired in `tools/dclib/cli.py`). Tests: `python3 -I tools/tests/test_qa_arabic.py` (76 checks).
Spec: `docs/plan/04` §3.4, `docs/plan/06` §1 G6b/G8, ADR-009 AT-10, ADR-010 (join gap, AT-11, AT-12, RT-010-2/3).
Exit codes: **0 pass**, **1 fail**, **2 incomplete** (no OCR engine, or `--no-ocr`). An incomplete run is never gate evidence.

## Inputs (combine freely)

| Flag | What it checks |
|---|---|
| `--spec FILE` | Scene spec. Every string leaf of `layers[].props` that holds Arabic, or sits under a text key (`text`, `title`, `label`, `caption`, `term`, `gloss`, `unit`, ...). Size comes from `props.size` (else 80 kinetic / 40 caption / 32 label). Layers with `effect/animate/split/mode` = `letter`, `char`, `per-letter`, `typewriter`, `scramble` that carry Arabic are flagged. |
| `--src PATH` | TS/TSX file or directory (component demos). Arabic string literals outside comments; prose with 3+ Latin words is skipped as a developer note. Size unknown, so each string is rendered at both bands (34 px text, 92 px display) and fails OCR only if it fails in both. Also runs the per-letter scan on the same paths. |
| `--items FILE` | JSON list of strings or `{id,text,size,kind,container:{w,h},expect}`. |
| `--frames FILE` | Items with `frame` (JPG/PNG, 1920x1080) and `box` `[x0,y0,x1,y1]`: OCR of the delivered crop. Evidence class `frame-crop` (glow-composited; advisory when `known_noise`). |
| `--probes DIR` | Chromium isolated renders: `probes.json` + `<id>.png` from `studio/scripts/lookdev_typeprobe.mjs` (queue it). Evidence class `chromium-isolated`. |
| `--string S` | One string, `text` or `text@size` (repeatable), with `--size` / `--kind` as defaults. |
| `--scan PATH` | Extra TS/TSX paths for the per-letter scan. |

`kind`: `kinetic` (word limit 6 applies), `caption`, `chip`, `number`, `label`. Item field `expect: "fail"` marks a negative control that the checker must catch (counted in `negative_fixtures/negative_caught`, excluded from the other counts).

Other flags: `--label NAME` (report `reports/qa/arabic/NAME.json`), `--out`, `--min-score 0.9`, `--safe 68,38`, `--gap-em` (join gap sweep, not gate evidence), `--ocr-cmd`, `--no-ocr`, `--jobs N`, `-v`.
Large runs (more than about 40 strings) go through the queue: `python3 tools/dc.py q submit --label qa-arabic -- python3 -I tools/dc.py qa arabic --src studio/src/lookdev --label lookdev-src --jobs 3`, then `q wait`.

## Checks per unique string

1. **OCR round-trip, pass at >= 0.90.** The string is rendered alone at its production size, white on black, and read by tesseract `ara+eng`. The same engine and the psm 7 / 13 reading that the r3 sweep used (`studio/scripts/lookdev_typeprobe_ocr.py`), but scored at several scales (line height 100, 70, 140 px, then 85 and 120; first pass wins) and with these normalisations:
   - two streams: Arabic letters in logical order, and Latin letters / digits / `%`. Tesseract emits a Latin isolate before or after the Arabic run, which is a reading-order artefact;
   - the want string lists Latin isolates in screen order (an RTL parent lays them out right to left), so `6 AI` is expected as `AI 6`;
   - dropped: tatweel, bidi marks, tashkeel, spaces and every symbol (`:` `،` `·` `←` `≠` `-` are unreadable to OCR; the static BiDi checks own punctuation);
   - equated: `I l 1 | !` and case (so `Al` = `AI`), Eastern digits to Western;
   - **join junk** (`d!`, `J|`, `t]`, `JI` right next to the Latin term of an `الـ`+Latin string) fails the string even when the ratio is >= 0.9, as in ADR-010 AT-11. A zero or B2 gap reproduces it (`partitiond!` scores 0.913 and still fails).
   - a short Arabic stream (fewer than 8 letters: `الـAI`, `جلب`) cannot be read by tesseract out of context (`Al JI`), so it is OCR'd behind the carrier word `قسم` laid out by the same code, with the carrier in the want string. The report records `carrier`.
   - **Script ambiguity control.** If a join string with a 1-3 letter Latin term (`AI`) fails, the same string is rendered with the tatweel replaced by a space and read again. If that control fails too, the failure is Latin `AI` read as Arabic `ام`, not the join: a warning (`OCR-SCRIPT-AMBIGUOUS`) that needs the native reader (ADR-010 AT-11). If the control passes, the failure stands.
   - **RT-010-2 evidence.** A failing join string whose Latin term was damaged or has 1-2 junk characters beside it is listed in `metrics.rt_010_2` and printed. A low score with the Latin term intact (another word misread) is a plain OCR failure, not RT-010-2.
2. **Tofu: 0.** Every codepoint must have a non-`.notdef` glyph in the face chain the `Mix` component uses (Arabic face by size, Inter Tight or JetBrains Mono for Latin, either as fallback). The cmap is read by a pure-Python parser (formats 0, 4, 6, 12), so fontTools is not needed.
3. **Overflow: 0.** Ink width of the isolated render against its container (`container.w`, default frame minus the safe margin 68 x 38 px, which is 3.5 % action-safe; `04` defines none, override with `--safe`); frame crops must sit inside the safe rectangle. Join strings are also rendered with a zero gap: if the line fits without the gap but not with it, `OVERFLOW-JOIN-GAP` (ADR-010 RT-010-3 / AT-12).
4. **Copy limits.** At most 2 lines and 32 visible characters per line (port of `breakCaption`), at most 6 words for `kinetic`, size >= 18 px. Warnings: MSA markers (register), unit forms (`LE`, `secs`, `66%` next to `66 %`).
5. **BiDi case list** (static, on the same segmentation the component uses): Arabic swallowed by an LTR isolate (`(الـpartition)`), unbalanced parentheses in an isolate, two Latin words or two numbers as separate isolates (`vector database` must be `⟦vector database⟧`, `12 500` must be `12,500`; RTL reverses them; number + word like the chip `6 AI` is the tag idiom and passes), number and unit not one isolate (`66.67 %`, `11 rows`), numeric expression outside one isolate, Latin `?` `,` `;` in an Arabic string, `→` between Arabic blocks, hyphen-minus in arithmetic, `؟` not at the phrase end, a line break inside `⟦…⟧`.
6. **Western digits.** Any U+0660-0669, U+06F0-06F9, U+066A-066C, full-width digit is an error.
7. **Joins.** Arabic never touches Latin directly: `الkafka` (no tatweel), `ال roadmap` (article + space), orphan or doubled tatweel, tatweel not before a Latin isolate, Arabic glued after Latin. The gap itself comes from `JOIN_GAP` in `studio/src/type/arabic.ts`. The report's `join_policy` names the basis: the decided ADR-010 values if present, else ADR-009 B2, and whether the shipped values match.
8. **Per-letter animation** (repo scan): `.split('')`, `[...text]`, `Array.from(text)`, `charAt`, `text.slice(0, f(frame))`, `typewriter`, `scramble` in TS/TSX. A line is exempt only if the 3 lines around it carry `latin-only`, `mono-only`, `ok-letter` or an `isArabic(` guard. `studio/src` currently has 0 hits.

## Evidence classes (what counts for G6b / G8)

- `pil-raqm-isolated` (default): PIL + Raqm (HarfBuzz shaping) with the frozen faces (Alexandria 700 from 56 px, Plex Arabic 600 below, Inter Tight / JetBrains Mono for Latin), tabular figures, word-spacing 0.08 em and the J1 join gap. It reproduces the r3 failures exactly (zero gap and B2 gaps give `partitiond!`, `roadmapJ|`; ADR-010 gaps read exact), and needs no browser. It is an emulation of the Chromium layout, so G6b uses it for every string and **also** needs the Chromium probes for the gate strings.
- `chromium-isolated` (`--probes`): the real render. Run `python3 tools/dc.py q submit --label typeprobe -- node studio/scripts/lookdev_typeprobe.mjs`, then `dc qa arabic --probes data/renders/lookdev/r3/probe`. Use for the ADR-009 gate strings and the ADR-010 AT-11 strings.
- `frame-crop` (`--frames`): regression on delivered frames. Glow depresses OCR (F7 title 0.80, F4 title 0.93), so fixtures mark glow cases `known_noise` (warning, not failure). Never the only evidence.

## Install-free fallbacks

- Rendering, cmap, BiDi, digits, joins, copy limits, per-letter scan: Python 3 stdlib + Pillow with Raqm (`PIL.features.check('raqm')`). No fontTools, no python-bidi, no numpy.
- OCR engine order: `--ocr-cmd` / `$DC_OCR_CMD` (`<cmd> <image.png> <psm>` prints the text), then the `tesseract` binary with `ara` and `eng` traineddata (present here, 5.3.4). With neither, OCR is reported as skipped and the verdict is `incomplete` (exit 2). `--no-ocr` runs the structural checks only and also ends `incomplete`; `--no-ocr-ok` turns that into `pass` for lint use only, never for G6b.
- No Chromium: use the PIL path; the probes step needs the Playwright chromium at `/opt/pw-browsers` (as `lookdev_typeprobe.mjs` does).

## Fixtures and tests

`tools/tests/fixtures/qa_arabic/r3_stills.json` crops strings from `reports/lookdev/r3/stills/*_fix.jpg` (F3, F4, F6, F7) and two pre-fix stills as negative controls (`F3-standard.jpg` fused join scores 0.67, `F7-standard.jpg` chip `6 الـAI` scores 0.67). `demo_spec.json` is a deliberately bad spec (Eastern digits, per-letter effect, 3-line caption, orphan article).
The test file also asserts that the four ADR-009 gate strings and the 34 px labels pass as isolated renders, that a zero join gap is caught, and that the CLI exits 1 / 2 / 0 as documented.

## First results on repo data (2026-10-10, reports in `reports/qa/arabic/`)

- `adr009-gate.json`: the ADR-009 close-condition-2 strings, **6/6 exact at 1.0**: `الترتيب داخل الـpartition` (92 px), `قسم الـroadmap` and `قسم الـidempotency` (72 px), the F7 chip 6 (`6 AI`, forced OCR), and the ADR-010 AT-11 labels at 34 px. Evidence class `pil-raqm-isolated`; the Chromium probes (`--probes`) are still to be re-rendered through the queue for the G6b record.
- `lookdev-src.json`: 33 Arabic literals of `studio/src/lookdev`, PASS, OCR min 0.972, 5 join strings all 1.0, tofu 0.
- `r3-stills.json`: the fixtures above, PASS (11 of 12 OCR >= 0.9; F7 title 0.83 is glow noise, `known_noise`; both pre-fix stills caught).
- `canon-labels-ar.json`: 121 `labels_ar` strings of `corpus/canon/chapters.json` (117 unique), FAIL, the scene-director's list: `خطوة 4 / 9` (BIDI-EXPR, write `⟦4 / 9⟧`), `3 صفحات مقابل 12 500` (two number isolates reverse to `500 12`; write `12,500` or `⟦12 500⟧`), `95٪` and `99٪` (Arabic percent sign U+066A: use `95 %`), the 7-district ribbon (3 lines > 2), and `نفس الـobject` (join junk `J]` at 32 and 40 px with the 0.30 em text gap; clean at 0.35 em: ADR-010 RT-010-2 evidence). OCR-only misses on short or symbol-heavy labels (`جلب`, `خلّصت ≠ أثبتّ`) are OCR noise: shaping is correct in the render.
- Canon `6 الـAI`: reads `الام` at 32, 34 and 92 px even behind the carrier, while the spaced control passes; Latin `AI` is the one acronym OCR confuses with Arabic. Treat as native-reader judgement (AT-11, RT-010-4); the look-dev bare `AI` stays.

## Not automated (open)

- Mirrored `؟` under the RTL wipe and a gap that reads as two words in motion (ADR-010 AT-11 sampled frames, native reader veto).
- Latin isolate wrapping across a browser line break (only `⟦…⟧` and the `breakCaption` port are checked).
- Text over a busy background without a plate or halo (the plate/halo rule is for the spec lint and the critic).
