// TxnCapsule (catalog: Domain specials). 04 §6 "Transactions & deadlock": a transaction is a sealed capsule that lands whole or
// vanishes; isolation levels are frosted walls. A glass pill holds the operations as mono rows (Latin / code, one whole label
// each; an Arabic op goes through the type engine). Above the pill, a Latin isolation tag and 0-3 concentric frosted walls
// (read_uncommitted 0, read_committed 1, repeatable_read 2, serializable 3); below it the ledger rail the capsule lands on.
// Open (before any outcome): dashed signal rim, ops arrive staggered 3 f@24 from the layer anchor (RV1 onset).
//   commit   -> every op gets its ok tick (staggered 2 f@24), the rim closes solid ok, the capsule drops onto the rail
//               (morph preset, camera ease) and the rail lights under it; tag COMMIT.
//   rollback -> the ops fail one by one from the last to the first (crit, staggered 3 f@24), the rim breaks into crit dashes,
//               the capsule collapses into a ghost outline and vanishes; the rail stays dark; tag ROLLBACK.
// `outcome` with no action is shown as the settled state from the first frame (a static scene-director choice); an action
// always wins. DOM + SVG only, same code at every tier.
import React from 'react';
import {interpolate} from 'remotion';
import {C, FONT, SIZE} from '../../tokens';
import {hex} from '../../fx/look';
import {isArabic} from '../../type/arabic';
import {ease} from '../../type/reveal';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {FitText, Place, Tag, actsOf, clamp, emit, ff, flashAt, layerStyle, mix, prog} from '../_dom-a/kit';

const WALLS = {read_uncommitted: 0, read_committed: 1, repeatable_read: 2, serializable: 3} as const;

export const txnOutcome = (p: Props, ctx: DcProps<Props>['ctx']): {kind: 'commit' | 'rollback'; t: number} | null => {
  const acts = [...actsOf(ctx, 'commit'), ...actsOf(ctx, 'rollback')].filter((a) => a.at <= ctx.frame).sort((x, y) => x.at - y.at || x.li - y.li);
  const last = acts[acts.length - 1];
  if (last) return {kind: last.name as 'commit' | 'rollback', t: last.at};
  if (p.outcome && ![...actsOf(ctx, 'commit'), ...actsOf(ctx, 'rollback')].length) return {kind: p.outcome, t: -1e9};
  return null;
};

