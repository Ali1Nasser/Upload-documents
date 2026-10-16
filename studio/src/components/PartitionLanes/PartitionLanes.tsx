// PartitionLanes (catalog: Structure & flow). A Kafka topic as a river of partition lanes (04 §6 Big data · Kafka & NRT: "topic =
// river with partition lanes; offsets = glowing markers; consumer groups = boats; lag = a gap that grows"; Spark: partitions =
// lanes). Look-dev r3 F3 is the reference frame.
//  - Lanes are violet partition boundaries (04 §1.1: partition / scope). The log runs left -> right like offsets do (an LTR
//    data structure, also in the RTL film; the topic copy itself is RTL). The producer appends on the right, consumers sit on
//    the left as boats wired to the lanes they own.
//  - Layer anchor: the lanes open top-down, then `messages` slide out of the producer one after another with a light trail.
//    keyed = true: every message carries a key glyph and one key always lands in the same lane (hash); keyed = false: round robin.
//  - Consumers read their lanes one message at a time, slower than the producer, so the unread tail (lag) grows on its own. A
//    lane nobody owns is not read at all and its unread cells turn warn. The offset marker (signal bar) sits after the last
//    read message.
//  - produce(lane, key?): one message flies into that lane on its anchor. rebalance(assign): every lane pauses (stop-the-world,
//    morph length), the boat wiring re-draws to the new owners, then reading resumes. lag(lane, value): a warn bracket spans the
//    unread tail of the lane and the spoken value (data-contract `ref`) lands on it.
//  - Text: topic and group on plates (auto-fit, 28 px floor); partition names, consumer ids and keys are Latin / code isolates.
//    Cell numbers are the structural offsets of the log (0, 1, 2 ... per lane; an index, not a data value), shown only while the
//    lanes are tall enough for 28 px digits (<= 4 lanes). The only data numbers are the `lag` values, each with its data-contract ref.
//  - Depth and light (ADR-003 LK-F): lanes are glass slabs (acrylic top edge, violet under-light pool on the floor, a perspective
//    floor grid under the last lane), cells are raised tiles with a drop shadow, the offset marker is the brightest line on
//    screen, consumers are boats on a hull, the lag bracket is a bloomed warn bracket. 2.5D only, no WebGL.
import React from 'react';
import {random} from 'remotion';
import {C, SIZE} from '../../tokens';
import {hex} from '../../fx/look';
import {ease, presetFrames} from '../../type/reveal';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {GlowPath, Lbl, Pool, actionsOf, cPath, f24, layerStyle, lerp, numText, prog} from '../_struct-b/kit';

type Ctx = DcProps<Props>['ctx'];
type Msg = {lane: number; key: number; keyLabel?: string; born: number; off: number; produced: boolean};
type Assign = {t: number; owner: (string | null)[]};

