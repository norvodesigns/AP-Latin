'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { questions, QUESTION_TYPE_LABELS, SKILL_LABELS, getQuestion } from '@/data/questions';
import { allPassages, getPassage } from '@/data/passages';
import { useStore } from '@/store/useStore';
import { Page, PageHeader, Section, Panel, CalledOut, Empty, SourceNote } from '@/components/ui';
import type { Question, QuestionType, SkillCategory, UnitId } from '@/data/types';

type Filters = {
  author: 'all' | 'vergil' | 'pliny' | 'sight';
  passageId: string;
  unit: 'all' | UnitId;
  skill: 'all' | SkillCategory;
  types: Set<QuestionType>;
  count: number;
};

const ALL_TYPES = Object.keys(QUESTION_TYPE_LABELS) as QuestionType[];

/** A labelled select, so the filter panels stay consistent. */
function Field({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="slab-sm mb-2 block">{label}</span>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        {children}
      </select>
    </label>
  );
}

export default function QuizEngine() {
  const params = useSearchParams();
  const reviewMode = params.get('mode') === 'review';

  const reviewQueue = useStore((s) => s.reviewQueue);
  const recordQuiz = useStore((s) => s.recordQuiz);
  const removeFromReviewQueue = useStore((s) => s.removeFromReviewQueue);
  const markStudied = useStore((s) => s.markStudied);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [filters, setFilters] = useState<Filters>({
    author: 'all',
    passageId: 'all',
    unit: 'all',
    skill: 'all',
    types: new Set(ALL_TYPES),
    count: 10,
  });

  const [session, setSession] = useState<Question[] | null>(null);
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<Array<{ id: string; correct: boolean }>>([]);
  const startedAt = useRef<number>(Date.now());

  /* ---------------- pool ---------------- */
  const pool = useMemo(() => {
    if (reviewMode) {
      return reviewQueue.map(getQuestion).filter((x): x is Question => Boolean(x));
    }
    return questions.filter((qq) => {
      if (!filters.types.has(qq.type)) return false;
      if (filters.skill !== 'all' && qq.skillCategory !== filters.skill) return false;
      if (filters.unit !== 'all' && qq.unit !== filters.unit) return false;
      if (filters.passageId !== 'all' && qq.passageId !== filters.passageId) return false;
      if (filters.author !== 'all') {
        if (filters.author === 'sight') {
          if (qq.passageId) return false;
        } else {
          const p = qq.passageId ? getPassage(qq.passageId) : undefined;
          if (!p || p.author !== filters.author) return false;
        }
      }
      return true;
    });
  }, [filters, reviewMode, reviewQueue]);

  function start() {
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, reviewMode ? pool.length : filters.count);
    if (shuffled.length === 0) return;
    setSession(shuffled);
    setIndex(0);
    setChosen(null);
    setRevealed(false);
    setResults([]);
    startedAt.current = Date.now();
    markStudied();
  }

  const current = session?.[index];

  function submit(optionId: string) {
    if (!current || revealed) return;
    const correct = optionId === current.answerId;
    setChosen(optionId);
    setRevealed(true);
    setResults((r) => [...r, { id: current.id, correct }]);
    recordQuiz({
      questionId: current.id,
      correct,
      chosenId: optionId,
      type: current.type,
      skillCategory: current.skillCategory,
      unit: current.unit,
      passageId: current.passageId,
      seconds: Math.round((Date.now() - startedAt.current) / 1000),
    });
    if (reviewMode && correct) removeFromReviewQueue(current.id);
  }

  function next() {
    if (!session) return;
    if (index < session.length - 1) {
      setIndex((i) => i + 1);
      setChosen(null);
      setRevealed(false);
      startedAt.current = Date.now();
    } else {
      setIndex(session.length); // finished
    }
  }

  /* Keyboard: 1–4 to answer, Enter/space to advance. */
  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      if (!revealed && /^[1-9]$/.test(e.key)) {
        const opt = current.options[Number(e.key) - 1];
        if (opt) {
          e.preventDefault();
          submit(opt.id);
        }
      } else if (revealed && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, revealed, index, session]);

  /* ---------------- finished ---------------- */
  if (session && index >= session.length) {
    const correct = results.filter((r) => r.correct).length;
    const pct = Math.round((correct / results.length) * 100);
    return (
      <Page>
        <PageHeader eyebrow="Set complete" title={`${correct} of ${results.length} correct`} />

        <div className="animate-in mb-10">
          <div
            className="tabular-nums"
            style={{ fontFamily: 'var(--font-serif)', fontSize: '4rem', fontWeight: 600, lineHeight: 1 }}
          >
            {pct}%
          </div>
          <p
            style={{
              margin: '0.75rem 0 0',
              fontFamily: 'var(--font-latin)',
              fontSize: '1.125rem',
              color: 'var(--ink2)',
            }}
          >
            {results.length - correct > 0
              ? `${results.length - correct} question${results.length - correct === 1 ? '' : 's'} went to your review queue.`
              : 'Nothing added to the review queue — clean set.'}
          </p>
        </div>

        <Section title="This set" className="mb-10">
          <ul className="flex flex-col pl-0" style={{ listStyle: 'none' }}>
            {session.map((qq, i) => {
              const r = results[i];
              return (
                <li
                  key={qq.id}
                  className="row-hover flex items-start gap-3 rounded-[var(--r-sm)] border-t px-2 py-2.5"
                  style={{ borderColor: 'var(--hair)', marginLeft: '-0.5rem' }}
                >
                  <span
                    aria-hidden="true"
                    className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: r?.correct ? 'var(--correct)' : 'var(--accent)' }}
                  />
                  <span
                    style={{
                      fontFamily: 'var(--font-latin)',
                      fontSize: '1rem',
                      lineHeight: 1.5,
                      color: 'var(--ink2)',
                    }}
                  >
                    {qq.prompt.length > 92 ? `${qq.prompt.slice(0, 92)}…` : qq.prompt}
                  </span>
                </li>
              );
            })}
          </ul>
        </Section>

        <div className="flex flex-wrap gap-2.5">
          <button type="button" className="btn btn-primary" onClick={() => setSession(null)}>
            Build another set
          </button>
          <Link href="/" className="btn">
            Dashboard
          </Link>
        </div>
      </Page>
    );
  }

  /* ---------------- in a set ---------------- */
  if (current) {
    const passage = current.passageId ? getPassage(current.passageId) : undefined;
    const lines = passage && current.lineRange
      ? passage.lines.filter((l) => l.n >= current.lineRange![0] && l.n <= current.lineRange![1])
      : [];

    return (
      <Page>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="slab tabular-nums">
              {index + 1} of {session!.length}
            </span>
            <span className="slab-sm">{QUESTION_TYPE_LABELS[current.type]}</span>
            <span className="slab-sm" title={SKILL_LABELS[current.skill]}>
              Skill {current.skill}
            </span>
          </div>
          <button type="button" className="btn btn-ghost" onClick={() => setSession(null)}>
            End set
          </button>
        </div>

        <div
          className="mb-8 h-[3px] w-full overflow-hidden rounded-full"
          style={{ background: 'var(--track)' }}
          role="progressbar"
          aria-valuenow={index}
          aria-valuemin={0}
          aria-valuemax={session!.length}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${(index / session!.length) * 100}%`,
              background: 'var(--accent)',
              transition: 'width var(--dur-3) var(--ease-spring)',
            }}
          />
        </div>

        {/* stimulus */}
        {(lines.length > 0 || current.stimulus) && (
          <CalledOut rubric={current.stimulus?.citation ?? passage?.citation} className="mb-8">
            {lines.length > 0 ? (
              lines.map((l) => (
                <div key={l.n} className="flex items-baseline gap-4">
                  <span
                    className="w-7 shrink-0 text-right tabular-nums"
                    style={{ fontSize: '0.75rem', color: 'var(--fg-faint)' }}
                  >
                    {l.n}
                  </span>
                  <p
                    className={passage?.author === 'vergil' ? 'latin-verse' : 'latin'}
                    style={{ margin: 0 }}
                  >
                    {l.latin}
                  </p>
                </div>
              ))
            ) : (
              <p
                className={current.stimulus?.genre === 'poetry' ? 'latin-verse' : 'latin'}
                style={{ margin: 0, whiteSpace: 'pre-line' }}
              >
                {current.stimulus?.latin}
              </p>
            )}

            {current.stimulus?.gloss && current.stimulus.gloss.length > 0 && (
              <ul
                className="mt-5 flex flex-col gap-1.5 border-t pt-4 pl-0"
                style={{ borderColor: 'var(--redborder)', listStyle: 'none' }}
              >
                {current.stimulus.gloss.map((g) => (
                  <li
                    key={g.word}
                    style={{
                      fontFamily: 'var(--font-latin)',
                      fontSize: '1rem',
                      color: 'var(--ink2)',
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{g.word}</span>
                    {' — '}
                    {g.meaning}
                  </li>
                ))}
              </ul>
            )}
          </CalledOut>
        )}

        {/* prompt */}
        <h2
          className="measure mb-6"
          style={{ fontSize: '1.375rem', fontWeight: 550, lineHeight: 1.35 }}
        >
          {current.prompt}
        </h2>

        <ul className="mb-7 flex flex-col gap-2.5 pl-0" style={{ listStyle: 'none' }}>
          {current.options.map((o, i) => {
            const isAnswer = o.id === current.answerId;
            const isChosen = o.id === chosen;
            const style: CSSProperties = { borderColor: 'var(--rule-strong)' };
            if (revealed && isAnswer) {
              style.borderColor = 'var(--correct)';
              style.background = 'var(--correct-bg)';
            } else if (revealed && isChosen) {
              style.borderColor = 'var(--accent)';
              style.background = 'var(--incorrect-bg)';
            } else if (revealed) {
              style.opacity = 0.5;
            }
            return (
              <li key={o.id}>
                <button
                  type="button"
                  disabled={revealed}
                  onClick={() => submit(o.id)}
                  className="squish row-hover flex w-full items-start gap-3.5 rounded-[var(--r-md)] border px-4 py-3.5 text-left"
                  style={{ ...style, cursor: revealed ? 'default' : 'pointer' }}
                >
                  <span className="kbd mt-0.5 shrink-0" aria-hidden="true">
                    {i + 1}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-latin)',
                      fontSize: '1.0625rem',
                      lineHeight: 1.55,
                    }}
                  >
                    {o.text}
                  </span>
                  {revealed && isAnswer && (
                    <span className="slab-sm ml-auto shrink-0" style={{ color: 'var(--correct)' }}>
                      correct
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {revealed && (
          <Panel className="animate-in mb-7">
            <div className="rubric mb-2.5">Why</div>
            <p
              className="measure"
              style={{
                margin: 0,
                fontFamily: 'var(--font-latin)',
                fontSize: '1.0625rem',
                lineHeight: 1.65,
                color: 'var(--ink2)',
              }}
            >
              {current.explanation}
            </p>
            {passage && (
              <Link
                href={`/read/${passage.id}`}
                className="link-rule mt-4 inline-block"
                style={{ color: 'var(--accent)' }}
              >
                Read {passage.citation} in full →
              </Link>
            )}
          </Panel>
        )}

        {revealed && (
          <button type="button" className="btn btn-primary" onClick={next} autoFocus>
            {index < session!.length - 1 ? 'Next question' : 'See results'}
            <span className="kbd ml-2" aria-hidden="true">
              ↵
            </span>
          </button>
        )}
      </Page>
    );
  }

  /* ---------------- setup ---------------- */
  const passageOptions = allPassages.filter((p) => questions.some((qq) => qq.passageId === p.id));

  return (
    <Page>
      <PageHeader
        eyebrow={reviewMode ? 'Review queue' : 'Practice'}
        title={reviewMode ? 'Review what you missed' : 'Quiz Engine'}
        lede={
          reviewMode
            ? 'Questions you got wrong, in the order you missed them. Answering one correctly removes it from the queue.'
            : 'Build a set filtered by author, passage, unit, skill category, or question type. Every question explains its answer, and missed questions go to the review queue.'
        }
        actions={
          reviewMode ? (
            <Link href="/quiz" className="btn">
              All questions
            </Link>
          ) : mounted && reviewQueue.length > 0 ? (
            <Link href="/quiz?mode=review" className="btn">
              Review queue ({reviewQueue.length})
            </Link>
          ) : null
        }
      />

      {reviewMode ? (
        pool.length === 0 ? (
          <Empty
            title="Your review queue is empty"
            body="Questions you answer incorrectly land here automatically. Answer one correctly and it clears."
            action={
              <Link href="/quiz" className="btn btn-primary">
                Build a practice set
              </Link>
            }
          />
        ) : (
          <CalledOut rubric="Ready when you are">
            <p
              style={{
                margin: '0 0 1.25rem',
                fontFamily: 'var(--font-latin)',
                fontSize: '1.125rem',
              }}
            >
              {pool.length} question{pool.length === 1 ? '' : 's'} waiting.
            </p>
            <button type="button" className="btn btn-primary" onClick={start}>
              Start review
            </button>
          </CalledOut>
        )
      ) : (
        <>
          <div className="mb-12 grid gap-10 sm:grid-cols-2">
            <Section title="Source">
              <div className="flex flex-col gap-5">
                <Field
                  label="Author"
                  value={filters.author}
                  onChange={(v) =>
                    setFilters((f) => ({ ...f, author: v as Filters['author'], passageId: 'all' }))
                  }
                >
                  <option value="all">All</option>
                  <option value="vergil">Vergil</option>
                  <option value="pliny">Pliny</option>
                  <option value="sight">Sight (no syllabus passage)</option>
                </Field>

                <Field
                  label="Passage"
                  value={filters.passageId}
                  onChange={(v) => setFilters((f) => ({ ...f, passageId: v }))}
                >
                  <option value="all">Any passage</option>
                  {passageOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.citation} — {p.title}
                    </option>
                  ))}
                </Field>
              </div>
            </Section>

            <Section title="Scope">
              <div className="flex flex-col gap-5">
                <Field
                  label="Unit"
                  value={filters.unit}
                  onChange={(v) => setFilters((f) => ({ ...f, unit: v as Filters['unit'] }))}
                >
                  <option value="all">All units</option>
                  {(['1', '2', '3', '4', '5', '6'] as UnitId[]).map((u) => (
                    <option key={u} value={u}>
                      Unit {u}
                    </option>
                  ))}
                </Field>

                <Field
                  label="Skill category"
                  value={filters.skill}
                  onChange={(v) => setFilters((f) => ({ ...f, skill: v as Filters['skill'] }))}
                >
                  <option value="all">All skills</option>
                  <option value="1">1 — Read and comprehend</option>
                  <option value="2">2 — Describe style and context</option>
                  <option value="3">3 — Analyse with evidence</option>
                </Field>
              </div>
            </Section>
          </div>

          <Section
            title="Question types"
            className="mb-12"
            aside={
              <div className="flex gap-1.5">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setFilters((f) => ({ ...f, types: new Set(ALL_TYPES) }))}
                >
                  All
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setFilters((f) => ({ ...f, types: new Set() }))}
                >
                  None
                </button>
              </div>
            }
          >
            <div className="flex flex-wrap gap-2">
              {ALL_TYPES.map((t) => {
                const on = filters.types.has(t);
                const n = questions.filter((qq) => qq.type === t).length;
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setFilters((f) => {
                        const next = new Set(f.types);
                        if (next.has(t)) next.delete(t);
                        else next.add(t);
                        return { ...f, types: next };
                      })
                    }
                    className={on ? 'chip chip-on squish' : 'chip squish'}
                  >
                    {QUESTION_TYPE_LABELS[t]}{' '}
                    <span className="tabular-nums" style={{ opacity: 0.6 }}>
                      {n}
                    </span>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title="Set length">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div className="flex flex-wrap items-center gap-2">
                {[5, 10, 20, 52].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={filters.count === n}
                    onClick={() => setFilters((f) => ({ ...f, count: n }))}
                    className={filters.count === n ? 'btn btn-rubric' : 'btn'}
                  >
                    {n}
                    {n === 52 && <span style={{ opacity: 0.7 }}>&nbsp;full</span>}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-4">
                <span className="slab tabular-nums">
                  {pool.length} match{pool.length === 1 ? '' : 'es'}
                </span>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={start}
                  disabled={pool.length === 0}
                >
                  Start set
                </button>
              </div>
            </div>

            {pool.length === 0 && (
              <p
                className="animate-in mt-5"
                style={{
                  margin: '1.25rem 0 0',
                  fontFamily: 'var(--font-latin)',
                  fontSize: '1.0625rem',
                  color: 'var(--accent)',
                }}
              >
                No questions match those filters. Widen the type or scope selection.
              </p>
            )}
          </Section>

          <SourceNote to="examOverview">
            The multiple-choice section is the largest single part of the exam. The filters above map
            onto the units and skill categories the Course and Exam Description defines.
          </SourceNote>
        </>
      )}
    </Page>
  );
}
