# ADR-005 — Music and SFX

Status: decided (Council C2, 2026-10-09). Confidence: **low**. The palette choice had 4/7 agreement, and the bed level had 4/7 and was unscored.
Chair: council-chair. Brief: `docs/decisions/C2.brief.md` §4.

## Context

- **Source material:**
  - The archives contain no music or SFX: `corpus/audio/assets.json` holds 71 speech assets.
  - S2's music bed is of unknown provenance (`reports/audio/sources.md`).
- **Silence and voice switches:**
  - S1 has digital silence between phrases (floor −90 dB, 608 pauses).
  - There are 66 voice switches in B100 and 48 in B100-V2.
  - S4 is 48–64 kbps with a median bandwidth of 8.0 kHz.
- **Targets:**
  - D9: −16 ± 0.5 LUFS, true peak ≤ −1.0 dBTP, music ducked under VO.
  - `03` P11: bed at about −24 to −28 LUFS-S under VO.
  - `04` §9: SFX at −22 to −36 LUFS-S, ≤ 30 cues/min, ≥ 350 ms apart, −6 dB under VO.
  - G9a: WER on the mix ≤ WER on VO alone + 2 points, with licences logged.
- **Plan guidance:**
  - `00` §4, row 005: "Owned or procedural SFX palette + procedural or royalty-free ambient music".
  - R12: "owned/procedural or CC0".
- **Network:** whether CC0 hosts are reachable through the proxy is n/m.

## Options

| id | Music | SFX |
|---|---|---|
| MS-P | Procedural | Procedural |
| MS-C | Procedural | CC0 + procedural |
| MS-R | Royalty-free library | CC0 + procedural |
| MS-S2 | Demucs-separated S2 bed | Procedural |

MS-S2 is screened out: its licence is unknown, and G9a requires logged licences.

## Scores (votes: MS-P 4/7 = educator, technical-accuracy, audio-sync, producer; MS-C 3/7 = director, motion-design, egyptian-arabic)

- The method is the same as in ADR-002.
- Agreement was 4/7, below the 5/7 threshold. Cross-review was not run in this workflow, so the higher weighted score is taken at low confidence.

| Criterion (weight) | MS-P | MS-C | MS-R | MS-S2 |
|---|---|---|---|---|
| licence safety (0.30) | 10.00 | 8.14 | 5.57 | 1.00 |
| premium feel (0.25) | 5.29 | 6.29 | 8.00 | 6.86 |
| VO intelligibility and mix (0.20) | 8.00 | 7.71 | 6.57 | 3.86 |
| cost and schedule (0.15) | 6.86 | 6.29 | 5.00 | 3.86 |
| reversibility (stems) (0.10) | 8.86 | 8.57 | 7.14 | 3.43 |
| **Weighted total** | **7.836** | **7.357** | **6.450** | **3.707** |
| Confidence-weighted | 7.838 | 7.356 | 6.450 | 3.709 |

Per-lens weighted totals:

| Lens | MS-P | MS-C | MS-R | MS-S2 |
|---|---|---|---|---|
| director | 7.70 | 7.65 | 6.65 | 3.95 |
| educator | 7.80 | 7.00 | 6.45 | 3.55 |
| motion-design | 7.80 | 7.60 | 6.75 | 3.75 |
| technical-accuracy | 7.90 | 7.25 | 6.45 | 4.05 |
| egyptian-arabic | 7.80 | 7.45 | 6.15 | 3.15 |
| audio-sync | 7.65 | 7.00 | 6.05 | 3.30 |
| producer | 8.20 | 7.55 | 6.65 | 4.20 |

Top two: MS-P 7.836 vs MS-C 7.357, margin 6.51 %.

- **All 7 lenses rank MS-P first on their own weighted scores**, including the three that voted MS-C. Their MS-C votes reflect premium feel and SFX variety, which their own numbers did not carry.

**Bed level under VO (unscored):**

| Level | Lenses |
|---|---|
| −26 LUFS-S | 4/7: director, motion-design, technical-accuracy, audio-sync |
| −28 LUFS-S | 3/7: educator, egyptian-arabic, producer |

## Decision

### Palette: MS-P (low confidence; margin 6.51 %, agreement 4/7)

- **Music:** procedural, synthesised in the repo with sox and ffmpeg:
  - pads, pulses, risers and stingers;
  - a motif family per part, varied per chapter.
- **SFX:** about 20 procedural sounds (`03` P11), using the `04` §9 map.
- **Licences:** every asset is logged in `docs/decisions/licenses.md` as owned/procedural.

### Bed level: −26 LUFS-S under VO, with an automatic fallback to −28 (low confidence)

- **Ducking:** sidechain-ducked, with release ≥ 300 ms.
- **Swells:** only in pauses and transitions.
- **Room tone:** a low room-tone or noise-floor layer under S1's digital silence, so the ducking does not pump.
- **Voice switches:** stingers or motif changes mark the 66 (or 48) switches.
- The −26 level is a taste call, carried by the audio-sync lens as mix owner, with technical-accuracy's fallback rule.

## Rationale

- MS-P is the only option with fully owned licences (licence safety 10.0) and no network dependency.
- It scores highest on reversibility (8.86) and on VO mix (8.00).
- Its weakness is premium feel (5.29, against 6.29 for MS-C).
- MS-C can be added later without touching picture or the music stem: only the SFX stem and the final mix change. That makes MS-P the cheaper starting point.

## Dissent (verbatim)

- **director (MS-C):** "ADR-005: procedural music plus CC0 SFX is licence-safe. Per-chapter motifs and stingers should mark the 66 voice switches. Bed at -26 LUFS-S."
- **motion-design (MS-C):** "MS-C (procedural music, CC0 + procedural SFX; fall back to MS-P if CC0 hosts are unreachable); bed under VO = -26 LUFS-S"
- **egyptian-arabic (MS-C, −28):** "ADR-005: MS-C, bed -28 LUFS-S; speech fricatives sit in a 2-8 kHz band."
- **educator (−28):** "The bed is -28 LUFS-S so Egyptian VO stays clear at 8 kHz source bandwidth."
- **producer (−28):** "-28 LUFS-S bed protects the G9a WER gate on 48-64 kbps S4 audio."
- **audio-sync (risk):** "Sidechain ducking on digital silence can pump audibly, so a room-tone or noise-floor bed and release of at least 300 ms are needed."

## Reversal triggers

- **Bed −26 → −28.** WER(mix) − WER(VO) > 2 points on the sound-designer's first 60 s S4 check in P11, or at G9a. The change is a stem re-mix only.
- **MS-P → MS-C.** Both of the following:
  - the critic's (or director lens's) listening review of the 3-minute radio-edit or the pilot scores SFX premium feel ≤ 6/10, or flags audible repetition;
  - a CC0 host is reachable and the licence is logged.
- **Music → MS-R** (royalty-free library). Music premium feel stays ≤ 5/10 after one procedural revision, **and** the library terms are logged.

## Consequences and follow-ups

- **sound-designer:**
  - procedural palette (about 20 SFX), part motifs and switch stingers;
  - the −26 bed with the −28 fallback;
  - room-tone layer, ducking release ≥ 300 ms;
  - the 60 s S4 WER check at both levels at the start of P11;
  - `docs/decisions/licenses.md`, including the OFL fonts from ADR-003.
- **critic:** a listening review of the 3-minute radio-edit and the pilot.
- **audio-forensics:** confirm the S2 bed is not used anywhere.
