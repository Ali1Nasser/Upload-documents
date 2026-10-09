#!/usr/bin/env python3
"""P6 look-dev r2 report: JPG stills (<= 400 KB), 8-frame motion strips, contact sheet, perf JSON, README r2 section.
Reads data/renders/lookdev/r2/timings_*.json (studio/scripts/lookdev_r2_render.mjs). Run: python3 -I studio/scripts/lookdev_r2_report.py"""
import io, json, os, subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
REN = ROOT / "data/renders/lookdev/r2"
OUT = ROOT / "reports/lookdev/r2"
FONT = ROOT / "studio/public/fonts/JetBrainsMono-VF.ttf"
CAP = 400_000
for d in ("stills", "strips"):
    (OUT / d).mkdir(parents=True, exist_ok=True)
font = ImageFont.truetype(str(FONT), 22)
FPS = 24
LEAD = 2  # ADR-002 kinetic lead at 24 fps


def save_jpg(im, path):
    for w in (1920, 1600, 1440, 1280):
        im2 = im if im.width <= w else im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        for q in (88, 84, 80, 76, 72):
            b = io.BytesIO()
            im2.save(b, "JPEG", quality=q, optimize=True, progressive=True)
            if b.tell() <= CAP:
                path.write_bytes(b.getvalue())
                return round(b.tell() / 1000, 1), list(im2.size), q
    raise SystemExit(f"cannot fit {path} under {CAP}")


def load(name):
    p = REN / name
    return json.loads(p.read_text()) if p.exists() else None


def frames(mp4, idx):
    sel = "+".join(f"eq(n\\,{n})" for n in idx)
    r = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(mp4), "-vf", f"select={sel},scale=480:270", "-vsync", "0", "-f", "image2pipe", "-vcodec", "png", "-"], capture_output=True, check=True)
    data, ims = r.stdout, []
    sig = b"\x89PNG\r\n\x1a\n"
    parts = [p for p in data.split(sig) if p]
    for p in parts:
        ims.append(Image.open(io.BytesIO(sig + p)).convert("RGB"))
    return ims


def win_frames(path, ids, kind):
    w = json.loads((ROOT / path).read_text())
    st = w["window"]["start_ms"]
    by = {x["word_id"]: x for x in w["words"]}
    out = {}
    for n in ids:
        x = by[f"w:S1:ar-natural:{n:06d}"]
        out[n] = (round((x["start_ms"] - st) * FPS / 1000) - LEAD, round((x["end_ms"] - st) * FPS / 1000))
    return out


ma = win_frames("studio/src/lookdev/data/ch33_window.json", [5965, 5968, 5974, 5975, 5976, 5979], "ma")
md = win_frames("studio/src/lookdev/data/ch00_gates_window.json", [36, 38, 42, 45, 48, 50], "md")
I = ma[5976][0]  # impact word وغلط (on - lead)
STRIP = {
    # camera life (push from f0, carry-over caption) + impact rhythm (pre-hit, flash f+0..2, settle)
    "MA": [4, ma[5968][0] + 3, I - 2, I, I + 1, I + 3, ma[5974][1] + 2, ma[5979][0] + 4],
    "MB": [round(i * 239 / 7) for i in range(8)],
    "MC": [108, 112, 115, 118, 119, 120, 121, 123],  # cut at 120 (5.0 s); 20 % incoming light at 118-119; clean by 123
    "MD": [0, md[36][0] + 4, md[42][0] + 4, md[45][0] + 7, md[48][0] + 3, md[50][0], md[50][0] + 2, 287],
}
NOTE = {
    "MA": "CH-33 S1 3768.8-3778.8 s on word ids w:S1:ar-natural:005965-005980 (lead 2 f); 3 % push + 40 px track over the shot, far plane (blurred galaxy plate) at 0.4x; carry-over query caption from f0; impact on وغلط = 3-frame light burst + hard glow flash + nudge (no CA on Arabic); `الـroadmap` via display override; SFX hooks exported as MA_SFX_HOOKS",
    "MB": "baked P10 plate (nebula + 1,500 GL points + Bloom, data/derived/plates/galaxy-ch33-push.mp4) under the text-safe mask; live layer = probe, links, cards, 2-line caption; hero adds 360 live near-field GL points (no EffectComposer)",
    "MC": "whip-pan SQL funnel -> Kafka, 12 frames: 9 out, 3 in; frames cut-2..cut-1 carry 20 % of the incoming scene's light (no black dip); incoming scene runs on its own clock (t0 = cut) so messages slide in after the cut",
    "MD": "TripleGate ignition on S1 CH-00 words (w:000036-000045); camera yawed from f0 (-0.78 -> -0.30 rad, never front-on) + push 13.6 -> 10.8; gates 1.3x at 50 % height with inner rings and light cones; phrase دي الشغلانة كلها (w:000048-000050, impact on كلها)",
}
BUDGET = {"R5_standard_box_s_per_frame": 0.201, "H_band_box_s_per_frame": [0.904, 1.038], "R2_blended_box_s_per_frame": 0.240, "RT5_hero_share": 0.05,
          "source": "docs/decisions/ADR-002-render-stack.md (cost model S/H, R2, R5)"}

