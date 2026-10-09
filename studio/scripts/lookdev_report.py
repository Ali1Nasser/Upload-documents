#!/usr/bin/env python3
"""P6 look-dev report: JPG previews (<= 300 KB), motion strips, contact sheet (<= 400 KB), reports/perf/lookdev.json.
# SUPERSEDED (r0): re-running rewrites reports/lookdev/README.md without the r1 section. Use lookdev_r1_report.py.
Reads data/renders/lookdev/timings_*.json written by studio/scripts/lookdev_render.mjs. Run: python3 -I studio/scripts/lookdev_report.py"""
import glob, io, json, os, subprocess, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
REN = ROOT / "data/renders/lookdev"
REP = ROOT / "reports/lookdev"
PERF = ROOT / "reports/perf/lookdev.json"
FONT = ROOT / "studio/public/fonts/JetBrainsMono-VF.ttf"
(REP / "stills").mkdir(parents=True, exist_ok=True)
(REP / "motion").mkdir(parents=True, exist_ok=True)


def save_jpg(im, path, cap):
    for w in (1600, 1440, 1280, 1120, 960):
        im2 = im if im.width <= w else im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        for q in (86, 80, 74, 68):
            b = io.BytesIO()
            im2.save(b, "JPEG", quality=q, optimize=True, progressive=True)
            if b.tell() <= cap:
                path.write_bytes(b.getvalue())
                return path.stat().st_size, im2.size
    raise SystemExit(f"cannot fit {path} under {cap}")


def load(name):
    p = REN / name
    return json.loads(p.read_text()) if p.exists() else None


def frames(mp4, idx):
    out = []
    for n in idx:
        r = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(mp4), "-vf", f"select=eq(n\\,{n})", "-frames:v", "1", "-f", "image2pipe", "-vcodec", "png", "-"], capture_output=True, check=True)
        out.append(Image.open(io.BytesIO(r.stdout)).convert("RGB"))
    return out


font = ImageFont.truetype(str(FONT), 22)
perf = {"v": 1, "phase": "P6", "resolution": "1920x1080", "fps": 30, "box": f"{os.cpu_count()} vCPU, no GPU",
        "definitions": {"s_per_frame": "(wall - overhead) x concurrency / (frames - 1): seconds per frame per render slot (bench definition, reports/perf/render_bench.md)",
                        "fps_throughput": "(frames - 1) / (wall - overhead), whole box",
                        "still_s": "renderStill wall per still, one browser, bundle excluded"},
        "stills": {}, "motion": {}}

st = load("timings_stills_swiftshader.json")
stp = load("timings_stills_swiftshader_partial.json")
if st and stp:  # latest re-render wins
    st["items"].update(stp["items"])
