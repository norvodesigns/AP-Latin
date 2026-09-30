import type { CurriculumLevel } from '../types';
import { unit as unit1 } from './unit1';
import { unit as unit2 } from './unit2';
import { unit as unit3 } from './unit3';

/** Level IV: the AP syllabus itself, read in order with a guide at each step. */
export const quarta: CurriculumLevel = {
  id: 'quarta',
  numeral: 'IV',
  title: 'Quārta',
  subtitle: 'The AP syllabus',
  blurb:
    'The set texts, read in the order of the AP syllabus: Pliny’s letters, then the Aeneid, a passage at a time, with the grammar, style and essay points the exam asks about.',
  units: [unit1, unit2, unit3],
};
