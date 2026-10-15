// Terminal (catalog: Code). A terminal on a glass plate: an LTR mono block (04 section 3.4), <= 12 visible rows (section 3.2).
// Lines appear on their own word anchors (`at`); a line without one follows the previous line (a command types, its output
// follows one beat later, output rows cascade 2 film frames apart). The first line without an anchor starts on the layer anchor.
//  - cmd: the prompt shows at once and the command TYPES per character (Latin / code only: 04 section 3.4 allows per-character
//    animation for mono text). An Arabic run inside a command (a comment, a string) appears whole when the typing reaches it;
//  - out: the row arrives on the label preset (160 ms fade + 6 px rise); err: the same in crit with a crit band (failure beat);
//  - a signal caret marks the line being typed (the thing explained right now); after the last line an idle prompt blinks;
//  - rows soft-wrap at the column limit; when the rows outgrow the panel it scrolls up (camera ease, RV1 first step on the
//    frame a row is born). All motion uses revealProgress: the first visible step of every line lands ON its anchor frame.
import React, {useRef} from 'react';
import {C, FONT, SIZE} from '../../tokens';
import {Glass} from '../../fx/Atmos';
import {hex} from '../../fx/look';
import {useAutoFit} from '../../type/Text';
import {ease, presetFrames, revealProgress, revealStyle} from '../../type/reveal';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Rect} from '../../type/safe';
import {centred, Chrome, CodeRow, codeLayout, detab, f24, tokenize, type Tok} from '../_code-media/kit';
import type {Props} from './schema';

type Ctx = DcProps<Props>['ctx'];
const PROMPT: Record<Props['shell'], string> = {bash: '$', python: '>>>', sql: 'sql>', docker: '$', git: '$', other: '>'};
const CONT: Record<Props['shell'], string> = {bash: '>', python: '...', sql: '->', docker: '>', git: '>', other: '>'};
const LANG: Record<Props['shell'], string> = {bash: 'bash', python: 'python', sql: 'sql', docker: 'bash', git: 'bash', other: 'other'};

/** Display text of every line (prompt + command; a command that continues the previous command gets the continuation mark). */
const displayLines = (p: Props) => {
  const prompt = p.prompt ?? PROMPT[p.shell];
  return p.lines.map((l, i) => {
    if (l.kind !== 'cmd') return {pre: '', text: detab(l.text)};
    const cont = i > 0 && p.lines[i - 1].kind === 'cmd' && !/;\s*$/.test(p.lines[i - 1].text) && p.shell !== 'bash' && p.shell !== 'docker' && p.shell !== 'git';
    const pr = cont ? CONT[p.shell].padStart(prompt.length) : prompt;
    return {pre: `${pr} `, text: detab(l.text)};
  });
};

export const terminalLayout = (p: Props, box: Rect) => {
  const dl = displayLines(p);
  return {dl, L: codeLayout(dl.map((d) => d.pre + d.text), box.w, box.h, 0, 1)};
};

/** Per-line timing (shot-local frames at ctx.fps). */
export const terminalTimeline = (p: Props, ctx: Ctx) => {
  const out: {start: number; dur: number; end: number}[] = [];
  let cursor = ctx.at;
  p.lines.forEach((l, i) => {
    const anchored = l.at ? ctx.frameOf(l.at) : undefined;
    const prev = p.lines[i - 1];
    const gap = i === 0 ? 0 : prev.kind === 'cmd' && l.kind !== 'cmd' ? f24(3, ctx.fps) : f24(2, ctx.fps);
    const start = anchored ?? (i === 0 ? ctx.at : cursor + gap);
    // a command types at >= 3 chars per film frame, 4..18 film frames long (0.17-0.75 s)
    const dur = l.kind === 'cmd' ? f24(Math.min(18, Math.max(4, Math.ceil(l.text.length / 3))), ctx.fps) : presetFrames('label', ctx.fps);
    out.push({start, dur, end: start + dur});
    cursor = start + (l.kind === 'cmd' ? dur : 0);
  });
  return out;
};

