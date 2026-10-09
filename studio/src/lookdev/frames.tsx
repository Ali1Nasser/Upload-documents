// P6 style frames, r1 (critic r0 issues 1-5 applied). Real content only: corpus/canon/data_contract.json §6.3, §6.7,
// §6.18, §6.19; chapters.json labels; Arabic microcopy taken from S1 narration words (no authored phrases).
import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {Backdrop, Bokeh, Counter, FloorGrid, Glass, Haze, KWord, Label, Mix, Plane, Post, Scrim, TermChip, drift, hex, push} from './kit';
import {C, Fx, Typo, caShadow, glow, halo} from './theme';
import {RECEIPTS, SQL_FUNNEL, SQL_LINES, DOCKER, RAG, COPY} from './content';
import {ArStack} from '../type/ArStack';
import {blockLineHeight, breakCaption, minus} from '../type/arabic';
import {displayText} from '../type/overrides';
import {interpolate, random} from 'remotion';

export type FrameProps = {typo: Typo; fx: Fx; reveal?: number};
const SHOWN = -1000; // stills: every kinetic element already revealed

const subLines = (sub: string) => {
  const b = breakCaption(sub);
  if (b.overflow) throw new Error(`subtitle overflows the 32 x 2 rule: "${sub}"`);
  return b.lines;
};

/** Title block, top-right, with the tashkeel clearance rule between title and subtitle. */
const Title: React.FC<{typo: Typo; fx: Fx; title: string; size: number; sub?: string; subSize?: number; subColor?: string; top?: number; right?: number; at?: number; subAt?: number}> = ({
  typo,
  fx,
  title,
  size,
  sub,
  subSize = 48,
  subColor = C.ink2,
  top = 60,
  right = 120,
  at = SHOWN,
  subAt = SHOWN,
}) => (
  <div style={{position: 'absolute', right, top}}>
    <ArStack
      lines={[
        {text: title, size, node: <KWord text={title} at={at} typo={typo} fx={fx} size={size} preset="impact" />},
        // r2: subtitles follow the caption rule (<= 32 chars/line, <= 2 lines, top-heavy break), block line-height
        ...(sub ? subLines(sub).map((l, i, a) => ({text: l, size: subSize, role: (i === 0 ? 'title-sub' : 'lines') as 'title-sub' | 'lines', node: <KWord text={l} at={subAt + i * 4} typo={typo} fx={fx} size={subSize} color={subColor} glowColor={C.void} style={{lineHeight: blockLineHeight(a)}} />})) : []),
      ]}
    />
  </div>
);

// ---------- (1) cold open: NilePay receipts → glowing table (CH-00, §6.19) ----------
const ReceiptCard: React.FC<{x: number; y: number; rot: number; r: (typeof RECEIPTS)[number]; typo: Typo; fx: Fx; k?: number}> = ({x, y, rot, r, typo, fx, k = 1.5}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: 170 * k,
      padding: `${12 * k}px ${14 * k}px`,
      background: `linear-gradient(180deg, ${C.paper}, ${C.paperShade})`,
      borderRadius: 6 * k,
      transform: `rotate(${rot}deg)`,
      boxShadow: `0 0 ${fx.glowPx}px ${C.signal}66, 0 0 2px ${C.signal}, 0 ${18 * k}px ${30 * k}px rgba(0,0,0,0.55)`,
      fontFamily: `'${typo.mono}'`,
      color: C.paperInk,
    }}
  >
    <div style={{fontSize: 15 * k, fontWeight: 700, letterSpacing: 1}}>NilePay</div>
    <div style={{height: 1, background: `${C.paperInk}55`, margin: `${6 * k}px 0`}} />
    <div style={{fontSize: 20 * k, fontWeight: 700}}>{r.id}</div>
    <div style={{fontSize: 17 * k}}>op {r.operator}</div>
    <div style={{fontSize: 20 * k, fontWeight: 700}}>{r.amount_egp} EGP</div>
    <div style={{fontSize: 16 * k, color: r.status === 'OK' ? C.paperOk : C.paperCrit, fontWeight: 700}}>{r.status}</div>
  </div>
);

/** Point on a cubic Bezier (receipt flight paths). */
const bez = (p: number[][], t: number) => {
  const u = 1 - t;
  const k = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
  return [0, 1].map((d) => k.reduce((a, w, i) => a + w * p[i][d], 0));
};

