// Family "State & FX", group fx-a (04 section 8): the failure / fix beats and the target effects. One file per group; shared helpers
// live in components/_fx-a/. Effects that act on another layer address it by `to` (the target's layer `id` in the same shot).
import type {FamilyModule} from '../../spec/types';
import {FailureGlitch} from '../FailureGlitch/FailureGlitch';
import {FixSettle} from '../FixSettle/FixSettle';
import {MorphTextToObject} from '../MorphTextToObject/MorphTextToObject';
import {PathDraw} from '../PathDraw/PathDraw';
import {Pulse} from '../Pulse/Pulse';
import {Shake} from '../Shake/Shake';
import {ShatterToBlocks} from '../ShatterToBlocks/ShatterToBlocks';
import {Spin} from '../Spin/Spin';

const family: FamilyModule = {family: 'State & FX', components: [FailureGlitch, FixSettle, ShatterToBlocks, MorphTextToObject, PathDraw, Pulse, Shake, Spin]};
export default family;
