/**
 * Forms Forge questions, made from the paradigm tables in src/data/forms.
 *
 *   chart: a table with a few cells blanked, to fill in
 *   make:  "the genitive plural of rēx" — type the form
 *   name:  "rēgibus" — pick what it is (only one option fits)
 *
 * Checking typed forms uses the lesson player's `checkTyped`, which ignores
 * macrons, case and u/v, i/j. Naming a form is exact: *manūs* and *manus*
 * are different answers, and the macron is what tells them apart.
 *
 * The app (Features/Forge) makes the same three kinds of question.
 */

import { cellForms, type Paradigm, type ParadigmKind } from '@/data/forms';

export type ForgeMode = 'chart' | 'make' | 'name';

export interface ChartQuestion {
  mode: 'chart';
  paradigm: Paradigm;
  /** [row, col] of each blank, in reading order. */
  blanks: Array<[number, number]>;
}

export interface MakeQuestion {
  mode: 'make';
  paradigm: Paradigm;
  row: number;
  col: number;
  /** "genitive plural" */
  asked: string;
  answers: string[];
}

export interface NameQuestion {
  mode: 'name';
  paradigm: Paradigm;
  row: number;
  col: number;
  /** The form shown, with its ending marked: "rēg|ibus". */
  form: string;
  options: string[];
  answer: number;
}

export type ForgeQuestion = ChartQuestion | MakeQuestion | NameQuestion;

type Rng = () => number;
const pick = <T,>(xs: readonly T[], rng: Rng): T => xs[Math.floor(rng() * xs.length)];

function shuffle<T>(xs: T[], rng: Rng): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function cells(p: Paradigm): Array<[number, number]> {
  return p.rows.flatMap((r, ri) => r.cells.map((_, ci) => [ri, ci] as [number, number]));
}

/** The tables in scope: some kinds, and optionally only lessons the student has done. */
export function forgeScope(all: Paradigm[], kinds: ReadonlySet<ParadigmKind>, learned: ReadonlySet<string> | null): Paradigm[] {
  return all.filter((p) => kinds.has(p.kind) && (!learned || !p.lesson || learned.has(p.lesson)));
}

export function chartQuestion(p: Paradigm, rng: Rng = Math.random, blanks = 5): ChartQuestion {
  const chosen = shuffle(cells(p), rng).slice(0, Math.min(blanks, p.rows.length * p.cols.length));
  chosen.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return { mode: 'chart', paradigm: p, blanks: chosen };
}

export function makeQuestion(p: Paradigm, rng: Rng = Math.random): MakeQuestion {
  const [row, col] = pick(cells(p), rng);
  return { mode: 'make', paradigm: p, row, col, asked: p.names[row][col], answers: cellForms(p.rows[row].cells[col]) };
}

/** The one alternative of a cell to show: the first, with its ending marker. */
function shownForm(cell: string): string {
  return cell.split(' / ')[0].trim();
}

export function nameQuestion(p: Paradigm, rng: Rng = Math.random): NameQuestion {
  const [row, col] = pick(cells(p), rng);
  const form = shownForm(p.rows[row].cells[col]);
  const plainForm = form.replace(/\|/g, '');
  // Every name this exact form could have, so none of them is a distractor.
  const fits = new Set<string>();
  for (const [r, c] of cells(p)) if (cellForms(p.rows[r].cells[c]).includes(plainForm)) fits.add(p.names[r][c]);
  const others = [...new Set(p.names.flat())].filter((n) => !fits.has(n));
  const options = shuffle([p.names[row][col], ...shuffle(others, rng).slice(0, 3)], rng);
  return { mode: 'name', paradigm: p, row, col, form, options, answer: options.indexOf(p.names[row][col]) };
}

export function makeRound(scope: Paradigm[], mode: ForgeMode, length: number, rng: Rng = Math.random): ForgeQuestion[] {
  if (scope.length === 0) return [];
  const out: ForgeQuestion[] = [];
  let last: string | null = null;
  for (let i = 0; i < length; i++) {
    // Don't ask from the same table twice running when there's a choice.
    const pool = scope.length > 1 ? scope.filter((p) => p.id !== last) : scope;
    const p = pick(pool, rng);
    last = p.id;
    out.push(mode === 'chart' ? chartQuestion(p, rng) : mode === 'make' ? makeQuestion(p, rng) : nameQuestion(p, rng));
  }
  return out;
}

/** The dictionary headword of a paradigm: "rēx" from "rēx, rēgis, m.". */
export function headword(p: Paradigm): string {
  return p.lemma.split(',')[0].trim();
}
