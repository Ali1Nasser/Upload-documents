#!/usr/bin/env python3
"""Record the studio (Node) toolchain into budget.json["studio"]: node/npm versions, lockfile hash, installed vs pinned package versions,
browser executable, font inventory. Exits 1 if any pinned package is missing or differs from what is installed. stdlib only."""
import hashlib, json, os, re, subprocess, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import budget_io

ROOT = Path(__file__).resolve().parents[2]
S = Path(os.environ.get("DC_STUDIO", ROOT / "studio"))
pkg = json.loads((S / "package.json").read_text())
pins = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
installed, bad = {}, []
for n, want in pins.items():
    f = S / "node_modules" / n / "package.json"
    have = json.loads(f.read_text())["version"] if f.is_file() else None
    installed[n] = have
    if have != want.lstrip("^~"):
        bad.append(f"{n}: pinned {want}, installed {have}")
def out(*c):
    try: return subprocess.run(c, capture_output=True, text=True, timeout=30).stdout.strip()
    except Exception: return None
cfg = (S / "remotion.config.ts").read_text() if (S / "remotion.config.ts").is_file() else ""
m = re.search(r"HEADLESS_SHELL\s*=\s*'([^']+)'", cfg)
browser = m.group(1) if m else None
fonts = sorted(p.name for p in (S / "public" / "fonts").glob("*.ttf"))
info = {"node": out("node", "-v"), "npm": out("npm", "-v"),
        "lock_sha256": hashlib.sha256((S / "package-lock.json").read_bytes()).hexdigest(),
        "packages_installed": installed, "pins_match": not bad,
        "browser_executable": browser, "browser_present": bool(browser and os.path.exists(browser)),
        "browser_note": "Remotion's own Chrome download host (storage.googleapis.com) is blocked here; see limitations.remotion_chrome_download",
        "fonts_ttf_count": len(fonts)}
if S == ROOT / "studio":
    budget_io.update(studio=info)
print(json.dumps({k: v for k, v in info.items() if k != "packages_installed"}, indent=1))
for b in bad: print("PIN MISMATCH", b)
sys.exit(1 if bad else 0)
