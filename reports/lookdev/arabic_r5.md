# Arabic typography review r5: F7-standard_fix (arabic-typographer)

## PASS: F7-standard_fix (ADR-009 condition 3), 0 blocking, 0 required

Scope: `reports/lookdev/r3/stills/F7-standard_fix.jpg`, 1920x1080, full size, re-rendered 2026-10-10 06:34 (commit 8ae7cc0: Inter Tight `cv08` serifed capital I on the chip 6 Latin run). Rules from `arabic_r3.md` plus ADR-010 JOIN_GAP. The author (motion-engineer) did not grade. Nothing in the freeze set (`reports/lookdev/` stills, `data/renders/`, `studio/src/lookdev|type|components|tokens.ts`) was touched; only this report and `reports/qa/arabic/` files were written.

## `dc qa arabic --frames` on the still
Input `reports/qa/arabic/f7-fix-frames.json` (9 text layers: title, chips 1 to 7, Kafka). Report `reports/qa/arabic/r5-f7-standard_fix.json`.
- Result: 9 strings, 8 pass, 1 flagged. Tofu 0, overflow 0, BiDi 0, digits 0, joins 0, per-letter 0.
- Chips 1/2/3/4/5/7: OCR 1.00 / 1.00 / 0.947 / 1.00 / 1.00 / 1.00.
- Chip 6 `AI 6` and `Kafka`: the tool skips OCR for strings with no Arabic letter (structural checks pass, face `mono`/Latin, no tofu). The chip 6 OCR gate is the isolated render in `adr009-gate.json` (`F7-chip6`, 1.00 exact, 6/6 gate strings exact). My own crop OCR of the frame chip gives `AIG` / `(AIG)` (the `6` read as `G`, glow plus 32 px): the `AI` run reads `AI`, not `Al`. That is the cv08 fix working. Glow-composited Latin crops are not a gate.
- Title `دي الشغلانة كلها` (104 px): frame-crop OCR 0.828 (`د> الشغلدنة كلما`). Identical score to the pre-fix frame, same pixels (the re-render changed only the chip 6 box, per the commit). It is glow noise, the `known_noise` class in `docs/tools/qa_arabic.md`. The gate is the isolated render: `dc qa arabic --string 'دي الشغلانة كلها@104'` gives PASS 0.966 (`reports/qa/arabic/r5-f7-title-isolated.json`). Not a defect.

## Rule by rule (full-size inspection)
| Rule | Evidence | Result |
|---|---|---|
| Chip 6 glyphs | `AI 6`: `A` and serifed `I` clearly distinct from lowercase `l` (serif bars at top and foot), `6` Western digit, weight and size match the neighbouring chips, no collision with the pill edge | ok |
| Joins / ADR-010 JOIN_GAP | No `الـ`+Latin string in this still (bare `AI`, see canon note), so JOIN_GAP is not exercised here. Arabic-only joins intact in all six chips and the title (no broken ligature). Join gate strings (`الترتيب داخل الـpartition`, `قسم الـroadmap`, `قسم الـidempotency`, 34 and 72 px) exact in `adr009-gate.json` | ok |
| BiDi | Chips: number at the RTL start (right) then label, identical for all seven (`7 الدليل`, `1 الجهاز`, `2 الداتا`, `3 الأنظمة`, `4 المنصة`, `5 المجال`, `AI 6`). Title reads RTL `دي` then `الشغلانة` then `كلها`. No punctuation or `%` here | ok |
| Canon drift `6 الـAI` vs shown `AI 6` | Chip order is consistent with the other six chips (number at the right). Canon text (`corpus/canon/chapters.json:196`, glossary) has the article. Not a defect in the still; P8 item below | non-blocking |
| Tashkeel clearance | None in the string set. Final `ي` of the title: both dots present and clear of the line below and the chip 2 plate (zoomed) | ok |
| Tofu | 0 missing codepoints in all 9 strings (cmap check in the tool; `AI`, digits and Arabic letters covered) | ok |
| Overflow and safe margin | Title box 890-1800 x 70-180 inside the 68/38 px safe area (right edge 1800 of 1852); all chip texts sit inside their pills with margin; chip 6 pill 405-515 holds `AI 6` with at least 20 px side padding; no chip overlaps the title | ok |
| Size floors | Title 104 px (display floor 56); chips 32 px and Kafka 34 px (spoken-term floor 28; global floor 18); no sub-18 px text except unspoken background tower window dots | ok |
| Contrast (pixel sampled) | Title 13.1; lit chips 14.5 to 16.1; Kafka 11.2; dimmed chips 5, 6 and 7 at 9.0 to 9.2 (all >= 4.5, dimmed on purpose). Title sits on a scrim, chips on opaque dark plates: no text over a bare busy background | ok |
| Digits and units | Western digits only; no Eastern-Arabic digits | ok |
| Kinetic limits | Title 3 words, 16 chars, 1 line; chips 2 words | ok |
| Per-letter animation | Still frame; `per_letter` scan 0 hits | ok |

## Open items (non-blocking, carry to P8/P9)
1. Canon drift: production spec for chapter 34 (`chapters.json:196`) says `6 الـAI`; look-dev shows bare `AI` (serifed I, no article). Scene-director must restore `الـAI` (ADR-010 caps gap 0.20 em display / 0.25 em text, tool's no-join control applies) or log a `pending-council` override for the bare form. Do not ship the bare form silently.
2. The `cv08` serifed `I` applies to this chip only. Any other all-caps Latin acronym containing `I` (`API`, `SQL` has none, `KPI`, `AI`) in a production string needs the same treatment or the tool's I/l normalisation; otherwise OCR and viewers can read `Al`.
3. `dc qa arabic --frames` skips OCR for Latin-only strings; chip 6 evidence therefore rests on the isolated-render fixture. Keep that fixture in the G6b/G8 set.
4. Earlier advisories stand (F5 status chips 20 px, RTL anchoring of F5/F1 labels, chip term-first order, `CH-34:labels_ar:0` pending-council).

Verdict: PASS for F7-standard_fix. ADR-009 condition 3 (Arabic typography) is satisfied for this still. G6b and G8 gating on the full `dc qa arabic` run is unchanged.
