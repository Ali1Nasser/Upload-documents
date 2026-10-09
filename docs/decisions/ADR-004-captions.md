# ADR-004 — Captions

Status: decided (Council C2, 2026-10-09). Confidence: normal.
Chair: council-chair. Brief: `docs/decisions/C2.brief.md` §3.

## Context

- **Arabic text:** G3 passed. S4 polished 27/27, and 99.8 % of S5 words agree within 120 ms.
- **English text:** `gloss_en` exists for 3,126 of 3,126 sentences in `corpus/sentences/`. It is LLM-written and not fact-checked, so its accuracy is n/m.
- **Plan guidance:**
  - `00` §4, row 004: "Soft Arabic subtitle track (+ optional English for the trunk); no full burned-in captions".
  - D10 requires soft Arabic subtitles.
  - `04` §11 lists full burned-in captions under *Don't*.
- **S4 audio:** 48–64 kbps, with a median bandwidth of 8.0 kHz. Intelligibility on the mix is n/m until G9a.
- **Not tested:** RTL `mov_text` in players, and sidecars when the direct link plays in a browser.

## Options

| id | Option |
|---|---|
| CAP-AR | Soft Arabic + `.srt`/`.vtt` sidecars |
| CAP-ARENT | CAP-AR + English for the S1 trunk |
| CAP-AREN | CAP-AR + English for the whole film |
| CAP-BP | Soft tracks + partial burn-in in named windows |
| CAP-BF | Full burn-in + soft tracks |

## Scores (votes: CAP-AR 7/7)

The method is the same as in ADR-002. Cross-review was skipped because agreement was 7/7.

| Criterion (weight) | CAP-AR | CAP-ARENT | CAP-AREN | CAP-BP | CAP-BF |
|---|---|---|---|---|---|
| accessibility and reach (0.25) | 6.57 | 7.43 | 8.00 | 7.57 | 8.14 |
| picture cleanliness (0.25) | 9.00 | 9.00 | 9.00 | 5.43 | 1.86 |
| accuracy exposure (0.15) | 8.71 | 5.86 | 3.29 | 7.00 | 6.29 |
| plan conformance (0.15) | 9.14 | 8.00 | 5.43 | 5.43 | 1.43 |
| cost and reversibility (0.10) | 9.00 | 6.86 | 5.00 | 4.29 | 2.00 |
| player compatibility (0.10) | 6.43 | 6.14 | 5.86 | 8.29 | 9.29 |
| **Weighted total** | **8.114** | **7.486** | **6.643** | **6.371** | **4.786** |
| Confidence-weighted | 8.111 | 7.483 | 6.647 | 6.370 | 4.779 |

Per-lens weighted totals:

| Lens | CAP-AR | CAP-ARENT | CAP-AREN | CAP-BP | CAP-BF |
|---|---|---|---|---|---|
| director | 8.05 | 7.35 | 6.75 | 6.40 | 4.85 |
| educator | 8.35 | 7.70 | 6.45 | 6.25 | 5.05 |
| motion-design | 8.05 | 7.65 | 6.85 | 6.35 | 4.60 |
| technical-accuracy | 8.20 | 7.50 | 6.70 | 6.40 | 4.85 |
| egyptian-arabic | 8.05 | 7.50 | 6.45 | 6.50 | 4.80 |
| audio-sync | 8.05 | 7.40 | 6.70 | 6.35 | 4.75 |
| producer | 8.05 | 7.30 | 6.60 | 6.35 | 4.60 |

Top two: CAP-AR 8.114 vs CAP-ARENT 7.486, margin 8.39 %.

## Decision

**CAP-AR** is decided (7/7 agree, margin 8.39 %).

- **Container track:** one soft Arabic track, `mov_text`, language `ara`.
- **Sidecars:** `.srt` and `.vtt`.
- **Source:** generated from the EDL sentences, timed to the locked S5 word times. No English track.
- **Text direction:** each cue gets an RLM, and first-strong isolates wrap Latin runs and digits.
- **No burned-in captions.** Mandatory numbers and terms remain word-anchored on screen through the kinetic layer, as before.

## Rationale

- CAP-AR ranks first for every lens.
- It scores highest on plan conformance (9.14), accuracy exposure (8.71) and picture cleanliness (9.00).
- Its weakest criteria are accessibility and reach (6.57) and player compatibility (6.43).
- The English options expose unverified LLM text: accuracy exposure is 5.86 for the S1-trunk English and 3.29 for full-film English.
- `00` §4 makes English optional, so CAP-AR is fully conformant.

## Dissent (verbatim)

There was no dissent on the choice. Recorded risks:

- **egyptian-arabic:** "Soft Arabic mov_text with RTL and BiDi (Latin isolates, digits, tashkeel) is untested in players; sidecars may fail in the browser direct-link case. Insert RLM/isolate marks and test VLC, QuickTime and Chrome."
- **educator:** "CAP-AR leaves hard-to-hear S4 windows (48-64 kbps, 8.0 kHz) uncaptioned in burn-in."
- **audio-sync:** "The 00 section 4 S1-English wording was not read, so CAP-ARENT may be required."
  - Chair check: `00` §4 reads "+ optional English for the trunk", so English is optional.

## Reversal triggers

- **→ CAP-ARENT**, if either:
  - the user asks for English; or
  - fact-checker verifies `gloss_en` for the S1 trunk at ≥ 98 % accuracy on a random 100-sentence sample.
- **→ CAP-BP, for named windows only (by ADR amendment):** if G9a shows a window whose WER on the mix is ≥ 2× the film median WER. The burn-in is limited to that window.
- **Player compatibility:** if RTL renders wrongly in VLC or Chrome after the RLM and isolate fixes, ship `.vtt`/`.srt` as the primary sidecars and document the limitation in the delivery note. D10 still requires the `mov_text` track.

## Consequences and follow-ups

- **transcription-aligner:** cue segmentation from the sentences:
  - ≤ 2 lines per cue;
  - the plan sets no character limit, so ≤ 42 characters per line is a starting value, not a gate;
  - timing taken from S5 words.
- **render-ops / delivery-publisher:** mux the `mov_text` `ara` track, write the `.ar.srt` and `.ar.vtt` sidecars (`06` §5), and run a 30 s RTL test in VLC, QuickTime and Chrome before P13.
- **sync-verifier:** check caption timing against word times at G10a.
