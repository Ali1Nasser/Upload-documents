// P6 style frames (2D families). Real content only: corpus/canon/data_contract.json §6.3, §6.7, §6.18, §6.19; chapters.json labels.
import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {Backdrop, Bokeh, Counter, FloorGrid, Glass, KWord, Label, Mix, Post, TermChip, drift, hex} from './kit';
import {C, Fx, Typo, glow, halo} from './theme';
import {RECEIPTS, SQL_FUNNEL, SQL_LINES, DOCKER, RAG} from './content';

export type FrameProps = {typo: Typo; fx: Fx; reveal?: number};
const SHOWN = -1000; // stills: every kinetic element already revealed

// ---------- (1) cold open: NilePay receipts → glowing table (CH-00, §6.19) ----------
export const F1ColdOpen: React.FC<FrameProps> = ({typo, fx}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const colX = [0, 150, 330, 540]; // id | operator | amount | status (LTR data table)
  const landed = 4;
  const rowY = (i: number) => 120 + i * 78;
  const paths = [
    {d: 'M 1420 600 C 1300 330, 1120 460, 968 713', p: 0.55, r: RECEIPTS[4]},
    {d: 'M 1440 620 C 1400 520, 1180 700, 968 791', p: 0.3, r: RECEIPTS[5]},
  ];
  return (
    <AbsoluteFill>
      <Backdrop fx={fx} />
      <FloorGrid y={760} drift={frame * 0.6} />
      <AbsoluteFill style={{transform: drift(frame, fps)}}>
        {/* shoebox (right = narrative start in RTL) */}
        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
          <defs>
            <linearGradient id="box" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#2A2F38" />
              <stop offset="1" stopColor="#14181F" />
            </linearGradient>
            <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation={fx.glowInner} />
            </filter>
          </defs>
          <polygon points="1290,640 1640,640 1690,600 1340,600" fill="#0B0E13" stroke={C.ink3} strokeOpacity={0.4} />
          {[0, 1, 2].map((k) => (
            <rect key={k} x={1360 + k * 70} y={585 - k * 14} width={120} height={70} rx={6} fill={C.ink} opacity={0.75 - k * 0.12} transform={`rotate(${-12 + k * 9} ${1420 + k * 70} 620)`} />
          ))}
          <polygon points="1290,640 1640,640 1620,860 1310,860" fill="url(#box)" stroke={C.ink3} strokeOpacity={0.5} fillOpacity={1} />
          <polygon points="1640,640 1690,600 1668,815 1620,860" fill="#1A1F27" stroke={C.ink3} strokeOpacity={0.4} />
          <polygon points="1340,600 1690,600 1720,470 1380,500" fill="#232933" stroke={C.ink3} strokeOpacity={0.45} />
          {/* flight paths, path-draw in progress */}
          {paths.map((pp, i) => (
            <g key={i}>
              <path d={pp.d} fill="none" stroke={C.signal} strokeWidth={2} strokeDasharray="6 10" opacity={0.5} />
              <path d={pp.d} fill="none" stroke={C.signal} strokeWidth={6} opacity={0.35} filter="url(#soft)" pathLength={1} strokeDasharray={`${pp.p} 1`} />
            </g>
          ))}
        </svg>
        {/* receipts in flight */}
        {[
          {x: 1130, y: 360, rot: -14, r: RECEIPTS[4]},
          {x: 1250, y: 470, rot: 10, r: RECEIPTS[5]},
        ].map((q, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: q.x,
              top: q.y,
              width: 170,
              padding: '12px 14px',
              background: 'linear-gradient(180deg, #EEF2F6, #C9D2DB)',
              borderRadius: 6,
              transform: `rotate(${q.rot}deg)`,
              boxShadow: `0 0 ${fx.glowPx}px ${C.signal}55, 0 18px 30px rgba(0,0,0,0.5)`,
              fontFamily: `'${typo.mono}'`,
              color: C.void,
            }}
          >
            <div style={{fontSize: 15, fontWeight: 700, letterSpacing: 1}}>NilePay</div>
            <div style={{height: 1, background: '#0005', margin: '6px 0'}} />
            <div style={{fontSize: 20, fontWeight: 700}}>{q.r.id}</div>
            <div style={{fontSize: 17}}>op {q.r.operator}</div>
            <div style={{fontSize: 20, fontWeight: 700}}>{q.r.amount_egp} EGP</div>
            <div style={{fontSize: 15, color: q.r.status === 'OK' ? '#0E7A45' : '#B3261E', fontWeight: 700}}>{q.r.status}</div>
          </div>
        ))}
        {/* the table */}
        <Glass accent={C.signal} style={{left: 140, top: 250, width: 820, height: 700}}>
          <div style={{position: 'absolute', left: 40, top: 38, display: 'flex', fontFamily: `'${typo.mono}'`, fontSize: 24, color: C.ink3}} dir="ltr">
            {['id', 'operator', 'amount_egp', 'status'].map((h, i) => (
              <div key={h} style={{position: 'absolute', left: colX[i], whiteSpace: 'nowrap'}}>
                {h}
              </div>
            ))}
          </div>
          <div style={{position: 'absolute', left: 30, right: 30, top: 88, height: 1, background: `${C.signal}55`}} />
          {RECEIPTS.map((r, i) => {
            const done = i < landed;
            const st = r.status === 'OK' ? C.ok : C.crit;
            return (
              <div key={r.id} dir="ltr" style={{position: 'absolute', left: 40, top: rowY(i), width: 740, height: 62, fontFamily: `'${typo.mono}'`, fontSize: 30, color: C.ink, opacity: done ? 1 : 0.9}}>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    left: -14,
                    right: -14,
                    borderRadius: 10,
                    border: done ? `1px solid ${C.signal}33` : `1.5px dashed ${C.signal}88`,
                    background: done ? `${C.signal}0D` : 'transparent',
                    boxShadow: done ? `0 0 ${fx.glowPx * 0.6}px ${C.signal}22` : undefined,
                  }}
                />
                {done ? (
                  <>
                    <div style={{position: 'absolute', left: colX[0], top: 12}}>{r.id}</div>
                    <div style={{position: 'absolute', left: colX[1], top: 12}}>{r.operator}</div>
                    <div style={{position: 'absolute', left: colX[2], top: 12, width: 150, textAlign: 'right', fontVariantNumeric: 'tabular-nums'}}>{r.amount_egp}</div>
                    <div
                      style={{
                        position: 'absolute',
                        left: colX[3],
                        top: 9,
                        padding: '2px 14px',
                        borderRadius: 8,
                        fontSize: 24,
                        fontWeight: 700,
                        color: st,
                        border: `1.5px solid ${st}`,
                        textShadow: glow(st, fx, 0.4),
                      }}
                    >
                      {r.status}
                    </div>
                  </>
                ) : null}
              </div>
            );
          })}
          <Label text="6 فواتير ← 6 صفوف" typo={typo} size={30} color={C.ink2} style={{right: 40, bottom: 30}} />
        </Glass>
        <TermChip term="table" gloss="جدول" typo={typo} fx={fx} style={{left: 160, top: 190}} size={28} />
        <Label text="فواتير NilePay" typo={typo} size={34} style={{right: 290, top: 880}} />
      </AbsoluteFill>
      {/* kinetic type */}
      <div style={{position: 'absolute', right: 120, top: 80, textAlign: 'right'}}>
        <KWord text="هات الصفوف" at={SHOWN} typo={typo} fx={fx} size={120} preset="impact" />
        <KWord text="أقفل أنهي يوم في الأسبوع؟" at={SHOWN} typo={typo} fx={fx} size={56} color={C.ink2} glowColor={C.void} style={{marginTop: 4}} />
      </div>
      <Bokeh fx={fx} seed="f1" drift={frame * 0.4} />
      <Post fx={fx} />
    </AbsoluteFill>
  );
};

