
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

## LayerStack — round 1 (polish re-read of cc6b018) (2026-10-16, critic, fresh read of baselines p0/a1/p50/p100 at 960x540 lite scale 0.5, p100 ADS crop zoomed x4; no strip supplied, no new renders)

Verdict: NOT APPROVED (score 6.8, one blocking issue). meta.json left at pending-critic; the earlier 7.0 approval was for the pre-polish baselines.

Polish check: lift gap fixed (p50 gaps about 12 px, no overlap), dimmed ink brighter and legible (p0, a1, p100), "5 s" now full ink (a1 x 650-695 / y 185-205), p0 now carries two slabs (not empty), floor shadow and n<=4 scale-up applied (p100 stack about 48 % of width, was 38 %), five-slab p50 fills the frame. Look parity 7, typography 7 (see blocking), mechanism 7, depth 6.5 (3D slab faces, no parallax), tokens 9 (ok/signal/crit/warn/ink), legibility 8, accuracy 9, no bullet look 7, no legacy frames 10.

Blocking:
1. p100 (x 250-460 / y 335-365): the ADS slab label "ADS - جاهز للتقارير" overflows the left padding. The final ر of "للتقارير" touches or crosses the slab's left border (x 250), while DW starts at x 266 and Marts at x 272. Arabic text must never reach the slab edge; this will recur with any real label longer than the demo. Fix: measure label width in the slab and shrink-to-fit (or widen the slab / reduce font) with a minimum left padding of about 24 px at 1080; add a lint/spec metric for label overflow.

Non-blocking (fix before pilot use):
1. p50 (x 198-725 / y 165-220): the active COPY src slab fill is a muddy olive-brown (warn progress blended over cyan); the cyan edge and warn progress fight. Use a clean warn bar on a cool base, or a narrower progress strip.
2. Motion still unjudged: rebuildFrom cascade (crit wave, warn bar, signal edge, ok pulse, and the new highlight fade) is not in any baseline. Supply a 12 fps strip and add two snap frames (mid-cascade, mid-rebuild).
3. p50 CMD app slab (x 198-760 / y 52-130): crit slab has no label beyond "CMD app" and no stage cue showing that it is invalidated; consider a faint "x" chip or crack on the edge for reading without narration.
4. All frames: flat dark ground, no camera drift or parallax between slabs; add slight camera orbit for pilot use.

## LayerStack — round 2 (2026-10-16, critic, fresh read of baselines p0/a1/p50/p100 at 960x540 lite scale 0.5; no strip supplied, no new renders)

Verdict: APPROVED (score 7.3, no blocking issue). meta.json set to approved-critic (status and approval).

Fix check: p100 ADS slab (x 230-683 / y 310-380): the label "ADS - جاهز للتقارير" now starts at x ~270, about 40 px inside the slab edge (80 px at 1920), consistent with DW (x ~285) and Marts (x ~290); no touching, border clear. Overflow lint on slab padding (24 px min) is present in LayerStack.tsx and the snapshot reported qa 0.

Scores: subject clarity 8, mechanism visible 7, look parity 7, typography 8 (Arabic shaped, RTL, Latin terms keep order, ODS/DW/ADS/Marts order correct), camera and depth 6.5 (3D slab faces and floor shadow, no parallax), legibility 8, accuracy 9 ("5 s" from the data contract), tokens 9, polish 7.5, no bullet-list look 7.5, no legacy frames 10.

Blocking: none.

Non-blocking (fix before pilot use):
1. p50 (x 195-728 / y 165-220): active COPY src slab fill is still muddy olive (warn progress over cyan base); use a clean warn bar on a cool base or a narrower progress strip.
2. p50 CMD app (x 195-728 / y 75-128): the crit slab carries an X icon but no break cue on the edge; a crack or fault chip would read without narration.
3. Motion unjudged: rebuildFrom cascade (crit wave, warn bar, signal edge, ok pulse, highlight fade) is not in any baseline; supply a 12 fps strip and two snaps (mid-cascade, mid-rebuild).
4. All frames: no camera drift or parallax between slabs; add slight orbit for pilot use.
5. p0 (x 202-756 / y 320-490): the first snap frame holds only two slabs, which is acceptable but guards little of the build-up.

## TreeView — round 1 (independent re-read of 7c316a5/fca15ae) (2026-10-16, critic, fresh full-size read of baselines p0/a1/p50/p100 at 960x540 lite scale 0.5; snap det 0 and perf taken from author note, not re-run; no strip exists)

Verdict: APPROVED (score 7.0, no blocking issue). meta.json set to approved-critic (status, approval, score, date, notes).