/** Structural timeline (pure): messages per lane with offsets, ownership history, consumption per lane per frame. */
export const laneTimeline = (p: Props, ctx: Ctx) => {
  const P = p.partitions;
  const nKeys = Math.max(2, Math.min(4, P + 1));
  const openN = presetFrames('morph', ctx.fps, true) + f24(2 * P, ctx.fps);
  const msgs: Msg[] = [];
  const count = new Array(P).fill(0);
  for (let i = 0; i < p.messages; i++) {
    const key = Math.floor(random(`pl-key-${p.seed}-${i}`) * nKeys);
    const lane = p.keyed ? (key * 5 + p.seed) % P : i % P;
    msgs.push({lane, key, born: ctx.at + openN + f24(3 * i, ctx.fps), off: count[lane]++, produced: false});
  }
  const owners = (asg: {id: string; lanes: number[]}[]) => {
    const o: (string | null)[] = new Array(P).fill(null);
    for (const c of asg) for (const l of c.lanes) if (l < P && o[l] === null) o[l] = c.id;
    return o;
  };
  const assigns: Assign[] = [{t: -1e9, owner: owners(p.consumers.map((c) => ({id: c.id, lanes: c.lanes})))}];
  const lags: {lane: number; t: number; text: string}[] = [];
  const pause = presetFrames('morph', ctx.fps, true);
  const pauses: [number, number][] = [];
  for (const a of actionsOf(ctx, 'produce', 'rebalance', 'lag')) {
    if (a.name === 'produce') {
      const lane = Math.min(P - 1, a.props.lane as number);
      msgs.push({lane, key: Math.floor(random(`pl-pk-${a.li}`) * nKeys), keyLabel: a.props.key as string | undefined, born: a.at, off: count[lane]++, produced: true});
    } else if (a.name === 'rebalance') {
      assigns.push({t: a.at, owner: owners((a.props.assign as {consumer: string; lanes: number[]}[]).map((x) => ({id: x.consumer, lanes: x.lanes})))});
      pauses.push([a.at, a.at + pause]);
    } else lags.push({lane: Math.min(P - 1, a.props.lane as number), t: a.at, text: numText(a.props.value as {value: number; unit?: string; decimals?: number})});
  }
  const slide = f24(8, ctx.fps);
  const period = f24(5, ctx.fps);
  const readStart = ctx.at + openN + f24(6, ctx.fps);
  const ownerAt = (lane: number, t: number) => {
    let o: string | null = null;
    for (const a of assigns) if (a.t <= t) o = a.owner[lane];
    return o;
  };
  /** messages of `lane` read by frame t (simulated frame by frame: deterministic, pauses on rebalance). */
  const readAt = (lane: number, t: number) => {
    const landed = msgs.filter((m) => m.lane === lane).map((m) => m.born + slide).sort((a, b) => a - b);
    let read = 0;
    for (let f = readStart; f <= t; f += 1) {
      if ((f - readStart) % period !== 0) continue;
      if (!ownerAt(lane, f) || pauses.some(([a, b]) => f >= a && f < b)) continue;
      if (read < landed.length && landed[read] <= f) read++;
    }
    return read;
  };
  return {P, msgs, count, assigns, lags, pauses, openN, slide, ownerAt, readAt};
};

const KeyGlyph: React.FC<{k: number; x: number; y: number; s: number; color: string}> = ({k, x, y, s, color}) =>
  k === 0 ? (
    <circle cx={x} cy={y} r={s * 0.42} fill={color} />
  ) : k === 1 ? (
    <rect x={x - s * 0.36} y={y - s * 0.36} width={s * 0.72} height={s * 0.72} rx={3} fill={color} />
  ) : k === 2 ? (
    <path d={`M ${x} ${y - s * 0.46} L ${x + s * 0.44} ${y + s * 0.36} L ${x - s * 0.44} ${y + s * 0.36} Z`} fill={color} />
  ) : (
    <path d={`M ${x} ${y - s * 0.48} L ${x + s * 0.42} ${y} L ${x} ${y + s * 0.48} L ${x - s * 0.42} ${y} Z`} fill={color} />
  );

