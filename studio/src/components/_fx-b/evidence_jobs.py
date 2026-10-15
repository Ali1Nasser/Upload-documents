"""fx-b evidence: job list for evidence.ts, and the strip composer (critic review round 1, B1-B5).

    python3 -I evidence_jobs.py jobs <jobs.json>              write the job list
    python3 -I evidence_jobs.py strips <stillsDir> <outDir>   compose labelled JPG strips from the rendered stills

Stills are 960x540 (scale 0.5 of 1080p). Features in the AudioReactive jobs are SYNTHETIC and labelled so (CR-005 is open);
the transition rows show the CURRENT engine behaviour (CR-003 open), not the target. Evidence only: never a baseline.
"""
import json
import os
import sys

DEMO_FRAMES = {"CameraRig": 96, "DepthLayers": 96, "FXTier": 72, "AudioReactive": 72}
TRF = [46, 49, 52, 54, 55, 57, 60, 63, 80]  # whip / streak: shot 1 ends at 55, 12 f transition (6 out, 6 in); match: 7 f tail; 80 = incoming counter settled


def jobs():
    J = [
        {"tag": "cam_std", "demo": "CameraRig", "tier": "standard", "frames": [8, 30, 60, 61, 62, 95]},
        {"tag": "dl_std", "demo": "DepthLayers", "tier": "standard", "frames": [0, 70, 95]},
        {"tag": "dl_lite", "demo": "DepthLayers", "tier": "lite", "frames": [70]},
    ]
    for t in ["lite", "standard", "hero"]:
        J.append({"tag": f"fx_{t}", "demo": "FXTier", "tier": t, "frames": [33, 50]})

    def feats(rms, onset, n=72):
        return {"start_frame": 0, "rms_dbfs": [rms] * n, "onset_strength": [onset] * n, "centroid_hz": [0] * n,
                "_label": "SYNTHETIC evidence features (not P5 data)"}

    J.append({"tag": "ar_quiet", "demo": "AudioReactive", "tier": "standard", "frames": [60], "features": feats(-60, 0)})
    J.append({"tag": "ar_loud", "demo": "AudioReactive", "tier": "standard", "frames": [60], "features": feats(-10, 1)})
    W = lambda n: f"w:DEMO:FXB-TR:{n:06d}"
    S1, S2 = "s:DEMO:FXB-TR:0001", "s:DEMO:FXB-TR:0002"
    words = [[W(1), 2, 20, S1], [W(2), 26, 44, S1], [W(3), 60, 78, S2], [W(4), 80, 90, S2]]

    def counter(i, v, ref, unit, dec, fmt, label, word):
        return {"component": "NumberCounter", "props": {"id": i, "to": {"value": v, "ref": ref, "unit": unit, "decimals": dec}, "format": fmt,
                                                        "label": label, "slot": "center"}, "at": {"word": word, "lead_frames": 0}}

    def tr_input(name, layer):
        cam = {"move": "push_in", "intensity": 0.5}
        s1 = {"shot_id": "TR-S01", "sentences": [S1], "intent": f"{name} out", "fx_tier": "standard", "camera": cam,
              "layers": [layer, counter("total", 400, "d:5.2:8", "EGP", 0, "currency", "الإجمالي الناجح", W(2))]}
        s2 = {"shot_id": "TR-S02", "sentences": [S2], "intent": f"{name} in", "fx_tier": "standard", "camera": cam,
              "layers": [counter("rate", 66.67, "d:5.2:7", "%", 2, "percent", "نسبة النجاح", W(3))]}
        return {"id": f"fxb-tr-{name}", "spec": {"v": 1, "chapter": "DEMO", "edl_version": "v1", "shots": [s1, s2]}, "span": {"start": 0, "end": 96},
                "words": [{"id": a, "s": b, "e": c, "sent": d} for a, b, c, d in words], "features": None, "audio": None}

    whip = {"component": "WhipPan", "props": {"direction": "rtl", "motion_blur": True}}
    J.append({"tag": "tr_whip_std", "input": tr_input("whip", whip), "tier": "standard", "frames": TRF})
    J.append({"tag": "tr_whip_hero", "input": tr_input("whip", whip), "tier": "hero", "frames": TRF})
    J.append({"tag": "tr_streak_std", "input": tr_input("streak", {"component": "LightStreakTransition", "props": {"direction": "rtl", "color": "signal"}}), "tier": "standard", "frames": TRF})
    J.append({"tag": "tr_match_std", "input": tr_input("match", {"component": "MatchCut", "props": {"from": "total", "to": "rate", "kind": "shape"}}), "tier": "standard", "frames": TRF})
    # determinism of the evidence stills themselves (same frame twice)
    for j in J:
        if j["frames"]:
            j["det"] = j["frames"][-1]
    return J


