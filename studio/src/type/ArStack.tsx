// Stack of Arabic lines (title, subtitle, …) that applies the tashkeel descender-clearance rule (arabic.ts T1/T2).
// Each line keeps its own kinetic element (KWord etc.); ArStack only owns the vertical rhythm.
import React from 'react';
import {StackRole, lineHeightFor, stackGap} from './arabic';

export type StackLine = {text: string; size: number; node: React.ReactNode; role?: StackRole};

export const ArStack: React.FC<{lines: StackLine[]; align?: 'right' | 'left'; style?: React.CSSProperties}> = ({lines, align = 'right', style}) => (
  <div dir="rtl" style={{display: 'flex', flexDirection: 'column', alignItems: align === 'right' ? 'flex-start' : 'flex-end', ...style}}>
    {lines.map((l, i) => {
      const prev = lines[i - 1];
      const mt = prev ? stackGap(prev, l, l.role ?? (i === 1 ? 'title-sub' : 'lines')) : 0;
      return (
        <div key={i} data-line-height={lineHeightFor(l.text)} data-gap={mt} style={{marginTop: mt, lineHeight: lineHeightFor(l.text)}}>
          {l.node}
        </div>
      );
    })}
  </div>
);
