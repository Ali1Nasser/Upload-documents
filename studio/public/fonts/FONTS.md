# Fonts (all SIL Open Font License 1.1 unless noted)

Variable fonts were renamed from the upstream `Name[axes].ttf` to `Name-VF.ttf` (brackets break URLs). Each family has its upstream `OFL-<family>.txt`.
Fetch script: `studio/fetch_fonts.sh` (re-downloads the Google Fonts files from raw.githubusercontent.com/google/fonts/main/ofl/<family>/).

| File(s) | Family | Source | Role (Visual Bible 04 §3.1) | License file |
|---|---|---|---|---|
| PlexAR-400/500/600/700.ttf | IBM Plex Sans Arabic + IBM Plex Sans (Latin) + DejaVu symbol subset, merged | archive `LMArena/Folder 3/film/fonts/final/` | Arabic+Latin+symbols in one face (benchmark default, one-font shaping) | FONTS_LICENSE_PLEXAR.txt (OFL 1.1 for Plex; DejaVu/Bitstream Vera licence for symbols) |
| Mono-400/500/600/700.ttf | IBM Plex Mono + IBM Plex Sans Arabic, merged (+ DejaVu symbols) | same | Mono terms with Arabic fallback | FONTS_LICENSE_PLEXAR.txt |
| Alexandria-VF.ttf (wght) | Alexandria | google/fonts ofl/alexandria | Arabic display / impact | OFL-alexandria.txt |
| ReadexPro-VF.ttf (HEXP, wght) | Readex Pro | google/fonts ofl/readexpro | Arabic display / impact | OFL-readexpro.txt |
| IBMPlexSansArabic-Regular/Medium/SemiBold/Bold.ttf | IBM Plex Sans Arabic | google/fonts ofl/ibmplexsansarabic | Arabic body labels, display | OFL-ibmplexsansarabic.txt |
| Cairo-VF.ttf (slnt, wght) | Cairo | google/fonts ofl/cairo | Arabic fallback candidate | OFL-cairo.txt |
| InterTight-VF.ttf (wght) | Inter Tight | google/fonts ofl/intertight | Latin display | OFL-intertight.txt |
| SpaceGrotesk-VF.ttf (wght) | Space Grotesk | google/fonts ofl/spacegrotesk | Latin display | OFL-spacegrotesk.txt |
| JetBrainsMono-VF.ttf (wght) | JetBrains Mono | google/fonts ofl/jetbrainsmono | Mono (tabular figures mandatory for counters) | OFL-jetbrainsmono.txt |
| IBMPlexMono-Regular/Medium/SemiBold/Bold.ttf | IBM Plex Mono | google/fonts ofl/ibmplexmono | Mono | OFL-ibmplexmono.txt |

Final pick is made in ADR-003 (P6). Italics were not fetched.
