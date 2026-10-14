// Family "Data" (04 section 8). One file per family: add implementations here, never in a shared file.
import type {FamilyModule} from '../../spec/types';
import {TableGrid} from '../TableGrid/TableGrid';
import {RowFunnel} from '../RowFunnel/RowFunnel';
import {JoinFusion} from '../JoinFusion/JoinFusion';
import {WindowFrame} from '../WindowFrame/WindowFrame';
import {LedgerPair} from '../LedgerPair/LedgerPair';
import {Heatmap} from '../Heatmap/Heatmap';
import {BarStack} from '../BarStack/BarStack';
import {LineTrace} from '../LineTrace/LineTrace';
import {ScatterField} from '../ScatterField/ScatterField';
import {Distribution} from '../Distribution/Distribution';
import {ConfusionTiles} from '../ConfusionTiles/ConfusionTiles';
import {KpiPanel} from '../KpiPanel/KpiPanel';
import {ThresholdSlider} from '../ThresholdSlider/ThresholdSlider';

const family: FamilyModule = {
  family: 'Data',
  components: [TableGrid, RowFunnel, JoinFusion, WindowFrame, LedgerPair, Heatmap, BarStack, LineTrace, ScatterField, Distribution, ConfusionTiles, KpiPanel, ThresholdSlider],
};
export default family;
