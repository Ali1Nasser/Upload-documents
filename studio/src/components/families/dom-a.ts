// Family "Domain specials", P7 group dom-a (04 section 8). One file per group: dom-a registers only its own components.
import type {FamilyModule} from '../../spec/types';
import {TripleGate} from '../TripleGate/TripleGate';

const family: FamilyModule = {family: 'Domain specials', components: [TripleGate]};
export default family;