// ---------- (2) SQL row-count funnel (CH-11, §6.3) — moment: WHERE drops 1004 + 1010, 13 → 11 ----------
export const F2SqlFunnel: React.FC<FrameProps & {stage?: number}> = ({typo, fx, stage = 2}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const x0 = 200;
  const dx = 190;
  const trackY = 610;
  const dot = 26;
  const top = (n: number) => trackY - 60 - n * dot;
  const pts = SQL_FUNNEL.map((s, i) => `${x0 + i * dx},${top(i <= stage ? s.rows : 0)}`);
  return (
    <AbsoluteFill>
      <Backdrop fx={fx} />
      <FloorGrid y={820} drift={frame * 0.5} opacity={0.25} />
      <AbsoluteFill style={{transform: drift(frame, fps)}}>
        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
          <defs>
            <linearGradient id="funnel" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={C.signal} stopOpacity={0.22} />
              <stop offset="1" stopColor={C.signal} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <polygon points={`${x0},${trackY - 40} ${pts.slice(0, stage + 1).join(' ')} ${x0 + stage * dx},${trackY - 40}`} fill="url(#funnel)" />
          <polyline points={pts.slice(0, stage + 1).join(' ')} fill="none" stroke={C.signal} strokeWidth={2} opacity={0.7} />
          <line x1={x0 - 40} y1={trackY} x2={x0 + 8 * dx + 40} y2={trackY} stroke={C.grid} strokeWidth={4} />
          <line x1={x0 - 40} y1={trackY} x2={x0 + stage * dx} y2={trackY} stroke={C.signal} strokeWidth={4} style={{filter: `drop-shadow(0 0 ${fx.glowInner}px ${C.signal})`}} />
          {SQL_FUNNEL.map((s, i) =>
            i <= stage
              ? Array.from({length: s.rows}, (_, k) => (
                  <circle key={`${i}-${k}`} cx={x0 + i * dx} cy={trackY - 60 - k * dot - dot / 2} r={9} fill={i === stage ? C.signal : C.ink2} opacity={i === stage ? 1 : 0.55} style={i === stage ? {filter: `drop-shadow(0 0 ${fx.glowInner}px ${C.signal})`} : undefined} />
                ))
              : null,
          )}
          {/* the two rows WHERE drops */}
          {[0, 1].map((k) => (
            <g key={k}>
              <circle cx={x0 + stage * dx + 30 + k * 34} cy={trackY + 122 + k * 46} r={10} fill="none" stroke={C.crit} strokeWidth={2.5} style={{filter: `drop-shadow(0 0 ${fx.glowInner}px ${C.crit})`}} />
              <line x1={x0 + stage * dx} y1={trackY - 60 - (11 + k) * dot - dot / 2} x2={x0 + stage * dx + 30 + k * 34} y2={trackY + 122 + k * 46} stroke={C.crit} strokeDasharray="4 8" opacity={0.6} />
            </g>
          ))}
        </svg>
        {SQL_FUNNEL.map((s, i) => {
          const cur = i === stage;
          const past = i < stage;
          return (
            <div key={s.stage} style={{position: 'absolute', left: x0 + i * dx - 85, top: trackY + 22, width: 170, textAlign: 'center'}}>
              <div
                dir="ltr"
                style={{
                  display: 'inline-block',
                  padding: '6px 12px',
                  borderRadius: 10,
                  fontFamily: `'${typo.mono}'`,
                  fontSize: 24,
                  fontWeight: 600,
                  color: cur ? C.void : past ? C.ink : C.ink3,
                  background: cur ? C.signal : 'rgba(22,27,34,0.85)',
                  border: `1px solid ${cur ? C.signal : C.grid}`,
                  boxShadow: cur ? `0 0 ${fx.glowPx}px ${C.signal}aa` : undefined,
                  whiteSpace: 'nowrap',
                }}
              >
                {s.stage}
              </div>
              <div dir="ltr" style={{fontFamily: `'${typo.mono}'`, fontSize: 34, fontWeight: 700, marginTop: 8, color: cur ? C.signal : C.ink2, fontVariantNumeric: 'tabular-nums', opacity: i <= stage ? 1 : 0}}>
                {s.rows}
              </div>
            </div>
          );
        })}
        <div dir="ltr" style={{position: 'absolute', left: x0 + stage * dx + 96, top: trackY + 104, fontFamily: `'${typo.mono}'`, fontSize: 24, color: C.crit, lineHeight: '46px', textShadow: halo}}>
          <div>1004 · cancelled</div>
          <div>1010 · refunded</div>
        </div>
        {/* query with the current clause lit */}
        <Glass style={{left: 120, top: 790, width: 880, height: 250}} blur={false}>
          <div dir="ltr" style={{position: 'absolute', left: 30, top: 18, fontFamily: `'${typo.mono}'`, fontSize: 25, lineHeight: '27px', color: C.ink3, whiteSpace: 'pre'}}>
            {SQL_LINES.map((l, i) => (
              <div key={i} style={l.startsWith('WHERE') ? {color: C.signal, textShadow: glow(C.signal, fx, 0.4)} : undefined}>
                {l}
              </div>
            ))}
          </div>
        </Glass>
        <div style={{position: 'absolute', right: 140, top: 780, textAlign: 'right'}}>
          <div dir="ltr" style={{display: 'flex', alignItems: 'baseline', gap: 26, justifyContent: 'flex-end'}}>
            <span style={{fontFamily: `'${typo.mono}'`, fontSize: 80, color: C.ink3, fontWeight: 600}}>13 →</span>
            <Counter from={11} to={11} a={0} b={0} typo={typo} fx={fx} size={180} color={C.signal} unit="rows" />
          </div>
        </div>
        <TermChip term="WHERE" gloss="بيشيل قبل أي حساب" typo={typo} fx={fx} style={{left: x0 + stage * dx - 70, top: trackY - 470}} size={28} />
      </AbsoluteFill>
      <div style={{position: 'absolute', right: 120, top: 70, textAlign: 'right'}}>
        <KWord text="الصفوف الباقية" at={SHOWN} typo={typo} fx={fx} size={112} preset="impact" />
        <Label text="9 مراحل منطقية · ⟦14 → 13 → 11 → 2 → 2 → 2 → 2 → 2 → 1⟧" typo={typo} size={32} style={{position: 'relative', marginTop: 6}} />
      </div>
      <Bokeh fx={fx} seed="f2" drift={frame * 0.4} />
      <Post fx={fx} />
    </AbsoluteFill>
  );
};

