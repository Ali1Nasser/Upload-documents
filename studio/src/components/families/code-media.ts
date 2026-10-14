// Families "Code" and "Media" (04 section 8), group code-media. One file per group: add implementations here, never in a shared file.
import type {FamilyModule} from '../../spec/types';
import {Terminal} from '../Terminal/Terminal';
import {CodeTrace} from '../CodeTrace/CodeTrace';
import {SqlStages} from '../SqlStages/SqlStages';
import {LoopPlate} from '../LoopPlate/LoopPlate';
import {ManimInsert} from '../ManimInsert/ManimInsert';
import {AIPlate} from '../AIPlate/AIPlate';

const family: FamilyModule = {family: 'Code + Media', components: [Terminal, CodeTrace, SqlStages, LoopPlate, ManimInsert, AIPlate]};
export default family;
