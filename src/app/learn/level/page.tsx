import type { Metadata } from 'next';
import { GRAMMAR_LEVELS, PLACEMENT, VOCAB_LEVEL, VOCAB_PLACEMENT } from '@/data/curriculum';
import LevelCheck from './LevelCheck';

export const metadata: Metadata = {
  title: 'Find my level · Course',
  description: 'A short check of grammar and vocabulary that sets where your path through the course starts.',
};

/**
 * The level check, any time: the course map's "Find my level". Only the
 * questions and the few names the result needs go to the browser, not the
 * course they come from.
 */
export default function LevelPage() {
  const units = GRAMMAR_LEVELS.flatMap((level) =>
    level.units.map((unit) => ({ id: unit.id, level: level.title, n: unit.n, title: unit.title, firstLesson: unit.lessons[0]?.id ?? null })),
  );
  const vocabUnits = VOCAB_LEVEL.units.map((u) => ({ id: u.id, title: u.title }));
  return <LevelCheck grammar={PLACEMENT} vocab={VOCAB_PLACEMENT} units={units} vocabUnits={vocabUnits} />;
}
