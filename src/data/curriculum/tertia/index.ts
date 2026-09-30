import type { CurriculumLevel } from '../types';
import { unit as unit1 } from './unit1';
import { unit as unit2 } from './unit2';
import { unit as unit3 } from './unit3';
import { unit as unit4 } from './unit4';
import { unit as unit5 } from './unit5';
import { unit as unit6 } from './unit6';
import { unit as unit7 } from './unit7';

/** Level III: toward AP — real prose and poetry, meter, style, and reading at sight. */
export const tertia: CurriculumLevel = {
  id: 'tertia',
  numeral: 'III',
  title: 'Tertia',
  subtitle: 'Toward AP',
  blurb:
    'The bridge into the AP syllabus. Real Caesar and Pliny, poetic word order, the dactylic hexameter, figures of speech, the Aeneid itself, and reading at sight.',
  units: [unit1, unit2, unit3, unit4, unit5, unit6, unit7],
};
