// Family "Type & UI" (04 section 8). One file per family: add implementations here, never in a shared file.
import type {FamilyModule} from '../../spec/types';
import {KineticWord} from '../KineticWord/KineticWord';
import {NumberCounter} from '../NumberCounter/NumberCounter';

const family: FamilyModule = {family: 'Type & UI', components: [KineticWord, NumberCounter]};
export default family;
