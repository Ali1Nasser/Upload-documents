
## GraphNetwork — round 1 (2026-10-15, critic, fresh read; baselines p0/a1/p50/p100 at 960x540 lite scale 0.5, plus reports/p7/snap/GraphNetwork.jpg)

Verdict: APPROVED (score 7.4, no blocking issue). meta.json set to approved-critic.

Scores (06 section 3.3 + component acceptance): subject clarity 8, mechanism visible 7 (NameNode/DataNode metadata + block fetch reads; p100 payment chain reads), look parity 6.5, typography 8 (Arabic shaping and "ال NameNode" mixed-script order correct), camera and depth 6 (component only, no parallax/particles; camera comes from the rig), legibility 7, accuracy/no invented numbers 9 (no numerals on screen), continuity/tokens 9 (palette only via C.*), polish 7.5, no bullet-slide look 8, no legacy frames 10.

Verified: wedge layout puts children in the parent's direction; no wire crosses the centre; router keeps wires off foreign chips, hull label chips and the "metadata" edge-label chip in p50 and p100.

Non-blocking issues (fix before pilot use, in priority order):
1. p50, region x 380-520 / y 215-370 (NameNode to DataNode C/D wires) and p100, region x 400-560 / y 290-320 (gateway to wallet/notifications): inactive wires are 1 px hairlines at low contrast with arrowheads about 6 px at 960 width; raise inactive stroke to about 1.5 px and arrowhead x1.4 so they survive 1080p H.264.
2. p50, region x 275-370 / y 105-135 and x 365-455 / y 315-340: hull label chips show a visible darker rectangle over the hull border; use a gradient mask or match the hull fill.
3. p100: whole frame; flat against the 04 section 5 standard (no particle motes, no depth falloff between active and idle nodes beyond glow). Add a faint idle-node depth scale or soft shadow; parallax is expected from DepthLayers at scene level.
4. a1, region x 675-700 / y 100-115: a detached wire stub floats near the client chip during entrance; start wire draw after both endpoints have settled.
5. Motion intent (pulse travel, addEdge draw, highlightPath dimming) cannot be judged from stills; supply a 12 fps strip of frames 145-200 at round 2.

## DagRun — round 1 (2026-10-15, critic, fresh read; baselines p0/a1/p50/p100 at 960x540 lite scale 0.5, plus critic-rendered frames 70, 88, 96 of Demo-DagRun, deleted after review)

Verdict: APPROVED (score 7.3, no blocking issue). meta.json set to approved-critic.

Scores (06 section 3.3 + component acceptance): subject clarity 8.5, mechanism visible 8 (every state is distinct by glyph as well as colour: ring, spinner f70, check, cross f88/f96, retry arrow p50, dash p100; wires go ok-green after success, dashed crit after failure, pulses on the live wire in a1/f70), look parity 6.5, typography 8.5 (Arabic shaped; "تجهيز الـ Warehouse" mixed-script order correct; RTL flow, first task on the right), camera and depth 6 (component only, no particles or parallax), legibility 7, accuracy 9 ("@daily" has no numeral; no invented numbers), tokens 9, polish 7.5, no bullet-slide look 8, no legacy frames 10.

Verified: failed card f88/f96 turns crit with cross and red dashed outgoing wires, running card f70 shows the cyan spinner and green pulse dots on the wire from the finished task, p100 skipped card is dimmed with a dashed wire into the report.

Non-blocking issues (fix before pilot use, in priority order):
1. All stills, whole frame: the DAG occupies only the middle ~45 % of frame height and ~85 % of width (cards about 38 px tall at 960 wide). It reads as a small flowchart on a void, close to the dashboard look. Let ctx.box fit scale up to a larger card height or add a vertical spread for 5 tasks; add idle-card depth (soft shadow, faint back-plane grid) and a few drifting motes.
2. f88/f96, clean card (x 508-663 / y 280-320): the failure flash is faint at 960 width (soft red glow only), so the "hard" moment does not land. Raise the crit glow and add a 2-frame whole-card brightness flash plus a visible red wash on the outgoing wires. The shake is not visible in a still; supply a 12 fps strip of frames 84-96 at round 2.
3. Baselines: frames 0/11/107/215 never capture running or failed (p50 already shows retry). Add frames at about 70 and 88 to the snap list so regressions on the spinner and crit flash are caught.
4. All frames, wires (x 440-510 / y 255-345): 1 px hairlines for queued wires and 6 px arrowheads; raise inactive stroke to about 1.5 px and arrowhead x1.4 so they survive 1080p H.264 (same as GraphNetwork item 1).
5. p0 is a pure empty backdrop (nothing for the first 6 frames), and a1 (x 695-705 / y 295-303) shows a tiny wire stub before the cards settle; start the wire after both endpoints are born.
6. @daily chip (x 795-900 / y 180-215): floats unattached above the first task with no wire or alignment line; connect it with a short drop line to the first task so it reads as the trigger.

