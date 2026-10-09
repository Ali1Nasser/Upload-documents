#!/usr/bin/env python3
"""P6 look-dev r1 report: JPG stills (<= 400 KB), 8-frame motion strips, contact sheet, perf JSON, README r1 section.
Reads data/renders/lookdev/r1/timings_*.json (studio/scripts/lookdev_r1_render.mjs). Run: python3 -I studio/scripts/lookdev_r1_report.py"""
import io, json, os, subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
REN = ROOT / "data/renders/lookdev/r1"
OUT = ROOT / "reports/lookdev/r1"
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
ma_exit = round((3776900 - 3768800) * FPS / 1000)
STRIP = {
    "MA": [ma[5965][0] + 3, ma[5968][0] + 3, ma[5975][0] + 1, ma[5976][0], ma[5976][0] + 3, ma[5974][1] + 2, ma_exit + 5, ma[5979][0] + 4],
    "MB": [round(i * 239 / 7) for i in range(8)],
    "MC": [108, 112, 115, 118, 119, 120, 121, 123],  # cut at 120 (5.0 s); clean by 123 (cut + 3)
    "MD": [md[36][0] + 4, md[38][0], md[42][0] + 4, md[45][0] + 2, md[45][0] + 10, md[48][0] + 3, md[50][0] + 2, 287],
}
NOTE = {
    "MA": "CH-33 S1 3768.8-3778.8 s; impact words on word ids w:S1:ar-natural:005965-005980 (lead 2 f); 0.165 counter lands on the end of خمسة and leaves with its phrase",
    "MB": "galaxy push 17 -> 7.4 units + 0.5 rad orbit + parallax planes; 1,500 points; text-safe masks; roadmap card dims to 60 % (ghost) beside the new 0.227 hit",
    "MC": "whip-pan SQL funnel -> Kafka, 520 ms total = 12 frames at 24 fps: 9 frames out, 3 frames in; incoming scene clean (no blur, streak or wash) from cut + 3",
    "MD": "TripleGate ignition on S1 CH-00 words (تجيب / تثق / تجاوب, w:000036-000045) with a camera push + 0.6 rad orbit, then the kinetic phrase دي الشغلانة كلها (w:000048-000050, impact on كلها)",
}

perf = {"v": 1, "phase": "P6", "round": "r1", "resolution": "1920x1080", "fps": FPS, "gl": "swiftshader", "box": f"{os.cpu_count()} vCPU, no GPU",
        "tokens": "studio/src/tokens.ts (ADR-002 F24 + FX2, ADR-003 T-A)",
        "definitions": {"s_per_frame": "(wall - overhead) x concurrency / (frames - 1): seconds per frame per render slot",
                        "fps_throughput": "(frames - 1) / (wall - overhead), whole box", "still_s": "renderStill wall per still, one browser, bundle excluded"},
        "r0_s_per_frame_30fps": {"MA-standard": 0.398, "MB-standard": 0.606, "MB-hero(4k pts)": 2.712, "MC-standard": 0.647},
        "stills": {}, "motion": {}}

st = load("timings_stills.json")
part = load("timings_stills_partial.json")
if st and part:
    st["items"].update(part["items"])
for k, v in sorted((st or {"items": {}})["items"].items()):
    kb, px, q = save_jpg(Image.open(ROOT / v["png"]).convert("RGB"), OUT / "stills" / f"{k}.jpg")
    perf["stills"][k] = {"still_s": round(v["s"], 3), "comp": v.get("comp"), "frame": v.get("frame"), **v["props"], "preview": f"reports/lookdev/r1/stills/{k}.jpg", "kb": kb, "px": px, "q": q}

mo = load("timings_motion.json") or {"items": {}, "concurrency": 3}
mp = load("timings_motion_partial.json")
if mp:
    mo["items"].update(mp["items"])
