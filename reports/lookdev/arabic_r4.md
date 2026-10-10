# Arabic typography review r4: MD-standard_fix (arabic-typographer)

## PASS (0 blocking, 0 required) for ADR-009 condition 3, scope MD-standard_fix

Scope: `reports/lookdev/r3/strips/MD-standard_fix.jpg` (1920x540, eight 480x270 tiles: f0, f20, f33, f160, f210, f260, f262, f287). It is the only `*_fix` artifact not yet reviewed; the seven `*_fix.jpg` stills were re-checked in `arabic_r3.md` (PASS). Author (motion-engineer) did not grade. Tiles are 480 px wide (1/4 scale), so joins, dots, tashkeel and size floors were judged on the 1920x1080 `F8-standard_fix.jpg` (the same MD shot, f210 region) plus source (`studio/src/lookdev/world.tsx:384-562`, `content.ts:77-78`, `data/ch00_gates_window.json`). The strip was judged for wipe shaping, collisions, layout and RTL anchoring.

## Rule by rule

| Rule | Evidence | Result |
|---|---|---|
| Strings (7 distinct) | `اللي أي حد شغال`, `في الداتا بيعمله`, `هات الصفوف`, `خليها موثوقة`, `جاوب على السؤال`, `دي الشغلانة كلها` (words `دي`/`الشغلانة`/`كلها` are separate elements). All Arabic only; no Latin, no digits, no `الـ`+Latin | ok |
| Words and length | Ghost 4 + 3 words, 15 + 16 chars, 2 lines total, one line per phrase (R2 closed); labels 2 to 3 words, 10 to 15 chars; title 3 words, 15 chars | ok (limits 6 / 32 / 2) |
| Joins and JOIN_GAP | MD has no `الـ`+Latin string, so `JOIN_GAP` is not exercised here. Values in `arabic.ts:60` are display caps 0.20 / mixed 0.25 em, text caps 0.25 / mixed 0.30 em; the gate strings (`الترتيب داخل الـpartition`, `قسم الـroadmap`, `قسم الـidempotency`) score 3/3 exact in `r3/fix.json` and I re-viewed them in `arabic_r3.md`. Visible tatweel/ligature joins inside the MD words are intact (no broken `لا`, `ال`, `ـة`, `ؤ`) | ok |
| BiDi | No mixed runs. Ghost block `dir="rtl"`, `alignItems: flex-start` puts both lines flush at the right edge (tile x 450 and 450). Title lays out RTL: `دي` at the right, then `الشغلانة`, then `كلها` (reading order correct). Gate order right to left: `هات الصفوف` right, `جاوب على السؤال` left | ok |
| Tashkeel clearance | No tashkeel in MD. `ؤ` in `السؤال` (hamza above) clears the line above and the ring reflection; final `ي` dots are present at full size on the ghost (F8 crop: both `اللي` and `أي` dotted; tile-scale OCR `أى` is blur only) | ok |
| Tofu | All glyphs are in the 49-string cmap check of `arabic_r3.md` (Alexandria and Plex Sans Arabic 500/600): 0 missing codepoints | ok |
| Overflow | Ghost right edge 1800 (right: 120), widest line 16 chars at 72 px, inside the frame and clear of the title slot; labels 600 px container, widest `جاوب على السؤال` fits with margin (f210: x 48 to 170 of 480, left gate keeps >= 48 px from the edge) | ok |
| Size floors | Labels 56 px, ghost 72 px, title 104 px and `كلها` 128 px: all at or above the 56 px display floor and the 18 px text floor (ADR-003) | ok |
| Ghost contrast | Pixel sample on F8_fix (full size): line 1 3.4:1, line 2 3.85:1 (98.5th-percentile ink against local background, ink2 `#9FB0BD` at opacity 0.5). Strip f0 reads brighter (opacity 0.9 falling to 0.5 by f30). Accepted as a receding ghost; line 1 is at the edge of the 3.8 line so it may not be dimmed further (AT-4) | ok, hold |
| Presets | Ghost `arrive` per phrase, in at f0; ghost gone by f260 and the title slot taken by three whole-word `arrive`/`impact` elements. No per-letter motion, scramble or typewriter. f262 is a whole-element RTL clip wipe (the `ه` is cut in medial form with its joining stroke; the cut runs right to left, so `ك` is revealed first) and a 3-frame flash: valid `impact` | ok |
| Halo/plate | Title and labels sit on a dark scrim or halo; no text over a busy bright background. f262 bloom behind `كلها` is the flash; do not use as a style still | ok |

## Observations (non-blocking; carry to P7/P8, owners in brackets)

1. **Label baselines are staggered** (f160, f210): the three gate labels are placed at projected 3D points, so baselines differ by about 36 and 52 px at 1920 scale. At f160 the `هات الصفوف` and `خليها موثوقة` labels are only about 24 px apart horizontally (stair-stepped about 44 px vertically): they do not overlap but nearly read as one phrase. This is AT-4 (one baseline y); also require a minimum 40 px horizontal gap or a fixed y in the P7 label layout [scene-director, motion-engineer].
2. **Pixel diff vs the old `MD-standard.jpg`** has pixels with |delta| > 8/255 in all of tiles f0..f210, spread over x 65 to 450 and y 16 to 205 (a region wider than the ghost box). It is probably the r3 camera/gate-standby changes in the same render, but it is a render-ops item (ADR-009 condition 4), not an Arabic one [render-ops].
3. **Strips MA, MB, MB-hero and MC are still the pre-fix renders** (old J1 gaps; MA shows `قسم الـroadmap`). They are not valid Arabic evidence for the new gaps; the F3/F4/F6/F7 `_fix` stills are. Re-render before any of them is cited at G8.
4. **JOIN_GAP vs ADR-009 B2**: the shipped values (mixed 0.25 and 0.30 em; caps 0.20 and 0.25) differ from B2 (mixed 0.14 and 0.10). I accept them on the measured isolated-OCR sweep (B2 values stayed fused), but `freeze_p6.py` requires either the B2 values or a Council amendment, so an amendment ADR must record the actual table [council-chair]. I am not the owner of that decision.
5. **Isolated OCR probe `F6-head` scores 0.651** (`roadmap ال awd نتيجة: lel`): reading-order/psm scrambling of a mixed string, with the lam and `roadmap` separated; the same string scores 1.00 on the still crop. `dc qa arabic` must normalize this or run per-line psm 7/13 [harness-engineer, AT-10].
6. Earlier open items stand: canon drift `6 الـAI` vs look-dev `6 AI`; F5 chips 20 px; right-edge anchoring of F5/F1 labels; `CH-34:labels_ar:0` pending-council; `dc qa arabic` is still not implemented, so G6b and G8 stay blocked.

## Verdict

PASS. MD-standard_fix shows the split ghost title, flush right and 2 lines, with correct RTL order and wipe direction, 0 tofu, no overflow, and all sizes above floor. ADR-009 condition 3 (fresh Arabic PASS on the fix set) is satisfied: arabic_r3 re-check on the seven stills (PASS) plus this review of MD (PASS). Conditions 4 and 5 and the JOIN_GAP amendment remain with render-ops, motion-engineer and council-chair.
