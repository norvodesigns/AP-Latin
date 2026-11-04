import type { CurriculumLevel } from '../types';
import { unit as unit1 } from './unit1';
import { unit as unit2 } from './unit2';
import { unit as unit3 } from './unit3';
import { unit as unit4 } from './unit4';
import { unit as unit5 } from './unit5';
import { unit as unit6 } from './unit6';
import { unit as unit7 } from './unit7';
import { unit as unit8 } from './unit8';

/** Level V: close reading. For after the syllabus: how to take hard poetry
 *  apart, then every required passage of Vergil again, line by line, with
 *  everything the exam can ask about it. */
export const quinta: CurriculumLevel = {
  id: 'quinta',
  numeral: 'V',
  title: 'Quīnta',
  subtitle: 'Close reading',
  blurb:
    'For after the syllabus: how to take a hard passage of Vergil apart, then every required passage again, slowly, with everything the exam can ask about it: the grammar, the shortened forms, the meter, the figures and the argument.',
  units: [unit1, unit2, unit3, unit4, unit5, unit6, unit7, unit8],
};
