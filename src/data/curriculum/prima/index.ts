import type { CurriculumLevel } from '../types';
import { unit as unit1 } from './unit1';
import { unit as unit2 } from './unit2';

/** Level I: a first year of Latin, from the alphabet to the passive voice. */
export const prima: CurriculumLevel = {
  id: 'prima',
  numeral: 'I',
  title: 'Prīma',
  subtitle: 'Foundations',
  blurb:
    'A first year of Latin. Pronunciation, the five cases, the verb system’s present and past, and short stories to read from the start.',
  units: [unit1, unit2],
};