export const TerminalView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const ref = useRef<HTMLDivElement>(null);
  const {dl, L} = terminalLayout(props, ctx.box);
  const fit = useAutoFit(ref, {id: ctx.id, size: L.size, min: SIZE.labelMin, maxW: ctx.box.w - 2 * L.pad, key: dl.map((d) => d.pre + d.text).join('\n')});
  const fs = fit.size;
  const rowH = Math.round((L.rowH * fs) / L.size);
  const t = ctx.frame;
  const tl = terminalTimeline(props, ctx);
  const lang = LANG[props.shell];
  const toks: Tok[][] = dl.map((d, i) => {
    if (props.lines[i].kind !== 'cmd') return [{t: d.text, k: 'id', at: 0}];
    const body = tokenize(d.text, lang).map((k) => ({...k, at: k.at + d.pre.length}));
    return [{t: d.pre, k: 'com', at: 0}, ...body];
  });
  // characters of line i shown at frame t (prompt at once, then the command types; output lines show whole)
  const shownOf = (i: number): number => {
    const d = dl[i];
    const x = tl[i];
    if (t < x.start) return -1;
    if (props.lines[i].kind !== 'cmd') return d.pre.length + d.text.length;
    const q = revealProgress(t - x.start, x.dur, (u) => u); // linear typing, RV1: >= 1 char on the anchor frame
    return d.pre.length + Math.ceil(q * d.text.length);
  };
  // birth frame of every visual row (scroll + row visibility)
  const rowBorn = L.rows.map((r) => {
    const i = r.line;
    const x = tl[i];
    if (props.lines[i].kind !== 'cmd' || r.s <= dl[i].pre.length) return x.start;
    const frac = (r.s - dl[i].pre.length) / Math.max(1, dl[i].text.length);
    return x.start + Math.max(0, Math.floor(frac * x.dur) - 1);
  });
  const lastEnd = Math.max(...tl.map((x) => x.end));
  const idleBorn = lastEnd + f24(3, ctx.fps);
  const allBorn = [...rowBorn, idleBorn];
  const nScroll = f24(4, ctx.fps);
  let scroll = 0;
  allBorn.forEach((b, r) => {
    if (r >= L.visRows) scroll += revealProgress(t - b, nScroll, ease.camera);
  });
  // the active command line (caret) = the last started line if it is a command still being typed or just typed
  let active = -1;
  for (let i = 0; i < tl.length; i++) if (t >= tl[i].start) active = i;
  const caretOn = (since: number) => Math.floor(Math.max(0, since) / f24(12, ctx.fps)) % 2 === 0; // 0.5 s blink, frame-driven
  const typing = active >= 0 && props.lines[active].kind === 'cmd' && t < tl[active].end;
  const panel0 = revealStyle(t - ctx.at, ctx.fps, 'label', 'ltr', ctx.until !== undefined ? t - ctx.until : undefined);
  // a settled reveal carries no opacity / transform: no needless stacking context or raster layer over the whole plate
  const panel = {...panel0, style: panel0.p >= 1 && ctx.until === undefined ? {} : panel0.style};
  const caret = (
    <span style={{position: 'relative', display: 'inline-block', width: 0, height: '1.1em', verticalAlign: '-0.2em'}}>
      <span style={{position: 'absolute', left: 0, top: 0, width: '0.6em', height: '100%', background: C.signal}} />
    </span>
  );
  const prompt = props.prompt ?? PROMPT[props.shell];
  const idleVisible = t >= idleBorn && props.lines[props.lines.length - 1].kind !== 'cmd';
  return (
    <div style={{position: 'absolute', left: ctx.box.x, top: ctx.box.y, width: ctx.box.w, height: ctx.box.h, display: 'flex', alignItems: 'center', justifyContent: 'center', ...panel.style}}>
      <Glass accent={C.signal} style={{maxWidth: ctx.box.w, overflow: 'hidden'}}>
        <Chrome label={props.shell} size={fs} h={L.chromeH} />
        <div style={{height: L.visRows * rowH, margin: L.pad, overflow: 'hidden', position: 'relative'}}>
          <div
            ref={ref}
            dir="ltr"
            data-overflow={fit.overflow ? 1 : undefined}
            style={{width: 'max-content', fontSize: fs, lineHeight: `${rowH}px`, transform: scroll ? `translateY(${(-scroll * rowH).toFixed(2)}px)` : undefined, outline: fit.overflow ? `2px dashed ${C.crit}` : undefined}}
          >
            {L.rows.map((r, k) => {
              const i = r.line;
              const kind = props.lines[i].kind;
              const shown = shownOf(i);
              const born = rowBorn[k];
              const hidden = t < born || shown < 0;
              const rv = kind === 'cmd' ? undefined : revealStyle(t - born, ctx.fps, 'label', 'ltr');
              const st = rv && rv.p < 1 ? rv.style : {};
              const err = kind === 'err';
              const isCaretRow = typing && i === active && shown >= r.s && (shown < r.e || (shown === r.e && r.e === dl[i].pre.length + dl[i].text.length));
              const lastRowOfLine = k === L.rows.length - 1 || L.rows[k + 1].line !== i;
              // the line explained right now carries a signal rim (04 section 1.1: signal = the thing named now); err keeps its crit band
              const isActive = i === active && !err && t >= tl[i].start;
              const act = isActive ? revealProgress(t - tl[i].start, presetFrames('label', ctx.fps), ease.arrive) : 0;
              const doneCaret = !typing && i === active && kind === 'cmd' && lastRowOfLine && !idleVisible && caretOn(t - tl[i].end);
              return (
                <div
                  key={k}
                  style={{
                    height: rowH,
                    whiteSpace: 'pre',
                    visibility: hidden ? 'hidden' : undefined,
                    // a 3 px rim + a faint band as two background layers (no extra element, no inset shadow)
                    backgroundColor: err ? `${C.crit}${hex(0.12)}` : isActive ? `${C.signal}${hex(0.07 * act)}` : undefined,
                    backgroundImage: isActive ? `linear-gradient(90deg, ${C.signal}${hex(act)} 0 3px, transparent 3px)` : undefined,
                    marginLeft: -Math.round(L.pad * 0.5),
                    paddingLeft: Math.round(L.pad * 0.5),
                    ...st,
                  }}
                >
                  <CodeRow id={`${ctx.id}:r${k}`} toks={toks[i]} s={r.s} e={r.e} size={fs} shown={kind === 'cmd' ? shown : undefined} tint={kind === 'out' ? C.ink2 : err ? C.crit : undefined} caret={isCaretRow || doneCaret ? caret : undefined} />
                </div>
              );
            })}
            <div style={{height: rowH, whiteSpace: 'pre', visibility: idleVisible ? undefined : 'hidden'}}>
              <bdi dir="ltr" style={{fontFamily: `'${FONT.mono.family}'`, fontWeight: FONT.mono.weight, color: C.ink3}}>{`${prompt} `}</bdi>
              {idleVisible && caretOn(t - idleBorn) ? caret : null}
            </div>
          </div>
        </div>
      </Glass>
    </div>
  );
};

export const Terminal: DcComponent<Props> = {
  name: 'Terminal',
  Component: TerminalView,
  text: true,
  slot: 'center',
  textRect: (p, box) => {
    const {L} = terminalLayout(p, box);
    return centred(box, L.panelW, L.panelH);
  },
};