def strips(src, out):
    from PIL import Image, ImageChops, ImageDraw, ImageFont

    os.makedirs(out, exist_ok=True)
    fnt = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 15)
    big = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 17)
    PW, PH = 480, 270  # panel = still at 0.5

    def im(tag, f):
        return Image.open(os.path.join(src, f"{tag}_f{f:03d}.png")).convert("RGB")

    def amp(a, b, k):
        return ImageChops.difference(a, b).point(lambda v: min(255, v * k))

    def onion(a, b):  # frame a shows cyan (G+B), frame b yellow (R+G), overlap grey: displacement reads as colour fringes
        ga, gb = a.convert("L"), b.convert("L")
        z = Image.new("L", a.size, 0)
        return Image.merge("RGB", (gb, ImageChops.lighter(ga, gb), ga)).point(lambda v: min(255, int(v * 1.6)))

    def row(panels, title, path, pw=PW, cols=None):
        # pw: panel width (height keeps 16:9); cols: panels per line (wraps to a grid; the critic asked for 960 px panels)
        ph = pw * 9 // 16
        n = len(panels)
        cols = cols or n
        lines = (n + cols - 1) // cols
        o = Image.new("RGB", (pw * cols, 44 + lines * (ph + 24)), (8, 10, 14))
        d = ImageDraw.Draw(o)
        d.text((8, 4), title, font=big, fill=(230, 236, 242))
        for i, (img, cap) in enumerate(panels):
            x, y = (i % cols) * pw, 44 + (i // cols) * (ph + 24)
            d.text((x + 6, y), cap, font=fnt, fill=(150, 200, 220))
            o.paste(img.resize((pw, ph)), (x, y + 22))
        o.save(path, quality=88)

    def rows(blocks, path):
        ims = []
        for blk in blocks:
            panels, title = blk[0], blk[1]
            opt = blk[2] if len(blk) > 2 else {}
            tmp = path + ".part.jpg"
            row(panels, title, tmp, **opt)
            ims.append(Image.open(tmp).copy())
            os.remove(tmp)
        w = max(i.width for i in ims)
        o = Image.new("RGB", (w, sum(i.height for i in ims)), (8, 10, 14))
        y = 0
        for i in ims:
            o.paste(i, (0, y))
            y += i.height
        o.save(path, quality=86)

    c = {f: im("cam_std", f) for f in [8, 30, 60, 61, 62, 95]}
    rows([
        ([(c[8], "f8 (word 1 settled)"), (c[30], "f30 (counter rolling to its word end)"), (c[95], "f95 (end)"), (onion(c[30], c[95]), "onion: f30 cyan / f95 yellow (title + counter)")],
         "CameraRig dolly_zoom, intensity 1, standard tier: subject +12 %, backdrop counter-scales", {"pw": 960, "cols": 2}),
        ([(c[61], "f61"), (c[62], "f62 = nudge word anchor (RV1)"), (amp(c[60], c[61], 6), "|f61 - f60| x6 (camera drift only)"), (amp(c[61], c[62], 6), "|f62 - f61| x6 (drift + 4 px nudge)")],
         "CameraRig impact nudge: one frame, 4 px (IMPACT.nudgePxMax) on the anchor frame", {"pw": 960, "cols": 2}),
    ], os.path.join(out, "CameraRig_motion.jpg"))
    if os.environ.get("FXB_ONLY") == "CameraRig":  # re-render only this strip (the other stills are not rendered)
        return

    d0, d47, d95, l47 = im("dl_std", 0), im("dl_std", 70), im("dl_std", 95), im("dl_lite", 70)
    rows([
        ([(d0, "f0 truck start"), (d47, "f70"), (d95, "f95 truck end"), (onion(d0, d95), "onion f0 / f95: far 0.4 < mid 1 < near 1.3 < fg 1.6")],
         "DepthLayers, standard: grid far (DOF 0.6), 400 EGP mid, NilePay near, dust fg (DOF 1); truck 0.7"),
        ([(l47, "f70 lite (dofBlurPx 0)"), (d47, "f70 standard (dofBlurPx 4)"), (amp(l47, d47, 4), "|standard - lite| x4: DOF + tier FX; copy never blurred")],
         "DepthLayers DOF by tier"),
    ], os.path.join(out, "DepthLayers_parallax.jpg"))

    fl, fs_, fh = im("fx_lite", 50), im("fx_standard", 50), im("fx_hero", 50)
    rows([
        ([(fl, "lite f50"), (fs_, "standard f50"), (fh, "hero f50"), (amp(fl, fs_, 4), "|standard - lite| x4")],
         "FXTier: same frame at the three frozen tiers (glow 10/32 px, grain 0/1.5 %, vignette 10/15 %, CA 0/0.6 px Latin+digits, bokeh 0/14, DOF 0/4 px)"),
        ([(im("fx_lite", 33), "lite f33 impact flash"), (im("fx_standard", 33), "standard f33 impact flash"), (im("fx_hero", 33), "hero f33 impact flash"), (amp(im("fx_standard", 33), fs_, 3), "|f33 - f50| x3 standard: flash + bloom")],
         "FXTier: FAILED lands on the impact preset (80 ms glow flash) under the failed amount"),
    ], os.path.join(out, "FXTier_tiers.jpg"))

    q, L = im("ar_quiet", 60), im("ar_loud", 60)
    row([(q, "quiet: rms -60 dBFS, onset 0"), (L, "loud: rms -10 dBFS, onset 1"), (amp(q, L, 3), "|loud - quiet| x3")],
        "AudioReactive f60, standard, SYNTHETIC labelled features (CR-005 open): glow 1 on 400 EGP, scale 1 on NilePay (8 % cap), haze 0.8",
        os.path.join(out, "AudioReactive_quiet_loud.jpg"))

    def trrow(tag, title):
        return ([(im(tag, f), f"f{f}" + (" cut" if f == 55 else " (counters roll to their word end)" if f == 60 else " settled" if f == 80 else "")) for f in TRF], title)

    rows([
        trrow("tr_whip_std", "WhipPan (direction rtl, motion_blur true) at standard - CURRENT ENGINE: whole-frame 24 px CSS blur, props ignored (CR-003 open)"),
        trrow("tr_whip_hero", "WhipPan at hero - CURRENT ENGINE: identical to standard (no CameraMotionBlur yet; CR-003)"),
        trrow("tr_streak_std", "LightStreakTransition (rtl, signal) - CURRENT ENGINE: streak only in the outgoing shot, cut at its peak on f55 (CR-003)"),
        trrow("tr_match_std", "MatchCut (total -> rate, shape) - CURRENT ENGINE: backdrop dissolve + 1.04 scale, no geometric match (CR-003)"),
    ], os.path.join(out, "Transitions_engine_current.jpg"))


if __name__ == "__main__":
    if sys.argv[1] == "jobs":
        json.dump(jobs(), open(sys.argv[2], "w"), ensure_ascii=False)
    else:
        strips(sys.argv[2], sys.argv[3])
