#!/usr/bin/env python3
"""P6 look-dev r3 report: JPG stills (<= 400 KB), 8-frame motion strips, contact sheet, perf JSON, README r2 section.
Reads data/renders/lookdev/r3/timings_*.json (studio/scripts/lookdev_r3_render.mjs). Run: python3 -I studio/scripts/lookdev_r3_report.py"""
import io, json, os, subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
REN = ROOT / "data/renders/lookdev/r3"
OUT = ROOT / "reports/lookdev/r3"
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
    "MA": [0, 4, ma[5968][0] + 3, I, I + 1, I + 3, ma[5974][1] + 2, ma[5979][0] + 4],
    "MB": [round(i * 239 / 7) for i in range(8)],
    "MC": [108, 112, 115, 118, 119, 120, 121, 123],  # cut at 120 (5.0 s); 20 % incoming light at 118-119; clean by 123
    "MD": [0, 20, md[36][0] + 4, md[42][0] + 4, md[45][0] + 7, md[50][0], md[50][0] + 2, 287],
}
NOTE = {
    "MA": "CH-33 S1 3768.8-3778.8 s on word ids w:S1:ar-natural:005965-005980 (lead 2 f); 3 % push + 40 px track; far plane = galaxy plate drawn at 1/4 size and scaled 4x (static defocus, opens at 45 % and settles to 30 %); r3 opening subject = the carried-over query at 56 px mid-frame + the empty score track (fills to 0.165 while it is spoken); impact on وغلط = 3-frame burst + flash + nudge (no CA on Arabic)",
    "MB": "baked P10 plate read as a 240-frame JPG sequence (r3; was OffthreadVideo) under the r3 sprite text-safe mask (Gaussian feather to 2.5 x pad, chip/cards/caption keep a 30-35 % field floor); live probe, links, cards, caption; hero adds 360 live GL points as an out-of-focus FOREGROUND (200 specks, 110 soft discs, 50 large bokeh) above the probe layer",
    "MC": "whip-pan SQL funnel -> Kafka, 12 frames (9 out, 3 in); 20 % incoming light on cut-2..cut-1; r3: F2 dots glow with halo discs (no per-dot drop-shadow), 28 px stage chips, two-column 28 px SQL band; F3 P1/P2 rows lighter defocus",
    "MD": "TripleGate ignition on S1 CH-00 words (w:000036-000045); yawed push; r3: ghost carry-over title (w:000027-000033) from f0, dormant gates breathe from f0, floor reflections, 4 travelling packets that queue at the first dark gate, leader ticks label->gate, all-gate flare + 1-frame nudge + burst on كلها; no CSS blur filters",
}
BUDGET = {"R5_standard_box_s_per_frame": 0.201, "H_band_box_s_per_frame": [0.904, 1.038], "R2_blended_box_s_per_frame": 0.240, "RT5_hero_share": 0.05,
          "source": "docs/decisions/ADR-002-render-stack.md (cost model S/H, R2, R5)"}

perf = {"v": 1, "phase": "P6", "round": "r3", "resolution": "1920x1080", "fps": FPS, "gl": "swiftshader", "box": f"{os.cpu_count()} vCPU, no GPU",
        "tokens": "studio/src/tokens.ts (ADR-002 F24 + FX2 + RT5, ADR-003 T-A + LK-F)",
        "definitions": {"s_per_frame": "(wall - overhead) x concurrency / (frames - 1): seconds per frame per render slot",
                        "box_s_per_frame": "(wall - overhead) / (frames - 1): whole-box seconds per frame, measured with 3 render slots busy (under load)",
                        "fps_throughput": "(frames - 1) / (wall - overhead), whole box", "still_s": "renderStill wall per still, one browser, bundle excluded"},
        "budget": BUDGET, "r2_box_s_per_frame": {"MA-standard": 0.1969, "MB-standard": 0.3412, "MB-hero": 0.51, "MC-standard": 0.2192, "MD-standard": 0.2518},
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
    perf["stills"][k] = {"still_s": round(v["s"], 3), "comp": v.get("comp"), "frame": v.get("frame"), **v["props"], "loadavg_1m": round(v["loadavg"][0], 2), "preview": f"reports/lookdev/r3/stills/{k}.jpg", "kb": kb, "px": px, "q": q}

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
                         "strip": f"reports/lookdev/r3/strips/{k}.jpg", "strip_frames": idx, "strip_kb": kb, "note": NOTE[test]}
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
perf["contact_sheet"] = {"path": "reports/lookdev/r3/contact.jpg", "kb": kb, "px": px}
(OUT / "perf.json").write_text(json.dumps(perf, indent=1, ensure_ascii=False))
print(json.dumps({k: v["still_s"] for k, v in perf["stills"].items()}, indent=0))
print(json.dumps({k: [v["s_per_frame"], v["s_per_frame_box"], v["within_budget"]] for k, v in perf["motion"].items()}, indent=0), perf.get("blended"))

