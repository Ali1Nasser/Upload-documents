"""Playwright (python, headless chromium from /opt/pw-browsers) screenshots of the HUB builds, fully offline.

Every request that is not file:/data:/blob:/about: is aborted (the builds only reference Google Fonts, which is cosmetic).
One browser per build, 1280x720, up to N distinct states per build. Runs inside a tsp job (dc corpus hub shots submits one per build).
Archive JavaScript runs only inside the sandboxed headless browser with the network blocked; nothing of it is imported here.

Outputs
  data/derived/hub_shots/<build>/NN.png        (git-ignored)
  data/derived/hub_shots/<build>/shots.jsonl   per-build records, merged by `hub shots` into corpus/canon/hub_shots.jsonl
  data/derived/hub_shots/<build>/notes.json    blank/CDN diagnosis, blocked URLs, navigation failures
"""
import glob
import hashlib
import json
import os
import re
import sys
import time

from . import common as C
from . import manifest as M

HUB_DIR = os.path.join(C.ROOT, "data", "extracted", "DA_Camp_HUB.zip.d", "DA Camp HUB")
OUT = os.path.join(C.ROOT, "data", "derived", "hub_shots")
ITEMS = os.path.join(C.ROOT, "corpus", "canon", "hub_items.jsonl")
CRASH = os.path.join(C.ROOT, "corpus", "canon", "crash_course_steps.jsonl")

BUILD_FILES = {
    "vcc": "DA-Camp-Visual-Crash-Course.html",
    "lab-m12-ds": "DA-Camp-Lab_M12-DS.html",
    "supreme-final2": "DA_Camp_SUPREME_FINAL2.html",
    "nilepay-journey": "NilePay-Data-AI-Study-Journey.html",
    "fusion": "FUSION-standalone.html",
    "unified": "DA-Camp-Unified.html",
}

EXCERPT_JS = """() => {
  const vis = e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
    return r.width > 20 && r.height > 20 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const cands = ['#stage', 'main', '#main', '#app', '.vcc-overlay', '[role=main]', '#view', '.view'];
  let el = null;
  for (const s of cands) { const x = document.querySelector(s); if (x && vis(x) && (x.innerText || '').trim().length > 40) { el = x; break; } }
  el = el || document.body;
  const h = Array.from(document.querySelectorAll('h1,h2,.vcc-step-title,.title')).find(vis);
  return { text: (el.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 700),
           heading: h ? (h.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 140) : '',
           bodyLen: (document.body.innerText || '').length, hash: location.hash };
}"""


def chrome_exe():
    c = sorted(glob.glob("/opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell"))
    if not c:
        c = sorted(glob.glob("/opt/pw-browsers/chromium-*/chrome-linux/chrome"))
    return c[-1] if c else None


def _png_variance(path):
    try:
        from PIL import Image, ImageStat
        im = Image.open(path).convert("L").resize((160, 90))
        return ImageStat.Stat(im).stddev[0]
    except Exception:  # noqa: BLE001
        return -1.0


class Capture:
    def __init__(self, slug, page, max_shots, build_file_id):
        self.slug, self.pg, self.max = slug, page, max_shots
        self.dir = os.path.join(OUT, slug)
        self.recs, self.seen, self.fails = [], set(), []
        self.build_file_id = build_file_id

    @property
    def full(self):
        return len(self.recs) >= self.max

    def shot(self, label, wait_ms=900):
        if self.full:
            return False
        try:
            self.pg.wait_for_timeout(wait_ms)
            n = len(self.recs) + 1
            path = os.path.join(self.dir, f"{n:02d}.png")
            self.pg.screenshot(path=path, full_page=False, timeout=60000)
            data = open(path, "rb").read()
            sha = hashlib.sha256(data).hexdigest()
            if sha in self.seen:  # identical pixels: the state did not change
                os.remove(path)
                self.fails.append(f"duplicate pixels, skipped: {label}")
                return False
            self.seen.add(sha)
            info = self.pg.evaluate(EXCERPT_JS)
            label = re.sub(r"\s+", " ", label).strip()
            title = label if not info["heading"] or info["heading"].lower() in label.lower() else f"{label} — {info['heading']}"
            self.recs.append({"v": 1, "asset_id": "v:" + hashlib.sha1(data).hexdigest()[:12], "build": self.slug,
                              "path": os.path.relpath(path, C.ROOT), "n": n, "section_title": title[:240],
                              "dom_text_excerpt": info["text"][:600], "width": 1280, "height": 720, "png_sha256": sha,
                              "build_file_id": self.build_file_id, "route": info["hash"] or None})
            return True
        except Exception as e:  # noqa: BLE001
            self.fails.append(f"shot failed {label}: {str(e)[:120]}")
            return False

    def js_click(self, js, arg=None):
        try:
            return self.pg.evaluate(js, arg) if arg is not None else self.pg.evaluate(js)
        except Exception as e:  # noqa: BLE001
            self.fails.append(f"eval failed: {str(e)[:120]}")
            return None


