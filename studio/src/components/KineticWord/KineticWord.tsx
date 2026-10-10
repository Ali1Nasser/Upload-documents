// KineticWord (catalog: Type & UI). One whole word, or a tatweel compound such as `الـKafka`, never split per letter.
// Reveal = the frozen preset (RTL clip-path wipe for Arabic, LTR for Latin/numerals), auto-fit to its slot inside the
// title-safe area (overflow is reported and FAILS snapshot tests), ADR-010 join gap, cv08 serifed I on ALL-CAPS Latin with I.
import React from 'react';
import {C, SIZE} from '../../tokens';
import {KText} from '../../type/Text';
import {visLen} from '../../type/arabic';
import type {Rect} from '../../type/safe';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';

const justify = (slot?: string) => (slot === 'start' ? 'flex-end' : slot === 'end' ? 'flex-start' : 'center');

export const KineticWordView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const size = SIZE[props.size];
  const color = C[props.color];
  const m = ctx.mod;
  return (
    <div
      style={{
        position: 'absolute',
        left: ctx.box.x,
        top: ctx.box.y,
        width: ctx.box.w,
        height: ctx.box.h,
        display: 'flex',
        alignItems: 'center',
        justifyContent: justify(props.slot),
        opacity: Math.max(0, 1 - m.opacity),
        transform: m.scale ? `scale(${(1 + 0.08 * m.scale).toFixed(4)})` : undefined,
      }}
    >
      <KText
        id={ctx.id}
        text={props.text}
        size={size}
        maxW={ctx.box.w}
        maxH={ctx.box.h}
        fx={ctx.fx}
        at={ctx.at}
        exitAt={ctx.until}
        fps={ctx.fps}
        frame={ctx.frame}
        preset={props.preset === 'count' || props.preset === 'morph' ? 'arrive' : props.preset}
        color={color}
        emphasis={props.emphasis}
        modGlow={m.glow}
      />
    </div>
  );
};

/** Text-safe rect: an estimate of the word box inside the slot (haze / bokeh are masked here with the tier padding). */
const textRect = (p: Props, box: Rect): Rect => {
  const size = SIZE[p.size ?? 'kinetic'];
  const w = Math.min(box.w, size * 0.6 * visLen(p.text) + size * 0.4);
  const h = Math.min(box.h, size * 1.6);
  const x = p.slot === 'start' ? box.x + box.w - w : p.slot === 'end' ? box.x : box.x + (box.w - w) / 2;
  return {x, y: box.y + (box.h - h) / 2, w, h};
};

export const KineticWord: DcComponent<Props> = {name: 'KineticWord', Component: KineticWordView, text: true, slot: 'center', textRect};