export const F1ColdOpen: React.FC<FrameProps> = ({typo, fx}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const colX = [0, 150, 330, 560]; // id | operator | amount | status (LTR data table)
  const T = {x: 120, y: 260, w: 860, rowH: 72};
  const rowY = (i: number) => 100 + i * T.rowH;
  const landed = 4; // rows 1-4 in; row 5 landing now; row 6 lit by the incoming receipt
  const rowEnd = (i: number) => ({x: T.x + T.w - 6, y: T.y + rowY(i) + 30});
  const r5 = rowEnd(4);
  const r6 = rowEnd(5);
  const ctl = [
    [[1150, 560], [1080, 520], [1040, r5.y - 40], [r5.x, r5.y]],
    [[1420, 600], [1330, 520], [1180, r6.y + 60], [r6.x, r6.y]],
  ];
  const paths = [
    {d: `M 1150 560 C 1080 520, 1040 ${r5.y - 40}, ${r5.x} ${r5.y}`, p: 1},
    {d: `M 1420 600 C 1330 520, 1180 ${r6.y + 60}, ${r6.x} ${r6.y}`, p: 0.62},
  ];
  // r2 (critic r1 #8): particles travel along both receipt paths toward the table (seeded phases, 2 x 36 sprites)
  const trail = ctl.flatMap((c, j) =>
    Array.from({length: 36}, (_, i) => {
      const u = (((frame / fps) * (0.32 + 0.1 * random(`tr${j}${i}`)) + random(`to${j}${i}`)) % 1) * paths[j].p;
      const [x, y] = bez(c, u);
      const a = 0.25 + 0.75 * random(`ta${j}${i}`);
      return {x, y, r: 1.6 + 3 * random(`tz${j}${i}`), a: a * (0.3 + 0.7 * u), j, i};
    }),
  );
  return (
    <AbsoluteFill>
      <Backdrop fx={fx} />
      {/* far plane: floor grid + a dim back wall of shelves, blurred */}
      <Plane depth={0.8} fx={fx} cam={frame / fps / 10} post={push(frame, durationInFrames, 0.035, 0.4).transform as string}>
        <FloorGrid y={700} drift={frame * 0.6} opacity={1} />
        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
          {Array.from({length: 7}, (_, i) => (
            <rect key={i} x={140 + i * 250} y={180} width={200} height={420} rx={8} fill="none" stroke={C.ink3} strokeOpacity={0.18} />
          ))}
        </svg>
      </Plane>
      <Haze fx={fx} y={640} h={560} k={1.4} />
      <AbsoluteFill style={push(frame, durationInFrames, 0.035)}>
        {/* under-light pools */}
        <div style={{position: 'absolute', left: 1200, top: 820, width: 620, height: 150, borderRadius: '50%', background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${C.signal}${hex(0.32)} 0%, transparent 70%)`}} />
        <div style={{position: 'absolute', left: 80, top: 830, width: 940, height: 160, borderRadius: '50%', background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${C.signal}${hex(0.2)} 0%, transparent 70%)`}} />
        {/* the shoebox: matte solid with key rim light (upper right), emissive lip and light from inside */}
        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
          <defs>
            <linearGradient id="boxFront" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#2C3440" />
              <stop offset="1" stopColor="#11151B" />
            </linearGradient>
            <linearGradient id="boxSide" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#151A22" />
              <stop offset="1" stopColor="#3A4656" />
            </linearGradient>
            <radialGradient id="boxInner" cx="0.5" cy="1" r="0.8">
              <stop offset="0" stopColor={C.signal} stopOpacity={0.75} />
              <stop offset="0.5" stopColor={C.signal} stopOpacity={0.18} />
              <stop offset="1" stopColor={C.signal} stopOpacity={0} />
            </radialGradient>
            <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation={fx.glowInner} />
            </filter>
          </defs>
          {/* open lid behind */}
          <polygon points="1340,600 1720,600 1760,450 1390,480" fill="#1E2430" stroke={C.ink3} strokeOpacity={0.5} />
          <line x1={1390} y1={480} x2={1760} y2={450} stroke={C.ink} strokeOpacity={0.5} strokeWidth={2} />
          {/* opening + inner glow */}
          <polygon points="1290,630 1690,630 1740,595 1340,595" fill="#07090D" />
          <ellipse cx={1515} cy={600} rx={230} ry={120} fill="url(#boxInner)" />
          {/* receipts still in the box */}
          {[0, 1, 2].map((k) => (
            <rect key={k} x={1370 + k * 90} y={565 - k * 16} width={150} height={88} rx={8} fill={C.paper} opacity={0.82 - k * 0.12} transform={`rotate(${-12 + k * 9} ${1440 + k * 90} 610)`} />
          ))}
          <polygon points="1290,630 1690,630 1665,890 1315,890" fill="url(#boxFront)" stroke={C.ink3} strokeOpacity={0.5} />
          <polygon points="1690,630 1740,595 1716,845 1665,890" fill="url(#boxSide)" />
          {/* key rim light on the right edges */}
          <polyline points="1740,595 1716,845" fill="none" stroke={C.ink} strokeOpacity={0.75} strokeWidth={2.5} />
          <polyline points="1690,630 1665,890" fill="none" stroke={C.ink} strokeOpacity={0.35} strokeWidth={1.5} />
          {/* emissive lip */}
          <polyline points="1290,630 1690,630 1740,595" fill="none" stroke={C.signal} strokeWidth={4} />
          <polyline points="1290,630 1690,630 1740,595" fill="none" stroke={C.signal} strokeWidth={14} opacity={0.6} filter="url(#soft)" />
          {/* flight paths: light trails that light the table rows */}
          {trail.map((t) => (
            <circle key={`t${t.j}-${t.i}`} cx={t.x} cy={t.y} r={t.r} fill={t.i % 5 ? C.signal : C.ink} opacity={t.a} style={{filter: `drop-shadow(0 0 ${fx.glowInner * 0.6}px ${C.signal})`}} />
          ))}
          {paths.map((pp, i) => (
            <g key={i}>
              <path d={pp.d} fill="none" stroke={C.signal} strokeWidth={2} strokeDasharray="6 10" opacity={0.45} />
              <path d={pp.d} fill="none" stroke={C.signal} strokeWidth={10} opacity={0.5} filter="url(#soft)" pathLength={1} strokeDasharray={`${pp.p} 1`} />
              <path d={pp.d} fill="none" stroke={C.ink} strokeWidth={2.5} opacity={0.9} pathLength={1} strokeDasharray={`${pp.p} 1`} />
            </g>
          ))}
        </svg>
        {/* the table */}
        <Glass accent={C.signal} style={{left: T.x, top: T.y, width: T.w, height: rowY(6) + 18, borderTop: `1.5px solid ${C.signal}AA`}}>
          {/* r2: header labels 28 px in ink2 (was 26 px ink3, ~22 px apparent at low contrast) */}
          <div style={{position: 'absolute', left: 40, top: 30, fontFamily: `'${typo.mono}'`, fontSize: 28, fontWeight: 600, color: C.ink2, textShadow: halo}} dir="ltr">
            {['id', 'operator', 'amount_egp', 'status'].map((h, i) => (
              <div key={h} style={{position: 'absolute', left: colX[i], whiteSpace: 'nowrap'}}>
                {h}
              </div>
            ))}
          </div>
          <div style={{position: 'absolute', left: 30, right: 30, top: 84, height: 1, background: `${C.signal}66`}} />
          {RECEIPTS.map((r, i) => {
            const landing = i === landed;
            const arriving = i === landed + 1;
            const st = r.status === 'OK' ? C.ok : C.crit;
            const o = arriving ? 0.5 : 1;
            return (
              <div key={r.id} dir="ltr" style={{position: 'absolute', left: 40, top: rowY(i), width: T.w - 80, height: 60, fontFamily: `'${typo.mono}'`, fontSize: 32, color: C.ink}}>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    left: -14,
                    right: -14,
                    borderRadius: 10,
                    border: `1px solid ${C.signal}${landing ? 'CC' : arriving ? '77' : '3A'}`,
                    background: landing
                      ? `linear-gradient(270deg, ${C.signal}55 0%, ${C.signal}14 60%, ${C.signal}0A 100%)`
                      : arriving
                        ? `linear-gradient(270deg, ${C.signal}38 0%, transparent 70%)`
                        : `${C.signal}0D`,
                    boxShadow: landing ? `0 0 ${fx.glowPx}px ${C.signal}66` : `0 0 ${fx.glowPx * 0.5}px ${C.signal}1F`,
                  }}
                />
                <div style={{position: 'absolute', left: colX[0], top: 10, opacity: o}}>{r.id}</div>
                <div style={{position: 'absolute', left: colX[1], top: 10, opacity: o}}>{r.operator}</div>
                <div style={{position: 'absolute', left: colX[2], top: 10, width: 150, textAlign: 'right', fontVariantNumeric: 'tabular-nums', opacity: o}}>{r.amount_egp}</div>
                <div style={{position: 'absolute', left: colX[3], top: 8, padding: '0 14px', borderRadius: 8, fontSize: 28, fontWeight: 700, color: st, border: `1.5px solid ${st}`, textShadow: glow(st, fx, 0.4), opacity: o}}>
                  {r.status}
                </div>
              </div>
            );
          })}
        </Glass>
        {/* r2: the narration line moves into the empty upper-left, above the table it describes */}
        <Label text={COPY.f1Table} typo={typo} size={48} color={C.ink} weight={600} style={{left: T.x, top: 96}} />
        <TermChip term="table" typo={typo} fx={fx} style={{left: T.x + 20, top: T.y - 70}} size={30} />
        <ReceiptCard x={1010} y={380} rot={-12} r={RECEIPTS[4]} typo={typo} fx={fx} />
        <ReceiptCard x={1300} y={420} rot={9} r={RECEIPTS[5]} typo={typo} fx={fx} />
        <Label text={COPY.f1Box} typo={typo} size={34} color={C.ink} style={{right: 220, top: 920}} />
      </AbsoluteFill>
      <Title typo={typo} fx={fx} title="هات الصفوف" size={120} sub="أقفل أنهي يوم في الأسبوع؟" subSize={56} />
      <Plane depth={-0.5} fx={fx} cam={frame / fps / 10}>
        <Bokeh fx={fx} seed="f1" drift={frame * 0.4} />
      </Plane>
      <Post fx={fx} />
    </AbsoluteFill>
  );
};

