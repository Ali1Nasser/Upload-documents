import React from 'react';
import {Composition} from 'remotion';
import {Bench2D} from './bench/Bench2D';
import {BenchGlow} from './bench/BenchGlow';
import {BenchR3F} from './bench/BenchR3F';
import {H, W} from './tokens';

const BENCH_FPS = 30; // the P0 bench was measured at 30 fps; kept for comparability
import {LookdevCompositions} from './lookdev/Lookdev';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Bench2D" component={Bench2D} durationInFrames={150} fps={BENCH_FPS} width={W} height={H} />
    <Composition id="BenchGlow" component={BenchGlow} durationInFrames={150} fps={BENCH_FPS} width={W} height={H} />
    <Composition id="BenchR3F" component={BenchR3F} durationInFrames={150} fps={BENCH_FPS} width={W} height={H} />
    <LookdevCompositions />
  </>
);