## TreeView — round 1 (2026-10-15, critic, fresh read; baselines p0/a1/p50/p100 at 960x540 lite scale 0.5, snap/TreeView.jpg, plus critic-rendered lite frames 90 (plan after highlightPath), 330 (fs), 385 (fs exit), 460 (btree search), deleted after review)

Verdict: APPROVED (score 7.2, no blocking issue). meta.json set to approved-critic.

Scores (06 section 3.2/3.3 + component acceptance): subject clarity 8, mechanism visible 8 (plan: cyan beads flow up LIMIT<-SORT<-GROUP BY<-JOIN, f90; decision: lit route plus allow/deny glyph chips, p50; btree: 3-hop descent ending in a green hit, sibling chain dashed, p100/f460; fs: folder/file glyphs and nested elbows, f330), look parity 6.5, typography 8 (Arabic shaped, "فيه Deny صريح؟" and "تصفية delivered" mixed-script order correct; whole-word only), camera and depth 6 (SVG only, no motes or parallax; gloss comes from the rig), legibility 7.5 (labels >= 28 px at 1080), accuracy 9 (leaf ranges 1001-1014 are demo data, no claimed figures), tokens 9 (cyan/violet/ok/crit/warn only via C.*), polish 7, no bullet-list look 8 (it is a graph, not a list; fs outline is the closest, but glyph chips and glowing elbows keep it diagrammatic), no legacy frames 10.

Non-blocking (priority order, fix before pilot use):
1. a1 (x 455-470 / y 95-120 and 195-205): plan wires are 1 px stubs between chips, and the SORT-GROUP BY wire is a 4 px dash that is nearly invisible during entrance; f90 (x 400-460 / y 345-360): the SCAN(customers) wire is a thin detached hairline that stops short of the chip. Start wires after both endpoints are born and raise inactive stroke to about 1.5 px with arrowheads x1.4 (same as GraphNetwork item 1).
2. All stills: plan funnel (a1/f90) and the fs outline (f330) are ~380-450 px wide in a 960 frame (about 45 % of width) with large empty margins; with only 4 to 7 nodes this is a small diagram on a void. Allow ctx.box fit to scale up when node count is low, or add idle-node soft shadow and a faint back-plane grid.
3. p50 (x 360-370 / y 215-230) and f460 (x 435-445 / y 148-158): pulse beads sit on the node corner rather than the wire; verify pulse positions are sampled on the same cubic as the drawn wire.
4. f330 vs expand: the fs frame already shows tests/test_clean.py before the expand action is visible; supply a 12 fps strip for frames 300-345 (expand grow-out and re-flow) and 440-470 (search probe descent) at round 2, since stills cannot show motion intent. f385 exit blur is heavy (whole tree below ~25 % brightness); confirm it is one beat only.
5. No particles/parallax/depth falloff on idle nodes (04 section 5 standard); rely on DepthLayers at scene level but add a light idle-node depth scale.

## TreeView - round 1 (re-read) (2026-10-16, critic, independent fresh read of baselines p0/a1/p50/p100 at 960x540 lite scale 0.5; confirms the 2026-10-15 round 1)

Verdict: APPROVED (score 7.1, no blocking issue). meta.json stays approved-critic (critic block refreshed).

Scores (06 section 3.2/3.3 + component acceptance): subject clarity 8, mechanism visible 8 (p50: lit cyan route, pulse beads, red X / green check chips; p100: 3-hop descent to a green hit, dashed leaf sibling chain), look parity 6.5, typography 8 (Arabic shaped; "فيه Deny صريح؟" and "لأ: فيه Allow؟" order correct; yes branch sits on the right in RTL), camera and depth 6 (no motes or parallax in the component), legibility 7.5 (labels about 26 px at 960 = 52 px at 1080; mono leaf ranges clear), accuracy 9 (1001-1014 are demo leaf ranges, no claimed figures), tokens 9 (no raw hex/rgba in TreeView.tsx; cyan/violet/ok/crit via C.*), polish 7, no bullet-list look 8, no legacy frames 10.

