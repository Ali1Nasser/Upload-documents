#!/usr/bin/env python3
"""DA Camp production CLI. One entry point; subcommands live in tools/dclib/*.py (see docs/plan/02 section 9.2)."""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
# P2.7: `visual` reads extracted images/video (numpy, Pillow from the venv). Re-exec once, isolated.
_VPY = os.path.join(os.path.dirname(HERE), ".venv", "bin", "python")
if (len(sys.argv) > 1 and sys.argv[1] == "visual" and os.path.exists(_VPY) and not os.environ.get("DC_NO_VENV")
        and (os.path.abspath(sys.executable) != os.path.abspath(_VPY) or not sys.flags.isolated)):
    os.execv(_VPY, [_VPY, "-I", os.path.abspath(__file__), *sys.argv[1:]])
# Rule 11: python that reads extracted (untrusted) files runs isolated (-I). Re-exec once for those commands.
if len(sys.argv) > 1 and sys.argv[1] == "ingest" and not sys.flags.isolated and os.environ.get("DC_NO_ISOLATE") != "1":
    os.execv(sys.executable, [sys.executable, "-I", os.path.abspath(__file__), *sys.argv[1:]])
# P3: audio/asr/align commands need the venv (numpy, torch, faster-whisper). Re-exec once, isolated.
VENV_PY = os.path.join(os.path.dirname(HERE), ".venv", "bin", "python")
if (len(sys.argv) > 1 and sys.argv[1] in ("audio", "asr", "align") and os.path.exists(VENV_PY)
        and os.path.abspath(sys.executable) != os.path.abspath(VENV_PY) and not os.environ.get("DC_NO_VENV")):
    os.execv(VENV_PY, [VENV_PY, "-I", os.path.abspath(__file__), *sys.argv[1:]])
# P2.5: `corpus hub` parses untrusted HTML/JSON with lxml (venv) and drives Playwright. Re-exec once, isolated.
_HUB_PY = os.path.join(os.path.dirname(HERE), ".venv", "bin", "python")
if (len(sys.argv) > 2 and sys.argv[1] == "corpus" and sys.argv[2] == "hub" and os.path.exists(_HUB_PY)
        and os.path.abspath(sys.executable) != os.path.abspath(_HUB_PY) and not os.environ.get("DC_NO_VENV")):
    os.execv(_HUB_PY, [_HUB_PY, "-I", os.path.abspath(__file__), *sys.argv[1:]])
# P2.2: `corpus canon` parses untrusted archive text (stdlib only). Re-exec once, isolated.
if (len(sys.argv) > 2 and sys.argv[1] == "corpus" and sys.argv[2] == "canon" and not sys.flags.isolated
        and os.environ.get("DC_NO_ISOLATE") != "1"):
    os.execv(sys.executable, [sys.executable, "-I", os.path.abspath(__file__), *sys.argv[1:]])
sys.path.insert(0, HERE)

from dclib import cli  # noqa: E402

if __name__ == "__main__":
    sys.exit(cli.main(sys.argv[1:]))