// ---------- (2) SQL row-count funnel (CH-11, §6.3) — moment: WHERE drops 1004 + 1010, 13 → 11 ----------
export const F2SqlFunnel: React.FC<FrameProps & {stage?: number; dropAt?: number}> = ({typo, fx, stage = 2, dropAt = 4}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const x0 = 250;
  const dx = 172;
  const trackY = 700;
  const dot = 34;
  const r = 13;
  const colTop = (n: number) => trackY - 44 - n * dot;
  const xs = (i: number) => x0 + i * dx;
  const env = SQL_FUNNEL.map((s, i) => `${xs(i)},${colTop(s.rows) - 8}`);
  const whereX = xs(stage);
  return (
    <AbsoluteFill>
      <Backdrop fx={fx} />
      <Plane depth={0.8} fx={fx} cam={frame / fps / 10} post={push(frame, durationInFrames, 0.04, 0.35).transform as string}>
        <FloorGrid y={760} drift={frame * 0.5} opacity={1} />
      </Plane>
      <Haze fx={fx} y={520} h={620} k={1.2} />
      <AbsoluteFill style={push(frame, durationInFrames, 0.04)}>
        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
          <defs>
            <linearGradient id="funnel" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={C.signal} stopOpacity={0.26} />
              <stop offset="1" stopColor={C.signal} stopOpacity={0.03} />
            </linearGradient>
          </defs>
          {/* whole nine-stage envelope (future stages as a ghost) */}
          <polygon points={`${xs(0)},${trackY - 30} ${env.join(' ')} ${xs(8)},${trackY - 30}`} fill={`${C.signal}0A`} stroke={C.ink3} strokeOpacity={0.25} strokeDasharray="6 8" />
          <polygon points={`${xs(0)},${trackY - 30} ${env.slice(0, stage + 1).join(' ')} ${xs(stage)},${trackY - 30}`} fill="url(#funnel)" />
          <polyline points={env.slice(0, stage + 1).join(' ')} fill="none" stroke={C.signal} strokeWidth={3} opacity={0.85} style={{filter: `drop-shadow(0 0 ${fx.glowInner}px ${C.signal})`}} />
          <line x1={xs(0) - 50} y1={trackY} x2={xs(8) + 50} y2={trackY} stroke={C.grid} strokeWidth={5} />
          <line x1={xs(0) - 50} y1={trackY} x2={whereX} y2={trackY} stroke={C.signal} strokeWidth={5} style={{filter: `drop-shadow(0 0 ${fx.glowInner}px ${C.signal})`}} />
          {SQL_FUNNEL.map((s, i) =>
            Array.from({length: s.rows}, (_, k) => {
              const cur = i === stage;
              const past = i < stage;
              return (
                <circle
                  key={`${i}-${k}`}
                  cx={xs(i)}
                  cy={trackY - 44 - k * dot - dot / 2}
                  r={r}
                  fill={cur ? C.signal : past ? C.ink2 : 'none'}
                  stroke={past || cur ? undefined : C.ink3}
                  strokeOpacity={0.4}
                  strokeWidth={1.5}
                  opacity={cur ? 1 : past ? 0.6 : 1}
                  style={cur ? {filter: `drop-shadow(0 0 ${fx.glowInner}px ${C.signal})`} : undefined}
                />
              );
            }),
          )}
          {/* the two rows WHERE drops: fall out to the right of the WHERE column */}
          {[0, 1].map((k) => {
            // r2 (critic r1 #5): the two dropped rows TUMBLE out (ballistic arc + spin + 4-sample motion trail)
            const sy = trackY - 44 - (11 + k) * dot - dot / 2;
            const ex = whereX + 96 + k * 54;
            const ey = sy + 150 + k * 44;
            const T = Math.round(fps * (1.1 + 0.25 * k));
            const at = (f: number) => {
              const u = Math.max(0, Math.min(1, (f - dropAt - k * 5) / T));
              const e = 1 - (1 - u) * (1 - u);
              return {x: whereX + (ex - whereX) * e, y: sy + (ey - sy) * u * u - 60 * Math.sin(Math.PI * u) * (1 - u), rot: 300 * e * (k ? -1 : 1), u};
            };
            const cur = at(frame);
            return (
              <g key={k}>
                <path d={`M ${whereX} ${sy} Q ${whereX + 40} ${sy - 10}, ${ex} ${ey}`} fill="none" stroke={C.crit} strokeWidth={2} strokeDasharray="5 7" opacity={0.45} />
                <circle cx={whereX} cy={sy} r={r} fill="none" stroke={C.crit} strokeOpacity={0.45} strokeWidth={1.5} strokeDasharray="3 4" />
                {cur.u > 0 && cur.u < 1
                  ? [8, 6, 4, 2].map((d, j) => {
                      const g = at(frame - d);
                      return <circle key={d} cx={g.x} cy={g.y} r={r * (0.6 + j * 0.1)} fill={C.crit} opacity={0.08 + j * 0.06} />;
                    })
                  : null}
                <g transform={`translate(${cur.x} ${cur.y}) rotate(${cur.rot})`} style={{filter: `drop-shadow(0 0 ${fx.glowInner}px ${C.crit})`}}>
                  <circle r={r + 2} fill={`${C.crit}33`} stroke={C.crit} strokeWidth={2.5} />
                  <path d={`M ${-r * 0.5} ${-r * 0.5} L ${r * 0.5} ${r * 0.5} M ${r * 0.5} ${-r * 0.5} L ${-r * 0.5} ${r * 0.5}`} stroke={C.crit} strokeWidth={2.5} strokeLinecap="round" />
                </g>
              </g>
            );
          })}
        </svg>
        <div dir="ltr" style={{position: 'absolute', left: whereX + 190, top: trackY - 44 - 13 * dot + 112, fontFamily: `'${typo.mono}'`, fontSize: 30, fontWeight: 600, color: C.crit, lineHeight: '48px', textShadow: `${halo}, ${glow(C.crit, fx, 0.3)}`, whiteSpace: 'nowrap'}}>
          <div>1004 · cancelled</div>
          <div>1010 · refunded</div>
        </div>
        {SQL_FUNNEL.map((s, i) => {
          const cur = i === stage;
          const past = i < stage;
          return (
            <div key={s.stage} style={{position: 'absolute', left: xs(i) - 86, top: trackY + 22, width: 172, textAlign: 'center'}}>
              <div
                dir="ltr"
                style={{
                  display: 'inline-block',
                  padding: '6px 12px',
                  borderRadius: 10,
                  fontFamily: `'${typo.mono}'`,
                  fontSize: 24,
                  fontWeight: 600,
                  color: cur ? C.void : past ? C.ink : C.ink2,
                  background: cur ? C.signal : 'rgba(22,27,34,0.88)',
                  border: `1px solid ${cur ? C.signal : past ? C.ink3 : C.grid}`,
                  boxShadow: cur ? `0 0 ${fx.glowPx}px ${C.signal}aa` : undefined,
                  whiteSpace: 'nowrap',
                }}
              >
                {s.stage}
              </div>
              <div dir="ltr" style={{fontFamily: `'${typo.mono}'`, fontSize: 34, fontWeight: 700, marginTop: 8, color: cur ? C.signal : C.ink2, fontVariantNumeric: 'tabular-nums', opacity: i <= stage ? 1 : 0.28}}>
                {i <= stage ? s.rows : '·'}
              </div>
            </div>
          );
        })}
        <TermChip term="WHERE" gloss={COPY.f2Where} typo={typo} fx={fx} style={{left: whereX - 110, top: colTop(13) - 100}} size={30} glossSize={32} />
        {/* query with the current clause lit (compact, bottom-left, nothing overlaps) */}
        <Glass style={{right: 130, top: 856, width: 700, height: 196}}>
          <div dir="ltr" style={{position: 'absolute', left: 26, top: 14, fontFamily: `'${typo.mono}'`, fontSize: 20, lineHeight: '21.5px', color: C.ink3, whiteSpace: 'pre'}}>
            {SQL_LINES.map((l, i) => (
              <div key={i} style={l.startsWith('WHERE') ? {color: C.signal, textShadow: glow(C.signal, fx, 0.4)} : undefined}>
                {l}
              </div>
            ))}
          </div>
        </Glass>
        <div style={{position: 'absolute', right: 130, top: 330}}>
          <div dir="ltr" style={{display: 'flex', alignItems: 'baseline', gap: 26, justifyContent: 'flex-end'}}>
            <span style={{fontFamily: `'${typo.mono}'`, fontSize: 96, color: C.ink3, fontWeight: 600}}>13 →</span>
            <Counter from={11} to={11} a={0} b={0} typo={typo} fx={fx} size={220} color={C.signal} unit="rows" impact />
          </div>
        </div>
      </AbsoluteFill>
      <Title typo={typo} fx={fx} title="الصفوف الباقية" size={112} sub={COPY.f2Sub} subSize={44} top={40} />
      <Plane depth={-0.5} fx={fx} cam={frame / fps / 10}>
        <Bokeh fx={fx} seed="f2" drift={frame * 0.4} />
      </Plane>
      <Post fx={fx} />
    </AbsoluteFill>
  );
};

