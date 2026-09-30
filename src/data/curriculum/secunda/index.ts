import type { CurriculumLevel } from '../types';
import { unit as unit1 } from './unit1';
import { unit as unit2 } from './unit2';
import { unit as unit3 } from './unit3';
import { unit as unit4 } from './unit4';
import { unit as unit5 } from './unit5';
import { unit as unit6 } from './unit6';
import { unit as unit7 } from './unit7';
import { unit as unit8 } from './unit8';

/** Level II: a second year of Latin, the grammar of the complex sentence. */
export const secunda: CurriculumLevel = {
  id: 'secunda',
  numeral: 'II',
  title: 'Secunda',
  subtitle: 'Intermediate',
  blurb:
    'A second year of Latin. Deponent and irregular verbs, participles and the ablative absolute, indirect statement, and the subjunctive in all its main uses: the grammar of Caesar, Cicero and Vergil.',
  units: [unit1, unit2, unit3, unit4, unit5, unit6, unit7, unit8],
};
