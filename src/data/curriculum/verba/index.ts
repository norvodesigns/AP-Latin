import type { CurriculumLevel } from '../types';
import { unit as unit1 } from './unit1';
import { unit as unit2 } from './unit2';
import { unit as unit3 } from './unit3';
import { unit as unit4 } from './unit4';
import { unit as unit5 } from './unit5';
import { unit as unit6 } from './unit6';
import { unit as unit7 } from './unit7';

/**
 * Verba: the AP vocabulary list by letter, a track of its own beside the
 * grammar levels. Its lessons are built from the list (see build.ts).
 */
export const verba: CurriculumLevel = {
  id: 'verba',
  track: 'vocabulary',
  numeral: 'A–V',
  title: 'Verba',
  subtitle: 'The AP word list',
  blurb: 'Every word on the AP list, by letter: seven units, lessons of about twelve words, and a test at the end of each unit that lets you skip what you already know.',
  units: [unit1, unit2, unit3, unit4, unit5, unit6, unit7],
};