def spread(n_items, k):
    """k indexes spread evenly over range(n_items), always including 0 and the last."""
    if n_items <= k:
        return list(range(n_items))
    return sorted({round(i * (n_items - 1) / (k - 1)) for i in range(k)})


# --------------------------------------------------------------------------- per-build plans
def hub_labs(build):
    """Lab definitions found by the static harvest: [(lab_id, tag, title)] for lab({id,...}) entries of a build."""
    out = []
    for r in C.read_jsonl(ITEMS):
        if r["build"] == build and r["kind"] == "lab" and r.get("lab_id") and r.get("source_ref", "").endswith("#script"):
            out.append((r["lab_id"], r.get("tag", ""), r["title"]))
    return out


REVEAL_JS = """() => {
  // Capture-only DOM tweaks: hide the 'prerequisites not mastered' blocker and primer strip (Lab builds), answer the
  // 'predict before play' gates, then scroll the first drawn canvas / svg diagram into view.
  document.querySelectorAll('.m3-blocker, .primer-strip, .exec-disclosure').forEach(e => { e.style.display = 'none'; });
  const ta = document.querySelector('textarea');
  if (ta && /predict/i.test((ta.placeholder || '') + (ta.closest('section,div') || {innerText: ''}).innerText)) {
    ta.value = 'my prediction'; ta.dispatchEvent(new Event('input', {bubbles: true}));
  }
  const btn = Array.from(document.querySelectorAll('button')).find(b => /reveal the visual|reveal/i.test(b.innerText || '') && b.offsetParent);
  if (btn) btn.click();
  const g = document.querySelector('.m9-predict-gate button, .predict-gate button');
  if (g) g.click();
  return true;
}"""
SCROLL_JS = """() => {
  const vis = e => { const r = e.getBoundingClientRect(); return r.width > 260 && r.height > 120; };
  const c = Array.from(document.querySelectorAll('canvas, .vcc-stage, svg')).find(vis);
  if (c) { c.scrollIntoView({block: 'center', inline: 'nearest'}); return c.tagName.toLowerCase(); }
  return null;
}"""


def reveal_visual(cap, pg):
    """Make the lesson's own picture visible (best effort; never raises)."""
    try:
        pg.evaluate(REVEAL_JS)
        pg.wait_for_timeout(900)
        pg.evaluate(REVEAL_JS)  # a second pass handles gates that appear after the first answer
        pg.wait_for_timeout(1400)
        return pg.evaluate(SCROLL_JS)
    except Exception as e:  # noqa: BLE001
        cap.fails.append(f"reveal failed: {str(e)[:100]}")
        return None


def go_hash(cap, pg, h, label, wait_ms=1500, visual=False):
    cap.js_click("h => { location.hash = h; }", h)
    if visual:
        pg.wait_for_timeout(900)
        reveal_visual(cap, pg)
    return cap.shot(label, wait_ms)


def plan_vcc(cap, pg):
    cap.shot("Course map", 1200)
    n = pg.evaluate("() => document.querySelectorAll('.vcc-step-row').length")
    rows = pg.evaluate("() => Array.from(document.querySelectorAll('.vcc-step-row')).map(e => (e.innerText||'').trim().replace(/\\s+/g,' '))")
    for i in spread(n, cap.max - 1):
        cap.js_click("i => document.querySelectorAll('.vcc-step-row')[i].click()", i)
        pg.wait_for_timeout(700)
        pg.evaluate(SCROLL_JS)
        cap.shot(f"step: {rows[i]}"[:120], 1800)
        if cap.full:
            break


ANIM_ORDER = ("anim", "sim", "trace", "live", "map", "build", "drill")


def _lab_pool(build):
    labs = [x for x in hub_labs(build) if x[1] in ANIM_ORDER]
    labs.sort(key=lambda x: ANIM_ORDER.index(x[1]))
    return labs


def plan_lab(cap, pg):
    pool = [x for x in _lab_pool("lab-m12-ds") if x[1] in ("anim", "sim", "trace")]
    cap.shot("Journey Home", 1500)
    chosen = [pool[i] for i in spread(len(pool), cap.max - 1)]
    for lab_id, tag, title in chosen:
        if cap.full:
            break
        go_hash(cap, pg, "#" + lab_id, f"lab {lab_id} ({tag}): {title}"[:120], 1200, visual=True)
    C.write_json(os.path.join(OUT, cap.slug, "chosen_titles.json"), [c[0] for c in chosen])


