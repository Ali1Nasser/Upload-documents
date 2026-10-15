// Family "Structure & flow", P7 group struct-a (04 section 8). Group-owned registry file: never edit another group's file.
import type {FamilyModule} from '../../spec/types';
import {GraphNetwork} from '../GraphNetwork/GraphNetwork';
import {DagRun} from '../DagRun/DagRun';
import {TreeView} from '../TreeView/TreeView';
import {PipelineStations} from '../PipelineStations/PipelineStations';
import {LayerStack} from '../LayerStack/LayerStack';
import {StarSchema3D} from '../StarSchema3D/StarSchema3D';
import {OlapCube} from '../OlapCube/OlapCube';

const family: FamilyModule = {family: 'Structure & flow', components: [GraphNetwork, DagRun, TreeView, PipelineStations, LayerStack, StarSchema3D, OlapCube]};
export default family;
