// Family "Space & 3D", P7 group space3d (04 section 8). Group-owned registry file: never edit another group's file.
import type {FamilyModule} from '../../spec/types';
import {HoloGrid} from '../HoloGrid/HoloGrid';
import {ParticleField} from '../ParticleField/ParticleField';
import {VectorGalaxy} from '../VectorGalaxy/VectorGalaxy';

const family: FamilyModule = {family: 'Space & 3D', components: [VectorGalaxy, ParticleField, HoloGrid]};
export default family;