def plan_unified(cap, pg):
    used = set(C.read_json(os.path.join(OUT, "lab-m12-ds", "chosen_titles.json"), []) or [])
    pool = [x for x in _lab_pool("unified") if x[0] not in used]
    left_anim = [x for x in pool if x[1] in ("anim", "sim", "trace")]
    live = [x for x in pool if x[1] not in ("anim", "sim", "trace")]
    chosen = [left_anim[i] for i in spread(len(left_anim), min(len(left_anim), 12))]
    chosen += [live[i] for i in spread(len(live), min(len(live), cap.max - 1 - len(chosen)))]
    cap.shot("Journey Home", 1500)
    for lab_id, tag, title in chosen:
        if cap.full:
            break
        go_hash(cap, pg, "#" + lab_id, f"lab {lab_id} ({tag}): {title}"[:120], 1200, visual=True)


def _lesson_ids(pg):
    return pg.evaluate("() => { try { const c = JSON.parse(document.getElementById('course-data').textContent); return (c.lessons || []).map(l => l.id); } catch (e) { return []; } }")


def plan_supreme(cap, pg):
    cap.shot("Home", 1500)
    docks = pg.evaluate("() => Array.from(document.querySelectorAll('button[data-dock]')).map(e => e.dataset.dock)")
    for d in docks:
        if d != "home":
            go_hash(cap, pg, "#" + d, f"dock: {d}", 1200)
    ids = _lesson_ids(pg)
    for i in spread(len(ids), cap.max - len(cap.recs)):
        if cap.full:
            break
        go_hash(cap, pg, "#lesson/" + ids[i], f"lesson: {ids[i]}", 1500, visual=True)


def plan_nilepay(cap, pg):
    cap.shot("Journey home", 1200)
    for nv in ("practice", "project", "reference", "progress"):
        go_hash(cap, pg, "#" + nv, f"nav: {nv}", 1000)
    go_hash(cap, pg, "#phase/6", "phase 06: Learn from examples", 1000)
    ids = _lesson_ids(pg)
    for i in spread(len(ids), cap.max - len(cap.recs)):
        if cap.full:
            break
        go_hash(cap, pg, "#lesson/" + ids[i], f"lesson: {ids[i]}", 1500, visual=True)


CONTENT_JS = """() => {
  const vis = e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
    return r.width > 24 && r.height > 14 && r.left > 255 && r.top > 70 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const ok = e => { const t = (e.innerText || '').trim(); return t.length > 3 && t.length < 600; };
  const direct = Array.from(document.querySelectorAll('.item-card, button, a[href], [role=button], [role=tab], .card, summary, .vcc-step-row'));
  // cards that are plain divs with cursor:pointer (outermost only; cursor is inherited by their children)
  const cards = Array.from(document.querySelectorAll('div, article, li')).filter(e => {
    const cs = getComputedStyle(e); if (cs.cursor !== 'pointer') return false;
    const r = e.getBoundingClientRect(); if (r.width < 150 || r.height < 60) return false;
    return !e.parentElement || getComputedStyle(e.parentElement).cursor !== 'pointer';
  });
  return Array.from(new Set(direct.concat(cards))).filter(vis).filter(ok);
}"""


def _enter_view(pg, text):
    pg.evaluate("t => { const b = Array.from(document.querySelectorAll('button')).find(e => (e.innerText||'').trim().includes(t)); if (b) b.click(); }", text)
    pg.wait_for_timeout(700)


def plan_fusion(cap, pg):
    cap.shot("Home", 1500)
    views = pg.evaluate("() => Array.from(document.querySelectorAll('button')).filter(e => e.getBoundingClientRect().left < 260).map(e => (e.innerText||'').trim()).filter(t => /Home|Curriculum|Labs|Canvas|Studio|Review|Terminal|Sources|Audit/.test(t) && t.length < 40)")
    seen_v, uniq = set(), []
    for t in views:  # nav buttons and sidebar chips can share a name; keep the first of each
        k = re.sub(r"[^A-Za-z]", "", t)[:6].lower()
        if k not in seen_v:
            seen_v.add(k)
            uniq.append(t)
    views = uniq
    quota = {"Labs": 8, "Canvas": 5, "Curriculum": 2, "Studio": 2}
    for v in views:
        if cap.full:
            break
        if v.endswith("Home"):
            continue
        _enter_view(pg, v)
        cap.shot(f"view: {v}", 1500)
        k = next((q for name, q in quota.items() if name in v), 0)
        if not k:
            continue
        count = pg.evaluate(f"() => ({CONTENT_JS})().length")
        for idx in spread(count, min(k, count)):
            if cap.full:
                break
            _enter_view(pg, v)
            label = cap.js_click(f"""i => {{ const l = ({CONTENT_JS})(); const e = l[i]; if (!e) return null; e.click(); return (e.innerText||'').trim().replace(/\\s+/g, ' ').slice(0, 80); }}""", idx)
            if label:
                pg.wait_for_timeout(700)
                pg.evaluate(SCROLL_JS)
                cap.shot(f"{v} / {label}", 1600)