Blocking: none.

Non-blocking (priority order):
1. a1 (x 455-470 / y 98-120 and 195-203): plan wires are 1 px stubs and the SORT-GROUP BY wire is a 2 px dash; start wires after both endpoints exist and raise inactive stroke to about 1.5 px.
2. a1, whole frame: the plan funnel occupies about x 398-526 / y 45-340, i.e. 13 % of width and 55 % of height, a narrow column on a void; p100 and p50 fill the frame well. Let ctx.box fit scale the plan variant up or lay it out wider.
3. p100 (x 120-840 / y 448-456): the dashed leaf chain is a 1 px violet dash with arrowheads partly hidden under the leaf gaps; raise to 1.5 px so it survives 1080p H.264.
4. p50 (x 360-372 / y 215-232) and p100 (x 480-490 / y 365-378): pulse beads sit at the node corner, not centred on the wire tip; sample on the same cubic as the wire.
5. p0 is a pure empty backdrop; no idle-node depth (soft shadow, back-plane grid, motes). Standard of 04 section 5 is not met by the component alone; rely on DepthLayers or add light motes.
6. No motion strip exists for TreeView: supply 12 fps strips for frames 300-345 (fs expand) and 440-470 (search descent) at round 2.

## PipelineStations — round 1 (2026-10-15, critic, fresh read; baselines p0/a1/p50/p100 at 960x540 lite scale 0.5, snap/PipelineStations.jpg, plus critic-rendered lite frames 108, 112, 118, 128, 140, 146 (ETL fail at transform, fix) and 314, 322, 330, 336, 342 (CI/CD fail at prod, fix), deleted after review)

Verdict: APPROVED (score 7.2, no blocking issue). meta.json set to approved-critic.

Scores (06 section 3.2/3.3 + component acceptance): subject clarity 8, mechanism visible 7.5 (gate ring -> spinner -> check; capsule hops gate to gate with a cyan pool on the track, f166; fail turns gate X, capsule and reason chip crit, f108-128, f314-330; fix returns gate and capsule to ok, f140/f336), look parity 6.5, typography 8 (Arabic shaped; "نشر Production", "نشر Staging", "بناء الـ Image" mixed-script order correct in RTL; flow starts on the right), camera and depth 6.5 (light shafts and a few motes are real depth cues, but faint; no parallax in the component), legibility 7.5 (labels about 24 px at 960 = 48 px at 1080; reason chip legible), accuracy 9 (no numerals; demo payloads are illustrative), tokens 9 (cyan, ok, crit, ink only via C.*), polish 7, no bullet-list look 7.5 (it reads close to a CI stepper widget because the band is small and flat), no legacy frames 10.

Verified: RTL order, capsule colour follows state, reason chip sits clear of the label and the gate, fail on the last gate (CI/CD) has no track ahead and still reads via X, crit capsule and chip.

Non-blocking issues (fix before pilot use, in priority order):
1. f108-f128 (ETL), region x 235-335 / y 240-250: the "track ahead turns dashed crit" cue, the headline fail effect, is a 1-2 px pale-red dash on a near-black track and almost invisible at 960. Raise to about 3 px, add a crit glow under the dashes and let the dash march away from the failed gate.
2. f140 (ETL fix), region x 300-465 / y 165-330 and f336 (CI/CD fix), region x 75-210 / y 195-290: the expanding ring is a 1 px ghost at about 8 % opacity, so the settle does not land. Make it 2 px at 35-40 % opacity at birth, plus a brief ok-green gate brightness pulse.
3. All stills, whole frame: the gates and track fill about 45 % of frame height (gate diameter about 90 px at 960, rows y 120-400) with an empty lower band; with 4 to 5 stations it reads as a progress stepper. Let ctx.box fit scale gate and label up when n <= 5 (about x1.25) and add a soft idle-gate floor shadow or faint back-plane grid.
4. f166, region x 280-335 / y 235-255: the capsule light pool is a small cyan smear on the track, about 70 px away from and below the capsule at y 160, so it reads as a detached blob. Anchor the pool under the capsule x and widen it to include the tether, or drop it to a thin lead glow on the track.
5. Tether (x 380-386 / y 190-205 in f150): a 1 px dotted line from capsule to gate is barely visible; raise to 1.5 px or remove.
6. Baselines p0/a1/p50/p100 never capture fail or fix (p50 = f179 is already past ETL fix, p100 = all ok). Add frames about 112 and 322 to the snap list so regressions on the crit state are caught.
7. White flash and shake are not judgeable from stills; supply a 12 fps strip of frames 104-120 and 308-322 at round 2 to confirm the flash is 2-3 frames and the shake decays within 10 frames.
8. p0 is a pure empty backdrop for the first frames, and the motes at p0 (x 760-800 / y 245-250) pop in ahead of the gates; fade motes in with the first gate.