// ---------- (3) Kafka partitions with offsets + lag (CH-26 labels; offsets are schematic indices) ----------
export const F3Kafka: React.FC<FrameProps> = ({typo, fx}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const lanes = [
    {name: 'P0', len: 12, consumed: 7},
    {name: 'P1', len: 9, consumed: 8},
    {name: 'P2', len: 10, consumed: 9},
  ];
  const cx0 = 330;
  const cw = 104;
  const laneY = (i: number) => 330 + i * 190;
  const keyShape = (lane: number, off: number) => (lane * 7 + off * 3) % 3;
  return (
    <AbsoluteFill>
      <Backdrop fx={fx} tint={C.violet} />
      <FloorGrid y={900} drift={frame * 0.8} opacity={0.22} />
      <AbsoluteFill style={{transform: drift(frame, fps)}}>
        {lanes.map((ln, li) => {
          const y = laneY(li);
          const last = ln.len - 1;
          return (
            <React.Fragment key={ln.name}>
              <div style={{position: 'absolute', left: cx0 - 30, top: y - 16, width: 12 * cw + 60, height: 112, borderRadius: 20, border: `1.5px solid ${C.violet}88`, background: `${C.violet}0A`, boxShadow: `0 0 ${fx.glowPx}px ${C.violet}22`}} />
              <div dir="ltr" style={{position: 'absolute', left: cx0 - 130, top: y + 18, fontFamily: `'${typo.mono}'`, fontSize: 34, fontWeight: 700, color: C.violet, textShadow: glow(C.violet, fx, 0.4)}}>
                {ln.name}
              </div>
              {Array.from({length: ln.len}, (_, o) => {
                const done = o <= ln.consumed;
                const lagCell = li === 0 && o > ln.consumed;
                const shp = keyShape(li, o);
                return (
                  <div key={o} style={{position: 'absolute', left: cx0 + o * cw, top: y, width: cw - 12, height: 80, borderRadius: 10, background: done ? 'rgba(230,237,243,0.07)' : 'rgba(22,27,34,0.9)', border: `1px solid ${lagCell ? C.warn + 'AA' : 'rgba(230,237,243,0.12)'}`, boxShadow: lagCell ? `0 0 ${fx.glowInner * 1.5}px ${C.warn}44` : undefined}}>
                    <svg width={30} height={30} style={{position: 'absolute', left: (cw - 12) / 2 - 15, top: 8}}>
                      {shp === 0 ? <circle cx={15} cy={15} r={10} fill={done ? C.ink3 : C.ink} /> : shp === 1 ? <rect x={5} y={5} width={20} height={20} rx={3} fill={done ? C.ink3 : C.ink} /> : <polygon points="15,4 27,26 3,26" fill={done ? C.ink3 : C.ink} />}
                    </svg>
                    <div dir="ltr" style={{position: 'absolute', bottom: 6, width: '100%', textAlign: 'center', fontFamily: `'${typo.mono}'`, fontSize: 20, color: done ? C.ink3 : C.ink2, fontVariantNumeric: 'tabular-nums'}}>
                      {o}
                    </div>
                  </div>
                );
              })}
              {/* consumer offset marker */}
              <div style={{position: 'absolute', left: cx0 + (ln.consumed + 1) * cw - 8, top: y - 26, width: 4, height: 132, background: C.signal, boxShadow: `0 0 ${fx.glowPx}px ${C.signal}`, borderRadius: 2}} />
              <div style={{position: 'absolute', left: cx0 + (ln.consumed + 1) * cw - 19, top: y + 104, width: 0, height: 0, borderLeft: '13px solid transparent', borderRight: '13px solid transparent', borderBottom: `20px solid ${C.signal}`}} />
              {li === 0 ? (
                <>
                  {/* lag bracket: last available − last processed */}
                  <div style={{position: 'absolute', left: cx0 + (ln.consumed + 1) * cw - 6, top: y - 52, width: (last - ln.consumed) * cw, height: 22, borderTop: `3px solid ${C.warn}`, borderLeft: `3px solid ${C.warn}`, borderRight: `3px solid ${C.warn}`, borderRadius: '8px 8px 0 0', boxShadow: `0 -4px ${fx.glowPx}px ${C.warn}55`}} />
                  <div dir="ltr" style={{position: 'absolute', left: cx0 + (ln.consumed + 1) * cw, top: y - 108, fontFamily: `'${typo.mono}'`, fontSize: 30, fontWeight: 700, color: C.warn, textShadow: `${halo}, ${glow(C.warn, fx, 0.5)}`, whiteSpace: 'nowrap'}}>
                    lag = {last} − {ln.consumed} = {last - ln.consumed}
                  </div>
                  {/* producer appends at the end */}
                  <div style={{position: 'absolute', left: cx0 + (last + 1) * cw + 30, top: y + 6, width: cw - 22, height: 68, borderRadius: 10, border: `2px solid ${C.signal}`, background: `${C.signal}22`, boxShadow: `0 0 ${fx.glowPx}px ${C.signal}88`}} />
                  <div style={{position: 'absolute', left: cx0 + (last + 1) * cw + 120, top: y + 38, width: 140, height: 3, background: `linear-gradient(90deg, ${C.signal}, transparent)`}} />
                  <Label text="⟦producer⟧" typo={typo} size={28} color={C.signal} style={{left: cx0 + (last + 1) * cw + 20, top: y + 92}} />
                </>
              ) : null}
            </React.Fragment>
          );
        })}
        <TermChip term="offset" gloss="الإزاحة" typo={typo} fx={fx} style={{left: cx0 + 2 * cw, top: laneY(0) - 112}} size={28} />
        <Glass accent={C.warn} style={{left: 150, top: 900, width: 980, height: 110}}>
          <div style={{position: 'absolute', right: 34, top: 22}}>
            <Mix text="التأخر = آخر متاح − آخر معالج" arFont={typo.ar} latFont={typo.lat} style={{fontSize: 48, color: C.ink, fontWeight: 600, textShadow: halo}} />
          </div>
        </Glass>
        <TermChip term="consumer group" typo={typo} fx={fx} color={C.violet} style={{left: 1290, top: 925}} size={28} />
      </AbsoluteFill>
      <div style={{position: 'absolute', right: 120, top: 70, textAlign: 'right'}}>
        <KWord text="الترتيب داخل الـpartition" at={SHOWN} typo={typo} fx={fx} size={92} preset="impact" />
      </div>
      <Bokeh fx={fx} seed="f3" drift={frame * 0.4} />
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
          <rect x={x} y={y} width={w} height={h} fill={`rgba(13,17,23,0.82)`} stroke={col} strokeWidth={1.8} />
        </g>
      </svg>
      <div dir="ltr" style={{position: 'absolute', left: x + 22, top: y + h / 2 - 17, fontFamily: `'${typo.mono}'`, fontSize: 24, color: state === 'cached' ? C.ink2 : C.ink, whiteSpace: 'nowrap'}}>
        {text}
      </div>
      <div dir="ltr" style={{position: 'absolute', left: x + w - 132, top: y + h / 2 - 15, width: 116, textAlign: 'center', fontFamily: `'${typo.mono}'`, fontSize: 19, fontWeight: 700, color: col, border: `1.5px solid ${col}`, borderRadius: 6, padding: '2px 0'}}>
        {state === 'cached' ? 'CACHED' : state === 'edited' ? 'EDITED' : 'REBUILT'}
      </div>
    </>
  );
};