for k, v in mo["items"].items():
    test = k.split("-")[0]
    idx = sorted({min(v["frames"] - 1, max(0, n)) for n in STRIP[test]})  # ffmpeg select emits in stream order
    ims = frames(ROOT / v["mp4"], idx)
    strip = Image.new("RGB", (4 * 480, 2 * 270), (5, 7, 11))
    d = ImageDraw.Draw(strip)
    for i, im in enumerate(ims):
        x, y = (i % 4) * 480, (i // 4) * 270
        strip.paste(im, (x, y))
        lab = f"{k} f{idx[i]} {idx[i] / FPS:.2f}s"
        d.rectangle([x, y, x + 16 + d.textlength(lab, font=font), y + 30], fill=(5, 7, 11))
        d.text((x + 8, y + 4), lab, fill=(230, 237, 243), font=font)
    kb, px, q = save_jpg(strip, OUT / "strips" / f"{k}.jpg")
    perf["motion"][k] = {**{x: v[x] for x in ("comp", "props", "frames", "fps", "wall_s", "overhead_s", "fps_throughput", "s_per_frame", "s_per_frame_box", "mp4", "mb") if x in v},
                         "concurrency": mo.get("concurrency", 3), "strip": f"reports/lookdev/r1/strips/{k}.jpg", "strip_frames": idx, "strip_kb": kb, "note": NOTE[test]}

# contact sheet: the 10 stills (4 x 3) at 480 x 270
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
perf["contact_sheet"] = {"path": "reports/lookdev/r1/contact.jpg", "kb": kb, "px": px}
(OUT / "perf.json").write_text(json.dumps(perf, indent=1, ensure_ascii=False))
print(json.dumps({k: v["still_s"] for k, v in perf["stills"].items()}, indent=0))
print(json.dumps({k: [v["s_per_frame"], v["fps_throughput"], v["wall_s"]] for k, v in perf["motion"].items()}, indent=0))

# ---------- README r1 section (replaces any previous r1 section; the r0 text above it is kept) ----------
FAM = {"F1": "Cold open: NilePay receipts -> glowing table (CH-00)", "F2": "SQL row-count funnel, WHERE 13 -> 11 (CH-11)",
       "F3": "Kafka partitions, offsets, lag (CH-26, schematic offsets)", "F4": "RAG vector galaxy 0.165 -> 0.227 (CH-33)",
       "F5": "Docker layer cache 5 s vs 57 s (CH-34)", "F6": "Kinetic type only (CH-33)", "F7": "A-01 Holo-City (new, critic issue 10)",
       "F8": "TripleGate ignition, frame of MD (new, issue 10)", "F9": "Orbit + kinetic Arabic word, frame of MD (new, issue 10)"}
la = lambda v: f"{v['loadavg'][0]:.1f}" if v.get("loadavg") else "n/a"
L = ["## r1 (critic r0 fixes, ADR-002 F24 + FX2, ADR-003 T-A)", "",
     "Generated by `python3 -I studio/scripts/lookdev_r1_report.py` from `data/renders/lookdev/r1/timings_*.json`; renders by `studio/scripts/lookdev_r1_render.mjs` through `dc q submit` only.",
     "All frames: 1920x1080, **24 fps**, `--gl=swiftshader`, typography **T-A** only, FX tier **standard (FX2)** unless marked hero (= R3F WebGL + Bloom, 1,500-point cap).",
     f"Contact sheet: `reports/lookdev/r1/contact.jpg` ({perf.get('contact_sheet', {}).get('kb', 'n/a')} KB). Perf: `reports/lookdev/r1/perf.json`. Not scored here (the author does not grade its own work).", "",
     "### What changed in code", "",
     "- `studio/src/tokens.ts` is now the frozen token set: palette, 24 fps lead-frame table, T-A faces, type scale (28 px spoken / 18 px secondary floors), line metrics, FX tiers lite / standard / hero (FX2: standard = glow 10/32, grain 1.5 %, vignette 15 %, haze 8 %, CA 0.6 px; hero adds WebGL bloom 1.0; particle cap 1,500; text-safe masks on), easing and presets. `src/lookdev/theme.ts` only re-exports it.",
     "- `studio/src/type/arabic.ts`: runs/isolates (`segment`), face rule (Alexandria 700 only >= 56 px, else Plex Sans Arabic 600 + 0.08 em word-spacing), **tashkeel descender-clearance rule** (T1: line-height >= 1.6 on any line with diacritics; T2 `stackGap`: title->subtitle +0.3 em always, plus lower-mark / upper-mark clearance for lines set tighter than 1.6), **U+2212 minus** (`minus()`, `assertFormula()`), canvas auto-fit `fitSize()` and DOM `overflows()`. `ArStack.tsx` applies T1/T2 to stacked lines. Checks: `bash studio/scripts/check_type.sh` (18 assertions, all pass).",
     "- CA is applied only to Latin and numeral impact runs (`caShadow`), never to an Arabic run (KWord passes it to Latin isolates only; `Counter impact`).",
     "- Depth kit: `Plane` (parallax plane with fake DOF), `Haze`, `Scrim`, `textSafeMask` (feathered SVG mask over particles / nebula / GL canvas for every text box + 36 px padding).", "",
     "### Critic r0 issues -> r1", "",
     "| # | Issue | r1 change |", "|---|---|---|",
     "| 1 | F3 flat, widget-like | P2 far plane at 60 % scale + blur, P1 mid plane 80 %, crisp P0 with violet haze between; cells 1.4x (118x112), digits 28 px; `lag = 11 − 7 = 4` is the hero element (72 px + 150 px count-up `Counter a/b`, to be anchored to a word id in the spec) with a bloomed bracket; formula box fits its text and holds the consumer-group chip; minus is U+2212 via `minus()` and set in Inter Tight so it reads as a true minus |",
     "| 2 | F5 ثوانٍ kasratan on the subtitle | `ArStack` + rule T1/T2 in `studio/src/type/` (title line-height 1.6, +0.3 em gap); stacks compacted so the stack labels clear the subtitle |",
     "| 3 | F4 legibility 4-5 | dimmed 0.165 card at 60 % (was 45 %), cards on 84 % dark glass; labels 36 px, notes 30 px, chunk chip 28 px; radial scrim behind the title; text-safe masks remove points, nebula and bloom from title, chip, caption and both cards (hero and standard) |",
     "| 4 | F2 imbalance and clipping | funnel 1.3x (34 px pitch, 13 px dots) across all nine stages (future stages as a dashed ghost envelope + ghost chips); dropped rows 1004/1010 fall out to the right of WHERE with callouts there; `13 → 11 rows` moved into the empty upper-right; SQL panel shrunk (20 px) to the bottom-right; nothing overlaps |",
     "| 5 | light and depth on type only | F1: rim light on the box edges, emissive lip, light from inside, under-light pools, receipts 1.5x, rows 5/6 lit by the receipt paths (no empty dashed rows), far plane + haze; F2/F3/F5/F6: far plane, haze band, foreground bokeh plane, under-light pools (F5) |",
     "| 6 | MA orphaned 0.165 | the counter exits with its phrase (same frame, same curve, blur-out); MB keeps the dimmed 0.165 card as a deliberate 60 % ghost beside the new 0.227 hit |",
     "| 7 | MC incoming blur / lifted black | asymmetric whip (520 ms = 12 frames): 9 frames out, 3 frames in; streak, glow and white wash are zero from cut + 3, and the white wash exists only before the cut |",
     "| 8 | C display too light | moot: T-A frozen (ADR-003); B and C are no longer rendered |",
     "| 9 | authored microcopy | every Arabic microcopy string is now verbatim S1 narration (`COPY` in `studio/src/lookdev/content.ts`, with word refs): `ست عمليات دفع من NilePay`, `علبة فيها فواتير`, `أرخص مكسب`, `SQL مش بتشتغل بالترتيب اللي إنت كاتبها بيه`, `بترتيب layers عاقل`, `نسخ الكود فوق تنصيب التبعيات`, `غيّر سطر واحد في الكود`, `أعلى نتيجة`, `وسّع الـquery بمرادفات`, `دي الشغلانة كلها`; gate labels are canon `labels_ar` of CH-00. Still needs the egyptian-arabic / fact-checker pass (S1 voice is ADR-001-dependent) |",
     "| 10 | missing frames | F7 Holo-City (7 districts, true-3D projected towers, metro routes, lit SQL district); MD motion test = TripleGate ignition on real S1 words + camera push/orbit + kinetic phrase; F8/F9 are MD frames |", "",
     "### Stills", "", "| Still | Family | Tier | Render s | Load avg (1 min) | JPG (KB) |", "|---|---|---|---|---|---|"]
for k, v in perf["stills"].items():
    L.append(f"| `{k}` | {FAM[k.split('-')[0]]} | {v['fx']} | {v['still_s']:.2f} | {la(st['items'][k])} | `{v['preview']}` ({v['kb']}) |")
L += ["", "### Motion tests (h264 crf 18, concurrency 3, 24 fps; 8-frame strips)", "",
      "| Test | Tier | Frames | s/frame/slot | box fps | wall s | Load avg (1 min) | Strip (frames) |", "|---|---|---|---|---|---|---|---|"]
for k, v in perf["motion"].items():
    L.append(f"| {k} | {v['props']['fx']} | {v['frames']} | {v['s_per_frame']:.3f} | {v['fps_throughput']:.2f} | {v['wall_s']:.1f} | {la(mo['items'][k])} | `{v['strip']}` ({', '.join(map(str, v['strip_frames']))}) |")
L += ["", *[f"- **{t}**: {n}" for t, n in NOTE.items()], "",
      "### Notes", "",
      "- **Hero variants.** Under FX2 the CSS values of the r0 hero are the standard tier, so a CSS-only hero would be pixel-identical to standard. ADR-002 allows hero only as real-time WebGL: rendered for F4 (still) and MB (motion), at the new 1,500-point cap with text-safe masks.",
      "- **Perf vs r0** (r0 at 30 fps, `reports/perf/lookdev.json`): MA 0.398, MB-standard 0.606, MB-hero 2.712 (4,000 points), MC 0.647 s/frame/slot. r1 numbers include the FX2 lift (glow 10/32 on all type, 14 bokeh discs, DOF planes, masks). The box was shared with other queue jobs during some measurements: the load-average column is recorded per item so the numbers can be read against it.",
      "- **Budget flag for render-ops (ADR-002 R5 input, not a verdict).** Box s/frame (1 / box fps) measured here: MA " + f"{1 / perf['motion'].get('MA-standard', {}).get('fps_throughput', 1):.3f}, MC {1 / perf['motion'].get('MC-standard', {}).get('fps_throughput', 1):.3f}, MD {1 / perf['motion'].get('MD-standard', {}).get('fps_throughput', 1):.3f}, MB-standard {1 / perf['motion'].get('MB-standard', {}).get('fps_throughput', 1):.3f}" + ". R5 names 0.201 box s/frame for the FX2 standard rate; MC, MD and MB-standard are above it in these look-dev tests, which ran while another queue job (story radio) shared the box. Re-measure on the first chapter render. The MB-standard cost is the masked 1,500-sprite SVG field with a drop-shadow filter; a P10 plate or a cheaper sprite path is the fix if it holds.",
      "- **Determinism.** All randomness is `random(seed)`; MA and MD resolve `{word, lead_frames}` (lead 2 frames at 24 fps) from S1 word maps in `studio/src/lookdev/data/`.",
      "- **Not done here:** critic re-score of G6a; component schemas, Demo/snapshot baselines and `reports/perf/components.json` (P7). Holo-City district geometry is a layout (no district names exist in canon; only the lit district carries a label).", ""]
rd = (ROOT / "reports/lookdev/README.md").read_text()
cut = rd.find("## r1 (")
rd = (rd[:cut] if cut >= 0 else rd.rstrip() + "\n\n")
(ROOT / "reports/lookdev/README.md").write_text(rd + "\n".join(L) + "\n")
print("README r1 section written")
