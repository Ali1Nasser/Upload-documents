# Arabic typography review, look-dev r1 (arabic-typographer)

Scope: `reports/lookdev/r1/stills/` F1..F9 (incl. F4-hero) and `reports/lookdev/r1/strips/` MA, MB, MC, MD, viewed at full size, plus crops/zooms of MA f91 and f227. Content cross-read against `studio/src/lookdev/content.ts`, `motion.tsx`, `data/ch33_window.json`, `corpus/canon/chapters.json`.
Tesseract `ara+eng` was run on 26 text crops of the (glow-composited, JPG) stills as a smoke test only: 11 at 1.00, 5 at 0.85-0.93; the rest are 0.4-0.8 because of glow, tiny size, Latin mix or mid-reveal, and are explained below. The formal per-string isolated-render test (`dc qa arabic`, G6b/G8) is not implemented yet (P9), so this is a visual verdict, not that gate.

**Verdict: FAIL (3 blocking fixes, all spec/layout edits, no component redesign). Everything else passes.**

## Pass (verified)
| Check | Result |
|---|---|
| Shaping / joins | All 24 distinct strings join in contextual forms; no isolated-form letters, no broken ligatures (lam-alef, shadda in بيحوّل / تحمّل / غيّر / وسّع OK). |
| Tofu | 0 visible. `؟`, U+2212 minus, `→`, `=` render. |
| BiDi | Latin isolates sit correctly: `ست عمليات دفع من NilePay`, `قسم الـroadmap`, `الـpartition`, `الـquery`, `الـidempotency`, `SQL مش بتشتغل…`, `بترتيب layers عاقل`, `إزاي أمنع job إنها…`. Tatweel join `الـ` + Latin intact. `5 ثوانٍ مقابل 57` reads right-to-left correctly. `أعلى نتيجة:` colon is on the correct side. `lag = 11 − 7 = 4` and `13 → 11 rows` are clean LTR isolates. |
| Digits | Western only, everywhere (0.165, 0.227, 57, 150 EGP, offsets). No Eastern-Arabic digits. Units Latin (EGP, s, rows). |
| Tashkeel clearance | F5 `ثوانٍ` kasratan now clears the subtitle (about 60 px). F4 shadda lines clear neighbours. |
| Kinetic rules | No per-letter animation anywhere (no split-to-chars in `studio/src`); `arrive` is a whole-word RTL clip-path wipe; counters animate numerals only; scramble and typewriter are not used on Arabic. CA applied to Latin/numeral runs only. |
| Contrast (sampled) | F1 foot 9.3:1, F6 labels 8.0:1, F4 `وسّع الـquery` 10.2:1. |

## Blocking fixes
1. **F5-standard: overlap.** The label `بترتيب layers عاقل` (x 1005-1340, y 385-430) collides with the top slab's upper edge (slab top y ~418). Descenders of ع/ق/ب touch the slab outline; OCR 0.41 confirms. Fix: raise the label so its baseline sits >= 24 px above the slab top (move up ~40 px, y ~345-390), or lower both stacks by 40 px. Do the same for the left label (`نسخ الكود فوق تنصيب التبعيات`, currently clear by 70 px) so the pair stays aligned.
2. **F2-standard: `SQL مش بتشتغل بالترتيب اللي إنت كاتبها بيه`** is 1 line, 42 Arabic chars, 8 words (limit 32 chars per line, 2 lines). Break at the phrase boundary into two lines: `SQL مش بتشتغل بالترتيب` / `اللي إنت كاتبها بيه` (22 / 17 chars), line-height >= 1.3, still verbatim S1.
3. **F4-standard and F4-hero (and MB strip, all cells with the caption): caption `إزاي أمنع job إنها تحمّل نفس الصفوف مرتين`** is 1 line, 41 chars. It contains a shadda, so use the T1 line-height of 1.6. Split: `إزاي أمنع job إنها تحمّل` / `نفس الصفوف مرتين`.

