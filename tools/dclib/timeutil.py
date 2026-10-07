"""The ONLY place ms<->frame conversion lives (docs/plan/05 section 0). Integer math, round-half-up."""

DEFAULT_FPS = 30


def ms2frame(ms, fps=DEFAULT_FPS):
    """frame = floor(ms * fps / 1000 + 1/2), exact for ints (half-up, also for negatives)."""
    ms, fps = int(ms), int(fps)
    return (2 * ms * fps + 1000) // 2000


def frame2ms(frame, fps=DEFAULT_FPS):
    """ms = floor(frame * 1000 / fps + 1/2)."""
    frame, fps = int(frame), int(fps)
    return (2 * frame * 1000 + fps) // (2 * fps)


def run(args):
    if args.time_cmd == "ms2frame":
        print(ms2frame(args.value, args.fps))
    else:
        print(frame2ms(args.value, args.fps))
    return 0
