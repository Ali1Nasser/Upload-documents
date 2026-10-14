// Family "Domain specials", P7 group dom-a (04 section 8). One file per group: dom-a registers only its own components.
import type {FamilyModule} from '../../spec/types';
import {TripleGate} from '../TripleGate/TripleGate';
import {LegendOrbs} from '../LegendOrbs/LegendOrbs';
import {LatencyLadder} from '../LatencyLadder/LatencyLadder';
import {PermissionLocks} from '../PermissionLocks/PermissionLocks';
import {Heartbeat} from '../Heartbeat/Heartbeat';
import {LogScroll} from '../LogScroll/LogScroll';
import {CollectionMorph} from '../CollectionMorph/CollectionMorph';
import {VenvDome} from '../VenvDome/VenvDome';
import {TestGate} from '../TestGate/TestGate';
import {KeyBeams} from '../KeyBeams/KeyBeams';
import {TxnCapsule} from '../TxnCapsule/TxnCapsule';

const family: FamilyModule = {family: 'Domain specials', components: [TripleGate, LegendOrbs, LatencyLadder, PermissionLocks, Heartbeat, LogScroll, CollectionMorph, VenvDome, TestGate, KeyBeams, TxnCapsule]};
export default family;