Scores: subject clarity 8, mechanism visible 7.5 (p50 decision route with beads and crit X / ok check chips; p100 three-hop descent to a green hit and dashed sibling chain), look parity 6.5, typography 8 (Arabic shaped and RTL, "فيه Deny صريح؟" order correct, mono leaf ranges clear), camera and depth 6 (glow only, no parallax), legibility 7.5 (chips about 26 px at 960 = 52 px at 1080), accuracy 9 (leaf ranges are demo data, no claimed figures), tokens 9, polish 7, no bullet-list look 7.5 (a1 is the weakest frame), no legacy frames 10.

Blocking: none.

Non-blocking (fix before pilot use):
1. a1 (x 398-526 / y 45-340): the plan funnel is a narrow column; stubs at x 461 / y 100-120 and y 198 are 1-2 px, and the JOIN chip has no wire. It reads as stacked labels; scale up for n <= 4 and birth each wire with its second endpoint.
2. p0 (whole frame): empty backdrop with no motes; move the first snap to about f6.
3. p100 (x 120-840 / y 448-456): the dashed leaf chain is faint violet, arrowheads sit under the leaf gaps; raise opacity one step.
4. Motion unjudged: supply 12 fps strips for fs expand (f300-345) and btree search descent (f440-470).
5. All frames: no camera drift or parallax between levels; add a slight drift for pilot use.

## PipelineStations — round 1 (2026-10-16, critic, independent full-size read of baselines p0/a1/p50/p100 at 960x540 lite scale 0.5; no strip supplied, no new renders)

Verdict: APPROVED (score 7.4, no blocking issue). meta.json already carries approved-critic (7.5, round 2); the independent read confirms it, so it was left unchanged.

Scores: subject clarity 8, mechanism visible 7.5 (p50: two green gates, crit X gate, 7 px crit dashes ahead, payload chip over the failed gate, reason chip below; p100: all-green five-gate run with release chip over the last gate), look parity 6.5, typography 8 (Arabic shaped and RTL, first station on the right, "نشر Production" and "بناء الـ Image" keep Latin order, labels about 40-48 px at 1080), camera and depth 6.5 (light shafts, floor shadows, back-plane grid, motes; no parallax), legibility 8, accuracy 9 (no numerals), tokens 9 (crit/ok/cyan only), polish 7.5, no bullet-list look 7.5, no legacy frames 10. Arabic QA: 13/13 strings pass, OCR min 0.933, tofu 0.

Blocking: none.

Non-blocking (fix before pilot use):
1. a1 (x 160-800 / y 120-300): three idle grey gates on a faint track; reads as a CI stepper with empty bands above and below (y 0-110, y 350-540). No capsule is visible, so the hop verb is not shown in any still.
2. p0 (whole frame): near-empty backdrop (two motes); move the first snap to about f6 so it guards the track build-in.
3. p100 (x 48-235 / y 146-198): release chip sits about 48 px from the left edge at 960 (96 px at 1920), close to the 68 px safe margin of the 1080 spec; keep it clear when the last gate is leftmost with longer chips.
4. Motion unjudged: fix ring and green gate flash, capsule hop and gate shake appear in no baseline; supply a 12 fps strip (fail and fix) and add a fix snap.
5. All frames: no camera drift or parallax between gate planes; add a slight drift for pilot use.

## LayerStack — round 1 (independent re-read, post-fix) (2026-10-16, critic, fresh full-size read of baselines p0/a1/p50/p100 at 960x540 lite scale 0.5; no strip supplied, no new renders, snap re-run taken from author note)

Verdict: APPROVED (score 7.2, no blocking issue). meta.json status approved-critic kept; critic block refreshed with this read.

Scores: subject clarity 8 (build-up of Docker layers with a state per slab; Arabic data-tier stack reads as tiers), mechanism visible 7 (p50: ok / active / crit slabs with icon, edge and face tint; p100: one tier lit cyan over three dim ones), look parity 6.5, typography 8 (Arabic shaped and RTL, Latin term first on the right, "ADS - جاهز للتقارير" starts about 40 px inside the slab edge at 960 = 80 px at 1920, no touching), camera and depth 6.5 (3D top and side faces, no parallax or drift), legibility 8 (slab labels about 30 px at 960 = 60 px at 1080), accuracy 9 ("5 s" is demo data from the data contract, no claimed figures), tokens 9 (ok / crit / cyan / neutral only, active warn bar is the only off-key tone), polish 7.5, no bullet-list look 7 (a four-to-five slab column of equal-width bars is the closest this family gets to a list; the 3D faces and state glow save it), no legacy frames 10.

Blocking: none.

