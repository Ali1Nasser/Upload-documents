"""The ONLY place ms<->frame conversion lives (docs/plan/05 section 0). Integer math, round-half-up.

Record-timeline rule for spans (word map, EDL segments and chapters; from the ADR-002 24 fps reconcile, 2026-10-09):
    start_frame = floor(s * fps)      -> frame_start(ms, fps)
    end_frame   = ceil(s * fps)       -> frame_end(ms, fps)
Seconds/ms stay the truth; frames are derived from integer ms (s has 3 dp, so s * 1000 == ms exactly).
A span therefore always covers every frame its audio touches. ms2frame (half-up) stays for point events and leads.
"""
import json
import os
import re

DEFAULT_FPS = 30   # `dc time` CLI default only (G0 self-test); the film fps is film_fps() (ADR-002)
_DECISIONS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "harness", "state", "decisions.json")


def ms2frame(ms, fps=DEFAULT_FPS):
    """frame = floor(ms * fps / 1000 + 1/2), exact for ints (half-up, also for negatives)."""
    ms, fps = int(ms), int(fps)
    return (2 * ms * fps + 1000) // 2000


def frame2ms(frame, fps=DEFAULT_FPS):
    """ms = floor(frame * 1000 / fps + 1/2)."""
    frame, fps = int(frame), int(fps)
    return (2 * frame * 1000 + fps) // (2 * fps)


def frame_start(ms, fps):
    """Span start frame = floor(ms * fps / 1000) (= floor(s * fps))."""
    return (int(ms) * int(fps)) // 1000


def frame_end(ms, fps):
    """Span end frame = ceil(ms * fps / 1000) (= ceil(s * fps))."""
    return -((-int(ms) * int(fps)) // 1000)


def film_fps(decisions_path=_DECISIONS):
    """Master frame rate decided by ADR-002 Q2.1 ("F24 ..." -> 24). Raises if ADR-002 is not decided."""
    with open(decisions_path, encoding="utf-8") as f:
        dec = [d for d in json.load(f) if d.get("id") == "ADR-002" and d.get("status") == "decided"]
    if not dec:
        raise RuntimeError("ADR-002 not decided: no film fps")
    m = re.match(r"\s*F(\d+)\b", str((dec[-1].get("decision") or {}).get("Q2.1", "")))
    if not m:
        raise RuntimeError("ADR-002 Q2.1 has no F<fps> value")
    return int(m.group(1))


def run(args):
    if args.time_cmd == "ms2frame":
        print(ms2frame(args.value, args.fps))
    else:
        print(frame2ms(args.value, args.fps))
    return 0