## DagRun — round 2 (2026-10-16, critic, fresh read; baselines p0/a1/p50/p100 at 960x540 lite scale 0.5, snap/DagRun.jpg, plus critic-rendered lite frames 84-96 and 124, deleted after review)

Verdict: APPROVED (score 7.5, no blocking issue). meta.json set to approved-critic (previously 7.3 in round 1; baselines were re-pending after the round-2 look changes).

Scores (06 section 3.2/3.3 + component acceptance): subject clarity 8.5 (task cards, state glyphs, @daily trigger), mechanism visible 8.5 (green wire from done task, cyan spinner while running f84-96, crit card with X and red dashed outgoing wires p50, dimmed skipped card with dashed wire into the report p100), look parity 7, typography 8.5 (Arabic shaped, "تجهيز الـ Warehouse" mixed-script order correct, labels about 36 px at 1080), camera and depth 6.5 (back-plane grid fading from the centre, glass pool, motes now give depth; still no parallax), legibility 8 (cards about 86 px tall, 3 px wires, larger arrowheads survive 1080p), accuracy 9 (no numerals, schedule chip is a token), tokens 9 (cyan/violet/ok/crit via C.* only), polish 7.5, no bullet-list look 8 (a branching DAG, not a list), no legacy frames 10.

Round-1 items: 1 (scale and depth) fixed in substance; 2 (hard failure) fixed in the settled still, flash itself unverified; 3 (snap frames) NOT done, snap list is still 0/11/124/249 with p50 = the settled failure; 4 (wire weight) fixed; 5 (stub at a1) fixed, no stray stub; 6 (@daily drop line) fixed.

Blocking: none.

Non-blocking (fix before pilot use):
1. Frames 100-124 (flash and shake, x 508-663 / y 280-325 at 960): not judged. Frames 84-96 are still running; the 2-frame white-hot flash and the shake were not captured by the stills, and the RAM guard refused a second render batch. Supply a 12 fps strip of the failed beat (about f104-f124) at the next pass and add one failure-beat frame (about f110) to the snap list so the crit flash is regression-guarded.
2. p50 snap determinism: `dc render snap DagRun` reports determinism 1100 px (threshold 0) at p50 in three runs (committed json and two critic runs) under load 10, although the baseline compare is 0-1 px. The author's "det 0" did not reproduce. 15 other components show the same pattern, so it is a shared toolchain/load issue (blur or glow filter raster), not DagRun-specific; the harness owner must resolve before any --approve rewrite, because --approve refuses non-deterministic runs.
3. p100 (x 248-465 / y 333-378): the skipped card is nearly the same grey as the backdrop and its label is low contrast at 960. Raise label ink one step.
4. All stills: the diagram is about 85 % of width but about 40-45 % of height with empty bands above and below; the grid and motes help but it is still a compact flowchart. Allow fit scale-up when n <= 5.
5. a1 (x 258-440 / y 232-375): three cards are scattered with no wires yet, which reads as unordered boxes for the first beat; stagger so the root and its wire appear together.

## PipelineStations — round 1 (2026-10-16, critic, fresh read of baselines p0/a1/p50/p100 at 960x540 lite scale 0.5 and the author's retimed demo; no new renders, no strip supplied)

Verdict: APPROVED (score 7.5, no blocking issue; previous 7.2). meta.json set to approved-critic (baselines had been re-pending after the fixes).

Scores (06 section 3.2/3.3 + component acceptance): subject clarity 8.5, mechanism visible 8 (gate ring, X on fail, dashed crit track ahead of the failed gate marching away, dashed green track behind, reason chip with tether), look parity 7, typography 8.5 (Arabic shaped; "نشر Production", "نشر Staging", "بناء الـ Image" order correct in RTL; chip text legible), camera and depth 6.5 (shafts, floor shadows, back-plane grid, motes; still no parallax), legibility 8 (gates about 100 px, labels about 40-48 px at 1080, 7 px dashes survive 1080p), accuracy 9 (no numerals), tokens 9 (cyan/ok/crit/ink only), polish 7.5, no bullet-list look 7, no legacy frames 10.

