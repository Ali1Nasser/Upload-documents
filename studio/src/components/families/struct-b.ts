// Family "Structure & flow", P7 group struct-b (04 section 8). Group-owned registry file: never edit another group's file.
import type {FamilyModule} from '../../spec/types';
import {TimelineTrack} from '../TimelineTrack/TimelineTrack';
import {GitGraph} from '../GitGraph/GitGraph';
import {StackHeap} from '../StackHeap/StackHeap';
import {PartitionLanes} from '../PartitionLanes/PartitionLanes';
import {BlockReplication} from '../BlockReplication/BlockReplication';
import {RequestJourney} from '../RequestJourney/RequestJourney';

const family: FamilyModule = {family: 'Structure & flow', components: [TimelineTrack, GitGraph, StackHeap, PartitionLanes, BlockReplication, RequestJourney]};
export default family;
