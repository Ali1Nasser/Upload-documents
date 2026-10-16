// SqlStages (catalog: Code). A SQL query split into its logical clauses (one clause per line, in WRITTEN order) and, below it, a rail of
// stage chips in EXECUTION order (04 section 6, Query pipeline: rows travel through FROM -> WHERE -> GROUP BY -> ... -> LIMIT).
//  - `stages` is the execution order shown on the rail (numbered 1..n); the clauses are found in `query` by their keywords
//    (parenthesis- and quote-aware); a stage the query does not contain keeps its chip, dashed (nothing to light);
//  - `activate` (anchored to the word that names the stage, lead -2 f) lights that stage: its clause band(s) and its chip fill
//    with signal, the previous stage settles to "done", an execution-number badge lands on the clause (SELECT is written first
//    but runs sixth: the badge makes the mismatch visible). Before the first activation nothing is dimmed;
//  - DISTINCT and WINDOW light the SELECT line (they are written inside it) or a WINDOW clause when the query has one;
//  - code is an LTR mono block (04 section 3.4), syntax colours neutral (semantic colour = state only); chips are Latin mono keywords.
// All motion uses revealProgress (RV1: the first visible step lands on the anchor frame).
import React, {useRef} from 'react';
import {C, FONT, SIZE} from '../../tokens';
import {Glass} from '../../fx/Atmos';
import {hex} from '../../fx/look';
import {useAutoFit} from '../../type/Text';
import {ease, presetFrames, revealProgress, revealStyle} from '../../type/reveal';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Rect} from '../../type/safe';
import {centred, Chrome, CodeRow, codeLayout, MONO_ADV, tokenize} from '../_code-media/kit';
import type {Props} from './schema';

type Ctx = DcProps<Props>['ctx'];
type Stage = Props['stages'][number];
export type Clause = {stage: Stage; text: string};

const CLAUSE_RE: [RegExp, Stage][] = [
  [/^GROUP\s+BY\b/i, 'GROUP BY'],
  [/^ORDER\s+BY\b/i, 'ORDER BY'],
  [/^(?:(?:NATURAL\s+)?(?:LEFT|RIGHT|FULL|INNER|CROSS)(?:\s+OUTER)?\s+)?JOIN\b/i, 'JOIN'],
  [/^SELECT\b/i, 'SELECT'],
  [/^FROM\b/i, 'FROM'],
  [/^WHERE\b/i, 'WHERE'],
  [/^HAVING\b/i, 'HAVING'],
  [/^WINDOW\b/i, 'WINDOW'],
  [/^LIMIT\b/i, 'LIMIT'],
];

/** Split a query into clauses at top-level keywords (outside parentheses and quotes), whitespace collapsed outside quotes. */
export const splitClauses = (query: string): Clause[] => {
  const out: Clause[] = [];
  let depth = 0;
  let quote = '';
  let cur: Clause | null = null;
  let i = 0;
  let prevSpace = true;
  while (i < query.length) {
    const ch = query[i];
    if (quote) {
      if (cur) cur.text += ch;
      if (ch === quote) quote = '';
      i++;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
      if (cur) cur.text += ch;
      prevSpace = false;
      i++;
      continue;
    }
    if (/\s/.test(ch)) {
      if (cur && !prevSpace) cur.text += ' ';
      prevSpace = true;
      i++;
      continue;
    }
    if (ch === '(') depth++;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if (depth === 0 && prevSpace) {
      const rest = query.slice(i);
      const hit = CLAUSE_RE.find(([re]) => re.test(rest));
      if (hit) {
        if (cur) cur.text = cur.text.trimEnd();
        cur = {stage: hit[1], text: ''};
        out.push(cur);
      }
    }
    if (!cur) {
      cur = {stage: 'SELECT', text: ''}; // text before any keyword (a WITH prefix, ...) stays visible on its own line
      out.push(cur);
    }
    cur.text += ch;
    prevSpace = false;
    i++;
  }
  if (cur) cur.text = cur.text.trimEnd();
  return out.filter((c) => c.text.length);
};

