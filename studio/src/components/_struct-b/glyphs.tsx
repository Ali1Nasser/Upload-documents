// Station glyphs of P7 group "struct-b" (RequestJourney hops, Conveyor stations). Pure SVG, tokens passed in by the caller
// (no colours here). Every glyph is drawn inside a disc of radius `r` centred on (x, y); stroke widths are layout constants.
import React from 'react';
import {C, type Fx} from '../../tokens';

export type HopKind = 'client' | 'lb' | 'service' | 'db' | 'cache' | 'queue' | 'external';

const Glyph: React.FC<{kind: HopKind; s: number; color: string}> = ({kind, s, color}) => {
  const sw = Math.max(2.4, s * 0.09);
  const p = {fill: 'none', stroke: color, strokeWidth: sw, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const};
  switch (kind) {
    case 'client':
      return (
        <g>
          <rect x={-0.42 * s} y={-0.7 * s} width={0.84 * s} height={1.4 * s} rx={0.16 * s} {...p} />
          <line x1={-0.12 * s} y1={0.5 * s} x2={0.12 * s} y2={0.5 * s} {...p} />
        </g>
      );
    case 'lb':
      return (
        <g>
          <circle cx={-0.5 * s} cy={0} r={0.13 * s} fill={color} />
          {[-0.5, 0, 0.5].map((q) => (
            <g key={q}>
              <path d={`M ${-0.4 * s} 0 C ${0.05 * s} 0, ${-0.05 * s} ${q * s}, ${0.4 * s} ${q * s}`} {...p} />
              <circle cx={0.5 * s} cy={q * s} r={0.11 * s} fill={color} />
            </g>
          ))}
        </g>
      );
    case 'service':
      return (
        <g>
          <rect x={-0.42 * s} y={-0.42 * s} width={0.84 * s} height={0.84 * s} rx={0.14 * s} {...p} />
          <rect x={-0.16 * s} y={-0.16 * s} width={0.32 * s} height={0.32 * s} rx={0.06 * s} fill={color} />
          {[-1, 1].flatMap((d) => [<line key={`h${d}`} x1={d * 0.42 * s} y1={0} x2={d * 0.66 * s} y2={0} {...p} />, <line key={`v${d}`} x1={0} y1={d * 0.42 * s} x2={0} y2={d * 0.66 * s} {...p} />])}
        </g>
      );
    case 'db':
      return (
        <g>
          <ellipse cx={0} cy={-0.5 * s} rx={0.5 * s} ry={0.19 * s} {...p} />
          <path d={`M ${-0.5 * s} ${-0.5 * s} V ${0.5 * s} A ${0.5 * s} ${0.19 * s} 0 0 0 ${0.5 * s} ${0.5 * s} V ${-0.5 * s}`} {...p} />
          <path d={`M ${-0.5 * s} ${0} A ${0.5 * s} ${0.19 * s} 0 0 0 ${0.5 * s} ${0}`} {...p} />
        </g>
      );
    case 'cache':
      return (
        <g>
          <rect x={-0.46 * s} y={-0.46 * s} width={0.92 * s} height={0.92 * s} rx={0.16 * s} {...p} />
          <path d={`M ${0.1 * s} ${-0.36 * s} L ${-0.22 * s} ${0.04 * s} H ${0.02 * s} L ${-0.1 * s} ${0.36 * s} L ${0.24 * s} ${-0.08 * s} H ${0} Z`} fill={color} />
        </g>
      );
    case 'queue':
      return (
        <g>
          {[-0.4, 0, 0.4].map((q, i) => (
            <rect key={q} x={(-0.5 + i * 0.06) * s} y={(q - 0.12) * s} width={(0.7 - i * 0.04) * s} height={0.24 * s} rx={0.07 * s} {...p} />
          ))}
        </g>
      );
    default:
      return (
        <path
          d={`M ${-0.5 * s} ${0.3 * s} A ${0.26 * s} ${0.26 * s} 0 0 1 ${-0.36 * s} ${-0.17 * s} A ${0.4 * s} ${0.4 * s} 0 0 1 ${0.3 * s} ${-0.2 * s} A ${0.3 * s} ${0.3 * s} 0 0 1 ${0.5 * s} ${0.3 * s} Z`}
          {...p}
        />
      );
  }
};

/** A glass disc with a glyph inside; `k` scales the emissive halo (0 = none), `scale` is the pop-in / emphasis scale. */
export const HopDisc: React.FC<{kind: HopKind; x: number; y: number; r: number; color: string; fx: Fx; k?: number; scale?: number; opacity?: number; ring?: number}> = ({kind, x, y, r, color, fx, k = 1, scale = 1, opacity = 1, ring = 3}) => (
  <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${scale.toFixed(3)})`} opacity={opacity}>
    {k > 0 ? <circle r={r + fx.glowInner * 1.5 * k} fill={color} fillOpacity={0.09 * Math.min(1.6, k)} /> : null}
    {k > 0 ? <circle r={r + fx.glowInner * 0.55 * k} fill={color} fillOpacity={0.17 * Math.min(1.6, k)} /> : null}
    <circle r={r} fill={C.panel} stroke={color} strokeWidth={ring} />
    <circle r={r - 7} fill={C.ground} opacity={0.85} />
    <Glyph kind={kind} s={r * 0.8} color={color} />
  </g>
);