export const F5Docker: React.FC<FrameProps> = ({typo, fx}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const w = 700;
  const h = 60;
  const gap = 28;
  const stack = (x: number, base: number, layers: typeof DOCKER.good) =>
    layers.map((l, i) => <Slab key={i} x={x} y={base - i * (h + gap)} w={w} h={h} text={l.text} state={l.state} typo={typo} fx={fx} />);
  const goodX = 1010;
  const badX = 120;
  const base = 770;
  const badTop = base - (DOCKER.bad.length - 1) * (h + gap);
  const editedBad = DOCKER.bad.findIndex((l) => l.state === 'edited');
  return (
    <AbsoluteFill>
      <Backdrop fx={fx} />
      <FloorGrid y={900} drift={frame * 0.5} opacity={0.28} />
      <AbsoluteFill style={{transform: drift(frame, fps)}}>
        {stack(goodX, base, DOCKER.good)}
        {stack(badX, base, DOCKER.bad)}
        {/* cascade beam: invalidation runs up from the edited layer */}
        <div style={{position: 'absolute', left: badX - 40, top: badTop - 10, width: 6, height: base - editedBad * (h + gap) - badTop + h + 10, background: `linear-gradient(0deg, ${C.crit}, ${C.crit}22)`, boxShadow: `0 0 ${fx.glowPx}px ${C.crit}`, borderRadius: 3}} />
        <div style={{position: 'absolute', left: badX - 54, top: badTop - 34, width: 0, height: 0, borderLeft: '17px solid transparent', borderRight: '17px solid transparent', borderBottom: `26px solid ${C.crit}`}} />
        <Label text="الترتيب الموثّق" typo={typo} size={38} color={C.ink} weight={600} style={{left: goodX, top: base - 5 * (h + gap) - 20}} />
        <Label text="⟦COPY . .⟧ فوق ⟦pip install⟧" typo={typo} size={38} color={C.ink} weight={600} style={{left: badX, top: base - 5 * (h + gap) - 20}} />
        <div style={{position: 'absolute', left: goodX + 20, top: base + 70}}>
          <Counter from={5} to={5} a={0} b={0} typo={typo} fx={fx} size={140} color={C.ok} unit="s" />
        </div>
        <div style={{position: 'absolute', left: badX + 20, top: base + 70}}>
          <Counter from={57} to={57} a={0} b={0} typo={typo} fx={fx} size={140} color={C.crit} unit="s" />
        </div>
        <TermChip term="layer cache" gloss="كاش الطبقات" typo={typo} fx={fx} color={C.ok} style={{left: goodX + 300, top: base + 120}} size={28} />
      </AbsoluteFill>
      <div style={{position: 'absolute', right: 120, top: 60, textAlign: 'right'}}>
        <KWord text={DOCKER.headline} at={SHOWN} typo={typo} fx={fx} size={104} preset="impact" />
        <KWord text="تعديل سطر واحد في الكود" at={SHOWN} typo={typo} fx={fx} size={48} color={C.signal} glowColor={C.void} />
      </div>
      <Bokeh fx={fx} seed="f5" drift={frame * 0.4} />
      <Post fx={fx} />
    </AbsoluteFill>
  );
};

