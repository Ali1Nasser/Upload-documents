// Browser-side type QA. Findings are logged as `DC_QA {json}` (console.error) and kept on window.__DC_QA__; the render
// driver (scripts/p7.ts) collects them through onBrowserLog and FAILS snapshot tests / previews on any finding.
import type {Rect} from './safe';
import {arabicWords, perLetterViolations} from './words';

export type QaKind = 'overflow' | 'perletter' | 'label' | 'digits' | 'fragment' | 'unsafe';
export type QaFinding = {kind: QaKind; id: string; detail: unknown};
declare global {
  interface Window {
    __DC_QA__?: QaFinding[];
  }
}
const seen = new Set<string>();
export const reportQa = (kind: QaKind, id: string, detail: unknown): void => {
  const key = `${kind}:${id}`;
  if (seen.has(key) || typeof window === 'undefined') return;
  seen.add(key);
  const f = {kind, id, detail};
  (window.__DC_QA__ ??= []).push(f);
  console.error(`DC_QA ${JSON.stringify(f)}`);
};

/**
 * Whole-word guard: walks every `[data-dc-text]` root under `root` and reports an element boundary that splits an Arabic
 * word (per-letter spans). Cheap (text nodes only); SpecPlayer and DemoFrame call it on every frame.
 */
export const checkWholeWords = (root: HTMLElement | null): void => {
  if (!root) return;
  root.querySelectorAll<HTMLElement>('[data-dc-text]').forEach((tr, k) => {
    const ids = new Map<Node, number>();
    const pieces: {text: string; el: number}[] = [];
    const walker = document.createTreeWalker(tr, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const p = n.parentNode as Node;
      if (!ids.has(p)) ids.set(p, ids.size);
      pieces.push({text: n.nodeValue ?? '', el: ids.get(p) as number});
    }
    const v = perLetterViolations(pieces);
    if (v.length) reportQa('perletter', tr.dataset.dcText || `text${k}`, v.slice(0, 4));
  });
};

/**
 * Whole-word guard, part 2 (P7 review M6). Walks EVERY text node under `root` (not only [data-dc-text] roots), joins adjacent
 * text nodes of one parent, and requires every Arabic letter run on screen to be a whole word of the lexicon (all strings in the
 * resolved layer props). A substring / typewriter reveal (`text.slice(0, n)`), per-letter spans or Arabic copy set outside the
 * type engine leave a fragment that is not a word of any prop -> `DC_QA fragment`.
 */
export const checkArabicWholeWords = (root: HTMLElement | null, lexicon: readonly string[]): void => {
  if (!root) return;
  const known = new Set<string>();
  for (const s of lexicon) for (const w of arabicWords(s)) known.add(w);
  const runs: {parent: Node | null; text: string}[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const last = runs[runs.length - 1];
    if (last && last.parent === n.parentNode && n.previousSibling?.nodeType === Node.TEXT_NODE) last.text += n.nodeValue ?? '';
    else runs.push({parent: n.parentNode, text: n.nodeValue ?? ''});
  }
  for (const r of runs) {
    const bad = arabicWords(r.text).filter((w) => !known.has(w));
    if (bad.length) {
      const host = (r.parent as HTMLElement | null)?.closest?.('[data-dc-text]') as HTMLElement | null;
      reportQa('fragment', host?.dataset.dcText || bad[0], {fragments: bad.slice(0, 4), text: r.text.slice(0, 40)});
    }
  }
};

/**
 * Title-safe guard (P7 review B3). After layout AND after every transform (camera push, parallax, impact scale, audio scale),
 * the visible box of every [data-dc-text] element must lie inside `safe` (1080p px). Boxes are clipped by overflow ancestors;
 * invisible copy (opacity < 0.05, visibility hidden) and copy inside a transition (`data-dc-transit`, whips leave the frame on
 * purpose) are skipped. `scale` = preview scale of the 1920x1080 stage. Tolerance 1 px.
 */
export const checkTitleSafe = (root: HTMLElement | null, safe: Rect, scale: number): void => {
  if (!root) return;
  const o = root.getBoundingClientRect();
  const info = new Map<Element, {op: number; hidden: boolean; clip: DOMRect | null; transit: boolean}>();
  const infoOf = (el: Element) => {
    let v = info.get(el);
    if (!v) {
      const cs = getComputedStyle(el);
      v = {op: Number(cs.opacity), hidden: cs.visibility === 'hidden' || cs.display === 'none', clip: cs.overflow !== 'visible' ? el.getBoundingClientRect() : null, transit: (el as HTMLElement).dataset?.dcTransit === '1'};
      info.set(el, v);
    }
    return v;
  };
  root.querySelectorAll<HTMLElement>('[data-dc-text]').forEach((el, k) => {
    const r = el.getBoundingClientRect();
    if (r.width < 0.5 || r.height < 0.5) return;
    let op = 1;
    let x0 = r.left;
    let y0 = r.top;
    let x1 = r.right;
    let y1 = r.bottom;
    for (let a: Element | null = el; a && a !== root; a = a.parentElement) {
      const v = infoOf(a);
      if (v.hidden || v.transit) return;
      op *= v.op;
      if (v.clip && a !== el) {
        x0 = Math.max(x0, v.clip.left);
        y0 = Math.max(y0, v.clip.top);
        x1 = Math.min(x1, v.clip.right);
        y1 = Math.min(y1, v.clip.bottom);
      }
    }
    if (op < 0.05 || x1 - x0 < 0.5 || y1 - y0 < 0.5) return;
    const box = {x: (x0 - o.left) / scale, y: (y0 - o.top) / scale, r: (x1 - o.left) / scale, b: (y1 - o.top) / scale};
    const tol = 1;
    if (box.x < safe.x - tol || box.y < safe.y - tol || box.r > safe.x + safe.w + tol || box.b > safe.y + safe.h + tol)
      reportQa('unsafe', el.dataset.dcText || `text${k}`, {box: [Math.round(box.x), Math.round(box.y), Math.round(box.r), Math.round(box.b)], title_safe: [safe.x, safe.y, safe.x + safe.w, safe.y + safe.h], opacity: +op.toFixed(2)});
  });
};
