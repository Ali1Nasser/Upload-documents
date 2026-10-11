// Family "Domain specials", P7 group dom-b (04 section 8). One file per group: dom-b registers only its own components.
import type {FamilyModule} from '../../spec/types';
import {DeadlockCrossing} from '../DeadlockCrossing/DeadlockCrossing';

const family: FamilyModule = {family: 'Domain specials', components: [DeadlockCrossing]};
export default family;