export const TxnCapsuleView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const box = ctx.box;
  const t = ctx.frame;
  const n = props.ops.length;
  const out = txnOutcome(props, ctx);
  const walls = props.isolation ? WALLS[props.isolation] : 0;
  const rowH = Math.round(Math.min(78, (box.h * 0.5) / n));
  const pad = 34;
  const cw = Math.round(Math.min(box.w * 0.62, 1000));
  const ch = n * rowH + 2 * pad;
  const wallStep = 26;
  const railH = 14;
  const gap = 150; // capsule-to-rail distance while open
  const totalH = ch + gap + railH + 80 + (props.isolation ? 70 : 0);
  const topY = box.y + (box.h - totalH) / 2 + (props.isolation ? 70 : 0);
  const cx = box.x + box.w / 2;
  const x0 = cx - cw / 2;
  const railY = topY + ch + gap;
  const done = out ? prog(ctx, out.t, 'morph', ease.camera, true) : 0;
  const isCommit = out?.kind === 'commit';
  const isRb = out?.kind === 'rollback';
  const drop = isCommit ? done * (gap - 14) : 0;
  const tone = out ? mix(C.signal, isCommit ? C.ok : C.crit, prog(ctx, out.t, 'label')) : C.signal;
  const fl = out && out.t > -1e8 ? flashAt(ctx, out.t) : 0;
  const ghost = isRb ? interpolate(done, [0.35, 1], [0, 1], clamp) : 0;
  const ent = prog(ctx, ctx.at, 'arrive');
  const rtl = props.ops.some(isArabic);
  const glowK = 1 + ctx.mod.glow;
  const railTone = isCommit ? C.ok : C.ink3;
  const railLit = isCommit ? done : 0;
  const shrink = isRb ? 1 - 0.1 * ghost : 1;
  return (
    <div style={{position: 'absolute', inset: 0, ...layerStyle(ctx, rtl)}}>
      {/* ledger rail */}
      <div style={{position: 'absolute', left: x0 - 60, top: railY, width: cw + 120, height: railH, borderRadius: railH / 2, opacity: ent, background: `linear-gradient(90deg, ${C.ink3}${hex(0.25)}, ${C.ink3}${hex(0.5)}, ${C.ink3}${hex(0.25)})`, border: `1px solid ${C.grid}`}}>
        <div style={{position: 'absolute', left: cw * 0.2 + 60, width: cw * 0.6 * railLit, top: -2, bottom: -2, borderRadius: railH / 2, background: railTone, boxShadow: railLit > 0.02 ? emit(railTone, ctx.fx, railLit) : undefined, transform: 'translateX(0)'}} />
      </div>
      {/* isolation walls (frosted rims, outermost first) */}
      {Array.from({length: walls}, (_, w) => {
        const k = walls - w; // outermost = highest offset
        const wq = prog(ctx, ctx.at + ff(3 * w, ctx.fps), 'arrive');
        const o = k * wallStep;
        return (
          <div
            key={w}
            style={{
              position: 'absolute',
              left: x0 - o,
              top: topY - o + drop,
              width: cw + 2 * o,
              height: ch + 2 * o,
              borderRadius: 40 + o,
              opacity: wq * (1 - ghost),
              border: `${2 + (4 - k)}px solid ${C.ink}${hex(0.14)}`,
              background: `repeating-linear-gradient(135deg, ${C.ink}${hex(0.045)} 0 6px, transparent 6px 14px)`,
              boxShadow: `inset 0 0 30px ${C.signal}${hex(0.08)}`,
              transform: `scale(${shrink})`,
            }}
          />
        );
      })}
      {props.isolation ? (
        <Place x={cx} y={topY - walls * wallStep - 38 + drop} w={cw} h={56} style={{opacity: ent * (1 - ghost)}}>
          <Tag id={`${ctx.id}:iso`} text={props.isolation.toUpperCase().replace(/_/g, ' ')} color={C.violet} size={SIZE.label} fx={ctx.fx} on={0.6} />
        </Place>
      ) : null}
      {/* the capsule */}
      <div
        style={{
          position: 'absolute',
          left: x0,
          top: topY + drop,
          width: cw,
          height: ch,
          opacity: ent * (1 - 0.8 * ghost),
          transform: `scale(${shrink})`,
          borderRadius: ch / 2 > 120 ? 60 : ch / 2,
          border: `${isCommit ? 4 : 3}px ${isRb && ghost > 0.05 ? 'dashed' : out ? 'solid' : 'dashed'} ${tone}`,
          background: `radial-gradient(ellipse 70% 50% at 80% 0%, ${tone}${hex(0.16)} 0%, transparent 70%), linear-gradient(200deg, ${C.panel}F0, ${C.ground}E6)`,
          boxShadow: `inset 0 0 40px ${tone}${hex(0.12 + 0.15 * (out ? 1 : 0))}, ${emit(tone, ctx.fx, (0.5 + 0.5 * (out ? 1 : 0) + fl) * glowK)}`,
          padding: `${pad}px 48px`,
          boxSizing: 'border-box',
        }}
      >
        {props.ops.map((op, i) => {
          const born = ctx.at + ff(3 * i, ctx.fps);
          if (t < born) return null;
          const oe = prog(ctx, born, 'label');
          // per-op outcome tick: commit top-down, rollback bottom-up
          const tk = out ? out.t + ff((isRb ? n - 1 - i : i) * (isRb ? 3 : 2), ctx.fps) : null;
          const tq = tk !== null && t >= tk ? prog(ctx, tk, 'label') : 0;
          const opTone = isRb ? C.crit : C.ok;
          const nameW = cw - 96 - 70;
          return (
            <div key={i} style={{height: rowH, display: 'flex', alignItems: 'center', gap: 20, opacity: oe}}>
              <svg width={34} height={34} viewBox="0 0 34 34" style={{flex: 'none', overflow: 'visible'}}>
                <circle cx={17} cy={17} r={14} fill={tq > 0 ? `${opTone}${hex(0.18 * tq)}` : 'none'} stroke={mix(C.ink3, opTone, tq)} strokeWidth={3} strokeDasharray={tq > 0 ? undefined : '3 6'} />
                {tq > 0 && isCommit ? <path d="M 9 17.5 L 15 23 L 25 11" fill="none" stroke={opTone} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={20} strokeDashoffset={20 * (1 - tq)} /> : null}
                {tq > 0 && isRb ? <path d="M 11 11 L 23 23 M 23 11 L 11 23" fill="none" stroke={opTone} strokeWidth={4} strokeLinecap="round" strokeDasharray={34} strokeDashoffset={34 * (1 - tq)} /> : null}
              </svg>
              <div style={{opacity: 1 - 0.5 * tq * (isRb ? 1 : 0)}}>
                <FitText id={`${ctx.id}:o${i}`} text={op} size={SIZE.label} maxW={nameW} maxH={rowH} color={tq > 0 && isRb ? C.ink2 : C.ink} role={isArabic(op) ? 'sentence' : 'code'} weight={isArabic(op) ? FONT.label.strong : undefined} />
              </div>
            </div>
          );
        })}
      </div>
      {out ? (
        <Place x={cx} y={railY + railH + 52} w={cw} h={60} style={{opacity: prog(ctx, Math.max(out.t, ctx.at) + ff(4, ctx.fps), 'label')}}>
          <Tag id={`${ctx.id}:out`} text={isCommit ? 'COMMIT' : 'ROLLBACK'} color={isCommit ? C.ok : C.crit} size={SIZE.label} fx={ctx.fx} on={0.7 + fl} />
        </Place>
      ) : null}
    </div>
  );
};

export const TxnCapsule: DcComponent<Props> = {name: 'TxnCapsule', Component: TxnCapsuleView, text: true, slot: 'full'};
