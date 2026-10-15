# P7 critic review: group fx-b

Date: 2026-10-11. Reviewer: critic (not the author). Round 1.
Verdict: FAIL. No component reaches 7 with evidence that shows its own visual verb. No meta.json changed; none set to approved-critic.

Evidence read at full size: studio/test/baselines/{CameraRig,DepthLayers,FXTier,AudioReactive}/{p0,a1,p50,p100}.png (960x540, tier lite, scale 0.5, as recorded in meta.json),
reports/p7/snap/{CameraRig,DepthLayers,FXTier,AudioReactive}.jpg (4-frame strips), studio/src/demos/fx-b.tsx, CR-003..CR-005.
WhipPan, LightStreakTransition and MatchCut have no baselines and no demo, so there is nothing to look at.

## Scores (06 section 3.2 + component acceptance)

| Component | Score | Status |
|---|---|---|
| CameraRig | 6 | not approved |
| DepthLayers | 6 | not approved |
| FXTier | 5 | not approved |
| AudioReactive | 4 | not approved |
| WhipPan | unscored (3 if the current engine behaviour is scored) | not approved |
| LightStreakTransition | unscored | not approved |
| MatchCut | unscored (4 on current behaviour: a dissolve) | not approved |

What is good, and applies to all four: palette and token discipline is clean (cyan, coral crit, grey ink2 only), Arabic is correct and joined
(الإيصالات, الإجمالي الناجح, إيصال T3, with Latin and numerals set correctly beside it), the figures trace to d:5.2:1/3/7/8 (400 EGP, 66.67 %, T3 200), no legacy frames,
no bullets. 0 px snapshot diff and perf in budget are regression and cost evidence only. They say nothing about whether the effect is visible.

## Blocking issues