Round-1 items: 1 (barred track) fixed, p50 x 262-340 / y 235-245 is a bold red glowing dash; 2 (fix ring + gate pulse) NOT judgeable, frames 230-236 are not in the baselines or the snap, accepted on author's note only; 3 (scale) fixed in substance, gates and labels larger, grid and floor shadows added; 4 (capsule pool) not visible in any baseline, unverified; 5 (tether) fixed, p50 x 388 / y 172-200 is a visible thin line; 6 fixed by retiming, p50 = the ETL fail; 7 (12 fps flash/shake strip) NOT done; 8 (motes) p0 still shows two motes at x 736 / y 241 and x 795 / y 250 ahead of the gates, minor.

Blocking: none.

Non-blocking (fix before pilot use):
1. Strip needed (item 7 plus fix ring): 12 fps strip of f104-f120 (flash, shake) and f228-f240 (fix ring 2-5 px, green gate flash) at the next pass; I could not confirm the flash lasts 2-3 frames, the shake decays within 10 frames, or that the ring reads at 960.
2. Snap list: add one fix frame (about f232) and one CI/CD fail frame (about f322); at present nothing guards the fix beat or the last-gate fail.
3. All stills, y 0-95 and y 430-540: bands above and below remain empty and the whole reads as a compact stepper; p100 is fully green with nothing but a chip. Allow a further scale-up or a soft hero element (capsule glow trail) when n <= 5.
4. p100 (x 48-235 / y 145-200): the "إصدار جديد" chip sits 48 px (5 %) from the left edge, tight against the title-safe margin, and its tether is about 8 px long. Shift the chip inward or anchor it above the gate.
5. p50 (x 240-540 / y 100-175 and x 270-510 / y 378-430): two chips in the same frame compete with the crit gate; the top chip is larger than the labels. Reduce the top chip about 15 % so the X gate stays the focal point.
6. p0 (x 736 / y 241): two motes appear before any gate; fade them in with the first gate.

## LayerStack — round 1 (2026-10-16, critic, fresh read of baselines p0/a1/p50/p100 at 960x540 lite scale 0.5 and reports/p7/snap/LayerStack.jpg; no new renders, no strip supplied)

Verdict: APPROVED (score 7.0, no blocking issue). meta.json set to approved-critic.

Scores (06 section 3.2/3.3 + component acceptance): subject clarity 8 (a Docker layer stack and a warehouse tier stack both read as stacked slabs), mechanism visible 7 (cached slabs get a green check and edge, the lifted slab glows cyan and the rest dim; the cascade itself is not in any still), look parity 7 (acrylic slabs with lit top and dark side faces, glow edges; flat dark ground), typography 8 (Docker labels in mono LTR, Arabic "ODS - بيانات خام" shaped and RTL, Latin terms keep order), camera and depth 6.5 (3D slab faces give depth, no parallax or camera drift visible), legibility 7.5 (slab labels about 36-40 px at 1080, "5 s" readable), accuracy 9 ("5 s" is d:6.7:1 from the data contract), tokens 9 (ok/signal/crit/warn/ink via C.*), polish 7, no bullet-list look 7.5 (slabs have mass and a lifted state, but a stack of rows is still list-adjacent), no legacy frames 10.

Blocking: none.

Non-blocking (fix before pilot use):
1. The rebuildFrom beat (crit wave upward, then warn progress bar, then fresh signal edge, ok pulse below) is the component's key verb and is absent from all four baselines. p50 shows cyan CMD app and COPY src over three dimmed green slabs, which reads as "highlight", not "rebuild". Supply a 12 fps strip of the cascade and add two snap frames (crit wave about mid-cascade, warn bar mid-rebuild) so it is regression-guarded.
2. p50 (x 198-760 / y 60-220): the lifted COPY src top face overlaps the bottom edge of CMD app (about y 140-145), and the gap to RUN pip install is uneven. Raise inter-slab spacing for the lifted slab or lift less.
3. p50 (x 198-725 / y 250-490): dimmed slab labels (ink on dark green) are low contrast at 960; raise dimmed ink one step. Same for ADS/DW/ODS in p100 (x 296-626 / y 120-340).
4. p0: a fully empty frame, the baseline guards nothing. Move the first snap frame to the first slab entry (about f4-6).
5. p100 (x 296-662 / y 105-435): stack is about 38 % of width; allow scale-up when n <= 4, and add a soft floor reflection or shadow under the bottom slab for grounding.
6. a1 (x 205-750 / y 150-480): the top slab (grey, dot) next to green cached slabs is clear, but its "5 s" sits in the same grey as the dot, so the number does not read as the payoff; give it ink at full strength.

