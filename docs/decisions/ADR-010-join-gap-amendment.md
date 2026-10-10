# ADR-010 — JOIN_GAP amendment (amends ADR-009 B2 only)
Status: decided
Amends: ADR-009 B2 (the `JOIN_GAP` values only). Every other part of ADR-009 stands unchanged: W-009-LOOK, close conditions 2–5, AT-1…AT-10 and RT-1…RT-3.
Date: 2026-10-10 · Chair: council-chair · Ballot: lenses egyptian-arabic, motion-design and technical-accuracy (3 of 3 lenses that own this criterion) · Rule: majority; a tie goes to A3.

## Context
- ADR-009 close condition 1 (B2) set a size-banded `JOIN_GAP` as follows. ≥ 56 px: caps 0.20 em, mixed case 0.14 em. < 56 px: caps 0.25 em, mixed case 0.10 em. Its own acceptance gate is condition 2: an isolated-render OCR ≥ 0.90 on `الترتيب داخل الـpartition`, `قسم الـroadmap`, `قسم الـidempotency` and the F7 chip.
- **Isolated sweep** (`studio/scripts/lookdev_typeprobe.mjs --sweep`, which runs through the queue; the summary lives in the comment above `JOIN_GAP` in `studio/src/type/arabic.ts`):
  - at 0.14 em, `الـpartition` and `الـroadmap` still read `d|` and `.t]`;
  - at 0.10–0.25 em, the 34 px `الـidempotency` label read `J]`;
  - so the B2 values fail ADR-009's own condition-2 gate. The raw sweep PNGs and JSON are no longer on disk.
- **Implemented values** (`studio/src/type/arabic.ts:60`): `JOIN_GAP = {display: {caps: 0.2, latin: 0.25}, text: {caps: 0.25, latin: 0.3}}`. The type suite passes 43/43 and includes the banded-gap tests, among them "display gap ≥ 18 px at 92 px" (`studio/src/type/arabic.check.ts:73-80`).
- **Arabic re-check** (`reports/lookdev/arabic_r3.md`, section "Re-check of the r3 Arabic fixes", **PASS**): the arabic-typographer ran her own OCR on the delivered `*_fix` stills. The author (motion-engineer) did not grade.
  - F3 title: 1.00. It was 0.91, read as `partitiond!`.
  - F4 card: idempotency 1.00, roadmap 1.00.
  - F6 head at 72 px: 1.00.
  - F6 labels at 34 px: roadmap 1.00 (was 0.85, `roadmapJ|`); idempotency 1.00 on psm 13. Only dim-ink noise remains (`a.nd` on psm 7), with no join junk.
  - Her reading: the gap "reads as a word space plus the tatweel foot; no stretched-word look at 34 px or 92 px". She also asked: "Watch the 34 px labels in motion (wipe) for a gap that looks like two words."
- **Freeze:** `studio/scripts/freeze_p6.py` keeps the freeze provisional while `JOIN_GAP` differs from ADR-009 B2 and no decided Council ADR amends B2. That is the item this ADR closes.

## Options
- **A1:** amend B2 to the implemented values (display 0.20/0.25, text 0.25/0.30 em, caps/mixed).
- **A2:** keep B2 as written (0.20/0.14 and 0.25/0.10). Revert the code, or demand fresh evidence before any change.
- **A3:** reopen the token. Sweep or test intermediate values before deciding.

## Scores
No per-criterion scoring was used. This was a narrow ballot among the owning lenses, with choice and confidence per lens. No separate brief or cross-review was run, because the computed task posed the options inline.

| Lens | Choice | Confidence |
|---|---|---|
| egyptian-arabic | A1 | 0.78 |
| motion-design | A1 | 0.72 |
| technical-accuracy | A1 | 0.82 |
| **Vote share** | A1 1.00 · A2 0.00 · A3 0.00 | mean 0.773 |
| **Confidence-weighted** | A1 1.00 · A2 0.00 · A3 0.00 | margin 100 pts |

- Mean confidence is 0.773, which is at least 0.6. The margin is far above 5 %. No experiment is needed.
- The director, educator, audio-sync and producer lenses did not vote, because the criterion is outside their remit.

## Decision
**A1.** ADR-009 B2 now reads as follows. These are the binding frozen values:

| Band | ALL-CAPS / digit Latin after `الـ` | Mixed-case Latin after `الـ` |
|---|---|---|
| display (≥ 56 px, Alexandria) | **0.20 em** | **0.25 em** |
| text (< 56 px, Plex; also used for unknown size) | **0.25 em** | **0.30 em** |

Machine-readable form: `JOIN_GAP = {display: {caps: 0.2, latin: 0.25}, text: {caps: 0.25, latin: 0.3}}`. The gap applies only when the Arabic prefix ends in a tatweel (`ـ`).

No threshold changes. The OCR ≥ 0.90 gate of ADR-009 condition 2 and AT-10 stay exactly as they were.

## Rationale
- **Data carried most of the decision.** B2's numbers were a proposal, and they failed the gate B2 itself set: the sweep read `d|`, `.t]` and `J]`. The implemented values pass that gate at 1.00 on F3, F4 and F6, scored by a separate grader.
- Under A2, the frozen token would contradict both the passing code and the evidence. A3 would spend a round testing values that nobody has measured, with no new question to answer.
- **Taste carried one residual point.** Whether 0.30 em still reads as one `الـ`+Latin unit is a judgement, carried by the egyptian-arabic lens and the arabic-typographer review. The lens's view is that Egyptian typesetting writes `الـ`+Latin as a word space plus the tatweel foot.
- That judgement is backed only by stills. It is therefore made a P7 acceptance test (AT-11), not a precondition of this amendment.