# r3 perf attribution: MB-standard, first 72 frames, 3 slots, ablating one layer at a time (bench mode; not deliverables)
bench = {"run1_mp4_plate": {"none": 0.2085, "blend": 0.1601, "video(still png)": 0.1136, "grain": 0.1557, "post": 0.1544, "mask": 0.1648, "loadavg_1m": "2.6-6.1"}}
for name in ("bench_mb2", "bench_mc", "bench_md"):
    j = load(f"{name}.json")
    if j:
        bench[name] = {k.split(":")[1]: v["s_per_frame_box"] for k, v in j["items"].items()}
perf["bench_r3"] = {**bench, "reading": "plate video decode ~0.05-0.095, grain overlay ~0.05, screen blend ~0.05, mask ~0.04 box s/frame; the JPG sequence (seq) took MB-standard 0.209 -> 0.157 in the same run; a normal-blend grain gave no gain and was reverted",
                    "definition": "box s/frame over frames 1..71 minus a 1-frame overhead render; 'warm' = first (cold-cache) run, discarded"}
(OUT / "perf.json").write_text(json.dumps(perf, indent=1, ensure_ascii=False))

# ---------- README r3 section (replaces any previous r3 section; earlier rounds are kept) ----------
FAM = {"F1": "Cold open: receipts -> glowing table (CH-00)", "F2": "SQL row-count funnel, WHERE 13 -> 11 (CH-11)", "F3": "Kafka partitions, offsets, lag (CH-26, schematic offsets)",
       "F4": "RAG vector galaxy 0.165 -> 0.227 (CH-33)", "F5": "Docker layer cache 5 s vs 57 s (CH-34)", "F6": "Kinetic type only (CH-33)", "F7": "A-01 Holo-City (7 movements)",
       "F8": "TripleGate ignition, frame of MD (reveal complete)", "F9": "Orbit + kinetic Arabic word, frame of MD"}
