// Padlock glyph for PermissionLocks: gradient steel body, rim-lit upper-right edge, glowing keyhole, spring shackle.
// SVG only (the glow is a wide faint under-stroke, never a filter: filters rasterise differently per tile). No copy.
import React from 'react';
import {C, type Fx} from '../../tokens';
import {hex} from '../../fx/look';

export const Padlock: React.FC<{uid: string; size: number; tone: string; open: number; fx: Fx; on?: number}> = ({uid, size, tone, open, fx, on = 1}) => {
  const w = size;
  const h = size * 1.22;
  const by = h * 0.46; // body top
  const bh = h - by;
  const sw = Math.max(3, size * 0.1);
  const lift = open * size * 0.2;
  const gw = sw + fx.glowInner * 1.4 * on;
  const legL = w * 0.27;
  const legR = w * 0.73;
  const arc = (legR - legL) / 2;
  const top = by - size * 0.28;
  const shackle = `M ${legL} ${by + 2} V ${top} A ${arc} ${arc} 0 0 1 ${legR} ${top} V ${by + 2}`;
  const gid = `${uid}-g`;
  const rid = `${uid}-r`;
  const key = size * 0.075;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{overflow: 'visible'}}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor={tone} stopOpacity={0.1 + 0.34 * on} />
          <stop offset="0.55" stopColor={C.panel} stopOpacity={0.95} />
          <stop offset="1" stopColor={C.ground} stopOpacity={1} />
        </linearGradient>
        <linearGradient id={rid} x1="1" y1="0" x2="0" y2="0.6">
          <stop offset="0" stopColor={C.ink} stopOpacity={0.5 * (0.4 + 0.6 * on)} />
          <stop offset="0.45" stopColor={C.ink} stopOpacity={0} />
        </linearGradient>
      </defs>
      <g transform={`translate(${legR} ${by}) rotate(${(-26 * open).toFixed(2)}) translate(${-legR} ${-by - lift})`}>
        {on > 0.05 ? <path d={shackle} fill="none" stroke={tone} strokeOpacity={0.22 * on} strokeWidth={gw} strokeLinecap="round" /> : null}
        <path d={shackle} fill="none" stroke={C.ink3} strokeOpacity={0.9} strokeWidth={sw + 1.5} strokeLinecap="round" />
        <path d={shackle} fill="none" stroke={tone} strokeWidth={sw * 0.62} strokeLinecap="round" />
      </g>
      {on > 0.05 ? <rect x={w * 0.12} y={by} width={w * 0.76} height={bh} rx={size * 0.14} fill="none" stroke={tone} strokeOpacity={0.2 * on} strokeWidth={Math.max(2, size * 0.07) + fx.glowInner * 1.4 * on} /> : null}
      <rect x={w * 0.12} y={by} width={w * 0.76} height={bh} rx={size * 0.14} fill={`url(#${gid})`} stroke={tone} strokeOpacity={0.55 + 0.45 * on} strokeWidth={Math.max(2, size * 0.055)} />
      <rect x={w * 0.12} y={by} width={w * 0.76} height={bh} rx={size * 0.14} fill="none" stroke={`url(#${rid})`} strokeWidth={Math.max(2, size * 0.055)} />
      <circle cx={w * 0.5} cy={by + bh * 0.4} r={key * (1 + 0.6 * open) * 1.5} fill={`${tone}${hex(0.12 + 0.5 * on * (0.4 + 0.6 * open))}`} stroke={tone} strokeWidth={1.5} />
      <circle cx={w * 0.5} cy={by + bh * 0.4} r={key} fill={open > 0.5 ? tone : C.void} />
      <path d={`M ${w * 0.5 - key * 0.6} ${by + bh * 0.4 + key * 0.5} L ${w * 0.5 - key * 0.9} ${by + bh * 0.82} H ${w * 0.5 + key * 0.9} L ${w * 0.5 + key * 0.6} ${by + bh * 0.4 + key * 0.5} Z`} fill={open > 0.5 ? tone : C.void} />
    </svg>
  );
};
