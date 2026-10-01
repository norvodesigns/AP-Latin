import type { Question, QuestionType, SkillCode, SkillCategory } from './types';

/** Shared by the question banks (questions.ts and its companions). */

const cat = (skill: SkillCode): SkillCategory => skill[0] as SkillCategory;

export function q(
  id: string,
  type: QuestionType,
  skill: SkillCode,
  unit: Question['unit'],
  prompt: string,
  options: string[],
  answerIndex: number,
  explanation: string,
  extra: Partial<Question> = {},
): Question {
  return {
    id,
    type,
    skill,
    skillCategory: cat(skill),
    unit,
    prompt,
    options: options.map((text, i) => ({ id: String.fromCharCode(97 + i), text })),
    answerId: String.fromCharCode(97 + answerIndex),
    explanation,
    difficulty: 2,
    ...extra,
  };
}