Non-blocking (fix before pilot use):
1. p50 (x 195-728 / y 165-220): active COPY src slab fill is muddy olive (warn bar over cyan base); use a clean warn strip on a cool base.
2. p50 (x 195-728 / y 75-128): crit CMD app slab has an X icon but no break cue on the slab edge; add a fault chip or crack.
3. a1 and p0 (whole frame): upper 40 percent of the frame is empty and the stack sits low and left of centre (p0 x 202-756 / y 320-490); centre the stack vertically and add motes or a back plane so the first snaps guard more.
4. Stack direction differs between demos (FROM at the bottom in p50, ODS at the top in p100); fine if spec-driven, but name the direction in the guide so storyboards do not mix them.
5. Motion unjudged: rebuildFrom cascade (crit wave, warn bar, ok pulse) is in no baseline; supply a 12 fps strip and two snaps (mid-cascade, mid-rebuild).
6. All frames: no camera drift or parallax between slabs; add a slight orbit for pilot use.

## StarSchema3D — round 1 (2026-10-16, critic, independent full-size read of baselines p0/a1/p50/p100 at 960x540 lite scale 0.5; no strip supplied, no new renders)

Verdict: APPROVED (score 7.2, no blocking issue). meta.json set to approved-critic.

Scores: subject clarity 8 (one fact plate, dimension plates around it: a star schema reads without narration), mechanism visible 7 (p50/p100: focused dimension drops to the front, larger and cyan-edged, others dim; FK wire fact-to-dimension), look parity 6.5, typography 8 (Arabic titles shaped and RTL, Latin columns in mono, titles about 40 px at 1080), camera and depth 7 (perspective ring, back plates smaller and higher, lit top and shaded side faces; no parallax), legibility 7.5 (dimmed back plates about 4:1, still readable), accuracy 9 (no numerals, demo names only), tokens 9 (cyan fact/focus, violet dimensions), polish 7, no bullet-list look 8, no legacy frames 10. Arabic QA: 7/7 pass, OCR min 1.0, tofu 0, overflow 0.

Blocking: none.

Non-blocking (fix before pilot use):
1. p50 / p100 (x 395-585 / y 312-345): focused front plate sits about 35 px under the fact plate; the FK wire is a stub only, so the relationship verb is weak. Push the focus slot lower or shrink the front plate about 10 percent.
2. a1 (x 548-640 / y 180-315): the travelling pulse is a single 2 px dot; make pulses about 2x larger with a short comet trail so the FK flow reads at 960 px.
3. All wires: no key label (for example an id chip at the wire midpoint), so "foreign key" is implied, not shown.
4. p0 (whole frame): empty backdrop, guards nothing; move the first snap to about f6 to catch the build-in.
5. a1 vs p50 (ring x 140-810 / y 95-415): floor ring and rings are very faint; raise ring stroke or add floor sheen under the plates for more depth.
6. Motion unjudged: the focusDim orbit turn and plate size/dim transition appear in no baseline; supply a 12 fps strip over the turn. No camera drift or parallax.

## OlapCube — round 1 (2026-10-16, critic, independent full-size read of baselines p0/a1/p50/p100 at 960x540 lite scale 0.5 and reports/p7/snap/OlapCube.jpg; no strip supplied, no new renders)

Verdict: APPROVED (score 7.0, no blocking issue). meta.json set to approved-critic.

Scores: subject clarity 7.5 (a 3-axis cube with a lit slab reads as OLAP without narration; the a1 build-in is an unlabelled lilac staircase and is only decoded by p50), mechanism visible 7 (p50: one cyan delivered slice across four customers, Sigma on the collapsed axis; p100: two cyan columns picked out by Lena/Amara/gold ticks), look parity 6.5, typography 7.5 (Arabic titles shaped and upright, Latin members mono, about 32 px at 1080), camera and depth 6.5 (perspective faces, lit tops; no parallax or drift), legibility 7.5 (dim cells about 3:1, still visible), accuracy 9 (no numerals, demo names only), tokens 8.5 (cyan focus plus lilac build; lilac is the only off-key tone), polish 7, no bullet-list look 9, no legacy frames 10.

Blocking: none.

Non-blocking (fix before pilot use):
1. p50 (x 315-580 / y 360-465): axis-0 member ticks (Yuki, Lena, Ravi, Amara) drift in a diagonal about 60 px below the cube floor edge and are not tied to a column; pull them to 12 px under the front-bottom edge, or add a hairline tick to each column.
2. p50 and p100 (whole cube): non-focused cells are near-invisible (about 3:1 to the backdrop), so the seeded heat never reads; raise the dim fill and edge alpha about 1.5x so the cube survives under the slice.
3. a1 (x 285-655 / y 82-445): staircase of lilac cells with no axis titles; start titles at the first anchor, otherwise the first settled frame carries no meaning. p0 is an empty backdrop; move the first snap to about f6.
4. p100 (x 650-700 / y 405-420): "gold" tick sits on the front-right edge and touches the Amara slab corner; add a 10 px gap or a leader.
5. All frames: no camera drift or parallax, no glow or bloom on the lit slab; add a slight orbit and a soft cyan floor spill for pilot use.
6. Motion unjudged: slice, dice, rollup and drill transitions are in no baseline; supply a 12 fps strip over one slice and one drill (two snaps each: mid-move and settled).
