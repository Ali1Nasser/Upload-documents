// P7 compositions: SpecPlayer (scene specs), Demo-<Name> (one per registered demo), AT11, QA-Selftest.
import React from 'react';
import {Composition} from 'remotion';
import {AT11} from '../at11/AT11';
import {FPS, H, W} from '../tokens';
import {QaSelftest} from './QaSelftest';
import {SpecPlayer, calculateSpecMetadata} from './SpecPlayer';
import {demoNames} from './registry';

export const SpecCompositions: React.FC = () => (
  <>
    <Composition
      id="SpecPlayer"
      component={SpecPlayer}
      durationInFrames={FPS}
      fps={FPS}
      width={W}
      height={H}
      defaultProps={{demo: demoNames()[0] ?? null, input: null, preview: false, fps: null, tier: null, resolved: null}}
      calculateMetadata={calculateSpecMetadata}
    />
    {demoNames().map((n) => (
      <Composition
        key={n}
        id={`Demo-${n}`}
        component={SpecPlayer}
        durationInFrames={FPS}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{demo: n, input: null, preview: false, fps: null, tier: null, resolved: null}}
        calculateMetadata={calculateSpecMetadata}
      />
    ))}
    <Composition id="AT11" component={AT11} durationInFrames={48} fps={FPS} width={W} height={H} defaultProps={{preset: 'wipe'}} />
    <Composition id="QA-Selftest" component={QaSelftest} durationInFrames={2} fps={FPS} width={W} height={H} />
  </>
);
