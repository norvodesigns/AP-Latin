'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { questions, QUESTION_TYPE_LABELS, SKILL_LABELS, getQuestion } from '@/data/questions';
import { allPassages, getPassage } from '@/data/passages';
import { useStore } from '@/store/useStore';
import { Page, PageHeader, Card, Badge, Empty } from '@/components/ui';
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
        <Card className="mb-5">
          <div
            className="tabular-nums"
            style={{ fontFamily: 'var(--font-serif)', fontSize: '3rem', fontWeight: 600, lineHeight: 1 }}
          >
            {pct}%
          </div>
          <p className="mt-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
            {results.length - correct > 0
              ? `${results.length - correct} question${results.length - correct === 1 ? '' : 's'} went to your review queue.`
              : 'Nothing added to the review queue — clean set.'}
          </p>
        </Card>

        <div className="mb-6 flex flex-col gap-2">
          {session.map((qq, i) => {
            const r = results[i];
            return (
              <div key={qq.id} className="flex items-start gap-2.5 text-sm">
                <span
                  aria-hidden="true"
                  className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ background: r?.correct ? 'var(--correct)' : 'var(--incorrect)' }}
                />
                <span style={{ color: 'var(--fg-muted)' }}>
                  {qq.prompt.length > 92 ? `${qq.prompt.slice(0, 92)}…` : qq.prompt}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary" onClick={() => { setSession(null); }}>
            Build another set
          </button>
          <Link href="/" className="btn">Dashboard</Link>
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
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
            <span className="tabular-nums">
              {index + 1} / {session!.length}
            </span>
            <Badge tone="neutral">{QUESTION_TYPE_LABELS[current.type]}</Badge>
            <Badge tone="muted" title={SKILL_LABELS[current.skill]}>{current.skill}</Badge>
          </div>
          <button type="button" className="btn btn-ghost text-xs" onClick={() => setSession(null)}>
            End set
          </button>
        </div>

        <div className="mb-4 h-1 w-full overflow-hidden rounded-full" style={{ background: 'var(--bg-sunk)' }}>
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{ width: `${((index) / session!.length) * 100}%`, background: 'var(--accent)' }}
          />
        </div>

        {/* stimulus */}
        {(lines.length > 0 || current.stimulus) && (
          <Card className="mb-5">
            <div className="eyebrow mb-2">
              {current.stimulus?.citation ?? `${passage?.citation}`}
            </div>
            {lines.length > 0 ? (
              lines.map((l) => (
                <div key={l.n} className="flex items-baseline gap-3">
                  <span
                    className="w-7 shrink-0 text-right tabular-nums"
                    style={{ fontSize: '0.6875rem', color: 'var(--fg-faint)' }}
                  >
                    {l.n}
                  </span>
                  <p className={passage?.author === 'vergil' ? 'latin-verse' : 'latin'} style={{ margin: 0 }}>
                    {l.latin}
                  </p>
                </div>
              ))
            ) : (
              <p className={current.stimulus?.genre === 'poetry' ? 'latin-verse' : 'latin'} style={{ margin: 0, whiteSpace: 'pre-line' }}>
                {current.stimulus?.latin}
              </p>
            )}
            {current.stimulus?.gloss && current.stimulus.gloss.length > 0 && (
              <ul className="mt-3 flex flex-col gap-0.5 border-t pt-2.5" style={{ borderColor: 'var(--rule)' }}>
                {current.stimulus.gloss.map((g) => (
                  <li key={g.word} className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                    <span style={{ fontFamily: 'var(--font-latin)', fontSize: '0.95rem' }}>{g.word}</span>
                    {' — '}
                    {g.meaning}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {/* prompt */}
        <h2 className="measure mb-4" style={{ fontSize: '1.0625rem', fontWeight: 550, lineHeight: 1.45 }}>
          {current.prompt}
        </h2>

        <ul className="mb-5 flex flex-col gap-2">
          {current.options.map((o, i) => {
            const isAnswer = o.id === current.answerId;
            const isChosen = o.id === chosen;
            let bg = 'var(--bg-raised)';
            let bd = 'var(--rule)';
            let fg = 'var(--fg)';
            if (revealed && isAnswer) {
              bg = 'var(--correct-bg)';
              bd = 'var(--correct)';
            } else if (revealed && isChosen) {
              bg = 'var(--incorrect-bg)';
              bd = 'var(--incorrect)';
            } else if (revealed) {
              fg = 'var(--fg-faint)';
            }
            return (
              <li key={o.id}>
                <button
                  type="button"
                  disabled={revealed}
                  onClick={() => submit(o.id)}
                  className="flex w-full items-start gap-3 rounded-lg border px-3.5 py-3 text-left text-sm transition-colors"
                  style={{ background: bg, borderColor: bd, color: fg, cursor: revealed ? 'default' : 'pointer' }}
                >
                  <span className="kbd mt-px shrink-0" aria-hidden="true">{i + 1}</span>
                  <span style={{ lineHeight: 1.55 }}>{o.text}</span>
                  {revealed && isAnswer && (
                    <span className="ml-auto shrink-0 text-xs font-semibold" style={{ color: 'var(--correct)' }}>
                      correct
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {revealed && (
          <Card className="animate-in mb-5">
            <div className="eyebrow mb-1.5">Why</div>
            <p className="measure text-sm" style={{ color: 'var(--fg-muted)', lineHeight: 1.68, margin: 0 }}>
              {current.explanation}
            </p>
            {passage && (
              <Link
                href={`/read/${passage.id}`}
                className="mt-3 inline-block text-sm hover:underline"
                style={{ color: 'var(--accent)' }}
              >
                Read {passage.citation} in full →
              </Link>
            )}
          </Card>
        )}

        {revealed && (
          <button type="button" className="btn btn-primary" onClick={next} autoFocus>
            {index < session!.length - 1 ? 'Next question' : 'See results'}
            <span className="kbd ml-1" aria-hidden="true">↵</span>
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
            <Link href="/quiz" className="btn">All questions</Link>
          ) : (
            mounted && reviewQueue.length > 0 ? (
              <Link href="/quiz?mode=review" className="btn">
                Review queue ({reviewQueue.length})
              </Link>
            ) : null
          )
        }
      />

      {reviewMode ? (
        pool.length === 0 ? (
          <Empty
            title="Your review queue is empty"
            body="Questions you answer incorrectly land here automatically. Answer one correctly and it clears."
            action={<Link href="/quiz" className="btn btn-primary">Build a practice set</Link>}
          />
        ) : (
          <Card>
            <p className="mb-4 text-sm" style={{ color: 'var(--fg-muted)' }}>
              {pool.length} question{pool.length === 1 ? '' : 's'} waiting.
            </p>
            <button type="button" className="btn btn-primary" onClick={start}>
              Start review
            </button>
          </Card>
        )
      ) : (
        <>
          <div className="mb-5 grid gap-4 sm:grid-cols-2">
            <Card>
              <div className="eyebrow mb-2.5">Source</div>
              <label className="mb-3 block">
                <span className="mb-1 block text-xs" style={{ color: 'var(--fg-muted)' }}>Author</span>
                <select
                  className="input"
                  value={filters.author}
                  onChange={(e) => setFilters((f) => ({ ...f, author: e.target.value as Filters['author'], passageId: 'all' }))}
                >
                  <option value="all">All</option>
                  <option value="vergil">Vergil</option>
                  <option value="pliny">Pliny</option>
                  <option value="sight">Sight (no syllabus passage)</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs" style={{ color: 'var(--fg-muted)' }}>Passage</span>
                <select
                  className="input"
                  value={filters.passageId}
                  onChange={(e) => setFilters((f) => ({ ...f, passageId: e.target.value }))}
                >
                  <option value="all">Any passage</option>
                  {passageOptions.map((p) => (
                    <option key={p.id} value={p.id}>{p.citation} — {p.title}</option>
                  ))}
                </select>
              </label>
            </Card>

            <Card>
              <div className="eyebrow mb-2.5">Scope</div>
              <label className="mb-3 block">
                <span className="mb-1 block text-xs" style={{ color: 'var(--fg-muted)' }}>Unit</span>
                <select
                  className="input"
                  value={filters.unit}
                  onChange={(e) => setFilters((f) => ({ ...f, unit: e.target.value as Filters['unit'] }))}
                >
                  <option value="all">All units</option>
                  {(['1', '2', '3', '4', '5', '6'] as UnitId[]).map((u) => (
                    <option key={u} value={u}>Unit {u}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs" style={{ color: 'var(--fg-muted)' }}>Skill category</span>
                <select
                  className="input"
                  value={filters.skill}
                  onChange={(e) => setFilters((f) => ({ ...f, skill: e.target.value as Filters['skill'] }))}
                >
                  <option value="all">All skills</option>
                  <option value="1">1 — Read and comprehend</option>
                  <option value="2">2 — Describe style and context</option>
                  <option value="3">3 — Analyse with evidence</option>
                </select>
              </label>
            </Card>
          </div>

          <Card className="mb-5">
            <div className="mb-2.5 flex items-center justify-between">
              <div className="eyebrow" style={{ margin: 0 }}>Question types</div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  className="btn btn-ghost px-2 py-0.5 text-xs"
                  onClick={() => setFilters((f) => ({ ...f, types: new Set(ALL_TYPES) }))}
                >
                  All
                </button>
                <button
                  type="button"
                  className="btn btn-ghost px-2 py-0.5 text-xs"
                  onClick={() => setFilters((f) => ({ ...f, types: new Set() }))}
                >
                  None
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
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
                    className="rounded-full border px-2.5 py-1 text-xs transition-colors"
                    style={{
                      background: on ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'transparent',
                      borderColor: on ? 'color-mix(in srgb, var(--accent) 34%, transparent)' : 'var(--rule)',
                      color: on ? 'var(--accent)' : 'var(--fg-faint)',
                    }}
                  >
                    {QUESTION_TYPE_LABELS[t]} <span className="tabular-nums opacity-60">{n}</span>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <label>
                <span className="mb-1 block text-xs" style={{ color: 'var(--fg-muted)' }}>
                  Questions in this set
                </span>
                <div className="flex items-center gap-2">
                  {[5, 10, 20, 52].map((n) => (
                    <button
                      key={n}
                      type="button"
                      aria-pressed={filters.count === n}
                      onClick={() => setFilters((f) => ({ ...f, count: n }))}
                      className="btn px-3"
                      style={
                        filters.count === n
                          ? { background: 'var(--accent)', borderColor: 'var(--accent)', color: 'var(--accent-fg)' }
                          : undefined
                      }
                    >
                      {n}
                      {n === 52 && <span className="text-xs opacity-70">full</span>}
                    </button>
                  ))}
                </div>
              </label>

              <div className="flex items-center gap-3">
                <span className="text-sm tabular-nums" style={{ color: 'var(--fg-faint)' }}>
                  {pool.length} match{pool.length === 1 ? '' : 'es'}
                </span>
                <button type="button" className="btn btn-primary" onClick={start} disabled={pool.length === 0}>
                  Start set
                </button>
              </div>
            </div>
            {pool.length === 0 && (
              <p className="mt-3 text-sm" style={{ color: 'var(--incorrect)' }}>
                No questions match those filters. Widen the type or scope selection.
              </p>
            )}
          </Card>
        </>
      )}
    </Page>
  );
}
