#!/usr/bin/env python3
"""Verify studio fonts: every file listed in studio/public/fonts/FONTS.md exists and parses as sfnt; Arabic-capable faces cover U+0627 (alef).
Usage: check_fonts.py [fonts_dir]. Exit 0 = all good. Uses fontTools when available (venv), else a stdlib sfnt header check."""
import re, struct, sys
from pathlib import Path

D = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[2] / "studio" / "public" / "fonts"
EXPECT = ["PlexAR-%d.ttf" % w for w in (400, 500, 600, 700)] + ["Mono-%d.ttf" % w for w in (400, 500, 600, 700)] + [
    "Alexandria-VF.ttf", "ReadexPro-VF.ttf", "InterTight-VF.ttf", "SpaceGrotesk-VF.ttf", "JetBrainsMono-VF.ttf", "Cairo-VF.ttf"] + [
    "%s-%s.ttf" % (f, w) for f in ("IBMPlexSansArabic", "IBMPlexMono") for w in ("Regular", "Medium", "SemiBold", "Bold")]
ARABIC = re.compile(r"^(PlexAR|Mono|Alexandria|ReadexPro|Cairo|IBMPlexSansArabic)")
try:
    from fontTools.ttLib import TTFont
except ImportError:
    TTFont = None
bad = []
for n in EXPECT:
    p = D / n
    if not p.is_file() or p.stat().st_size < 10000:
        bad.append(f"{n}: missing or truncated"); continue
    try:
        if TTFont:
            f = TTFont(str(p), lazy=True)
            if ARABIC.match(n) and 0x0627 not in f.getBestCmap():
                bad.append(f"{n}: no Arabic alef glyph")
        else:
            tag = p.read_bytes()[:4]
            if tag not in (b"\x00\x01\x00\x00", b"OTTO", b"true"):
                bad.append(f"{n}: not an sfnt font")
    except Exception as e:  # noqa: BLE001
        bad.append(f"{n}: parse error {type(e).__name__}")
lic = [p.name for p in D.glob("OFL-*.txt")]
if len(lic) < 7:
    bad.append(f"licence files: only {len(lic)} OFL-*.txt")
print(f"fonts: {len(EXPECT) - len([b for b in bad if not b.startswith('licence')])}/{len(EXPECT)} ok, {len(lic)} licence files" + ("" if not bad else "; PROBLEMS: " + "; ".join(bad)))
sys.exit(1 if bad else 0)
