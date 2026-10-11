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