// ---------- (3) Kafka partitions with offsets + lag (CH-26 labels; offsets are schematic indices) ----------
type Lane = {name: string; len: number; consumed: number};
const LANES: Lane[] = [
  {name: 'P0', len: 12, consumed: 7},
  {name: 'P1', len: 9, consumed: 8},
  {name: 'P2', len: 10, consumed: 9},
];
const keyShape = (lane: number, off: number) => (lane * 7 + off * 3) % 3;

const LaneRow: React.FC<{ln: Lane; li: number; x0: number; y: number; cw: number; ch: number; typo: Typo; fx: Fx; lit?: boolean; hideFrom?: number; reveal?: (o: number) => number}> = ({ln, li, x0, y, cw, ch, typo, fx, lit, hideFrom, reveal}) => {
  const digit = Math.round(ch * 0.25);
  return (
    <>
      <div style={{position: 'absolute', left: x0 - 26, top: y - 18, width: ln.len * cw + 40, height: ch + 36, borderRadius: 22, border: `1.5px solid ${C.violet}${lit ? 'AA' : '66'}`, background: `${C.violet}${lit ? '12' : '0A'}`, boxShadow: `0 0 ${fx.glowPx}px ${C.violet}${lit ? '33' : '18'}`}} />
      <div dir="ltr" style={{position: 'absolute', left: x0 - 120, top: y + ch / 2 - 26, fontFamily: `'${typo.mono}'`, fontSize: 40, fontWeight: 700, color: C.violet, textShadow: glow(C.violet, fx, 0.4)}}>
        {ln.name}
      </div>
      {Array.from({length: ln.len}, (_, o) => {
        const done = o <= ln.consumed;
        const lagCell = lit && o > ln.consumed;
        const shp = keyShape(li, o);
        const s = ch * 0.34;
        const landed = hideFrom === undefined || o < hideFrom || !reveal || reveal(o) >= 1;
        if (!landed)
          return <div key={o} style={{position: 'absolute', left: x0 + o * cw, top: y, width: cw - 14, height: ch, borderRadius: 12, border: `1.5px dashed ${C.ink3}66`}} />;
        return (
          <div
            key={o}
            style={{
              position: 'absolute',
              left: x0 + o * cw,
              top: y,
              width: cw - 14,
              height: ch,
              borderRadius: 12,
              background: lagCell ? `${C.warn}14` : done ? 'rgba(230,237,243,0.07)' : 'rgba(22,27,34,0.92)',
              border: `1.5px solid ${lagCell ? C.warn + 'CC' : 'rgba(230,237,243,0.16)'}`,
              boxShadow: lagCell ? `0 0 ${fx.glowInner * 2}px ${C.warn}55` : 'inset 0 1px 0 rgba(230,237,243,0.08)',
            }}
          >
            <svg width={s} height={s} style={{position: 'absolute', left: (cw - 14) / 2 - s / 2, top: ch * 0.12}}>
              {shp === 0 ? (
                <circle cx={s / 2} cy={s / 2} r={s * 0.36} fill={done ? C.ink3 : C.ink} />
              ) : shp === 1 ? (
                <rect x={s * 0.16} y={s * 0.16} width={s * 0.68} height={s * 0.68} rx={3} fill={done ? C.ink3 : C.ink} />
              ) : (
                <polygon points={`${s / 2},${s * 0.12} ${s * 0.9},${s * 0.88} ${s * 0.1},${s * 0.88}`} fill={done ? C.ink3 : C.ink} />
              )}
            </svg>
            <div dir="ltr" style={{position: 'absolute', bottom: ch * 0.07, width: '100%', textAlign: 'center', fontFamily: `'${typo.mono}'`, fontSize: digit, fontWeight: 600, color: lagCell ? C.warn : done ? C.ink3 : C.ink, fontVariantNumeric: 'tabular-nums'}}>
              {o}
            </div>
          </div>
        );
      })}
      {/* consumer offset marker */}
      <div style={{position: 'absolute', left: x0 + (ln.consumed + 1) * cw - 10, top: y - 30, width: 5, height: ch + 60, background: C.signal, boxShadow: `0 0 ${fx.glowPx}px ${C.signal}`, borderRadius: 3}} />
      <div style={{position: 'absolute', left: x0 + (ln.consumed + 1) * cw - 22, top: y + ch + 30, width: 0, height: 0, borderLeft: '15px solid transparent', borderRight: '15px solid transparent', borderBottom: `22px solid ${C.signal}`}} />
    </>
  );
};

