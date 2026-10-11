// Family "State & FX", group fx-b (04 section 8). Shot-level components: the scene compiler consumes them (resolve.ts, rig.ts);
// they are registered so the registry and the catalog status know them. LightStreakTransition, WhipPan and MatchCut are mapped
// to the compiler shot transitions (their props-aware replacement is _fx-b/transitions.ts, CR-003; docs/p7/catalog_status/fx-b.md).
import type {FamilyModule} from '../../spec/types';
import {AudioReactive} from '../AudioReactive/AudioReactive';
import {CameraRig} from '../CameraRig/CameraRig';
import {DepthLayers} from '../DepthLayers/DepthLayers';
import {FXTier} from '../FXTier/FXTier';

const family: FamilyModule = {family: 'State & FX', components: [CameraRig, DepthLayers, FXTier, AudioReactive]};
export default family;
