import { SENTENTIAE as FIRST } from './sententiae.ts';
import { SENTENTIAE_2 } from './sententiae2.ts';
import { SENTENTIAE_3 } from './sententiae3.ts';
import type { Sententia } from './types.ts';

export type { Sententia } from './types.ts';

/** Every line, in the order the days take them. */
export const SENTENTIAE: Sententia[] = [...FIRST, ...SENTENTIAE_2, ...SENTENTIAE_3];