m = perf["motion"]
b = perf.get("blended", {})
L = ["## r3 (critic r2 + arabic-typographer r2 fixes; ADR-002 F24 / GL-SS / RT5 / FX2, ADR-003 T-A / LK-F 28/18 px)", "",
     "Generated by `python3 -I studio/scripts/lookdev_r3_report.py` from `data/renders/lookdev/r3/timings_*.json`; renders by `studio/scripts/lookdev_r3_render.mjs <plate|seq|stills|motion|bench>` through `dc q submit` only.",
     "Code: partial r3 WIP commit e4ea0bc reviewed and kept (one fix: a misplaced doc comment in `type/arabic.ts`), then completed here. All frames 1920x1080, 24 fps, `--gl=swiftshader`, T-A, FX2 standard unless marked hero.",
     f"Contact sheet: `reports/lookdev/r3/contact.jpg` ({perf['contact_sheet']['kb']} KB). Perf: `reports/lookdev/r3/perf.json`. Not scored here (the author does not grade its own work).", "",
     "### Critic r2 -> r3", "",
     "| # | Issue | r3 change |", "|---|---|---|",
     "| 1 | F4/MB dark rectangle behind `cosine similarity` (x460-555) | `textSafeMask` rewritten: one Gaussian-feathered hole sprite per box size, rasterised once per tab on a half-res canvas and reused every frame (moving boxes only change `mask-position`); ramp from +0.25 pad (core) to **+2.5 pad** (was 1.75); boxes with their own opaque surface keep part of the field behind them (`Rect.floor`: chip 0.3, cards 0.35, caption 0.3); the chip rect now matches the pill (420 -> 350 px wide), which removed the starless box right of it; title scrim strength 0.5 |",
     f"| 2 | Cost over R5 (MB-standard 0.341, MC 0.219, MD 0.252) | (a) the 10-ring SVG mask is gone (cached alpha sprites, see 1); (b) the MB push plate is read as a pre-extracted 240-frame JPG sequence (`seq` mode, ffmpeg q2, 25 MB in `data/derived/plates/galaxy-ch33-push/`) instead of `OffthreadVideo` (bench: 0.209 -> 0.157 box s/frame, same run); `toneMapped=false` on the remaining OffthreadVideo path; (c) per-element CSS `drop-shadow`/`blur` filters removed from the probe overlay, F2 dots, MD rings, cones, pools and stream sprites (glow = wide low-alpha strokes + radial-gradient halo discs); MD ground no longer blurred; MA far plate drawn at 1/4 size and scaled 4x (static defocus, no per-frame blur). Result under 3-slot load: MB-standard **{m.get('MB-standard', {}).get('s_per_frame_box')}**, MC **{m.get('MC-standard', {}).get('s_per_frame_box')}**, MD **{m.get('MD-standard', {}).get('s_per_frame_box')}**, MA **{m.get('MA-standard', {}).get('s_per_frame_box')}** vs R5 0.201. Card layers were not separately cached: the bench showed the overlay at ~0.01-0.03 (no measurable gain) |",
     "| 3 | MB-hero indistinguishable from standard | the 360 live GL points are now an out-of-focus **foreground** between the camera and the probe (200 sharp specks, 110 soft discs, 50 large lens-bokeh discs with a faint rim; seeded; half placed for the opening camera, half for the final one); mounted above the probe overlay, so the push sweeps them across and out of frame faster than the plate (real parallax); masked out of every text box like the plate |",
     "| 4 | F8 empty top, flat gates, labels not tied to gates | the line spoken just before the window (S1 w:000027-000033, `carry_over` in the window JSON) holds the title slot as a ghost from f0 (90 % -> 50 %, out 6 f before دي); every gate has a mirrored floor reflection (ring + portal) and a contact pool; two-layer light cone (core + skirt, no blur); 4 bright packets with trails travel gate to gate, queue at the first dark gate and are released as each gate ignites; a leader tick hangs each label from its gate |",
     "| 5 | F7 tag overlap, floating Kafka chip, `الـAI`, empty upper-left | district tags are placed collision-aware (below the footprint, then above the roofs, then left/right; first slot clear of every other district's screen bbox, the title and the Kafka chip), with a thin leader to the district station when moved; 32 px (36 px lit); the Kafka chip hangs from a station pin on the glowing route into district 4; `الـAI` gets the J1 join gap (arabic B1); a far skyline ring (110 dim silhouettes) and a violet haze band fill the upper frame |",
     "| 6 | MA f4-f34 and MD f0-f33 openings near-empty | MA: the carried-over query (w:005957-005964) is the opening subject at 56 px mid-frame (was a 40 px corner caption), the far plate opens at 45 % and settles to 30 %, and the empty score track sits on screen from f0 (pulsing), filling to 0.165 while it is spoken. MD: ghost carry-over title from f0 (see 4) + dormant gates breathe (standby glow) from f0 + packets moving from f0 |",
     "| 7 | F2/F3 still widgets, F5 offset | F2: the query spans the bottom band (x120-1800) in two 28 px mono columns, current clause lit (was a 20 px panel at x1090-1790); F3: P2 row 0.66 scale, blur 0.7x DOF, brightness 1.2 (legible defocus), P1 0.5x; message trail 2x (20 px band, full-alpha head, white core line); F5: the 4-layer stack is lifted one pitch so both stack tops share the label line |",
     "| 8 | pending non-critic items | unchanged: `5 ثواني مقابل 57` override awaits Council (egyptian-arabic); F7 act -> movement mapping and Kafka on district 4 await the fact-checker |", "",
     "### Arabic-typographer r2 -> r3", "",
     "| # | Item | r3 change |", "|---|---|---|",
     "| B1 | `الـAI` reads `AIJI` | rule J1 in `type/arabic.ts` (`joinGapEm`, `JOIN_GAP`): a Latin isolate after a tatweel join gets a gap on the side facing the Arabic prefix (physical right edge of the LTR isolate = the RTL inline-start side): 0.12em for ALL-CAPS/digit isolates, 0.06em for other Latin. Applied centrally in `Mix`, so every الـ+Latin join (F3 title, F4 cards, F6 labels, MA, F7 tags) gets it. 4 new unit checks |",
     "| B2 | F2 stage chips 24 px | 28 px (padding 6/10 px; fits the 172 px pitch) |",
     "| R | F5 bar units at number size | `s` at 0.42em in ink2, no glow (frozen rule 11), like the big counters |",
     "| A | F6 labels left-aligned | three-column grid; each caption centred under its own number |",
     "| A | U+2212 drawn short in F3 | the minus in the F3 formula is set in a Latin isolate (`⟦−⟧`, Inter Tight) |",
     "| A | CH-34 tanween override; `dc qa arabic` / fontTools missing; mid-wipe frames | unchanged / out of scope for P6 (P9 tool); r3 strips mark mid-wipe frames only as motion evidence, not style stills |", "",
     "Type checks: `bash studio/scripts/check_type.sh` (all pass, incl. 4 J1 checks). `tsc --noEmit` clean.", "",
     "### Stills", "", "| Still | Family | Tier | Frame | Render s | Load avg (1 min) | JPG (KB) |", "|---|---|---|---|---|---|---|"]
