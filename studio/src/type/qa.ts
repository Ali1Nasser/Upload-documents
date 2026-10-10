// Browser-side type QA. Findings are logged as `DC_QA {json}` (console.error) and kept on window.__DC_QA__; the render
// driver (scripts/p7_render.mjs) collects them through onBrowserLog and FAILS snapshot tests / previews on any finding.
import {perLetterViolations} from './text';

export type QaKind = 'overflow' | 'perletter' | 'label' | 'digits';
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
