# P7 code-media review (critic)

## Terminal — round 1

Reviewed: studio/test/baselines/Terminal/{p0,a1,p50,p100}.png (960x540 lite baselines, read at full size; p100 also zoomed 3x), Terminal.tsx, reports/p7/snap/Terminal.json. Author: motion-engineer (not the critic).

Score: 7.5 / 10. Verdict: approved-critic. Blocking issues: none.

| Criterion | Score | Note |
|---|---|---|
| Legibility at 1080p | 8 | About 30 px mono at 1080p, ink2 on near-black glass; prompt and flags in ink3 stay readable. |
| Token / palette discipline | 8.5 | Only ink, ink2, ink3, signal and crit; no stray hues. |
| Depth and light | 6.5 | Glass plate with a faint signal rim glow and the Atmos haze behind it. Quiet; no light on the active line beyond the 7 % band. |
| Visual verb without narration | 7 | A command typing, then rows cascading, then a red failure row reads as "build ran; the second one was slow". The cache hit vs miss contrast depends on reading words. |
| Arabic | 8.5 | "# الطبقة الوحيدة اللي اتغيرت" appears whole, RTL run shaped and joined, "#" correctly on the left in the LTR block. No per-letter animation. |
| No bullet-list look | 8 | Reads as a terminal, not a list. |
| No legacy frames / no unsourced numbers | 9 | 5 s and 57 s map to d:6.7:1 and d:6.7:2 in corpus/graph/nodes.jsonl (CH-34). |
| Motion intent | 7 | The a1 caret (typed "nilepay-" with a signal block on the baseline) shows per-char typing; the p50 rim shows the active row. No strip was supplied, so row cascade and scroll are inferred from code. |

Non-blocking issues, ordered by impact (for the CH-34 spec and a later polish pass):
1. p50, rows 2 and 3 ("=> CACHED [2/4] ...", "=> CACHED [3/4] ..."): the cache-hit keyword has the same tint as the rest of the row. The mechanism (reused layers vs a rebuilt layer) is the story, so tint CACHED with signal or ok in the tokenizer, and let the miss row carry the contrast. Suggested: a `hl` token class for CACHED / miss.
2. p50 and p100, rows "build finished in 5 s" and "... in 57 s": the two headline figures are the same size and weight as the log text. Bold them, or let the NumberCounter reference component pair-up the 5 s / 57 s beside the plate. Without that the lesson depends on the narration.
3. a1 (frame 13), plate region 200-757 x 143-397: one typed row in a twelve-row plate, so over two thirds of the plate is empty glass early in the shot. Acceptable for a typing beat, but consider sizing the plate to the rows born so far, or a gentle fill-in, to avoid an "empty panel" read on short holds.
4. p100, error row 8: "cache miss at pip install: build finished in 57 s" is a synthetic message (a real docker build does not print this), and "order-wrong" is a contrived branch name. Fine for a metaphor, but the spec should mark the row as an illustration, and keep the figure tied to d:6.7:2 only.
5. Request: a motion strip (frames 0-149 every 6 f) under reports/p7/ so scroll and cascade can be judged by eye rather than from code.

What worked: the caret fix is verified (a1: caret sits on the text baseline, height matches the glyphs); the error band is distinct without a new colour; frame 0 is correctly empty until the first anchor.

## Terminal — round 1 (re-review of polish r2)

Reviewed: studio/test/baselines/Terminal/{p0,a1,p50,p100}.png at full size (960x540 lite), after the author applied r1 #1 and #2 (CACHED in signal; spoken figures one ink step brighter via the additive `Tok.c` field in _code-media/kit.tsx). Author: motion-engineer (not the critic).

Score: 7.8 / 10. Verdict: approved-critic. Blocking issues: none.

| Criterion | Score | Note |
|---|---|---|
| Legibility at 1080p | 8 | Mono about 30 px at 1080p, ink2 on dark glass; "5 s" and "57 s" now read as the brightest tokens on their rows. |
| Token / palette discipline | 8.5 | ink / ink2 / ink3 / signal / crit only. The new `c` field is additive and uses palette tokens. |
| Depth and light | 6.5 | Glass plate, faint rim glow, haze behind, 7 % active-row band. Still quiet; nothing is lit by the action. |
| Visual verb without narration | 8 | p50: two cyan CACHED rows then an uncoloured rebuilt row reads as "reused layers vs rebuilt". p100: red miss row closes the contrast. Improved from 7. |
| Arabic | 8.5 | p50/p100 comment is whole, joined, "#" on the left in the LTR run; no per-letter animation. |
| No bullet-list look | 8 | Reads as a terminal. |
| No legacy frames / unsourced numbers | 9 | 5 s -> d:6.7:1, 57 s -> d:6.7:2 (CH-34). |
| Motion intent | 7 | a1 shows per-char typing with a baseline-aligned caret; cascade and scroll still inferred from code (no strip). |

Blocking: none.

Non-blocking, by impact:
1. p100, row 8 ("cache miss at pip install: build finished in 57 s", region x 205-660, y 340-362): "57 s" is only one step brighter inside a red row, so the headline figure gains little emphasis. Pair it with NumberCounter beside the plate, or make it ink-bright and bold on the crit band.
2. p50, plate bottom (y 320-395): about 20 % empty glass; p100 fills it. Acceptable for a short hold; in the CH-34 spec keep the cut to p50 under about 1.5 s or size the plate to the rows born.
3. Depth and light: add a soft signal glow that follows the active row, or a camera drift (spec-level `camera` push of 2-3 %), so the shot is not static glass.
4. The miss message is synthetic (real docker build does not print it). Mark the row as an illustration in the spec and tie the figure to d:6.7:2 only.
5. Still wanted: a motion strip (frames 0-149 every 6 f) under reports/p7/ for the row cascade and scroll.
