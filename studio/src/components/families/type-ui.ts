// Family "Type & UI" (04 section 8). One file per family: add implementations here, never in a shared file.
import type {FamilyModule} from '../../spec/types';
import {KineticWord} from '../KineticWord/KineticWord';
import {NumberCounter} from '../NumberCounter/NumberCounter';
import {KineticPhrase} from '../KineticPhrase/KineticPhrase';
import {TermChip} from '../TermChip/TermChip';
import {EquationLine} from '../EquationLine/EquationLine';
import {LowerThird} from '../LowerThird/LowerThird';
import {ChapterCard} from '../ChapterCard/ChapterCard';
import {DeepDiveCard} from '../DeepDiveCard/DeepDiveCard';
import {PredictionTimer} from '../PredictionTimer/PredictionTimer';
import {CalloutArrow} from '../CalloutArrow/CalloutArrow';
import {Spotlight} from '../Spotlight/Spotlight';

const family: FamilyModule = {
  family: 'Type & UI',
  components: [KineticWord, NumberCounter, KineticPhrase, TermChip, EquationLine, LowerThird, ChapterCard, DeepDiveCard, PredictionTimer, CalloutArrow, Spotlight],
};
export default family;