export const F3Kafka: React.FC<FrameProps & {lagAt?: number; lagEnd?: number; t0?: number}> = ({typo, fx, lagAt = 0, lagEnd = 0, t0 = 0}) => {
  const gframe = useCurrentFrame();
  const frame = gframe - t0; // local clock (MC mounts this scene at the cut)
  const {fps, durationInFrames} = useVideoConfig();
  const cw = 118;
  const ch = 112;
  const x0 = 190;
  const y0 = 560;
  const p0 = LANES[0];
  const last = p0.len - 1;
  const bx = x0 + (p0.consumed + 1) * cw - 8;
  const bw = (last - p0.consumed) * cw - 6;
  // r2 (critic r1 #5): messages 8-11 slide from the producer into P0 with a light trail, one every 0.3 s from 0.2 s
  const slide = (o: number) => interpolate(frame, [fps * (0.2 + (o - 8) * 0.3), fps * (0.2 + (o - 8) * 0.3) + 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (x) => 1 - (1 - x) ** 3});
  const prodX = x0 + (last + 1) * cw + 26;
  return (
    <AbsoluteFill>
      <Backdrop fx={fx} tint={C.violet} />
      <Plane depth={0.85} fx={fx} cam={frame / fps / 10}>
        <FloorGrid y={760} drift={frame * 0.8} opacity={1} />
      </Plane>
      {/* far partition P2: 60 % scale, blurred; mid partition P1: 80 %, light blur */}
      {/* r2: P2 and P1 rows are wholly defocused (critic r1 #5: blur the whole row, not just darken it) */}
      <AbsoluteFill style={{transform: `${drift(frame, fps, 0.012, 'far')} translate(0px, -330px) scale(0.6)`, transformOrigin: '0% 50%', filter: `blur(${fx.dofBlurPx * 1.9}px) brightness(0.75)`, opacity: 0.8}}>
        <div style={{position: 'absolute', left: 300, top: 0}}>
          <LaneRow ln={LANES[2]} li={2} x0={x0} y={y0} cw={cw} ch={ch} typo={typo} fx={fx} />
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{transform: `${drift(frame, fps, 0.016, 'mid')} translate(0px, -205px) scale(0.8)`, transformOrigin: '0% 50%', filter: `blur(${fx.dofBlurPx * 1.25}px) brightness(0.8)`, opacity: 0.88}}>
        <div style={{position: 'absolute', left: 120, top: 0}}>
          <LaneRow ln={LANES[1]} li={1} x0={x0} y={y0} cw={cw} ch={ch} typo={typo} fx={fx} />
        </div>
      </AbsoluteFill>
      <Haze fx={fx} y={560} h={460} tint={C.violet} k={1.3} />
      <AbsoluteFill style={push(frame, durationInFrames, 0.04)}>
        <LaneRow ln={p0} li={0} x0={x0} y={y0} cw={cw} ch={ch} typo={typo} fx={fx} lit hideFrom={8} reveal={slide} />
        {/* sliding messages + trails */}
        {[8, 9, 10, 11].map((o) => {
          const k = slide(o);
          if (k <= 0 || k >= 1) return null;
          const tx = x0 + o * cw;
          const x = prodX + (tx - prodX) * k;
          return (
            <React.Fragment key={o}>
              <div style={{position: 'absolute', left: x + cw * 0.4, top: y0 + ch / 2 - 5, width: (prodX - x) * 0.9 + 30, height: 10, borderRadius: 5, background: `linear-gradient(90deg, ${C.warn}AA, ${C.warn}00)`, filter: `blur(3px)`}} />
              <div style={{position: 'absolute', left: x, top: y0, width: cw - 14, height: ch, borderRadius: 12, border: `2px solid ${C.warn}`, background: `${C.warn}22`, boxShadow: `0 0 ${fx.glowPx}px ${C.warn}88`}} />
            </React.Fragment>
          );
        })}
        {/* lag bracket with bloom: last available − last processed */}
        <div style={{position: 'absolute', left: bx, top: y0 - 62, width: bw, height: 30, borderTop: `4px solid ${C.warn}`, borderLeft: `4px solid ${C.warn}`, borderRight: `4px solid ${C.warn}`, borderRadius: '10px 10px 0 0', boxShadow: `0 -6px ${fx.glowPx}px ${C.warn}88, inset 0 6px ${fx.glowInner}px ${C.warn}44`}} />
        <div style={{position: 'absolute', left: bx - 40, top: y0 - 250, width: bw + 80, height: 220, background: `radial-gradient(ellipse 50% 50% at 50% 60%, ${C.warn}${hex(0.16)} 0%, transparent 70%)`}} />
        {/* the hero element: lag = 11 − 7 = 4, count-up anchored to a word id in the spec */}
        <div dir="ltr" style={{position: 'absolute', left: bx + 20, top: y0 - 250, display: 'flex', alignItems: 'baseline', gap: 22, whiteSpace: 'nowrap'}}>
          <span style={{fontFamily: `'${typo.lat}'`, fontVariantNumeric: 'tabular-nums', fontSize: 72, fontWeight: 700, color: C.warn, textShadow: `${halo}, ${glow(C.warn, fx, 0.5)}`}}>{minus(`lag = ${last} - ${p0.consumed} =`)}</span>
          <Counter from={0} to={last - p0.consumed} a={lagAt} b={lagEnd} typo={typo} fx={fx} size={150} color={C.warn} impact font={typo.lat} />
        </div>
        {/* producer appends at the end */}
        <div style={{position: 'absolute', left: prodX, top: y0 + 10, width: cw - 26, height: ch - 20, borderRadius: 12, border: `2px solid ${C.signal}`, background: `${C.signal}26`, boxShadow: `0 0 ${fx.glowPx}px ${C.signal}88`}} />
        <Label text="⟦producer⟧" typo={typo} size={30} color={C.signal} style={{left: x0 + (last + 1) * cw + 10, top: y0 + ch + 30}} />
        <TermChip term="offset" gloss="الإزاحة" typo={typo} fx={fx} style={{left: x0 + (p0.consumed + 1) * cw - 150, top: y0 + ch + 66}} size={30} />
        {/* formula box fitted to its text, consumer-group chip inside */}
        <div style={{position: 'absolute', left: 960, top: 880, transform: 'translateX(-50%)'}}>
          <Glass accent={C.warn} style={{position: 'relative', display: 'flex', alignItems: 'center', gap: 34, padding: '18px 34px', flexDirection: 'row-reverse', whiteSpace: 'nowrap'}}>
            <Mix text="التأخر = آخر متاح − آخر معالج" latFont={typo.lat} size={52} style={{color: C.ink, textShadow: halo, lineHeight: 1.3}} />
            <TermChip term="consumer group" typo={typo} fx={fx} color={C.violet} style={{position: 'relative'}} size={28} />
          </Glass>
        </div>
      </AbsoluteFill>
      <Title typo={typo} fx={fx} title="الترتيب داخل الـpartition" size={92} />
      <Plane depth={-0.5} fx={fx} cam={frame / fps / 10}>
        <Bokeh fx={fx} seed="f3" drift={frame * 0.4} />
      </Plane>
      <Post fx={fx} />
    </AbsoluteFill>
  );
};

