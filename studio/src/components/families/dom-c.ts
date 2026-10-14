// Family "Domain specials", group dom-c (04 section 8). One file per group: dom-c implementations are registered here only.
import type {FamilyModule} from '../../spec/types';
import {ArtifactChain} from '../ArtifactChain/ArtifactChain';
import {BranchPaths} from '../BranchPaths/BranchPaths';
import {ConnPoolTaxi} from '../ConnPoolTaxi/ConnPoolTaxi';
import {GuardedAgentLoop} from '../GuardedAgentLoop/GuardedAgentLoop';
import {IdempotentStamp} from '../IdempotentStamp/IdempotentStamp';
import {KAnonBlur} from '../KAnonBlur/KAnonBlur';
import {QualityGauges} from '../QualityGauges/QualityGauges';
import {RaceCondition} from '../RaceCondition/RaceCondition';
import {SagaChain} from '../SagaChain/SagaChain';
import {SamplingDial} from '../SamplingDial/SamplingDial';
import {SplitDeck} from '../SplitDeck/SplitDeck';

const family: FamilyModule = {
  family: 'Domain specials',
  components: [ConnPoolTaxi, RaceCondition, SagaChain, QualityGauges, IdempotentStamp, KAnonBlur, SplitDeck, SamplingDial, GuardedAgentLoop, ArtifactChain, BranchPaths],
};
export default family;
