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
def plan_vcc(cap, pg):
    cap.shot("Course map", 1200)
    rows = pg.evaluate("() => Array.from(document.querySelectorAll('.vcc-step-row')).map(e => [e.id, (e.innerText||'').trim().replace(/\\s+/g,' ')])")
    for i in spread(len(rows), cap.max - 1):
        sid, label = rows[i]
        cap.js_click("id => document.getElementById(id).click()", sid)
        cap.shot(f"step: {label}"[:120], 1600)
        back = pg.locator("button:has-text('Course map')")
        try:
            if back.count() and back.first.is_visible():
                back.first.click(timeout=3000)
                pg.wait_for_timeout(400)
        except Exception as e:  # noqa: BLE001
            cap.fails.append(f"back failed: {str(e)[:80]}")
        if cap.full:
            break


def _rail_plan(cap, pg, prefer_live, avoid_titles=()):
    items = pg.evaluate("() => Array.from(document.querySelectorAll('.rail-item')).map((e, i) => [i, (e.innerText||'').trim().replace(/\\s+/g,' ')])")
    cap.shot("Home (Journey)", 1500)
    pool = [(i, t) for i, t in items if t and t not in avoid_titles]
    live = [x for x in pool if re.search(r"\blive\b", x[1])]
    rest = [x for x in pool if x not in live]
    chosen = []
    if prefer_live:
        chosen = [live[j] for j in spread(len(live), min(len(live), cap.max - 4))]
        chosen += [rest[j] for j in spread(len(rest), min(len(rest), 3))]
    else:
        chosen = [pool[j] for j in spread(len(pool), min(len(pool), cap.max - 1))]
    for i, t in chosen:
        if cap.full:
            break
        cap.js_click("i => document.querySelectorAll('.rail-item')[i].click()", i)
        cap.shot(t[:120], 1400)
    return [t for _, t in chosen]


def plan_lab(cap, pg):
    titles = _rail_plan(cap, pg, True)
    C.write_json(os.path.join(OUT, cap.slug, "chosen_titles.json"), titles)


def plan_unified(cap, pg):
    avoid = set(C.read_json(os.path.join(OUT, "lab-m12-ds", "chosen_titles.json"), []) or [])
    _rail_plan(cap, pg, False, avoid_titles=avoid)


def _click_text_buttons(cap, pg, selector, label_prefix, wait_ms=1300, limit=99, only=None):
    labels = pg.evaluate("sel => Array.from(document.querySelectorAll(sel)).map((e, i) => [i, (e.innerText||'').trim().replace(/\\s+/g,' ')])", selector)
    labels = [x for x in labels if x[1]]
    if only:
        labels = [x for x in labels if only(x[1])]
    for j in spread(len(labels), min(limit, len(labels))):
        if cap.full:
            return
        i, t = labels[j]
        cap.js_click("a => document.querySelectorAll(a[0])[a[1]].click()", [selector, i])
        cap.shot(f"{label_prefix}{t}"[:120], wait_ms)


def plan_supreme(cap, pg):
    cap.shot("Home", 1500)
    docks = pg.evaluate("() => Array.from(document.querySelectorAll('button[data-dock]')).map(e => e.dataset.dock)")
    for d in docks:
        if d == "home":
            continue
        cap.js_click("d => document.querySelector(`button[data-dock='${d}']`).click()", d)
        cap.shot(f"dock: {d}", 1200)
        if d == "scenes":
            _click_text_buttons(cap, pg, "button.chip", "scene lesson: ", 1700, limit=max(1, cap.max - len(cap.recs) - 3))
    if not cap.full:
        cap.js_click("() => document.querySelector(\"button[data-dock='scenes']\").click()")
        _click_text_buttons(cap, pg, "button.chip", "scene lesson: ", 1700, limit=cap.max - len(cap.recs))


def plan_nilepay(cap, pg):
    cap.shot("Journey home", 1200)
    navs = pg.evaluate("() => Array.from(document.querySelectorAll('button.navbtn')).map(e => e.dataset.nav)")
    for nv in navs:
        if nv == "home":
            continue
        cap.js_click("n => document.querySelector(`button.navbtn[data-nav='${n}']`).click()", nv)
        cap.shot(f"nav: {nv}", 1000)
    cap.js_click("() => document.querySelector(\"button.navbtn[data-nav='home']\").click()")
    phases = pg.evaluate("() => Array.from(document.querySelectorAll('button.phase-link')).map((e, i) => [i, (e.innerText||'').trim().replace(/\\s+/g,' ')])")
    for i, t in phases:
        if cap.full:
            break
        cap.js_click("i => document.querySelectorAll('button.phase-link')[i].click()", i)
        cap.shot(f"phase: {t}", 900)
        if cap.full:
            break
        # open the first lesson of the phase (lessons are buttons/links inside the phase list)
        ok = cap.js_click("""() => { const c = Array.from(document.querySelectorAll('main button, main a, #main button, #main a'))
            .filter(e => !e.classList.contains('phase-link') && !e.classList.contains('navbtn') && (e.innerText||'').trim().length > 6);
            if (!c.length) return false; c[0].click(); return (c[0].innerText||'').trim().slice(0, 80); }""")
        if ok:
            cap.shot(f"lesson: {ok}", 1500)
            cap.js_click("() => document.querySelector(\"button.navbtn[data-nav='home']\").click()")


def plan_fusion(cap, pg):
    cap.shot("Home", 1500)
    tabs = pg.evaluate("() => Array.from(document.querySelectorAll('nav button, header button, .tabs button, .nav button')).slice(0, 12).map(e => (e.innerText||'').trim())")
    names = [t for t in tabs if re.search(r"Labs|Canvas|Studio|Review|Terminal|Sources|Audit|Curriculum", t)]
    for t in names:
        if cap.full:
            return
        pg.get_by_text(t, exact=False).first.click(timeout=4000)
        cap.shot(f"view: {t}", 1500)
        if "Labs" in t:
            _fusion_open_cards(cap, pg, "lab", 9)
        elif "Canvas" in t:
            _fusion_open_cards(cap, pg, "canvas", 6)


def _fusion_open_cards(cap, pg, what, k):
    # cards/rows inside the current view: buttons that are not top-level navigation
    labels = pg.evaluate("""() => Array.from(document.querySelectorAll('main button, #view button, .view button, section button, .grid button, .card, .vcc-step-row'))
        .map((e, i) => [i, (e.innerText||'').trim().replace(/\\s+/g,' ')]).filter(x => x[1].length > 4 && x[1].length < 120)""")
    for j in spread(len(labels), min(k, len(labels))):
        if cap.full:
            return
        i, t = labels[j]
        cap.js_click("""i => { const q = Array.from(document.querySelectorAll('main button, #view button, .view button, section button, .grid button, .card, .vcc-step-row'));
            if (q[i]) q[i].click(); }""", i)
        cap.shot(f"{what}: {t}", 1500)


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
        PLANS[slug](cap, pg)
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