// ---------- (5) Docker layer cache cascade (CH-34, §6.7) ----------
type SlabState = 'cached' | 'edited' | 'cascade';
const Slab: React.FC<{x: number; y: number; w: number; h: number; text: string; state: SlabState; typo: Typo; fx: Fx}> = ({x, y, w, h, text, state, typo, fx}) => {
  const dx = 70;
  const dy = 46;
  const col = state === 'cached' ? C.ok : state === 'edited' ? C.signal : C.crit;
  const a = state === 'cached' ? 0.1 : 0.2;
  return (
    <>
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <g style={{filter: `drop-shadow(0 0 ${state === 'cached' ? fx.glowInner : fx.glowPx * 0.6}px ${col}${state === 'cached' ? '66' : 'AA'})`}}>
          <polygon points={`${x},${y} ${x + w},${y} ${x + w + dx},${y - dy} ${x + dx},${y - dy}`} fill={`${col}${hex(a + 0.08)}`} stroke={col} strokeWidth={1.5} />
          <polygon points={`${x + w},${y} ${x + w + dx},${y - dy} ${x + w + dx},${y - dy + h} ${x + w},${y + h}`} fill={`${col}${hex(a * 0.6)}`} stroke={col} strokeOpacity={0.7} strokeWidth={1.2} />
          <rect x={x} y={y} width={w} height={h} fill="rgba(13,17,23,0.82)" stroke={col} strokeWidth={1.8} />
          <line x1={x + dx} y1={y - dy} x2={x + w + dx} y2={y - dy} stroke={C.ink} strokeOpacity={0.55} strokeWidth={1.5} />
        </g>
      </svg>
      <div dir="ltr" style={{position: 'absolute', left: x + 22, top: y + h / 2 - 17, fontFamily: `'${typo.mono}'`, fontSize: 25, color: state === 'cached' ? C.ink2 : C.ink, whiteSpace: 'nowrap'}}>
        {text}
      </div>
      <div dir="ltr" style={{position: 'absolute', left: x + w - 136, top: y + h / 2 - 16, width: 120, textAlign: 'center', fontFamily: `'${typo.mono}'`, fontSize: 20, fontWeight: 700, color: col, border: `1.5px solid ${col}`, borderRadius: 6, padding: '2px 0'}}>
        {state === 'cached' ? 'CACHED' : state === 'edited' ? 'EDITED' : 'REBUILT'}
      </div>
    </>
  );
};

