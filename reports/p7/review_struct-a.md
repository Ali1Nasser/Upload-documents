
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
