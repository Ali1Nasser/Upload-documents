// Family "Domain specials", P7 group dom-b (04 section 8). One file per group: dom-b registers only its own components.
import type {FamilyModule} from '../../spec/types';
import {ABSplit} from '../ABSplit/ABSplit';
import {AppliedSteps} from '../AppliedSteps/AppliedSteps';
import {ComplexityRace} from '../ComplexityRace/ComplexityRace';
import {DeadlockCrossing} from '../DeadlockCrossing/DeadlockCrossing';
import {HashBuckets} from '../HashBuckets/HashBuckets';
import {KeycardDoors} from '../KeycardDoors/KeycardDoors';
import {ModuleClusters} from '../ModuleClusters/ModuleClusters';
import {PageScan} from '../PageScan/PageScan';
import {SampleScoop} from '../SampleScoop/SampleScoop';
import {StatusStamp} from '../StatusStamp/StatusStamp';
import {WireTangle} from '../WireTangle/WireTangle';

const family: FamilyModule = {family: 'Domain specials', components: [DeadlockCrossing, PageScan, AppliedSteps, SampleScoop, ABSplit, WireTangle, ModuleClusters, ComplexityRace, HashBuckets, StatusStamp, KeycardDoors]};
export default family;