perf = {"v": 1, "phase": "P6", "round": "r2", "resolution": "1920x1080", "fps": FPS, "gl": "swiftshader", "box": f"{os.cpu_count()} vCPU, no GPU",
        "tokens": "studio/src/tokens.ts (ADR-002 F24 + FX2 + RT5, ADR-003 T-A + LK-F)",
        "definitions": {"s_per_frame": "(wall - overhead) x concurrency / (frames - 1): seconds per frame per render slot",
                        "box_s_per_frame": "(wall - overhead) / (frames - 1): whole-box seconds per frame, measured with 3 render slots busy (under load)",
                        "fps_throughput": "(frames - 1) / (wall - overhead), whole box", "still_s": "renderStill wall per still, one browser, bundle excluded"},
        "budget": BUDGET, "r1_box_s_per_frame": {"MA-standard": 0.185, "MB-standard": 0.380, "MB-hero": 0.916, "MC-standard": 0.216, "MD-standard": 0.257},
        "stills": {}, "motion": {}, "plates": {}}

pl = load("timings_plate.json")
for k, v in (pl or {"items": {}})["items"].items():
    perf["plates"][k] = {**v, "note": "P10 plate, rendered once (hero GL + Bloom); amortised over every use of the shot"}

st = load("timings_stills.json")
sp = load("timings_stills_partial.json")
if st and sp:
    st["items"].update(sp["items"])
for k, v in sorted((st or {"items": {}})["items"].items()):
    kb, px, q = save_jpg(Image.open(ROOT / v["png"]).convert("RGB"), OUT / "stills" / f"{k}.jpg")
    perf["stills"][k] = {"still_s": round(v["s"], 3), "comp": v.get("comp"), "frame": v.get("frame"), **v["props"], "loadavg_1m": round(v["loadavg"][0], 2), "preview": f"reports/lookdev/r2/stills/{k}.jpg", "kb": kb, "px": px, "q": q}

mo = load("timings_motion.json") or {"items": {}, "concurrency": 3}
mp = load("timings_motion_partial.json")  # re-runs of single tests after a fix (same driver, same settings)
if mp:
    mo["items"].update(mp["items"])