## Dissent (verbatim)
No lens dissented from the choice. The risks each lens recorded, verbatim:
- egyptian-arabic:
  - "The gap may look like two separate words on 34 px labels mid-wipe. This is unverified, and strips MA to MD were not re-rendered."
  - "Wider gaps may shift line widths in P8 captions and chips. They need a length check at the 6-word limit."
  - "OCR is smoke on glow-composited JPGs. The real gate, dc qa arabic with isolated render and I/l normalisation, is not implemented (AT-10)."
  - "Canon drift: 6 الـAI is shown as bare AI. The scene-director must restore the article or log an override."
  - "Tuning to tesseract may over-widen. Native-reader review of the motion test must have veto power."
- motion-design:
  - "The gap may read as two words during the wipe or arrive animation. The r3 evidence is stills only, and the MD strip was not re-rendered."
  - "Latin ink will drift from the Arabic baseline rhythm at 0.30 em in dense label rows."
  - "Dim-ink OCR noise on the F6 idempotency label (a.nd) is unresolved, and dc qa arabic is still unimplemented."
  - "Amending a threshold after the fact sets a precedent. The ADR must record the OCR sweep as the reason."
- technical-accuracy:
  - "Gap may read as two words at 34 px in motion; only still evidence exists. Mitigation: P7 AT with 34 px wipe frames, and a regression trigger if it fails."
  - "The OCR is tesseract on isolated renders and cannot judge reading quality; the sweep output is not checked in, only summarised in code comments and arabic_r3.md."
  - "Canon drift: chapters.json and the glossary say 6 الـAI while the look-dev shows 6 AI. This is a separate item, but the new gap now makes restoring the article viable."
  - "Amending a frozen token after the hash freeze needs the freeze script to be re-run so the ADR text and arabic.ts hash agree."
  - "dc qa arabic is still not implemented, so the 0.90 gate has only been checked by a one-off script, not the permanent QA."

## Acceptance tests (carried to P7/P8; added to ADR-009's AT list)

**AT-11: 34 px join gap in motion** [motion-engineer renders; arabic-typographer reviews; the egyptian-arabic native reader has veto; due in P7, before G6b]
- **Strings:**
  - the F6 labels `قسم الـroadmap` and `قسم الـidempotency` at 34 px;
  - a caps case, `الـAI`, at 32 and 34 px;
  - one display case, `الترتيب داخل الـpartition`, at 92 px.
- **Render:** run each string through the MD `wipe` and the `arrive` preset. Save stills at 25 / 50 / 75 / 100 % of each move, as small PNGs in `reports/`.
- **Pass requires all of:**
  1. Isolated-render OCR ≥ 0.90 on the settled frame, with I/l/1 and Al/AI normalised.
  2. No join junk (`J|`, `d!`, `JI`, `]`) in any sampled frame.
  3. The native reader judges that, in no sampled frame, the article reads as a detached word or the Latin as a separate word.
- **On failure:** RT-010-1.

**AT-12: line-length check** [arabic-typographer and scene-director; P8, inside `dc spec lint`]
- Every caption or chip containing `الـ`+Latin, at the 6-word limit, must keep its current break: no added line, and no overflow of the safe area or of the chip width.

## Reversal triggers
- **RT-010-1:** AT-11 fails, or the native reader vetoes. Reopen the **text band only**, as a Council ballot with an isolated sweep at 0.20–0.30 em. Display values stay frozen unless the display string also fails.
- **RT-010-2:** `dc qa arabic` (AT-10), once implemented, scores any `الـ`+Latin string below 0.90 on an isolated full-contrast render. Reopen the failing band.
- **RT-010-3:** AT-12 finds at least one caption that gains a line or overflows only because of the gap. Reopen the band involved, or have the scene-director rewrite that caption.
- **RT-010-4:** if the canon `6 الـAI` is restored and fails AT-11 at 32 px, reopen the caps text value (0.25 em).

## Consequences / follow-ups
- **motion-engineer:** re-run `studio/scripts/freeze_p6.py` once ADR-009 conditions 3–4 close. This ADR clears only the JOIN_GAP item. The provisional freeze still needs:
  - cond 3, an Arabic review that names `MD-standard_fix` [arabic-typographer];
  - cond 4, `reports/lookdev/r3/regress.json` [render-ops].
- **harness-engineer:**
  - make `freeze_p6.py` and `g06a.py` compare `JOIN_GAP` with the values in this ADR, not just check that an amending ADR exists;
  - implement AT-10 (`dc qa arabic`) with I/l normalisation.
- **arabic-typographer:** check in a small sweep summary (`reports/lookdev/r3/typeprobe_sweep.json`, id × gap → OCR) the next time the sweep runs. This closes the "evidence only in comments" risk.
- **render-ops:** re-render the MA–MD strips with the new gaps before any strip is used as G6a or G8 evidence (`arabic_r3.md`, open item 2).
- **scene-director:** for the canon `6 الـAI`, either restore the article in the P8 spec or log a `pending-council` override. Do not ship the bare form silently. This ADR does not decide that question.
