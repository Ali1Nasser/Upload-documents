// Family "Data" (04 section 8). One file per family: add implementations here, never in a shared file.
import type {FamilyModule} from '../../spec/types';
import {TableGrid} from '../TableGrid/TableGrid';
import {RowFunnel} from '../RowFunnel/RowFunnel';

const family: FamilyModule = {family: 'Data', components: [TableGrid, RowFunnel]};
export default family;
