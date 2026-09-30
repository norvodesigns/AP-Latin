import type { CurriculumLevel } from '../types';
import { unit as unit1 } from './unit1';
import { unit as unit2 } from './unit2';

/** Level II: a second year of Latin, the grammar of the complex sentence. */
export const secunda: CurriculumLevel = {
  id: 'secunda',
  numeral: 'II',
  title: 'Secunda',
  subtitle: 'Intermediate',
  blurb:
    'A second year of Latin. Deponent and irregular verbs, participles and the ablative absolute, indirect statement, and the subjunctive in all its main uses: the grammar of Caesar, Cicero and Vergil.',
  units: [unit1, unit2],
};
