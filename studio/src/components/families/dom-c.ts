// Family "Domain specials", group dom-c (04 section 8). One file per group: dom-c implementations are registered here only.
import type {FamilyModule} from '../../spec/types';
import {SagaChain} from '../SagaChain/SagaChain';

const family: FamilyModule = {family: 'Domain specials', components: [SagaChain]};
export default family;
