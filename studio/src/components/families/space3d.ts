// Family "Space & 3D", P7 group space3d (04 section 8). Group-owned registry file: never edit another group's file.
import type {FamilyModule} from '../../spec/types';
import {AttentionBeams} from '../AttentionBeams/AttentionBeams';
import {AttentionMatrix} from '../AttentionMatrix/AttentionMatrix';
import {ContextTunnel} from '../ContextTunnel/ContextTunnel';
import {DataRibbons} from '../DataRibbons/DataRibbons';
import {HoloGrid} from '../HoloGrid/HoloGrid';
import {InferenceCore} from '../InferenceCore/InferenceCore';
import {LossLandscape} from '../LossLandscape/LossLandscape';
import {NeuralNet3D} from '../NeuralNet3D/NeuralNet3D';
import {ParticleField} from '../ParticleField/ParticleField';
import {TokenStream} from '../TokenStream/TokenStream';
import {VectorGalaxy} from '../VectorGalaxy/VectorGalaxy';

const family: FamilyModule = {
  family: 'Space & 3D',
  components: [VectorGalaxy, NeuralNet3D, AttentionBeams, AttentionMatrix, TokenStream, ContextTunnel, InferenceCore, ParticleField, HoloGrid, DataRibbons, LossLandscape],
};
export default family;