for k, v in mo["items"].items():
    test = k.split("-")[0]
    idx = sorted({min(v["frames"] - 1, max(0, n)) for n in STRIP[test]})
    ims = frames(ROOT / v["mp4"], idx)
    strip = Image.new("RGB", (4 * 480, 2 * 270), (5, 7, 11))
    d = ImageDraw.Draw(strip)
    for i, im in enumerate(ims):
        x, y = (i % 4) * 480, (i // 4) * 270
        strip.paste(im, (x, y))
        lab = f"{k} f{idx[i]} {idx[i] / FPS:.2f}s"
        d.rectangle([x, y + 240, x + 16 + d.textlength(lab, font=font), y + 270], fill=(5, 7, 11))  # bottom-left: never over titles
        d.text((x + 8, y + 244), lab, fill=(230, 237, 243), font=font)
    kb, px, q = save_jpg(strip, OUT / "strips" / f"{k}.jpg")
    box = v["s_per_frame_box"]
    hero = v["props"]["fx"] == "hero"
    lim = BUDGET["H_band_box_s_per_frame"][1] if hero else BUDGET["R5_standard_box_s_per_frame"]
    perf["motion"][k] = {**{x: v[x] for x in ("comp", "props", "frames", "fps", "wall_s", "overhead_s", "fps_throughput", "s_per_frame", "s_per_frame_box", "mp4", "mb") if x in v},
                         "loadavg_1m": round(v["loadavg"][0], 2), "concurrency": mo.get("concurrency", 3),
                         "budget_box_s_per_frame": lim, "budget_ref": "H band top (ADR-002 cost model)" if hero else "R5 (S-hi + 10 %)", "within_budget": box <= lim,
                         "strip": f"reports/lookdev/r2/strips/{k}.jpg", "strip_frames": idx, "strip_kb": kb, "note": NOTE[test]}
std = [v["s_per_frame_box"] for k, v in perf["motion"].items() if v["props"]["fx"] == "standard"]
hr = [v["s_per_frame_box"] for k, v in perf["motion"].items() if v["props"]["fx"] == "hero"]
if std:
    s_mean = sum(std) / len(std)
    h_mean = (sum(hr) / len(hr)) if hr else BUDGET["H_band_box_s_per_frame"][1]
    blend = (1 - BUDGET["RT5_hero_share"]) * s_mean + BUDGET["RT5_hero_share"] * h_mean
    perf["blended"] = {"standard_mean_box_s_per_frame": round(s_mean, 4), "hero_box_s_per_frame": round(h_mean, 4), "hero_share": BUDGET["RT5_hero_share"],
                       "blended_box_s_per_frame": round(blend, 4), "R2_limit": BUDGET["R2_blended_box_s_per_frame"], "within_R2": blend <= BUDGET["R2_blended_box_s_per_frame"],
                       "caveat": "look-dev shots, not a chapter; render-ops re-measures at the first chapter render (ADR-002 R2)"}

order = ["F1-standard", "F2-standard", "F3-standard", "F4-standard", "F4-hero", "F5-standard", "F6-standard", "F7-standard", "F8-standard", "F9-standard"]
tw, th, pad, lab = 480, 270, 6, 30
sheet = Image.new("RGB", (4 * (tw + pad) + pad, 3 * (th + lab + pad) + pad), (5, 7, 11))
d = ImageDraw.Draw(sheet)
for i, k in enumerate([o for o in order if o in (st or {"items": {}})["items"]]):
    im = Image.open(ROOT / st["items"][k]["png"]).convert("RGB").resize((tw, th), Image.LANCZOS)
    x, y = pad + (i % 4) * (tw + pad), pad + (i // 4) * (th + lab + pad)
    sheet.paste(im, (x, y + lab))
    d.text((x + 4, y + 3), f"{k}  {st['items'][k]['s']:.2f}s", fill=(159, 176, 189), font=font)
kb, px, q = save_jpg(sheet, OUT / "contact.jpg")
perf["contact_sheet"] = {"path": "reports/lookdev/r2/contact.jpg", "kb": kb, "px": px}
(OUT / "perf.json").write_text(json.dumps(perf, indent=1, ensure_ascii=False))
print(json.dumps({k: v["still_s"] for k, v in perf["stills"].items()}, indent=0))
print(json.dumps({k: [v["s_per_frame"], v["s_per_frame_box"], v["within_budget"]] for k, v in perf["motion"].items()}, indent=0), perf.get("blended"))

# text-safe mask A/B (MB-standard only, tsp user+sys CPU seconds per whole job incl. bundling; wall numbers were contended)
perf["mask_ab_mb_standard"] = {"rings10_multiply_cpu_s": [284.06, 287.11], "single_hard_rect_cpu_s": 262.56, "delta": "+8.7 % CPU for the 10-ring feather",
                               "note": "measured while another agent's process (out of queue) held 1.3 cores; wall s/frame is not comparable between these runs, CPU-s is"}
(OUT / "perf.json").write_text(json.dumps(perf, indent=1, ensure_ascii=False))

# ---------- README r2 section (replaces any previous r2 section; r0 and r1 text above it is kept) ----------
FAM = {"F1": "Cold open: receipts -> glowing table (CH-00)", "F2": "SQL row-count funnel, WHERE 13 -> 11 (CH-11)", "F3": "Kafka partitions, offsets, lag (CH-26, schematic offsets)",
       "F4": "RAG vector galaxy 0.165 -> 0.227 (CH-33)", "F5": "Docker layer cache 5 s vs 57 s (CH-34)", "F6": "Kinetic type only (CH-33)", "F7": "A-01 Holo-City (7 movements)",
       "F8": "TripleGate ignition, frame of MD (reveal complete)", "F9": "Orbit + kinetic Arabic word, frame of MD"}
m = perf["motion"]
b = perf.get("blended", {})
pl = perf["plates"].get("galaxy-ch33-push", {})
L = ["## r2 (critic r1 + arabic-typographer r1 fixes; ADR-002 F24 / GL-SS / RT5 / FX2, ADR-003 T-A / LK-F)", "",
     "Generated by `python3 -I studio/scripts/lookdev_r2_report.py` from `data/renders/lookdev/r2/timings_*.json`; renders by `studio/scripts/lookdev_r2_render.mjs <plate|stills|motion>` through `dc q submit` only.",
     "All frames 1920x1080, 24 fps, `--gl=swiftshader`, T-A, FX2 standard unless marked hero (= the baked P10 plate + live WebGL near field). Labels: 28 px floor for spoken/object labels, 18 px secondary (LK-F).",
     f"Contact sheet: `reports/lookdev/r2/contact.jpg` ({perf['contact_sheet']['kb']} KB). Perf: `reports/lookdev/r2/perf.json`. Not scored here (the author does not grade its own work).", "",
     "### Critic r1 issues -> r2 (ordered by impact, as in `critic_r1.md`)", "",
     "| # | Issue | r2 change |", "|---|---|---|",
     "| 1 | F7 composition / legibility | camera pushed 1.4x (dist 11.8 -> 8.4, target re-centred); emissive window grid on every tower face (bright signal on the lit district, warm on learned, dim ink on dark); a 30-34 px tag on every district with the canon CH-01 movement name and number (`1 الجهاز` ... `7 الدليل`), placed under each district's projected footprint; three fog planes between rows; the current metro route glows (20 px bloom stroke). The `SQL` chip on district 4 (المنصة) was wrong and is now `Kafka` (CH-26, act Big data): the act -> movement mapping is a layout assumption for the fact-checker |",
     "| 2 | F4/MB cost (Bloom under swiftshader) + title mask | nebula + 1,500 GL points + Bloom are baked once into P10 plates (`PL-GalaxyPush` 240 f MP4, `PL-GalaxyFinal` PNG, `data/derived/plates/`, `lookdev_r2_render.mjs plate`); probe, links, cards and caption stay live; the plate sits under the text-safe mask with screen blend. Hero = plate + 360 live near-field GL points, no EffectComposer. Title mask starts at x 720 (left edge of `لموضع` minus 24 px) |",
     "| 3 | MB-standard f0-f102 out-of-focus discs | the plate carries sharp GL point sprites from f0 (no SVG sprite field, no fake DOF on the far plane) |",
     "| 4 | F8 flat circles, empty top, low row | camera yawed from f0 and never front-on (-0.78 -> -0.30 rad, dist 13.6 -> 10.8, target shifted 0.8 to keep the near gate in frame); gates 1.3x, row at 50 % height; each gate has an inner dashed ring + inner ring and a vertical light cone from above; F8 is taken at on(w:000045) + 7, after the label wipe completes |",
     "| 5 | F2/F3 still diagrams | standard-tier camera on both (eased 4 % push + track, far plane at 0.35x); F2: rows 1004/1010 tumble out of WHERE (ballistic arc, spin, 4-sample trail; still at f22); F3: messages 8-11 slide from the producer into P0 with a light trail (still at f36), P1/P2 rows wholly defocused (blur 1.25x / 1.9x DOF) |",
     "| 6 | F5 label collision, upper-left void | both stack labels raised 40 px (baseline >= 24 px above the slab top); the upper-left carries the `layer cache` chip and 5 s / 57 s bars to scale |",
     "| 7 | F6 ghost numeral, dim captions | ghost `0.165` at 6 % (cap 8 %), blur 8 px, moved below the phrase; captions under the numbers in ink at 85 % |",
     "| 8 | F1 dead zone, flat table, static paths | narration line `ست عمليات دفع من NilePay` moved to the upper-left at 48 px; table header 28 px ink2; 2 x 36 seeded light particles travel the receipt paths (still at f40); box interior light rises to the lip (gradient over the opening) |",
     "| 9 | MA no camera, weak impact | 3 % push + 40 px track over the shot, far plane = blurred galaxy plate at 0.4x + floor grid at 0.5x; the query caption carries over from f0 and leaves as أعلى arrives; impact on وغلط = 3-frame light burst (hot core, lands with the word) + 3-frame hard glow/brightness flash + nudge (light only, no CA on Arabic); P11 hooks exported as `MA_SFX_HOOKS` (word id + lead 3 f) |",
     "| 10 | MC near-black dip at f119-f120 | the last 2 frames before the cut carry 20 % of the incoming scene's light; the incoming scene runs on its own clock from the cut |", "",
     "### Arabic-typographer r1 -> r2", "",
     "| # | Item | r2 change |", "|---|---|---|",
     "| B1 | F5 `بترتيب layers عاقل` on the slab | raised 40 px with the left label (see critic 6) |",
     "| B2 | F2 subtitle 42 chars on 1 line | `breakCaption()` (<= 32 visible chars, <= 2 lines, word boundaries only, top-heavy balance, ` \\| ` forces a break, throws on overflow) -> `SQL مش بتشتغل بالترتيب` / `اللي إنت كاتبها بيه`; Title subtitles always go through it |",
     "| B3 | F4/MB query caption 41 chars | `ArCaption` (one KWord per line, stagger 4 f) -> `إزاي أمنع job إنها تحمّل` / `نفس الصفوف مرتين`, block line-height 1.6 (`blockLineHeight`, shadda present) |",
     "| 4 | `5 ثوانٍ` (MSA tanween) | display override `CH-34:labels_ar:0` -> `5 ثواني مقابل 57` in `studio/src/type/overrides.ts`; canon untouched; status **pending-council** (egyptian-arabic lens) |",
     "| 5 | inline Latin style | rule L1 (`latinFamily`, `labelRole`): Latin inside an Arabic sentence = Inter Tight, same colour and size; mono only for chips, code and pure-Latin data labels. Applied to `Label`, F4 cards, MA |",
     "| 6 | `roadmap` article | display override on `w:S1:ar-natural:005968` -> `الـroadmap` (word id anchor unchanged); MA now matches F4/F6 |",
     "| 7 | F4 note 30 px at 4.5:1 | 32 px ink2 |",
     "| 8 | F2 chip gloss ~25 px | `TermChip glossSize` 32 px |",
     "| 9 | F6 ghost | 6 % and below the phrase |",
     "| 10 | F8 mid-wipe | F8 frame moved to after the wipe completes |",
     "| 11 | units | `withUnit()` freezes EGP, %, ms, s, rows: Latin, after the number, one LTR isolate, U+2212 for negatives |",
     "| 12 | arrows | `assertArrows()` rejects `→` between Arabic blocks outside an isolate (use `←`) |",
     "", "Type checks: `bash studio/scripts/check_type.sh` (now 34 assertions incl. caption breaking, L1, arrows, units, overrides; all pass). `tsc --noEmit` clean.", "",
     "### Other r2 code changes", "",
     "- `textSafeMask`: the feGaussianBlur feather (re-rasterised every frame when a card moves) is replaced by 10 nested rounded rects composited with `mix-blend-mode: multiply` (linear ramp across 1.75 x pad; overlapping holes multiply). A first 4-ring version read as hard dark panels around the F4 title and chip. Cost vs a single hard rect: +8.7 % CPU on MB-standard (`perf.json` `mask_ab_mb_standard`).",
     "- Kit: `push()` (standard-tier camera), `Burst`, `ArCaption`, `KWord flashFrames`, `Plane post`, `TermChip glossSize`; F3 takes a `t0` clock; `mbCam()` is shared by the plate and the live overlay so they stay locked.",
     "- `lookdev_r2_render.mjs`: `plate` mode bakes the P10 plates; stills/motion copy them into the bundle; F8/F9 are frames of `LD-MD-Gates`.", "",
     "### Stills", "", "| Still | Family | Tier | Frame | Render s | Load avg (1 min) | JPG (KB) |", "|---|---|---|---|---|---|---|"]
for k, v in perf["stills"].items():
    L.append(f"| `{k}` | {FAM[k.split('-')[0]]} | {v['fx']} | {v['frame']} | {v['still_s']:.2f} | {v['loadavg_1m']:.1f} | `{v['preview']}` ({v['kb']}) |")
L += ["", "### Motion tests (h264 crf 18, concurrency 3, 24 fps; 8-frame strips) vs the ADR-002 budget", "",
      "| Test | Tier | Frames | s/frame/slot | **box s/frame** | budget | within | r1 box | Load avg (1 min) | Strip (frames) |", "|---|---|---|---|---|---|---|---|---|---|"]
for k, v in m.items():
    L.append(f"| {k} | {v['props']['fx']} | {v['frames']} | {v['s_per_frame']:.3f} | **{v['s_per_frame_box']:.3f}** | {v['budget_box_s_per_frame']} ({v['budget_ref']}) | {'yes' if v['within_budget'] else '**no**'} | {perf['r1_box_s_per_frame'].get(k, 'n/a')} | {v['loadavg_1m']:.1f} | `{v['strip']}` ({', '.join(map(str, v['strip_frames']))}) |")
L += ["", *[f"- **{t}**: {n}" for t, n in NOTE.items()], "",
      "### Findings (for render-ops and the critic; not a verdict)", "",
      f"- **Load.** Every motion number was measured under load: 3 render slots on 4 vCPU plus other agents' queue jobs (story lock, G5 verification) and one out-of-queue process (~1.3 cores) running at the same time; 1-min load averages 6-7.4 are in the table. Treat them as upper bounds; render-ops re-measures on the first chapter.",
      f"- **Blended (RT5, 5 % hero):** standard mean {b.get('standard_mean_box_s_per_frame')} and hero {b.get('hero_box_s_per_frame')} box s/frame -> {b.get('blended_box_s_per_frame')} vs the R2 limit {b.get('R2_limit')} ({'within' if b.get('within_R2') else '**over**'}). MA ({m.get('MA-standard', {}).get('s_per_frame_box')}) is within R5 0.201; MC, MD and MB-standard are over it under this load (R5 trigger for FX2 -> FX3 is a render-ops measurement at the first chapter render, not this table).",
      f"- **MB cost moved from GL to DOM.** MB-hero: {perf['r1_box_s_per_frame']['MB-hero']} -> {m.get('MB-hero', {}).get('s_per_frame_box')} box s/frame (inside the ADR-002 H band); MB-standard: {perf['r1_box_s_per_frame']['MB-standard']} -> {m.get('MB-standard', {}).get('s_per_frame_box')}. The plate itself costs {pl.get('s_per_frame_box', 'n/a')} box s/frame once ({pl.get('wall_s', 'n/a')} s for 10 s) and is reused. What is left in MB-standard is the live DOM layer (cards, glass, glow text-shadows, moving masks) over a decoded video, not the field.",
      "- **Hero vs standard is now nearly invisible in stills.** With the field baked, F4-hero differs from F4-standard only by 360 live near-field points; MB-hero adds parallax of those points against the plate. Under RT5 the hero budget is better spent on shots that need live 3D (camera paths decided at P8), not on the galaxy.",
      "- **Content flags (unchanged from r1 + new):** district tags are canon CH-01 movement names, but which act belongs to which district (the lit district 4 = المنصة with a `Kafka` chip) is a layout assumption; offsets in F3 and galaxy positions in F4 remain schematic; the `5 ثواني` override awaits the egyptian-arabic lens.",
      "- **Not done here:** critic re-score of G6a and the arabic-typographer re-check of B1-B3; P7 schemas, Demo/snapshot baselines and `reports/perf/components.json`.", ""]
rd = (ROOT / "reports/lookdev/README.md").read_text()
cut = rd.find("## r2 (")
rd = (rd[:cut].rstrip() + "\n\n") if cut >= 0 else rd.rstrip() + "\n\n"
(ROOT / "reports/lookdev/README.md").write_text(rd + "\n".join(L) + "\n")
print("README r2 section written")