for k, v in perf["stills"].items():
    L.append(f"| `{k}` | {FAM[k.split('-')[0]]} | {v['fx']} | {v['frame']} | {v['still_s']:.2f} | {v['loadavg_1m']:.1f} | `{v['preview']}` ({v['kb']}) |")
L += ["", "### Motion tests (h264 crf 18, concurrency 3, 24 fps; 8-frame strips) vs the ADR-002 budget", "",
      "| Test | Tier | Frames | s/frame/slot | **box s/frame** | budget | within | r2 box | Load avg (1 min) | Strip (frames) |", "|---|---|---|---|---|---|---|---|---|---|"]
for k, v in m.items():
    L.append(f"| {k} | {v['props']['fx']} | {v['frames']} | {v['s_per_frame']:.3f} | **{v['s_per_frame_box']:.3f}** | {v['budget_box_s_per_frame']} ({v['budget_ref']}) | {'yes' if v['within_budget'] else '**no**'} | {perf['r2_box_s_per_frame'].get(k, 'n/a')} | {v['loadavg_1m']:.1f} | `{v['strip']}` ({', '.join(map(str, v['strip_frames']))}) |")
L += ["", *[f"- **{t}**: {n}" for t, n in NOTE.items()], "",
      "### Findings (for render-ops and the critic; not a verdict)", "",
      "- **Load.** Motion numbers were measured with 3 render slots busy on 4 vCPU (1-min load 4.7-8.1, in the table); the queue ran no other job at the time, so they are less contended than r2 (load 6-7.4 plus an out-of-queue process). Part of the r2 -> r3 drop is that; the bench (`perf.json` `bench_r3`) isolates the code changes on MB.",
      f"- **Blended (RT5, 5 % hero):** standard mean {b.get('standard_mean_box_s_per_frame')} and hero {b.get('hero_box_s_per_frame')} -> {b.get('blended_box_s_per_frame')} box s/frame vs the R2 limit {b.get('R2_limit')} ({'within' if b.get('within_R2') else '**over**'}).",
      "- **Where MB time goes (bench, 72 f):** plate decode ~0.05 (JPG seq) to ~0.095 (OffthreadVideo), film grain overlay ~0.05, screen blend of the plate ~0.05, text-safe mask ~0.04 box s/frame. A normal-blend grain was tried and gave no gain (reverted; grain look unchanged).",
      "- **New artefact:** `data/derived/plates/galaxy-ch33-push/0001-0240.jpg` (P10 plate as a JPG sequence; regenerate with `lookdev_r3_render.mjs seq`).",
      "- **Not done here:** critic re-score of G6a, arabic-typographer re-check (B1 legibility at 32 px should be re-OCR'd), fact-checker items; P7 schemas, Demo/snapshot baselines and `reports/perf/components.json`.", ""]
rd = (ROOT / "reports/lookdev/README.md").read_text()
cut = rd.find("## r3 (")
rd = (rd[:cut].rstrip() + "\n\n") if cut >= 0 else rd.rstrip() + "\n\n"
(ROOT / "reports/lookdev/README.md").write_text(rd + "\n".join(L) + "\n")
print("README r3 section written")