// ---------- (6) kinetic-typography-only frame (CH-33 §6.18: "confident, wrong, weak") ----------
export const F6Type: React.FC<FrameProps> = ({typo, fx}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <AbsoluteFill>
      <Backdrop fx={fx} tint={C.crit} shaft={false} />
      <Bokeh fx={fx} seed="f6" drift={frame * 0.4} />
      <AbsoluteFill style={{transform: drift(frame, fps, 0.015)}}>
        <div style={{position: 'absolute', right: 180, top: 170}}>
          <KWord text="أعلى نتيجة: قسم الـroadmap" at={SHOWN} typo={typo} fx={fx} size={72} color={C.ink2} glowColor={C.void} />
        </div>
        <div dir="rtl" style={{position: 'absolute', right: 180, top: 330, display: 'flex', alignItems: 'center', gap: 56}}>
          <KWord text="واثق" at={SHOWN} typo={typo} fx={fx} size={92} color={C.ink} />
          <KWord text="وغلط" at={SHOWN} typo={typo} fx={fx} size={176} color={C.crit} preset="impact" />
          <KWord text="وضعيف" at={SHOWN} typo={typo} fx={fx} size={92} color={C.warn} />
        </div>
        <div dir="ltr" style={{position: 'absolute', left: 200, top: 650, display: 'flex', alignItems: 'baseline', gap: 40}}>
          <Counter from={RAG.before.score} to={RAG.before.score} a={0} b={0} decimals={3} typo={typo} fx={fx} size={200} color={C.crit} />
          <span style={{fontFamily: `'${typo.mono}'`, fontSize: 90, color: C.ink3}}>→</span>
          <Counter from={RAG.after.score} to={RAG.after.score} a={0} b={0} decimals={3} typo={typo} fx={fx} size={130} color={C.ok} />
        </div>
        <Label text={RAG.before.note} typo={typo} size={32} style={{left: 215, top: 905}} />
        <Label text={RAG.after.note} typo={typo} size={32} style={{left: 905, top: 905}} />
        <TermChip term="vocabulary mismatch" typo={typo} fx={fx} color={C.signal} size={34} style={{right: 180, top: 900}} />
      </AbsoluteFill>
      <Post fx={fx} />
    </AbsoluteFill>
  );
};