export const F5Docker: React.FC<FrameProps> = ({typo, fx}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const w = 700;
  const h = 56;
  const gap = 22;
  const stack = (x: number, base: number, layers: typeof DOCKER.good) =>
    layers.map((l, i) => <Slab key={i} x={x} y={base - i * (h + gap)} w={w} h={h} text={l.text} state={l.state} typo={typo} fx={fx} />);
  const goodX = 1010;
  const badX = 120;
  const base = 780;
  const badTop = base - (DOCKER.bad.length - 1) * (h + gap);
  const editedBad = DOCKER.bad.findIndex((l) => l.state === 'edited');
  return (
    <AbsoluteFill>
      <Backdrop fx={fx} />
      <Plane depth={0.8} fx={fx} cam={frame / fps / 10}>
        <FloorGrid y={760} drift={frame * 0.5} opacity={1} />
      </Plane>
      <Haze fx={fx} y={640} h={520} k={1.2} />
      <AbsoluteFill style={push(frame, durationInFrames, 0.03)}>
        {/* r2 (critic r1 #6): the upper-left void carries the build-time comparison (canon 5 s vs 57 s, bars to scale) */}
        <TermChip term="layer cache" typo={typo} fx={fx} color={C.ok} style={{left: badX, top: 92}} size={30} />
        {[
          {s: DOCKER.seconds.good, col: C.ok, y: 176},
          {s: DOCKER.seconds.bad, col: C.crit, y: 236},
        ].map((b) => (
          <React.Fragment key={b.s}>
            <div style={{position: 'absolute', left: badX, top: b.y, width: 640, height: 26, borderRadius: 13, background: `${C.grid}`, border: `1px solid ${C.ink3}33`}} />
            <div style={{position: 'absolute', left: badX, top: b.y, width: Math.max(26, (640 * b.s) / DOCKER.seconds.bad), height: 26, borderRadius: 13, background: `linear-gradient(90deg, ${b.col}55, ${b.col})`, boxShadow: `0 0 ${fx.glowPx * 0.6}px ${b.col}88`}} />
            <bdi dir="ltr" style={{position: 'absolute', left: badX + 660, top: b.y - 10, fontFamily: `'${typo.mono}'`, fontSize: 36, fontWeight: 700, color: b.col, textShadow: `${halo}, ${glow(b.col, fx, 0.4)}`, whiteSpace: 'nowrap'}}>
              {b.s} s
            </bdi>
          </React.Fragment>
        ))}
        {/* under-light pools from the stacks */}
        <div style={{position: 'absolute', left: badX - 40, top: base + 20, width: w + 160, height: 120, borderRadius: '50%', background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${C.crit}${hex(0.2)} 0%, transparent 70%)`}} />
        <div style={{position: 'absolute', left: goodX - 40, top: base + 20, width: w + 160, height: 120, borderRadius: '50%', background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${C.ok}${hex(0.18)} 0%, transparent 70%)`}} />
        {stack(goodX, base, DOCKER.good)}
        {stack(badX, base, DOCKER.bad)}
        {/* cascade beam: invalidation runs up from the edited layer */}
        <div style={{position: 'absolute', left: badX - 40, top: badTop - 10, width: 6, height: base - editedBad * (h + gap) - badTop + h + 10, background: `linear-gradient(0deg, ${C.crit}, ${C.crit}22)`, boxShadow: `0 0 ${fx.glowPx}px ${C.crit}`, borderRadius: 3}} />
        <div style={{position: 'absolute', left: badX - 54, top: badTop - 34, width: 0, height: 0, borderLeft: '17px solid transparent', borderRight: '17px solid transparent', borderBottom: `26px solid ${C.crit}`}} />
        {/* r2 (critic r1 #6, arabic r1 BLOCKING): both stack labels raised 40 px, so 'عاقل' clears the top slab edge (~y 418); left label stays aligned */}
        <Label text={COPY.f5Good} typo={typo} size={40} color={C.ink} weight={600} style={{left: goodX, top: base - 5 * (h + gap) - 46}} />
        <Label text={COPY.f5Bad} typo={typo} size={40} color={C.ink} weight={600} style={{left: badX, top: base - 5 * (h + gap) - 46}} />
        <div style={{position: 'absolute', left: goodX + 20, top: base + 76}}>
          <Counter from={5} to={5} a={0} b={0} typo={typo} fx={fx} size={140} color={C.ok} unit="s" impact />
        </div>
        <div style={{position: 'absolute', left: badX + 20, top: base + 76}}>
          <Counter from={57} to={57} a={0} b={0} typo={typo} fx={fx} size={140} color={C.crit} unit="s" impact />
        </div>
      </AbsoluteFill>
      <Title typo={typo} fx={fx} title={displayText('CH-34:labels_ar:0', DOCKER.headline)} size={104} sub={COPY.f5Sub} subSize={48} subColor={C.signal} top={36} />
      <Plane depth={-0.5} fx={fx} cam={frame / fps / 10}>
        <Bokeh fx={fx} seed="f5" drift={frame * 0.4} />
      </Plane>
      <Post fx={fx} />
    </AbsoluteFill>
  );
};