## TreeView — round 1 (3 px wire polish) (2026-10-16, critic, fresh read of baselines p0/a1/p50/p100 at 960x540 lite scale 0.5 after the stroke change; no new renders, no strip supplied)

Verdict: APPROVED (score 7.1, no blocking issue). meta.json set to approved-critic (baselines had been re-pending after the 2.2 -> 3 px stroke change).

Scores (06 section 3.2/3.3 + component acceptance): subject clarity 8, mechanism visible 8 (p50 lit cyan route with beads and crit X / ok check chips; p100 3-hop descent to a green hit, dashed leaf chain), look parity 6.5, typography 8 (Arabic shaped, "فيه Deny صريح؟" and "لأ: فيه Allow؟" order correct, yes branch on the right in RTL, mono leaf ranges clear), camera and depth 6 (no parallax, depth only from glow), legibility 7.5 (inactive wires about 1.5 px at 960 = 3 px at 1080, visible in p50 x 365-440 / y 300-420 and p100 x 215-300 / y 285-390; dashed chain p100 y 448-456 is visible), accuracy 9 (1001-1014 are demo leaf ranges), tokens 9 (cyan/violet/ok/crit only), polish 7, no bullet-list look 8, no legacy frames 10.

Blocking: none.

Non-blocking (fix before pilot use):
1. a1 (x 398-526 / y 45-340): the plan funnel is a narrow column of four chips with a 1-2 px stub at x 461 / y 100-120 and a near-invisible dash at y 198, and the JOIN chip has no wire yet; it reads as stacked labels. Birth the wire with its second endpoint and allow fit scale-up for n <= 4 (carried from the earlier round-1 item 1 and 2, not fixed by the stroke change).
2. p100 (x 120-840 / y 448-456): the dashed leaf chain is still faint violet and its arrowheads sit under the leaf gaps; raise opacity one step.
3. p0: pure empty backdrop; the baseline guards nothing, move the first snap to about f6.
4. Motion: still no 12 fps strip for f300-345 (fs expand) and f440-470 (search descent); needed before pilot use.
5. p50 (x 360-372 / y 215-232) and p100 (x 480-495 / y 365-378): pulse beads sit at wire ends close to node corners; verify they are sampled on the drawn cubic.

## PipelineStations — round 1 (2026-10-16, critic re-read, baselines p0/a1/p50/p100 at 960x540 lite scale 0.5; no strip supplied, no new renders)

Verdict: APPROVED (score 7.4, no blocking issue). Independent read agrees with the 7.5 already recorded; meta.json already carries approved-critic (7.5, round 2) and is unchanged.

Read: RTL order correct (first station rightmost; "استخرج/تنقية/تحويل/تحميل"), mixed-script labels "نشر Production", "بناء الـ Image" order correct, Arabic shaped, no numerals, palette cyan/ok/crit/ink only, no legacy frames, not a bullet slide. p50 carries the verb: green ticks behind the gate, crit X gate, 7 px glowing crit dashes ahead of it (x 262-340 / y 235-245), crit data chip with tether and reason chip; reads without narration. Gates about 100 px and labels about 40-48 px at 1080 survive.

Blocking: none.

Non-blocking (fix before pilot use):
1. Motion not judged: no strip. Need 12 fps strip of the fail flash and shake (about f104-f124) and the fix ring (about f228-f240); neither is in the baselines.
2. p50 (x 240-540 / y 100-175): the capsule chip is the largest text in frame and outweighs the crit gate; reduce about 15 %. Its tether (x 388 / y 175-215) is a hairline.
3. p100 (x 48-235 / y 145-200): chip is 5 % from the left edge, tight to the title-safe margin; shift inward.
4. p0 is an empty backdrop with two motes (x 736 / y 241); move the first snap frame to about f6.
5. p0/a1/p50/p100: still a compact stepper with no parallax; add a depth cue (capsule glow trail, slight camera drift) for pilot use.