/** Clause line indices lit by a stage. */
export const linesOf = (clauses: Clause[], stage: Stage): number[] => {
  const idx = (s: Stage) => clauses.flatMap((c, i) => (c.stage === s ? [i] : []));
  if (stage === 'DISTINCT') return clauses.flatMap((c, i) => (c.stage === 'SELECT' && /^SELECT\s+DISTINCT\b/i.test(c.text) ? [i] : []));
  if (stage === 'WINDOW') {
    const w = idx('WINDOW');
    return w.length ? w : clauses.flatMap((c, i) => (c.stage === 'SELECT' && /\bOVER\s*\(/i.test(c.text) ? [i] : []));
  }
  return idx(stage);
};

const CHIP_FS = SIZE.labelMin;
const chipW = (s: string) => Math.ceil((s.length + 3) * CHIP_FS * MONO_ADV) + 2 * Math.round(CHIP_FS * 0.6);
const CHIP_H = Math.round(CHIP_FS * 2);
const ROW_GAP = 14;
const CHIP_GAP = 34; // the pipe between two chips (a line that fills with light when the rows travel through)

export const sqlLayout = (p: Props, box: Rect) => {
  const clauses = splitClauses(p.query);
  const L = codeLayout(clauses.map((c) => c.text), box.w, box.h, 0, 0);
  const panelW = Math.min(box.w, Math.max(L.panelW, 1060)); // wide enough for the rail (layout constant)
  const inner = panelW - 2 * L.pad;
  const widths = p.stages.map(chipW);
  // greedy wrap of the rail
  const rows: number[][] = [[]];
  let used = 0;
  widths.forEach((w, i) => {
    if (used && used + CHIP_GAP + w > inner) {
      rows.push([]);
      used = 0;
    }
    rows[rows.length - 1].push(i);
    used += (used ? CHIP_GAP : 0) + w;
  });
  if (rows.length > 1) {
    // balance the rail (equal chip counts per row) when that still fits the panel width
    const per = Math.ceil(widths.length / rows.length);
    const even = rows.map((_, r) => widths.map((_, i) => i).slice(r * per, (r + 1) * per)).filter((r) => r.length);
    const fits = even.every((r) => r.reduce((a, i) => a + widths[i], 0) + (r.length - 1) * CHIP_GAP <= inner);
    if (fits) rows.splice(0, rows.length, ...even);
  }
  const railH = rows.length * CHIP_H + (rows.length - 1) * ROW_GAP + 2 * Math.round(CHIP_FS * 0.7);
  return {clauses, L, rows, widths, railH, panelW, panelH: L.panelH + railH};
};

type Ev = {t: number; stage: Stage; li: number};

export const SqlStagesView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const ref = useRef<HTMLDivElement>(null);
  const {clauses, L, rows, widths, railH, panelW} = sqlLayout(props, ctx.box);
  const toks = React.useMemo(() => clauses.map((c) => tokenize(c.text, 'sql')), [clauses.map((c) => c.text).join('\n')]);
  const fit = useAutoFit(ref, {id: ctx.id, size: L.size, min: SIZE.labelMin, maxW: ctx.box.w - 2 * L.pad, key: clauses.map((c) => c.text).join('\n')});
  const fs = fit.size;
  const rowH = Math.round((L.rowH * fs) / L.size);
  const t = ctx.frame;
  const evs: Ev[] = ctx.actions.filter((a) => a.name === 'activate').map((a) => ({t: a.at, stage: a.props.stage as Stage, li: a.li})).sort((x, y) => x.t - y.t || x.li - y.li);
  const nLab = presetFrames('label', ctx.fps);
  const nMorph = presetFrames('morph', ctx.fps);
  // state of each stage: p = activation progress of its latest activation, current = it is the latest event overall
  let k = -1;
  for (let j = 0; j < evs.length; j++) if (evs[j].t <= t) k = j;
  const stageState = (s: Stage) => {
    let lastJ = -1;
    for (let j = 0; j <= k; j++) if (evs[j].stage === s) lastJ = j;
    if (lastJ < 0) return {on: 0, cur: 0, done: 0, order: 0};
    const p = revealProgress(t - evs[lastJ].t, nLab);
    const isCur = lastJ === k;
    const next = isCur ? 1 : revealProgress(t - evs[lastJ + 1].t, nMorph, ease.camera); // handed over to the next stage
    return {on: p, cur: isCur ? p : 1 - next, done: isCur ? 0 : next, order: p};
  };
  const anyActive = k >= 0;
  const lineState = clauses.map((_, i) => {
    let best = {on: 0, cur: 0, done: 0, order: 0, stage: '' as string};
    props.stages.forEach((s, si) => {
      if (!linesOf(clauses, s).includes(i)) return;
      const st = stageState(s);
      if (st.on > best.on || (st.on === best.on && st.cur > best.cur)) best = {...st, stage: String(si + 1)};
    });
    return best;
  });
  const panel = revealStyle(t - ctx.at, ctx.fps, 'label', 'ltr', ctx.until !== undefined ? t - ctx.until : undefined);
  const pw = panelW;
  // light: the rim leads the plate's arrive and warms with each stage; a pool of signal under the plate follows the active stage
  const rim = revealProgress(t - ctx.at, nLab);
  const prog = props.stages.length ? Math.min(1, (k + 1) / props.stages.length) : 0;
  const gk = 0.5 + 0.5 * rim + ctx.mod.glow;
  const rimLight = `linear-gradient(to bottom left, ${C.signal}${hex((0.45 + 0.35 * prog) * rim)} 0%, ${C.signal}${hex(0.14 * rim)} 36%, ${C.grid}${hex(0.9)} 100%)`;
  const stock = `linear-gradient(180deg, ${C.panel}E6 0%, ${C.ground}D9 100%)`;
  const actT = (s: Stage): number | null => {
    let a: number | null = null;
    for (let j = 0; j <= k; j++) if (evs[j].stage === s) a = evs[j].t;
    return a;
  };
  const half = Math.round(CHIP_FS * 0.35);
  return (
    <div style={{position: 'absolute', left: ctx.box.x, top: ctx.box.y, width: ctx.box.w, height: ctx.box.h, display: 'flex', alignItems: 'center', justifyContent: 'center', ...panel.style}}>
      <div style={{position: 'relative', width: pw}}>
      <div aria-hidden style={{position: 'absolute', left: '-14%', right: '-14%', bottom: -Math.round(fs * 2.4), height: Math.round(fs * 5), background: `radial-gradient(ellipse at 50% 38%, ${C.signal}${hex(0.16 * rim * gk * (0.4 + 0.6 * prog))} 0%, ${C.signal}${hex(0.05 * rim)} 46%, transparent 72%)`, pointerEvents: 'none'}} />
      <Glass style={{width: pw, overflow: 'hidden', position: 'relative', border: '1px solid transparent', background: `${stock} padding-box, ${rimLight} border-box`}}>
        <Chrome label="sql" size={fs} h={L.chromeH} />
        <div style={{margin: `${L.pad}px 0`, position: 'relative'}}>
          <div ref={ref} dir="ltr" data-overflow={fit.overflow ? 1 : undefined} style={{width: 'max-content', minWidth: '100%', fontSize: fs, lineHeight: `${rowH}px`, outline: fit.overflow ? `2px dashed ${C.crit}` : undefined}}>
            {L.rows.map((r, i) => {
              const ls = lineState[r.line];
              const dim = anyActive ? 0.42 + 0.58 * Math.max(ls.cur, ls.done * 0.7) : 1;
              const firstRow = L.rows.findIndex((x) => x.line === r.line) === i;
              return (
                <div
                  key={i}
                  style={{
                    height: rowH,
                    whiteSpace: 'pre',
                    paddingLeft: L.pad,
                    position: 'relative',
                    opacity: dim,
                    background: ls.cur > 0 ? `linear-gradient(90deg, ${C.signal}${hex(0.24 * ls.cur)}, ${C.signal}${hex(0.05 * ls.cur)} 70%, transparent)` : undefined,
                    boxShadow: ls.cur > 0 ? `inset 4px 0 0 ${C.signal}${hex(ls.cur)}` : ls.done > 0 ? `inset 3px 0 0 ${C.ink3}${hex(0.6 * ls.done)}` : undefined,
                  }}
                >
                  <CodeRow id={`${ctx.id}:r${i}`} toks={toks[r.line]} s={r.s} e={r.e} size={fs} />
                  {firstRow && ls.on > 0 ? (
                    <bdi
                      dir="ltr"
                      data-dc-text={`${ctx.id}:b${r.line}`}
                      style={{
                        position: 'absolute',
                        right: L.pad,
                        top: Math.round((rowH - CHIP_FS * 1.5) / 2),
                        minWidth: Math.round(CHIP_FS * 1.5),
                        height: Math.round(CHIP_FS * 1.5),
                        borderRadius: Math.round(CHIP_FS * 0.75),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: `'${FONT.mono.family}'`,
                        fontWeight: FONT.mono.weight,
                        fontSize: Math.max(SIZE.secondaryMin, Math.round(CHIP_FS * 0.8)),
                        fontFeatureSettings: '"tnum" 1',
                        color: ls.cur > 0.5 ? C.void : C.ink,
                        background: ls.cur > 0.5 ? C.signal : `${C.grid}`,
                        opacity: ls.on,
                        transform: `scale(${(0.7 + 0.3 * ls.on).toFixed(3)})`,
                      }}
                    >
                      {ls.stage}
                    </bdi>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
        <div dir="ltr" style={{borderTop: `1px solid ${C.grid}`, padding: `${half * 2}px ${L.pad}px`, display: 'flex', flexDirection: 'column', gap: ROW_GAP, alignItems: 'flex-start', height: railH}}>
          {rows.map((row, ri) => (
            <div key={ri} style={{display: 'flex', alignItems: 'center'}}>
              {row.map((si, ci) => {
                const s = props.stages[si];
                const present = linesOf(clauses, s).length > 0;
                const st = stageState(s);
                const lit = st.cur;
                const doneP = st.done;
                const at = actT(s);
                const fill = ci > 0 && at !== null ? revealProgress(t - at, nMorph, ease.camera) : 0; // the pipe into this chip fills as the rows arrive
                return (
                  <React.Fragment key={si}>
                    {ci > 0 ? (
                      <div aria-hidden style={{position: 'relative', width: CHIP_GAP, height: 2, background: `${C.grid}`}}>
                        <div style={{position: 'absolute', left: 0, top: 0, height: 2, width: `${(fill * 100).toFixed(1)}%`, background: C.signal, opacity: 0.55 + 0.45 * lit}} />
                        {fill > 0 && fill < 1 ? <div style={{position: 'absolute', left: `${(fill * 100).toFixed(1)}%`, top: -3, width: 8, height: 8, marginLeft: -4, borderRadius: '50%', background: C.signal, boxShadow: `0 0 ${ctx.fx.glowInner}px ${C.signal}`}} /> : null}
                      </div>
                    ) : null}
                    <div
                      style={{
                        width: widths[si],
                        height: CHIP_H,
                        borderRadius: Math.round(CHIP_H / 2.4),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: `${present ? 1 : 2}px ${present ? 'solid' : 'dashed'} ${lit > 0 ? C.signal : C.grid}`,
                        background: lit > 0 ? `${C.signal}${hex(0.9 * lit)}` : doneP > 0 ? `${C.signal}${hex(0.12 * doneP)}` : `${C.panel}`,
                        boxShadow: lit > 0 ? `0 0 ${ctx.fx.glowInner * lit}px ${C.signal}, 0 0 ${ctx.fx.glowPx * 0.6 * lit}px ${C.signal}55` : undefined,
                        color: lit > 0.5 ? C.void : doneP > 0 ? C.ink : C.ink2,
                        opacity: present ? 1 : 0.7,
                      }}
                    >
                      <bdi dir="ltr" data-dc-text={`${ctx.id}:c${si}`} style={{whiteSpace: 'nowrap', fontFamily: `'${FONT.mono.family}'`, fontWeight: FONT.mono.weight, fontSize: CHIP_FS, fontFeatureSettings: '"tnum" 1, "calt" 0'}}>
                        {`${si + 1} ${s}`}
                      </bdi>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          ))}
        </div>
      </Glass>
      </div>
    </div>
  );
};

export const SqlStages: DcComponent<Props> = {
  name: 'SqlStages',
  Component: SqlStagesView,
  text: true,
  slot: 'center',
  textRect: (p, box) => {
    const {panelW, panelH} = sqlLayout(p, box);
    return centred(box, panelW, panelH);
  },
};
