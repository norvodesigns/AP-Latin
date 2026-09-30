import type { ChoiceStep } from './types';

/**
 * The placement check: two quick questions per unit, in course order. A
 * student who already knows some Latin answers until the questions get
 * ahead of them; the course suggests starting at the first unit where
 * they slipped (see `placementStart` in src/lib/placement.ts, and its Swift
 * twin).
 */
export interface PlacementQuestion {
  /** The unit it checks, e.g. "prima-3". */
  unit: string;
  step: ChoiceStep;
}

const q = (unit: string, prompt: string, latin: string | undefined, options: string[], answer: number, explain: string): PlacementQuestion => ({
  unit,
  step: { kind: 'choice', prompt, latin, options, answer, explain },
});

export const PLACEMENT: PlacementQuestion[] = [
  q('prima-1', 'What does this mean?', 'Iūlia puella est.', ['Julia is a girl.', 'Julia has a girl.', 'Julia and the girl.'], 0, '*Est* is “is”.'),
  q('prima-1', 'Who does the loving?', 'Nautam puella amat.', ['the sailor', 'the girl'], 1, '*Puella* ends in *-a*, the subject ending; *nautam* is the object.'),
  q('prima-2', 'What is *puellārum*?', 'puellārum', ['of the girls', 'to the girls', 'the girls (object)'], 0, 'The genitive plural.'),
  q('prima-2', 'What does *portāmus* mean?', 'portāmus', ['we carry', 'they carry', 'you carry'], 0, '*-mus* is “we”.'),
  q('prima-3', 'Which form fits?', 'nauta ___ (good)', ['bona', 'bonus', 'bonum'], 1, '*Nauta* is masculine: *bonus*.'),
  q('prima-3', 'What is *bella*?', 'bella', ['a war', 'wars (subject or object)', 'of the war'], 1, 'A neuter plural in *-a*.'),
  q('prima-4', 'What does *in silvam* mean?', 'in silvam', ['in the forest', 'into the forest', 'from the forest'], 1, '*In* with the accusative is motion: “into”.'),
  q('prima-4', 'What does *amābit* mean?', 'amābit', ['he was loving', 'he will love', 'he loves'], 1, '*-bit* is the future.'),
  q('prima-5', 'What is *rēgem*?', 'rēgem', ['the king (subject)', 'the king (object)', 'of the king'], 1, 'The accusative singular of *rēx*.'),
  q('prima-5', 'What does *reget* mean?', 'reget', ['he rules', 'he will rule', 'he ruled'], 1, 'In the third conjugation, *-et* is future.'),
  q('prima-6', 'What does *vīdērunt* mean?', 'vīdērunt', ['they see', 'they saw', 'they will see'], 1, 'The perfect: “they saw”.'),
  q('prima-6', 'What does *vēnerat* mean?', 'vēnerat', ['he came', 'he had come', 'he will have come'], 1, 'The pluperfect.'),
  q('prima-7', 'Whose horse is it?', 'Mārcus equum suum amat.', ['Marcus’s own', 'someone else’s'], 0, '*Suus* is the subject’s own.'),
  q('prima-7', 'Which form fits?', 'Puella ___ vidēs soror mea est.', ['quae', 'quam', 'cuius'], 1, 'The object of *vidēs*: accusative *quam*.'),
  q('prima-8', 'What does *amātur* mean?', 'amātur', ['he loves', 'he is loved', 'he was loving'], 1, 'The passive.'),
  q('prima-8', 'What does this mean?', 'Urbs ā Rōmānīs capta est.', ['The city captured the Romans.', 'The city was captured by the Romans.', 'The Romans are capturing the city.'], 1, 'The perfect passive, with the agent *ā Rōmānīs*.'),
  q('secunda-1', 'What does *loquitur* mean?', 'loquitur', ['he is spoken', 'he speaks', 'he will speak'], 1, '*Loquor* is deponent: passive in form, active in meaning.'),
  q('secunda-1', 'What does this mean?', 'Puer ambulāre nōn vult.', ['The boy does not want to walk.', 'The boy cannot walk.', 'The boy was not walking.'], 0, '*Vult* is from *volō*, “want”.'),
];