if st:
    for k, v in sorted(st["items"].items()):
        png = ROOT / v["png"]
        size, dims = save_jpg(Image.open(png).convert("RGB"), REP / "stills" / f"{k}.jpg", 300_000)
        perf["stills"][k] = {"gl": "swiftshader", "still_s": round(v["s"], 3), **v["props"], "preview": f"reports/lookdev/stills/{k}.jpg", "preview_kb": round(size / 1000, 1), "preview_px": list(dims)}
    # contact sheet: 6 families x 4 variants
    order = [f"{f}-{t}" for f in ["F1", "F2", "F3", "F4", "F5", "F6"] for t in ["A-standard", "B-standard", "C-standard", "A-hero"]]
    tw, th, pad, lab = 400, 225, 6, 28
    sheet = Image.new("RGB", (4 * (tw + pad) + pad, 6 * (th + lab + pad) + pad), (5, 7, 11))
    d = ImageDraw.Draw(sheet)
    for i, k in enumerate(order):
        if k not in st["items"]:
            continue
        im = Image.open(ROOT / st["items"][k]["png"]).convert("RGB").resize((tw, th), Image.LANCZOS)
        x = pad + (i % 4) * (tw + pad)
        y = pad + (i // 4) * (th + lab + pad)
        sheet.paste(im, (x, y + lab))
        d.text((x + 4, y + 2), f"{k}  {st['items'][k]['s']:.2f}s", fill=(159, 176, 189), font=font)
    size, dims = save_jpg(sheet, REP / "contact.jpg", 400_000)
    perf["contact_sheet"] = {"path": "reports/lookdev/contact.jpg", "kb": round(size / 1000, 1), "px": list(dims)}

for gl in ("swiftshader", "swangle"):
    m = load(f"timings_motion_{gl}.json") or {"items": {}, "concurrency": 3}
    part = load(f"timings_motion_{gl}_partial.json")
    if part:  # latest measurement wins (re-runs after a layout fix)
        m["items"].update(part["items"])
    if not m["items"]:
        continue
    for k, v in m["items"].items():
        key = f"{k}@{gl}"
        perf["motion"][key] = {"gl": gl, "concurrency": m["concurrency"], **{x: v[x] for x in ("comp", "props", "frames", "wall_s", "overhead_s", "fps_throughput", "s_per_frame", "s_per_frame_box", "mp4", "mb")}}
        if gl == "swiftshader":
            mp4 = ROOT / v["mp4"]
            n = v["frames"]
            idx = [0, n // 3, (2 * n) // 3, n - 1] if not k.startswith("MC") else [140, 147, 150, 153]
            ims = frames(mp4, idx)
            strip = Image.new("RGB", (1920, 1080), (5, 7, 11))
            dd = ImageDraw.Draw(strip)
            for i, im in enumerate(ims):
                x, y = (i % 2) * 960, (i // 2) * 540
                strip.paste(im.resize((960, 540), Image.LANCZOS), (x, y))
                dd.text((x + 10, y + 8), f"{k} f{idx[i]}", fill=(230, 237, 243), font=font)
            size, _ = save_jpg(strip, REP / "motion" / f"{k}.jpg", 300_000)
            perf["motion"][key]["strip"] = f"reports/lookdev/motion/{k}.jpg"
            perf["motion"][key]["strip_frames"] = idx

# tier summary for ADR-002/003 (2D families from stills are per-still costs; motion is per frame)
summ = {}
for key, v in perf["motion"].items():
    summ.setdefault(v["comp"], {})[f"{v['props']['fx']}@{v['gl']}"] = v["s_per_frame"]
perf["summary_s_per_frame"] = summ
PERF.write_text(json.dumps(perf, indent=1, ensure_ascii=False))
print(json.dumps(summ, indent=1))

# ---------- README ----------
FAM = {"F1": "Cold open: NilePay receipts -> glowing table (CH-00, master §5.2/§6.19)",
       "F2": "SQL row-count funnel, WHERE moment 13 -> 11 (CH-11, §6.3)",
       "F3": "Kafka partitions, offsets, lag (CH-26 labels; offsets schematic)",
       "F4": "RAG vector galaxy, query probe + 3 neighbours, 0.165 -> 0.227 (CH-33, §6.18)",
       "F5": "Docker layer-cache cascade, 5 s vs 57 s (CH-34, §6.7)",
       "F6": "Kinetic-type-only: impact word + term chip + number (CH-33, §6.18)"}
MDESC = {"MA": "(a) Arabic impact words on real S1 timings, CH-33 window 3768.8-3778.8 s (word ids w:S1:ar-natural:005965-005980), RTL mask reveal, counter 0.000 -> 0.165 lands on the end of خمسة",
         "MB": "(b) camera push 17 -> 7.4 units + 0.5 rad orbit + 4 parallax planes over the vector galaxy; probe, raw hit 0.165, synonym expansion, new top hit 0.227",
         "MC": "(c) whip-pan light-streak transition SQL funnel -> Kafka, cut at 5.0 s, 520 ms, directional SVG blur + streak layers"}
L = ["# P6 look-dev: style frames and motion tests", "",
     "Generated by `python3 -I studio/scripts/lookdev_report.py` from the measured timings in `data/renders/lookdev/timings_*.json`.",
     "Code: `studio/src/lookdev/` (registered in `studio/src/Root.tsx`): compositions `LookdevStill` (inputProps `{frame, typo, fx}`), `LD-MA-Impact`, `LD-MB-Galaxy`, `LD-MC-Streak`.",
     "Render driver: `studio/scripts/lookdev_render.mjs` (bundles once, one browser, run only through `dc q submit`). Box: 4 vCPU, no GPU. All 1920x1080, 30 fps.",
     "Full-resolution PNGs and MP4s are in `data/renders/lookdev/` (git-ignored); the committed previews are JPGs.", "",
     "## Candidates", "",
     "| Typo | Arabic display (impact/kinetic) | Latin display | Mono | Arabic labels |", "|---|---|---|---|---|",
     "| A | Alexandria 700 | Inter Tight 700 | JetBrains Mono | IBM Plex Sans Arabic 500-600 |",
     "| B | Readex Pro 700 | Space Grotesk 700 | JetBrains Mono | IBM Plex Sans Arabic 500-600 |",
     "| C | IBM Plex Sans Arabic 700 | Inter Tight 700 | JetBrains Mono | IBM Plex Sans Arabic 500-600 |", "",
     "| FX | glow (inner/outer px) | grain | vignette | CA | haze | particles | bloom |", "|---|---|---|---|---|---|---|---|",
     "| standard | 6 / 18 (CSS) | 1.2 % | 12 % | 0 | 5 % | 1,500 (SVG) | CSS glow only |",
     "| hero | 10 / 32 (CSS) | 1.5 % | 15 % | 0.6 px on impact type | 8 % | 4,000 (R3F points) | postprocessing Bloom 1.0 (galaxy only) |", "",
     "Numbers are proposals for ADR-003 (`studio/src/lookdev/theme.ts`); `studio/src/tokens.ts` is not frozen yet.", "",
     f"## Style frames ({len(perf['stills'])} stills; 6 families x 3 typography candidates at standard, + candidate A at hero)", "",
     "Contact sheet: `reports/lookdev/contact.jpg`" + (f" ({perf['contact_sheet']['kb']} KB)." if 'contact_sheet' in perf else "."), "",
     "| Still | Family | Typo | FX | Render s (swiftshader) | Preview (KB) |", "|---|---|---|---|---|---|"]
for k, v in perf["stills"].items():
    L.append(f"| `{k}` | {FAM[v['frame']]} | {v['typo']} | {v['fx']} | {v['still_s']:.2f} | `{v['preview']}` ({v['preview_kb']}) |")
L += ["", "## Motion tests (300 frames each, h264 crf 18, concurrency 3)", "",
      "| Test | Tier | GL | s/frame/slot | box fps | wall s | MP4 (MB) | Strip |", "|---|---|---|---|---|---|---|---|"]
for k, v in sorted(perf["motion"].items()):
    L.append(f"| {k.split('@')[0]} | {v['props']['fx']} | {v['gl']} | {v['s_per_frame']:.3f} | {v['fps_throughput']:.2f} | {v['wall_s']:.1f} | `{v['mp4']}` ({v['mb']}) | {('`' + v['strip'] + '`') if v.get('strip') else '-'} |")
L += [""] + [f"- **{k}** {d}" for k, d in MDESC.items()]
open(REP / "README.md", "w").write("\n".join(L) + "\n")
print("README rows:", len(perf["stills"]), len(perf["motion"]))

# ---------- findings (numbers pulled from perf) ----------
def sp(test, tier, gl):
    return perf["motion"].get(f"{test}-{tier}@{gl}", {}).get("s_per_frame")
psnr = {}
pf = REN / "psnr.txt"
if pf.exists():
    for line in pf.read_text().split("\n"):
        if line.strip():
            t, v = line.split()
            psnr[t] = round(float(v.split(":")[1]), 1)
perf["psnr_swiftshader_vs_swangle_db"] = psnr
PERF.write_text(json.dumps(perf, indent=1, ensure_ascii=False))
ma_ss, ma_sw, mb_ss, mb_sw = sp("MA", "standard", "swiftshader"), sp("MA", "standard", "swangle"), sp("MB", "hero", "swiftshader"), sp("MB", "hero", "swangle")
F = ["", "## Findings", "",
     f"1. **GL backend.** 2D type test: swiftshader {ma_ss} vs swangle {ma_sw} s/frame ({ma_sw / ma_ss:.1f}x). WebGL galaxy (hero): {mb_ss} vs {mb_sw} ({mb_sw / mb_ss:.2f}x). "
     f"PSNR swiftshader vs swangle: MA {psnr.get('MA-standard', 'n/a')} dB (codec noise), MB-hero {psnr.get('MB-hero', 'n/a')} dB (46 dB while the field is distant, 22-27 dB when dense: "
     "sub-pixel point-sprite rasterisation differs; frames look identical side by side). Proposal for ADR-002: render everything with `--gl=swiftshader` and never mix GL backends inside one shot or chunk set.",
     f"2. **FX tier cost.** CSS hero FX (stronger glow, CA, grain, more bokeh) is free in practice: MA {sp('MA', 'standard', 'swiftshader')} vs {sp('MA', 'hero', 'swiftshader')}, MC {sp('MC', 'standard', 'swiftshader')} vs {sp('MC', 'hero', 'swiftshader')} s/frame. "
     f"The expensive step is WebGL: galaxy SVG 1,500 sprites {sp('MB', 'standard', 'swiftshader')} vs R3F 4,000 points + Bloom {mb_ss} s/frame ({mb_ss / sp('MB', 'standard', 'swiftshader'):.1f}x). "
     "Keep real-time WebGL for short hero beats; long galaxy shots should use the SVG standard tier or a pre-rendered P10 plate.",
     "3. **Bug found (affects every R3F shot and the P0 bench).** With `@remotion/three` 4.0.534 the first frame each browser tab renders is blank (BenchR3F mp4 frames 0-2 at concurrency 3, every `renderStill`). "
     "Fix: `R3FWarmup` in `studio/src/lookdev/galaxy.tsx` (one `delayRender` on mount and two `advance()` calls once the scene and EffectComposer are attached; costs two GL renders per tab, not per frame). P7 `FXTier`/`DepthLayers` must include it. "
     "R3F alpha does not survive the EffectComposer: render opaque black and composite with `mix-blend-mode: screen`.",
     "4. **Arabic shaping verified by viewing** all 24 stills and MA frames 90/116-129/160/299: letters joined in contextual forms; whole-word reveals (the right-to-left clip-path cuts across one shaped word, with no per-letter spans); RTL word order; "
     "Latin isolates (`roadmap`, `job`, `COPY . .`, `pip install`); tatweel joins (`الـroadmap`, `الـquery`, `الـidempotency`, `الـpartition`); Western digits; the LTR numeric isolate `14 → 13 → … → 1` sits correctly beside the Arabic phrase. "
     "Alexandria and Readex push the tail of ر close to the next word at 48 px, so Arabic display now uses `word-spacing: 0.08em`.",
     "5. **Content flags for the fact-checker and arabic-typographer.** CH-26 has no canonical numbers: offsets 0-11 and `lag = 11 − 7 = 4` are schematic indices computed from the drawing. "
     "The RAG third neighbour has no canonical score and shows none. Galaxy positions are a layout, not measurements; they only preserve the ordering 0.227 > 0.165. The Docker base image is deliberately unversioned (`python:slim`). "
     "Authored Arabic microcopy (not in canon) needs review: `6 فواتير ← 6 صفوف`, `9 مراحل منطقية`, `بيشيل قبل أي حساب`, `من غير توسيع` / `مع توسيع الـquery`, `الترتيب الموثّق`, `تعديل سطر واحد في الكود`, `كاش الطبقات`, `جدول`. "
     "Narration quotes and labels come from canon and S1: `هات الصفوف`, `أقفل أنهي يوم في الأسبوع؟`, `الصفوف الباقية`, `الترتيب داخل الـpartition`, `التأخر = آخر متاح − آخر معالج`, `الإزاحة`, `5 ثوانٍ مقابل 57`, `بيحوّل النص لموضع`, the query sentence, and the MA words.",
     "6. **Review copy with sound:** `data/renders/lookdev/MA-standard_swiftshader_with_S1_audio.mp4` (S1 16 kHz slice 3768.8-3778.8 s, not committed).",
     "7. **Not done here:** critic scoring (06 §3.2), Council ADR-002/003/004/005, the freeze of `studio/src/tokens.ts` and prop schemas. Auto-fit and overflow detection are P7 (`studio/src/type/`); these frames use fixed layouts.",
     ]
with open(REP / "README.md", "a") as fh:
    fh.write("\n".join(F) + "\n")