## Fix-then-pass (advisory, apply with the above)
4. **F5 title `5 ثوانٍ`:** narration and glossary say `خمس ثواني`; the tanween is MSA orthography. Egyptian register: `5 ثواني مقابل 57`. This also removes the tashkeel-clearance burden on the title. The glossary term (`corpus/canon/glossary.json` line 762) carries the tanween, so this is a spec text override and needs egyptian-arabic Council confirmation; do not edit canon.
5. **Inline Latin style is inconsistent.** MA f91/f102 sets `roadmap` in cyan JetBrains Mono at 64 px beside 72 px Arabic. F6-standard and F3 titles use Inter Tight in the Arabic colour. F4 cards use mono. Rule to freeze in `studio/src/type/`: inside an Arabic sentence, Latin isolates use Inter Tight, same colour, optical size = Arabic size; mono only for chips, code and data labels; colour accent only through the glow colour, never a second face.
6. **`roadmap` article mismatch.** MA shows `أعلى نتيجة قسم roadmap` (verbatim S1 w:5967-5968, no article spoken) while F4 and F6 show `قسم الـroadmap`. Pick one. Recommended: `قسم الـroadmap` everywhere, and in MA render word 5968 as `الـroadmap` (display text override on w:S1:ar-natural:005968; the word-id anchor is unchanged).
7. **F4 (standard and hero) note `أعلى نتيجة`:** 30 px at 4.5:1, which is the minimum. Raise to ink2 (>= 7:1) at 32 px.
8. **F2 chip `WHERE أرخص مكسب`:** Arabic is about 25 px tall, under the 28 px spoken floor; OCR returned nothing. Raise the chip text to 32 px.
9. **F6-standard:** the ghost `0.165` sits behind `وغلط` / `وضعيف`. A halo is present so it passes, but cap the ghost at 8 % alpha or move it below the phrase, so the yellow `وضعيف` keeps a clean plate.
10. **F8-standard and MD f205:** `جاوب على السؤا` is a mid-wipe frame, with the clip edge cutting the final ل. It is valid for `arrive`, but F8 must not be used as a style-lock still; F9 has the complete word. Tag F8 as "reveal in progress" in the report. Optionally have `arrive` end its clip on a whole-glyph boundary at p >= 0.85.
11. **Unit placement:** `57 s` / `5 s` (Latin, small) next to the Arabic title `ثواني` is acceptable (title is a narration quote), but freeze units: EGP, %, ms, s, rows always Latin, set after the number, in the muted ink at 0.4 x the number size.
12. **Direction note (design, not a defect):** funnel stages (FROM to LIMIT) and `13 → 11` run left-to-right. This is correct for SQL/code (Latin data), but arrows between Arabic text blocks must be `←`. Keep `→` only inside Latin/numeric isolates.

## Open BiDi cases for `dc qa arabic` (P9)
- `⟦4 / 6 = 66.67 %⟧` style isolates with `%` and parentheses next to Arabic punctuation (`،` `؛` `؟`) at line end.
- Latin isolate that wraps at a line break when a caption is split in 2 lines (fix 2 and 3).
- `الـ` + Latin inside a chip (term chips are LTR plates; check the Arabic gloss order beside them: F2 `WHERE أرخص مكسب`, F3 `offset الإزاحة`).
- Counters with `.` decimals in an RTL parent (`dir=ltr` span is already used; keep it).
- The Arabic-Indic `؟` mirrored in RTL clip-path wipes.

## Presets and fonts
- Presets seen in use and accepted: `arrive` (RTL clip-path wipe, 0.92 to 1 scale, 6 px blur to 0), `impact` (1.08 to 1 plus flash, nudge <= 4 px), `exit` (blur-out, 300 ms). `count`, `label` and `morph` are not exercised in r1; test them in P7.
- ADR-003 T-A (Alexandria 700 >= 56 px, Plex Sans Arabic 600 below, 0.08 em word-spacing) holds in glow and in motion: F6/F9 impact words legible, labels at 30-36 px legible. No change.