B1. AudioReactive, all stills (p0, a1, p50, p100): the baselines contain no modulation. demoInput passes features: null (the author's own CR-005), so the stills are a
NilePay word and a NumberCounter with no glow, no scale pulse and no haze. A baseline for this component proves nothing about it. Region: the 400 EGP counter at
(480, 250) has no halo at all, and the backdrop haze is the same as in FXTier. Fix: land CR-005 (synthetic labelled features on the demo), re-baseline, and show
a frame at a loud and a quiet feature value side by side in a strip, so the glow delta is visible.

B2. FXTier, p50 and p100 (and every still): the baselines are lite, but the component's job is to switch glow, grain, vignette, CA, haze and bokeh by tier. At lite none of those exist,
so the still is an unlit counter. The "FAILED" impact word (p100, left, y 270) is flat coral with no bloom and no glow, which is the one place the FX stack should show. Fix: baseline
the demo at standard and hero (3 tiers x 1 still, or one lite|standard|hero triptych), at 960 px minimum, and show the delta.

B3. DepthLayers, a1, p50 and p100: depth does not read. The table card (far, parallax 0.4) and the 400 EGP counter (mid) are the same sharpness, the same brightness and the same haze, and sit side by side
on one plane. The Bible (04 section 1.2) asks for 3-5 planes with bokeh in the foreground, a blurred and dim background, and a sharp midground. Here there are 2 planes, no bokeh, no
atmospheric dimming of the far plane, and blur 0.6 is documented as invisible because both layers carry copy. A depth component whose demo shows no depth cannot be approved. Fix: a demo
with at least 3 planes, including a non-copy far plane (grid or particle haze) that visibly blurs and dims, a bokeh fg plane, and a strip of 3 camera positions that shows differential parallax.
Also, the scrim behind the counter is a hard-edged darker rectangle (x 360-600, y 230-335 in p100 of AudioReactive and FXTier; x 130-370 in DepthLayers p100). This was a non-blocking note
for NumberCounter. Here it is more visible because the layer is the only thing on the frame.

B4. CameraRig, a1 to p100: the move does not read from the stills. The title shifts about 6 px at half scale (y 112 to 105) and the counter grows about 1-2 %, which is below the 1.5-3 % per 5 s
ambient drift in the Bible. The demo claims "push-in = focus" and a 4 px impact nudge on the word, but there is no frame that shows the nudge, and no motion strip that overlays start and end. A critic cannot judge
a camera from 4 stills. Fix: add an onion-skin or difference strip (frame 0 against frame 95 edges), raise the demo intensity until the move is visible at a glance (it is a demo, so
exaggeration is fine), and include the nudge frame. CR-004 (follow is dropped and behaves as truck) must also land, because a schema field that is silently ignored is a scene-director trap.

B5. WhipPan, LightStreakTransition, MatchCut: no baselines, no demo, no stills (catalogue: "mapped, not implemented"). The engine, as it stands (CR-003): a whole-frame CSS blur (24 px whip, 12 px streak) at every
tier, which blurs the Arabic copy and contradicts 04 section 1.3 (motion blur none at lite and standard, CameraMotionBlur on whips at hero only); direction is always RTL; streak colour is fixed;
the streak ends at its peak on the cut; MatchCut is a 1.04 dissolve with no geometric match, so "a dot becomes a node" cannot be done. The frozen props (direction, color, motion_blur, from/to/kind) are
validated and then ignored. These three cannot be approved until CR-003 is ratified and implemented, and a 3-frame strip per transition (out, mid, in) is submitted, with a hero-tier whip.
Do not approve on "mapped".

## Non-blocking
- p0 is the identical empty gradient in CameraRig, FXTier and AudioReactive (same sha256 84797cf4...). It spends a baseline slot with no information. Use the slot for the loudest or hero frame.
- The demo defaults to fx_tier standard, yet the baselines are lite. Record the tier the demo declares, or declare why it is overridden.
- FXTier p100: FAILED (end slot, left) and T3 200 EGP (start slot, right) are 2 unconnected objects. Co-locate them to read as one idea (the amount that failed).

## Order of fixes (by impact)
1. CR-005 features plus re-baseline AudioReactive (B1).
2. Standard and hero baselines for FXTier, plus bloom on impact (B2).
3. Rebuild the DepthLayers demo with 3+ planes, bokeh and a blurred non-copy far plane (B3).
4. CameraRig motion strip, exaggerated demo, CR-004 (B4).
5. Council ADR for CR-003, implement, then strips for the 3 transitions (B5).

Resubmit with 4 stills per component at standard (hero for FXTier and the whip) and a strip. Pass bar: mean >= 8.0 on the rubric, minimum >= 7, no blocking issue.

## CameraRig — round 1 (re-review)

Date: 2026-10-15. Reviewer: critic (not the author). Evidence read at full size: studio/test/baselines/CameraRig/{p0,a1,p50,p100}.png (960x540, lite, scale 0.5) and reports/p7/evidence/fx-b/CameraRig_motion.jpg (standard tier).
Verdict: APPROVED, score 7/10, no blocking issue. meta.json set to approved-critic.

What now works: the demo is an exaggerated dolly_zoom (intensity 1) and the move reads from the stills: the title grows from 132 px wide (a1) to 147 px (p100), about +11 %, and rises from y 120 to y 102. The 66.67 % counter (d:5.2:7, in canon chapters.json) grows from 250 to 265 px across p50 to p100 while it is still rolling. The strip shows the standard-tier backdrop (bokeh) counter-scaling between f8 and f95, and the |f62 - f61| x6 panel has a bright outline on both title and counter against a near-black |f61 - f60| panel, so the 4 px one-frame nudge on the word anchor is visible. Arabic (الإيصالات, نسبة النجاح) is joined and correct, palette is token-only, no bullets, no legacy frames, no unsourced numbers.

Non-blocking, fix before the next re-baseline:
1. Baselines are lite, the demo declares standard. At lite there is no bokeh and no backdrop counter-scale, so p0 to p100 show only the subject scale; the depth half of the dolly_zoom is proven only by the strip. Re-baseline at standard (a1 and p100 at least).
2. p0 shows the title mid-reveal, clipped at the left edge (x 457, y 120: "الإيصا"); the reveal mask cuts a letter. Use a settled frame (f8) instead of f0.
3. Onion legend (strip, top right) says "f8 cyan / f95 coral" but renders yellow and cyan, and the counter does not exist at f8, so the onion shows the title offset only. Fix the legend, or onion f30 against f95 for the counter.
4. Hard-edged dark scrim behind the counter (x 320-640, y 250-335, p50 and p100): carry-over from NumberCounter, feather it.
5. CR-004 is still open: move 'follow' behaves as 'truck'. Condition of approval: scene-directors must not use follow until it lands (add a spec-lint warning), because a schema field that is silently ignored is a trap.
6. Strip frames are dark at 480 px per panel: raise the strip panel size to 960 px for the next evidence.

## CameraRig — round 1 (confirmation after author's non-blocking fixes)

Date: 2026-10-15. Reviewer: critic (not the author). Read at full size: baselines p0, a1, p50, p100 (960x540, lite, unchanged pixels, snap 0 px mismatch on all four) and the re-rendered reports/p7/evidence/fx-b/CameraRig_motion.jpg (960 px panels, two per line).
Verdict: APPROVED stays, score 7/10, no blocking issue.

Closed since the previous pass:
- Strip panel size is now 960 px: bokeh, scrim and Arabic are readable (was 480 px, dark).
- Onion legend now says "f30 cyan / f95 yellow (title + counter)" and matches the render (cyan = f30 at the lower position, yellow = f95 larger and higher). Title and counter both show offset, so the dolly_zoom reads as a push-in without narration.
- |f62-f61| x6 still shows the 4 px nudge as a bright outline against the near-black |f61-f60|.

Still open (non-blocking, carry to the next re-baseline):
1. p0 (x 457-545, y 105-135): the title is still clipped at its left edge ("الإيصا" with a hard cut at x 457). Use a settled frame (f8) instead of f0.
2. Baselines are lite: no bokeh and no backdrop counter-scale in p0/a1/p50/p100 (flat gradient only). The depth half of the move is evidenced only by the strip. Re-baseline a1 and p100 at standard.
3. p50 and p100, hard-edged dark scrim behind the counter (x 320-640, y 250-335 at 960 px): feather it. Visible as a rectangle on the bokeh strip panels too (f30, f95, x 1080-1370, y 650-830 in the strip).
4. Counter label "نسبة النجاح" is small (about 18 px at 960 px wide; about 36 px at 1080p, acceptable) but low contrast: raise to the secondary token.
5. CR-004 (follow behaves as truck) still open. Condition: scene-directors must not use move follow until it lands; add a spec-lint warning.
6. Onion panel colours (pure yellow, cyan) are off-palette; acceptable for evidence only, never for a baseline.

Rubric (1-10): legibility 8, token/palette 8, depth and light 6 at lite (8 at standard strip), visual verb without narration 7, Arabic 9, no bullet look 8, legacy frames 10, sourced numbers 9 (66.67 % in canon), motion intent 8. Mean about 7.9 on the strip, 7 on the stills alone; the stills-only depth score of 6 is the reason for the capped 7.
