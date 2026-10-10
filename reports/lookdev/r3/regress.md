# P6 look-dev r3: fix-still regression (ADR-009 condition 4)

Tool: `python3 -I studio/scripts/lookdev_regress.py --boxes <boxes.json> --by render-ops` (run via `dc q`, jobs 1-2). Result: `regress.json`, **pass = true, 0 px outside**.

Method: each `*_fix.jpg` vs the scored r3 `.jpg` (the r3 PNGs were overwritten), both 1920x1080 JPG, downscaled to 960x540 (LANCZOS). A pixel is "changed" if max-over-RGB |delta| > 8/255. Allowed area = edited text boxes + 16 px (1080p), boxes in 1920x1080 px.

Threshold: 8/255. Largest |delta| seen outside the allowed boxes was 3/255 (F6), 2 (F3, F8), 1 (F4), 0 (F5, F7), i.e. JPEG/ringing noise at about 3 levels, so 8 clears it by 2.6x while real text edits are far above (edits reach 255). The original-vs-fix renders share the same compositor, so no other noise source was found.

| still | changed px (960) | changed bbox (960) | outside px | max delta outside |
|---|---|---|---|---|
| F3-standard | 5184 | 387,39-567,90 | 0 | 2 |
| F4-standard | 2577 | 151,225-791,429 | 0 | 1 |
| F4-hero | 2581 | 151,224-791,430 | 0 | 1 |
| F5-standard | 76 | 402,95-421,133 | 0 | 0 |
| F6-standard | 43475 | 97,93-665,472 | 0 | 3 |
| F7-standard | 1332 | 188,132-272,159 | 0 | 0 |
| F8-standard | 10064 | 292,40-900,148 | 0 | 2 |

Boxes (1080p) map to the source diff 8f245ee..a3b86c1: F3 title join gap (Mix px); F4 two node label/note Mix call sites (galaxy.tsx 275/278, projected in 3D, so their screen boxes were read from the diff clusters and each cluster is a single text element); F5 `s` unit 0.42em->0.55em; F6 headline plus the RTL counter grid (193,184-1330,257 and 193,690-1330,944); F7 district tag `AI` (376,264-544,319); F8 carry line in two phrases (585,78-1800,296).

Caveat: the F4 boxes are anchored on observed diff clusters, so for F4 the test proves "no other region changed" and that each cluster is one text element, not an independent position derivation. The other five were checked against source positions and are consistent. Also, `max_delta_outside` is not part of the verdict; the verdict is the count at 8/255.
