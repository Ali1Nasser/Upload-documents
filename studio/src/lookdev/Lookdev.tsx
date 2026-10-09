// P6 look-dev compositions (r1: ADR-002 F24 + FX2 tiers, ADR-003 T-A). Stills: "LookdevStill" with inputProps {frame, typo, fx}.
import React from 'react';
import {Composition} from 'remotion';
import {loadLookdevFonts} from './fonts';
import {FX, FxId, TYPO, TypoId} from './theme';
import {F1ColdOpen, F2SqlFunnel, F3Kafka, F5Docker, F6Type} from './frames';
import {F4Galaxy, MBGalaxyPush} from './galaxy';
import {MAImpact, MCStreak} from './motion';
import {GATES_FRAMES, GatesOrbit, HoloCity} from './world';
import {FPS, H, W} from '../tokens';

loadLookdevFonts();

export type FrameId = 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6' | 'F7';
type StillProps = {frame: FrameId; typo: TypoId; fx: FxId};
type MotionProps = {typo: TypoId; fx: FxId};

const FRAMES = {F1: F1ColdOpen, F2: F2SqlFunnel, F3: F3Kafka, F4: F4Galaxy, F5: F5Docker, F6: F6Type, F7: HoloCity};

const Still: React.FC<StillProps> = ({frame, typo, fx}) => {
  const Comp = FRAMES[frame];
  return <Comp typo={TYPO[typo]} fx={FX[fx]} />;
};
const wrap = (C: React.FC<{typo: (typeof TYPO)[TypoId]; fx: (typeof FX)[FxId]}>) => {
  const M: React.FC<MotionProps> = ({typo, fx}) => <C typo={TYPO[typo]} fx={FX[fx]} />;
  return M;
};
const MA = wrap(MAImpact);
const MB = wrap(MBGalaxyPush);
const MC = wrap(MCStreak);
const MD = wrap(GatesOrbit);
const TEN_S = 10 * FPS;

export const LookdevCompositions: React.FC = () => (
  <>
    <Composition id="LookdevStill" component={Still} durationInFrames={TEN_S} fps={FPS} width={W} height={H} defaultProps={{frame: 'F1', typo: 'A', fx: 'standard'} as StillProps} />
    <Composition id="LD-MA-Impact" component={MA} durationInFrames={TEN_S} fps={FPS} width={W} height={H} defaultProps={{typo: 'A', fx: 'standard'} as MotionProps} />
    <Composition id="LD-MB-Galaxy" component={MB} durationInFrames={TEN_S} fps={FPS} width={W} height={H} defaultProps={{typo: 'A', fx: 'hero'} as MotionProps} />
    <Composition id="LD-MC-Streak" component={MC} durationInFrames={TEN_S} fps={FPS} width={W} height={H} defaultProps={{typo: 'A', fx: 'standard'} as MotionProps} />
    <Composition id="LD-MD-Gates" component={MD} durationInFrames={GATES_FRAMES} fps={FPS} width={W} height={H} defaultProps={{typo: 'A', fx: 'standard'} as MotionProps} />
  </>
);
