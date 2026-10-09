# Chosen fonts (P6 freeze, ADR-003 T-A)

The font files live in `studio/public/fonts/` (served via `staticFile`). They are registered under the `DC-*` family names in `studio/src/tokens.ts` `FONT` and loaded by `studio/src/lookdev/fonts.ts` (in P7, `studio/src/type/fonts.ts`).
All four families are under the SIL Open Font License 1.1, which allows bundling, embedding in rendered video and commercial use. The licence text sits next to each file.
The SHA-256 of every file below is frozen in `harness/state/freeze.json` and re-checked by `dc gate check G6a`.

| Role (ADR-003 T-A) | Token | File(s) | Family / weight | License | Copyright |
|---|---|---|---|---|---|
| Arabic display, **≥ 56 px only** | `FONT.arDisplay` | `Alexandria-VF.ttf` (wght axis) | Alexandria 700 | OFL 1.1, `OFL-alexandria.txt` | 2022 The Alexandria Project Authors |
| Arabic text and labels **< 56 px**, word-spacing 0.08 em | `FONT.arText`, `FONT.label` | `IBMPlexSansArabic-{Regular,Medium,SemiBold,Bold}.ttf` | IBM Plex Sans Arabic 600 (labels 500/600) | OFL 1.1, `OFL-ibmplexsansarabic.txt` | 2017 IBM Corp. (Reserved Font Name "Plex") |
| Latin display and terms (in LTR isolates) | `FONT.lat` | `InterTight-VF.ttf` (wght axis) | Inter Tight 700 | OFL 1.1, `OFL-intertight.txt` | 2022 The Inter Project Authors |
| Mono: code and counters (tabular figures) | `FONT.mono` | `JetBrainsMono-VF.ttf` (wght axis) | JetBrains Mono 600 | OFL 1.1, `OFL-jetbrainsmono.txt` | 2020 The JetBrains Mono Project Authors |

Rules carried with the fonts:
- **Never mix T-A and T-B in a chapter** (ADR-003).
- **Line-height ≥ 1.6** on any Arabic line with diacritics. There is **+0.3 em** between a title and its subtitle.
- **Join gap for `الـ` + Latin** is size-banded in `studio/src/type/arabic.ts` `JOIN_GAP`:
  - display (≥ 56 px): caps 0.20 em, mixed 0.25 em;
  - text (< 56 px): caps 0.25 em, mixed 0.30 em.
  These values were measured by isolated-render OCR at a3b86c1 and accepted by the arabic-typographer re-check at d6ac265.
- **Coverage:** 0 missing codepoints for every on-screen Arabic string in look-dev (arabic_r3 cmap check).

Not chosen, kept for benchmarks and fallbacks only, and never used in film components:
- `PlexAR-*`, `Mono-*` (merged archive fonts);
- Readex Pro, Cairo, Space Grotesk, IBM Plex Mono.

Their licences are listed in `studio/public/fonts/FONTS.md`.