PLANS = {"vcc": plan_vcc, "lab-m12-ds": plan_lab, "unified": plan_unified, "supreme-final2": plan_supreme,
         "nilepay-journey": plan_nilepay, "fusion": plan_fusion}


def run_build(slug, max_shots=25, force=False):
    from playwright.sync_api import sync_playwright
    fn = BUILD_FILES[slug]
    path = os.path.join(HUB_DIR, fn)
    out = os.path.join(OUT, slug)
    os.makedirs(out, exist_ok=True)
    ins = [{"path": os.path.relpath(path, C.ROOT), "sha256": C.sha256_file(path)},
           {"path": "tools/dclib/hub_shots.py", "sha256": C.sha256_file(os.path.join(C.ROOT, "tools", "dclib", "hub_shots.py"))},
           {"path": "max_shots", "sha256": hashlib.sha256(str(max_shots).encode()).hexdigest()}]
    outputs = [os.path.join(out, "shots.jsonl")]
    if M.should_skip(out, "shots", ins, outputs, force):
        print(f"hub shots {slug}: up to date")
        return 0
    exe = chrome_exe()
    if not exe:
        print("no chromium under /opt/pw-browsers", file=sys.stderr)
        return 2
    for old in glob.glob(os.path.join(out, "*.png")):
        os.remove(old)
    file_id = None
    for r in C.read_jsonl(C.p("corpus", "catalog", "files.jsonl")):
        if any(p_.endswith("DA_Camp_HUB.zip.d/DA Camp HUB/" + fn) for p_ in r.get("paths", [])):
            file_id = r["file_id"]
            break
    blocked, errs, t0 = [], [], time.time()
    notes = {"build": slug, "file": fn}
    with sync_playwright() as p:
        br = p.chromium.launch(executable_path=exe, args=["--no-sandbox", "--disable-dev-shm-usage"])
        ctx = br.new_context(viewport={"width": 1280, "height": 720}, offline=True, service_workers="block", device_scale_factor=1)

        def gate(route):
            u = route.request.url
            if u.split(":", 1)[0] in ("file", "data", "blob", "about"):
                route.continue_()
            else:
                blocked.append(u[:160])
                route.abort()

        ctx.route("**/*", gate)
        pg = ctx.new_page()
        pg.on("pageerror", lambda e: errs.append(str(e)[:200]))
        pg.set_default_timeout(15000)
        pg.goto("file://" + path, wait_until="load", timeout=240000)
        pg.wait_for_timeout(2500)
        cap = Capture(slug, pg, max_shots, file_id)
        info = pg.evaluate(EXCERPT_JS)
        notes.update({"title": pg.title(), "body_text_chars": info["bodyLen"], "blocked_requests": len(blocked),
                      "blocked_hosts": sorted({re.sub(r"^(\w+://[^/]+).*", r"\1", b) for b in blocked})[:10], "page_errors": errs[:5]})
        try:
            PLANS[slug](cap, pg)
        except Exception as e:  # noqa: BLE001  keep whatever was captured
            cap.fails.append(f"plan aborted: {type(e).__name__}: {str(e)[:200]}")
        # blank diagnosis: no text and flat pixels -> keep text only
        if cap.recs:
            var = [_png_variance(os.path.join(C.ROOT, r["path"])) for r in cap.recs]
            notes["min_pixel_stddev"] = round(min(var), 2) if var else None
        notes["blank"] = (info["bodyLen"] < 60 and not cap.recs)
        if notes["blank"]:
            notes["blank_reason"] = "page rendered no text offline; build probably needs a blocked CDN (%s); text-only harvest kept" % ", ".join(notes["blocked_hosts"])
        notes.update({"shots": len(cap.recs), "navigation_notes": cap.fails[:40], "seconds": round(time.time() - t0, 1),
                      "blocked_after_nav": len(blocked), "page_errors_total": len(errs)})
        br.close()
    C.write_jsonl(outputs[0], cap.recs)
    C.write_json(os.path.join(out, "notes.json"), notes)
    M.write(out, "shots", f"dc corpus hub shots --build {slug}", ins, [os.path.relpath(o, C.ROOT) for o in outputs],
            extra={"shots": len(cap.recs), "seconds": notes["seconds"]})
    print(f"hub shots {slug}: {len(cap.recs)} shots in {notes['seconds']}s, blocked {len(blocked)} requests, {len(cap.fails)} notes")
    return 0 if cap.recs or notes["blank"] else 1
