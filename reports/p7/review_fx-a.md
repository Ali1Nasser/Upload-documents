# P7 fx-a review (critic)

## FailureGlitch — round 1

Date: 2026-10-15. Reviewer: critic (did not author; draft finished in fc5777e). Scope: baselines p0/a1/p50/p100 at full size (960x540, lite tier; sha256 match meta.json), reports/p7/snap/FailureGlitch.jpg strip, FailureGlitch.tsx source. Snap: determinism 0 px, 0 QA findings.

Verdict: APPROVED, 7/10, no blocking issue. meta.json set to approved-critic.

### Good
- p50: the visual verb reads without narration. The table jolts, red/cyan scan slices cut across rows, and a red ring marks the box. p100 holds the failed state: crit corner brackets and the chip.
- Arabic: chip "العملية فشلت" shaped correctly with the cross on the left and the crit edge on the right. Title "إيصالات NilePay" is BiDi-correct. Columns are RTL (الإيصال rightmost, الحالة leftmost). No effect touches copy (slices and ring sit outside the glyphs; no chromatic split on text).
- Token discipline: C.crit / C.signal / C.ink3 only, seeded rnd (no Math.random). One 2-frame onset flash, so at most 2 flashes/s (WCAG 2.3.1). Label at about 26 px at 1080p is legible.
- No legacy frames, no bullet list, and no numbers in the component (demo data comes via props).

### Non-blocking issues (fix at the next re-baseline, with a new critic pass)
1. p50, ring region (x 282-676, y 78-468): the shockwave is a 2 px rounded rectangle at about 25-30 % alpha. It reads as a faint frame, not an expanding blast, and is not circular as 04 section 6 implies. Fix: render a true radial ring from the tar origin with a thicker, brighter leading edge, and add bloom at the onset.
2. Baselines are lite only. Sparks (6-14 rects), glow and screen blend are standard/hero features and none of them appears in any still. This repeats fx-b B2. Fix: add a standard (and a hero) baseline or strip, plus an onion-skin or 3-frame strip across the beat. The a1 still is pre-onset (4 rows, no failure), so no baseline shows the onset frame itself; consider moving a1 or p50 to anchor+1.
3. p50, noise blocks (e.g. x 400-430, y 275-285; x 427-440, y 160-163): ink3 blocks at 0.35 alpha read as grey dead pixels, not sparks or glitch. Fix: tint them crit/signal or drop the ink3 ones.
4. p100 (rows T3 and T6, region x 350-610, y 280-390): FAILED rows carry no red mark, so the held failure state is attached only to the chip and brackets. TableGrid already gives failed rows a red edge bar. Fix: at least offer an optional red row mark or tie the chip to the failed row.
5. p0 is the same empty gradient (sha 84797c...) as in other components and carries no signal. The card is about 31 % of the frame width, with body text about 14 px at 960. The inner bracket frame clips the first letter of the title's "إ" (region x 604-612, y 155-165).