export const PartitionLanesView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const t = ctx.frame;
  const {w, h} = ctx.box;
  const tl = laneTimeline(props, ctx);
  const P = tl.P;
  const lblN = presetFrames('label', ctx.fps);
  const morph = presetFrames('morph', ctx.fps, true);
  const k = 1 + ctx.mod.glow;
  // ---- layout ----
  const hdr = Math.round(SIZE.body * 2.1);
  const consW = props.consumers.length ? Math.min(300, w * 0.17) : 0;
  const nameW = 92;
  const prodW = 210;
  const x0 = consW + (consW ? 60 : 0) + nameW;
  const x1 = w - prodW - 24;
  const gapY = P > 6 ? 10 : 22;
  const floorH = P <= 4 ? 70 : 0; // room for the floor grid under the last lane
  const laneH = Math.min(P <= 3 ? 210 : P <= 4 ? 170 : P <= 6 ? 130 : 120, (h - hdr - floorH - gapY * (P - 1)) / P);
  const yTop = hdr + Math.max(0, (h - hdr - floorH - P * laneH - gapY * (P - 1)) / 2);
  const yOf = (l: number) => yTop + l * (laneH + gapY);
  const yEnd = yOf(P - 1) + laneH;
  const maxLen = Math.max(4, ...tl.count);
  const cw = Math.min(laneH * 0.95, (x1 - x0 - 24) / maxLen);
  const cellX = (o: number) => x0 + 14 + o * cw;
  const cellH = laneH * 0.76;
  const showNo = laneH >= 160 && cw >= 64 && tl.msgs.length <= 24;
  const prod = {x: w - prodW / 2 - 8, y: yTop + (P * laneH + gapY * (P - 1)) / 2};
  // ---- state at t ----
  const laneOpen = (l: number) => prog(t, ctx.at + f24(2 * l, ctx.fps), morph, ease.camera);
  const read = Array.from({length: P}, (_, l) => tl.readAt(l, t));
  const lagOn = (l: number) => tl.lags.filter((g) => g.lane === l && g.t <= t).slice(-1)[0];
  const inPause = tl.pauses.find(([a, b]) => t >= a && t < b);
  const consumers = props.consumers.map((c, i) => ({id: c.id, group: c.group, i}));
  const consY = (i: number) => yTop + ((i + 0.5) * (P * laneH + gapY * (P - 1))) / Math.max(1, consumers.length);
  const consX = consW / 2;
  const groups = [...new Set(props.consumers.map((c) => c.group).filter((g): g is string => !!g))];
  const ownerNow = Array.from({length: P}, (_, l) => tl.ownerAt(l, t));
  const lastAssign = [...tl.assigns].reverse().find((a) => a.t <= t)!;
  const prevAssign = tl.assigns[Math.max(0, tl.assigns.indexOf(lastAssign) - 1)];
  const wireQ = lastAssign.t > -1e8 ? prog(t, lastAssign.t, morph, ease.camera) : 1;
  const floorOn = prog(t, ctx.at, morph, ease.camera);
  const boatW = consW * 0.62;
  const hd = Math.min(16, gapY - 5); // marker head fits the gap under the lane
  return (
    <div style={{position: 'absolute', left: ctx.box.x, top: ctx.box.y, width: w, height: h, ...layerStyle(ctx, true)}}>
      {/* light: violet under-light pool per lane (the lanes glow from below), signal pool under the producer */}
      {Array.from({length: P}, (_, l) => (
        <Pool key={`pl${l}`} x={(x0 + x1) / 2} y={yOf(l) + laneH + 6} r={(x1 - x0) * 0.5} color={C.violet} a={0.2 * laneOpen(l) * k} squash={0.12} />
      ))}
      <Pool x={prod.x} y={yEnd + 8} r={prodW * 0.7} color={C.signal} a={0.16 * floorOn * k} squash={0.14} />
      {/* perspective floor grid under the last lane (depth), fades away from the lit base */}
      {floorH ? (
        <svg width={w} height={h} style={{position: 'absolute', inset: 0, overflow: 'visible', opacity: floorOn}}>
          <defs>
            <linearGradient id={`${ctx.id}-fl`} gradientUnits="userSpaceOnUse" x1="0" y1={yEnd + 14} x2="0" y2={yEnd + floorH + 40}>
              <stop offset="0" stopColor={C.violet} stopOpacity={0.5} />
              <stop offset="1" stopColor={C.violet} stopOpacity={0} />
            </linearGradient>
          </defs>
          {Array.from({length: 5}, (_, i) => {
            const d = Math.pow((i + 1) / 5, 1.6) * (floorH + 26);
            return <line key={`fh${i}`} x1={x0 - 40} x2={x1 + 40} y1={yEnd + 14 + d} y2={yEnd + 14 + d} stroke={`url(#${ctx.id}-fl)`} strokeWidth={1.5} />;
          })}
          {Array.from({length: 13}, (_, j) => {
            const q = (j - 6) / 6;
            const xa = (x0 + x1) / 2 + q * ((x1 - x0) / 2 + 40);
            return <line key={`fv${j}`} x1={xa} x2={(x0 + x1) / 2 + q * ((x1 - x0) / 2 + 40) * 1.5} y1={yEnd + 14} y2={yEnd + floorH + 40} stroke={`url(#${ctx.id}-fl)`} strokeWidth={1.5} />;
          })}
        </svg>
      ) : null}
      {/* topic header */}
      <Lbl id={`${ctx.id}:topic`} text={props.topic} x={(x0 + x1) / 2} y={hdr / 2 - 6} maxW={x1 - x0} size={SIZE.body} color={C.ink} plate accent={C.violet} fx={ctx.fx} opacity={prog(t, ctx.at, lblN)} />
      {inPause ? <Pool x={(x0 + x1) / 2} y={prod.y} r={(x1 - x0) * 0.6} color={C.violet} a={0.22 * (1 - prog(t, inPause[0], morph))} squash={0.5} /> : null}
      {/* lanes: glass slabs with an acrylic top edge */}
      {Array.from({length: P}, (_, l) => {
        const q = laneOpen(l);
        if (q <= 0) return null;
        const y = yOf(l);
        const orphan = !ownerNow[l] && consumers.length > 0;
        return (
          <React.Fragment key={l}>
            <div
              style={{
                position: 'absolute',
                left: x0,
                top: y,
                width: (x1 - x0) * q,
                height: laneH,
                borderRadius: Math.min(22, laneH / 3),
                border: `1.5px solid ${C.violet}${hex(orphan ? 0.4 : 0.72)}`,
                background: `linear-gradient(180deg, ${C.violet}${hex(0.14)} 0%, ${C.violet}${hex(0.05)} 40%, ${C.ground}${hex(0.5)} 100%)`,
                boxShadow: `inset 0 1px 0 ${C.ink}${hex(0.14)}, 0 ${Math.round(laneH * 0.16)}px ${Math.round(laneH * 0.28)}px ${C.void}${hex(0.55)}, 0 0 ${ctx.fx.glowInner * 1.6}px ${C.violet}${hex(0.2)}`,
              }}
            />
            <Lbl id={`${ctx.id}:p${l}`} text={`P${l}`} x={x0 - 14} y={y + laneH / 2} align="right" maxW={nameW - 8} size={SIZE.labelMin} color={C.violet} opacity={q} role="code" />
          </React.Fragment>
        );
      })}
      <svg width={w} height={h} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        {/* consumer wiring (morphs on rebalance) */}
        {consumers.map((c) =>
          Array.from({length: P}, (_, l) => {
            const was = prevAssign.owner[l] === c.id;
            const is = lastAssign.owner[l] === c.id;
            const op = is && was ? 1 : is ? wireQ : was ? 1 - wireQ : 0;
            if (op <= 0.01) return null;
            const a = {x: consX + boatW / 2, y: consY(c.i)};
            const b = {x: x0 - nameW + 4, y: yOf(l) + laneH / 2};
            const dx = (b.x - a.x) * 0.5;
            const on = prog(t, ctx.at + tl.openN, lblN);
            return <GlowPath key={`${c.id}-${l}`} d={cPath(a, {x: a.x + dx, y: a.y}, {x: b.x - dx, y: b.y}, b)} color={C.signal} width={2.5} fx={ctx.fx} k={0.6 * k} opacity={op * on * 0.9} draw={is && !was ? wireQ : undefined} />;
          }),
        )}
        {/* consumer boats: hull + wake under the id plate */}
        {consumers.map((c) => {
          const on = prog(t, ctx.at + tl.openN + f24(2 * c.i, ctx.fps), lblN);
          const owns = ownerNow.some((o) => o === c.id);
          const col = owns ? C.signal : C.grid;
          const y = consY(c.i) + 22;
          const bob = Math.sin((t - ctx.at) * 0.09 + c.i * 1.7) * 2;
          return (
            <g key={`boat${c.id}`} opacity={on} transform={`translate(0 ${bob.toFixed(2)})`}>
              <path d={`M ${consX - boatW / 2} ${y} L ${consX + boatW / 2} ${y} L ${consX + boatW / 2 - 22} ${y + 22} L ${consX - boatW / 2 + 22} ${y + 22} Z`} fill={`${col}${hex(0.14)}`} stroke={col} strokeWidth={2} strokeLinejoin="round" />
              <path d={`M ${consX - boatW / 2 - 26} ${y + 30} L ${consX + boatW / 2 + 26} ${y + 30}`} stroke={col} strokeOpacity={0.3} strokeWidth={2} strokeLinecap="round" />
            </g>
          );
        })}
        {/* message cells: raised tiles */}
        {tl.msgs.map((m, i) => {
          if (t < m.born || laneOpen(m.lane) < 1) return null;
          const q = prog(t, m.born, tl.slide, ease.arrive);
          const y = yOf(m.lane);
          const tx = cellX(m.off);
          const x = lerp(prod.x - cw / 2, tx, q);
          const yy = lerp(prod.y - laneH / 2, y, q);
          const isRead = m.off < read[m.lane];
          const orphan = !ownerNow[m.lane] && consumers.length > 0;
          const lag = lagOn(m.lane);
          const warn = !isRead && (orphan || !!lag) && q >= 1;
          const accent = m.produced ? C.signal : C.warn;
          const stroke = q < 1 ? accent : warn ? C.warn : isRead ? `${C.ink}${hex(0.16)}` : `${C.ink}${hex(0.36)}`;
          const fill = q < 1 ? `${accent}${hex(0.24)}` : warn ? `${C.warn}${hex(0.13)}` : isRead ? `${C.ink}${hex(0.05)}` : `${C.panel}${hex(0.96)}`;
          const glyph = isRead ? C.ink3 : warn ? C.warn : C.ink;
          const top = yy + laneH * 0.12;
          const cy = showNo ? top + cellH * 0.36 : yy + laneH / 2;
          const gs = Math.min(cw, cellH) * (showNo ? 0.34 : 0.42);
          return (
            <g key={i}>
              {q < 1 ? <rect x={x + cw * 0.5} y={yy + laneH / 2 - 5} width={Math.max(0, prod.x - x - cw * 0.5) * 0.8} height={10} rx={5} fill={accent} opacity={0.4 * (1 - q)} /> : null}
              <rect x={x + 3} y={top + 5} width={cw - 6} height={cellH} rx={Math.min(12, cw / 5)} fill={C.void} opacity={0.5 * q} />
              <rect x={x + 3} y={top} width={cw - 6} height={cellH} rx={Math.min(12, cw / 5)} fill={fill} stroke={stroke} strokeWidth={1.5} />
              {!isRead && q >= 1 ? <rect x={x + 8} y={top + 1.5} width={cw - 16} height={2} rx={1} fill={C.ink} opacity={0.22} /> : null}
              {props.keyed ? <KeyGlyph k={m.key} x={x + cw / 2} y={cy} s={gs} color={glyph} /> : <circle cx={x + cw / 2} cy={cy} r={gs * 0.24} fill={glyph} />}
            </g>
          );
        })}
        {/* offset markers: the brightest line on screen (signal bar with a head under the lane) */}
        {Array.from({length: P}, (_, l) => {
          if (!ownerNow[l] || laneOpen(l) < 1) return null;
          const x = cellX(read[l]) - 1;
          const y = yOf(l);
          const on = prog(t, ctx.at + tl.openN, lblN);
          return (
            <g key={`o${l}`} opacity={on}>
              <GlowPath d={`M ${x.toFixed(1)} ${(y - 6).toFixed(1)} L ${x.toFixed(1)} ${(y + laneH + 4).toFixed(1)}`} color={C.signal} width={4} fx={ctx.fx} k={1.3 * k} />
              <path d={`M ${x.toFixed(1)} ${(y + laneH + 2).toFixed(1)} L ${(x + 9).toFixed(1)} ${(y + laneH + 2 + hd).toFixed(1)} L ${(x - 9).toFixed(1)} ${(y + laneH + 2 + hd).toFixed(1)} Z`} fill={C.signal} />
            </g>
          );
        })}
        {/* lag brackets (bloomed) */}
        {Array.from({length: P}, (_, l) => {
          const g = lagOn(l);
          if (!g) return null;
          const q = prog(t, g.t, presetFrames('arrive', ctx.fps));
          const a = cellX(read[l]) + 2;
          const b = cellX(tl.count[l]) - 2;
          const y = yOf(l) - 8;
          if (b - a < 8) return null;
          return <GlowPath key={`g${l}`} d={`M ${a.toFixed(1)} ${(y + 16).toFixed(1)} L ${a.toFixed(1)} ${y.toFixed(1)} L ${b.toFixed(1)} ${y.toFixed(1)} L ${b.toFixed(1)} ${(y + 16).toFixed(1)}`} color={C.warn} width={4} fx={ctx.fx} k={0.9 * k} opacity={q} />;
        })}
        {/* producer: emitter box with a light stub into the lanes */}
        <g opacity={prog(t, ctx.at + f24(4, ctx.fps), lblN)}>
          <rect x={prod.x - prodW / 2 + 16} y={prod.y - laneH * 0.45} width={prodW - 32} height={laneH * 0.9} rx={14} fill={`${C.signal}${hex(0.16)}`} stroke={C.signal} strokeWidth={2} />
          <rect x={prod.x - prodW / 2 + 22} y={prod.y - laneH * 0.45 + 2} width={prodW - 44} height={2} rx={1} fill={C.ink} opacity={0.3} />
        </g>
      </svg>
      <Lbl id={`${ctx.id}:prod`} text="producer" x={prod.x} y={prod.y} maxW={prodW - 44} size={SIZE.labelMin} color={C.signal} opacity={prog(t, ctx.at + f24(4, ctx.fps), lblN)} role="code" />
      {/* offsets inside the cells (structural index per lane; only while the lanes are tall enough for 28 px digits) */}
      {showNo
        ? tl.msgs.map((m, i) => {
            if (t < m.born || laneOpen(m.lane) < 1) return null;
            const q = prog(t, m.born, tl.slide, ease.arrive);
            const x = lerp(prod.x - cw / 2, cellX(m.off), q);
            const yy = lerp(prod.y - laneH / 2, yOf(m.lane), q);
            const isRead = m.off < read[m.lane];
            const warn = !isRead && q >= 1 && ((!ownerNow[m.lane] && consumers.length > 0) || !!lagOn(m.lane));
            return <Lbl key={`n${i}`} id={`${ctx.id}:n${i}`} text={String(m.off)} x={x + cw / 2} y={yy + laneH * 0.12 + cellH * 0.8} maxW={cw - 12} size={SIZE.labelMin} color={warn ? C.warn : isRead ? C.ink3 : C.ink2} opacity={q} role="data" />;
          })
        : null}
      {/* lag values */}
      {Array.from({length: P}, (_, l) => {
        const g = lagOn(l);
        if (!g) return null;
        const q = prog(t, g.t, presetFrames('impact', ctx.fps, true), ease.impact);
        const a = cellX(read[l]);
        const b = cellX(tl.count[l]);
        const y = yOf(l) - 12;
        // the value lands in the empty lane right of the unread tail (never over the neighbouring lane's cells)
        const lx = cellX(tl.count[l]) + 22;
        const room = x1 - lx - 12;
        const inLane = room >= 150;
        return (
          <Lbl
            key={`gv${l}`}
            id={`${ctx.id}:lag${l}`}
            text={g.text}
            x={inLane ? lx : Math.min(w - 100, Math.max(100, (a + b) / 2))}
            y={inLane ? yOf(l) + laneH / 2 : y}
            align={inLane ? 'left' : 'center'}
            valign={inLane ? 'center' : 'bottom'}
            maxW={inLane ? room : Math.max(160, b - a + 120)}
            size={inLane ? SIZE.sub : SIZE.label}
            color={C.warn}
            plate
            accent={C.warn}
            fx={ctx.fx}
            opacity={q}
            role="data"
          />
        );
      })}
      {/* produce keys */}
      {tl.msgs.map((m, i) => {
        if (!m.keyLabel || t < m.born) return null;
        const q = prog(t, m.born, tl.slide, ease.arrive);
        const x = lerp(prod.x, cellX(m.off) + cw / 2, q);
        const y = lerp(prod.y - laneH / 2, yOf(m.lane), q) + laneH + 30;
        return <Lbl key={`k${i}`} id={`${ctx.id}:k${i}`} text={m.keyLabel} x={Math.min(w - 90, x)} y={Math.min(h - 40, y)} valign="top" maxW={220} size={SIZE.labelMin} color={C.signal} plate accent={C.signal} fx={ctx.fx} opacity={prog(t, m.born, lblN)} />;
      })}
      {/* consumers (boats) */}
      {consumers.map((c) => {
        const op = prog(t, ctx.at + tl.openN + f24(2 * c.i, ctx.fps), lblN);
        const owns = ownerNow.some((o) => o === c.id);
        return <Lbl key={c.id} id={`${ctx.id}:c${c.id}`} text={c.id} x={consX} y={consY(c.i) - 6} maxW={boatW - 12} size={SIZE.label} color={owns ? C.signal : C.ink3} plate accent={owns ? C.signal : C.grid} fx={ctx.fx} opacity={op} role="code" />;
      })}
      {groups.length ? <Lbl id={`${ctx.id}:grp`} text={groups.join(' · ')} x={consX} y={hdr / 2 - 6} maxW={consW + 40} size={SIZE.labelMin} color={C.ink2} opacity={prog(t, ctx.at + tl.openN, lblN)} /> : null}
    </div>
  );
};

export const PartitionLanes: DcComponent<Props> = {name: 'PartitionLanes', Component: PartitionLanesView, text: true, slot: 'center'};
