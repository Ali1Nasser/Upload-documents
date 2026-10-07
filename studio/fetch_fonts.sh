#!/usr/bin/env bash
# Re-fetch the Google Fonts (OFL) files used by the studio. PlexAR-*/Mono-* come from the source archive (see public/fonts/FONTS.md).
set -euo pipefail
cd "$(dirname "$0")/public/fonts"
B=https://raw.githubusercontent.com/google/fonts/main/ofl
get(){ # family remote-filename local-filename
  [ -s "$3" ] && return 0
  curl -sS --fail -o "$3" "$B/$1/$(python3 -c 'import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))' "$2")"; echo "fetched $3"; }
get alexandria 'Alexandria[wght].ttf' Alexandria-VF.ttf
get readexpro 'ReadexPro[HEXP,wght].ttf' ReadexPro-VF.ttf
get intertight 'InterTight[wght].ttf' InterTight-VF.ttf
get spacegrotesk 'SpaceGrotesk[wght].ttf' SpaceGrotesk-VF.ttf
get jetbrainsmono 'JetBrainsMono[wght].ttf' JetBrainsMono-VF.ttf
get cairo 'Cairo[slnt,wght].ttf' Cairo-VF.ttf
for w in Regular Medium SemiBold Bold; do get ibmplexsansarabic IBMPlexSansArabic-$w.ttf IBMPlexSansArabic-$w.ttf; get ibmplexmono IBMPlexMono-$w.ttf IBMPlexMono-$w.ttf; done
for f in alexandria readexpro intertight spacegrotesk jetbrainsmono ibmplexsansarabic ibmplexmono cairo; do get $f OFL.txt OFL-$f.txt; done
echo "PlexAR-*.ttf / Mono-*.ttf: copy from data/extracted/DA_Camp_Videos_Files.zip.d/DA Camp Videos Files/LMArena/Folder 3/film/fonts/final/"