// ---------- (6) kinetic-typography-only frame (CH-33 §6.18: "confident, wrong, weak") ----------
export const F6Type: React.FC<FrameProps> = ({typo, fx}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  return (
    <AbsoluteFill>
      <Backdrop fx={fx} tint={C.crit} shaft={false} />
      {/* far plane: the raw score as a huge blurred ghost (depth cue for a type-only frame) */}
      <Plane depth={0.9} fx={fx} cam={frame / fps / 10}>
        {/* r2 (critic r1 #7, arabic r1): ghost dropped to 6 % (cap 8 %) and moved down, below the impact phrase */}
        <div dir="ltr" style={{position: 'absolute', left: 120, top: 400, fontFamily: `'${typo.mono}'`, fontWeight: 700, fontSize: 520, color: C.crit, opacity: 0.06, filter: 'blur(8px)'}}>
          0.165
        </div>
      </Plane>
      <Haze fx={fx} y={500} h={600} tint={C.crit} k={0.9} />
      <Plane depth={-0.5} fx={fx} cam={frame / fps / 10}>
        <Bokeh fx={fx} seed="f6" drift={frame * 0.4} />
      </Plane>
      <Scrim r={{x: 900, y: 300, w: 900, h: 260}} strength={0.55} />
      <AbsoluteFill style={push(frame, durationInFrames, 0.03)}>
        <div style={{position: 'absolute', right: 180, top: 170}}>
          <KWord text="أعلى نتيجة: قسم الـroadmap" at={SHOWN} typo={typo} fx={fx} size={72} color={C.ink2} glowColor={C.void} />
        </div>
        <div dir="rtl" style={{position: 'absolute', right: 180, top: 330, display: 'flex', alignItems: 'center', gap: 56}}>
          <KWord text="واثق" at={SHOWN} typo={typo} fx={fx} size={92} color={C.ink} />
          <KWord text="وغلط" at={SHOWN} typo={typo} fx={fx} size={176} color={C.crit} preset="impact" />
          <KWord text="وضعيف" at={SHOWN} typo={typo} fx={fx} size={92} color={C.warn} />
        </div>
        <div dir="ltr" style={{position: 'absolute', left: 200, top: 650, display: 'flex', alignItems: 'baseline', gap: 40}}>
          <Counter from={RAG.before.score} to={RAG.before.score} a={0} b={0} decimals={3} typo={typo} fx={fx} size={200} color={C.crit} impact />
          <span style={{fontFamily: `'${typo.mono}'`, fontSize: 90, color: C.ink3}}>→</span>
          <Counter from={RAG.after.score} to={RAG.after.score} a={0} b={0} decimals={3} typo={typo} fx={fx} size={130} color={C.ok} impact />
        </div>
        {/* r2: captions under the numbers in ink at 85 % (was ink2, ~3:1) */}
        <Label text={RAG.before.label} typo={typo} size={34} color={C.ink} style={{left: 215, top: 905, opacity: 0.85}} />
        <Label text={RAG.after.label} typo={typo} size={34} color={C.ink} style={{left: 905, top: 905, opacity: 0.85}} />
        <TermChip term="vocabulary mismatch" typo={typo} fx={fx} color={C.signal} size={34} style={{right: 180, top: 900}} />
      </AbsoluteFill>
      <Post fx={fx} />
    </AbsoluteFill>
  );
};

export {caShadow};
