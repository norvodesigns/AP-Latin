/**
 * Checking a student's answer to a lesson exercise.
 *
 * The iPhone app ports these exactly (LectioCore/Curriculum/LessonCheck.swift)
 * and is held to them by fixtures (`npm run export:fixtures`), so an answer
 * is right or wrong the same way on both.
 */

import type { BuildStep } from '@/data/curriculum/types';

/**
 * Latin as typed, folded for comparison: ligatures spelled out, no macrons
 * or other accents, lower case, u for v and i for j (Roman spelling had one letter for each pair),
 * no punctuation, a leading hyphen dropped (so "ae" matches "-ae"), single
 * spaces.
 */
export function foldLatin(s: string): string {
  return s
    .replace(/æ/gi, 'ae')
    .replace(/œ/gi, 'oe')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/v/g, 'u')
    .replace(/j/g, 'i')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const ARTICLES = new Set(['a', 'an', 'the']);

/**
 * English as typed, folded for comparison: lower case, contractions opened
 * out, no punctuation, and no articles. Latin has no articles, so "a girl"
 * and "the girl" are the same translation of *puella*.
 */
export function foldEnglish(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\bcan't\b/g, 'cannot')
    .replace(/\bwon't\b/g, 'will not')
    .replace(/n't\b/g, ' not')
    .replace(/'re\b/g, ' are')
    .replace(/'m\b/g, ' am')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !ARTICLES.has(w))
    .join(' ');
}

/** A typed Latin answer: an ending, a form, a word. */
export function checkTyped(answer: string, accepted: string[]): boolean {
  const a = foldLatin(answer);
  return a.length > 0 && accepted.some((x) => foldLatin(x) === a);
}

/** A typed English translation. A miss isn't necessarily wrong — the lesson
 *  then shows the model answer and lets the student judge. */
export function checkTranslation(answer: string, accepted: string[]): boolean {
  const a = foldEnglish(answer);
  return a.length > 0 && accepted.some((x) => foldEnglish(x) === a);
}

/** The tiles a student placed, in order, against a build step. */
export function checkBuild(placed: string[], step: Pick<BuildStep, 'answer' | 'anyOrder' | 'lang'>): boolean {
  const fold = step.lang === 'la' ? foldLatin : (s: string) => s.toLowerCase().replace(/[^a-z0-9']/g, '');
  const got = placed.map(fold);
  const want = step.answer.map(fold);
  if (got.length !== want.length) return false;
  if (!step.anyOrder) return got.every((w, i) => w === want[i]);
  const sortedGot = [...got].sort();
  const sortedWant = [...want].sort();
  return sortedGot.every((w, i) => w === sortedWant[i]);
}

/**
 * The lesson's score: exercises answered right the first time, out of all
 * exercises. A lesson with no exercises scores 1.
 */
export function lessonScore(firstTryRight: number, exercises: number): number {
  return exercises === 0 ? 1 : Math.round((firstTryRight / exercises) * 100) / 100;
}
