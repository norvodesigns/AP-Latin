'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { questions as syllabusQuestions, QUESTION_TYPE_LABELS } from '@/data/questions';
import { sightQuestions } from '@/data/sight';
import { frqPrompts, FRQ_TYPE_LABELS } from '@/data/frq';
import { getPassage } from '@/data/passages';
import { useStore } from '@/store/useStore';
import { Page, PageHeader, Card, Badge } from '@/components/ui';
import type { Question, SkillCategory, QuestionType } from '@/data/types';

/** The real exam: 52 MCQ in 65 minutes, then 5 FRQ in 115. */
const MCQ_COUNT = 52;
const MCQ_SECONDS = 65 * 60;
const FRQ_SECONDS = 115 * 60;

type Stage = 'intro' | 'mcq' | 'break' | 'frq' | 'report';

const pool = [...syllabusQuestions, ...sightQuestions];

export default function PracticeExam() {
  const recordExam = useStore((s) => s.recordExam);
  const markStudied = useStore((s) => s.markStudied);

  const [stage, setStage] = useState<Stage>('intro');
  const [seed, setSeed] = useState(0);
  const [mcqAnswers, setMcqAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [cursor, setCursor] = useState(0);
  const [mcqLeft, setMcqLeft] = useState(MCQ_SECONDS);
  const [frqLeft, setFrqLeft] = useState(FRQ_SECONDS);
  const [frqAnswers, setFrqAnswers] = useState<Record<string, string>>({});
  const [frqSelfScore, setFrqSelfScore] = useState<Record<string, number>>({});
  const tick = useRef<number | null>(null);

  /* Build a 52-question paper. If the bank is smaller, questions repeat so the
     timing rehearsal still works — the report says so plainly. */
  const paper: Question[] = useMemo(() => {
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const out: Question[] = [];
    while (out.length < MCQ_COUNT && shuffled.length > 0) {
      out.push(...shuffled.slice(0, Math.min(MCQ_COUNT - out.length, shuffled.length)));
    }
    return out.slice(0, MCQ_COUNT);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  const repeats = MCQ_COUNT - new Set(paper.map((q) => q.id)).size;

  /* timers */
  useEffect(() => {
    if (stage !== 'mcq' && stage !== 'frq') return;
    tick.current = window.setInterval(() => {
      if (stage === 'mcq') {
        setMcqLeft((s) => {
          if (s <= 1) { setStage('break'); return 0; }
          return s - 1;
        });
      } else {
        setFrqLeft((s) => {
          if (s <= 1) { finish(); return 0; }
          return s - 1;
        });
      }
    }, 1000);
    return () => { if (tick.current) window.clearInterval(tick.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  function start() {
    setStage('mcq');
    setMcqAnswers({});
    setFlagged(new Set());
    setCursor(0);
    setMcqLeft(MCQ_SECONDS);
    setFrqLeft(FRQ_SECONDS);
    setFrqAnswers({});
    setFrqSelfScore({});
    markStudied();
  }

  function finish() {
    const bySkill: Record<SkillCategory, { correct: number; total: number }> = {
      '1': { correct: 0, total: 0 },
      '2': { correct: 0, total: 0 },
      '3': { correct: 0, total: 0 },
    };
    const byType: Partial<Record<QuestionType, { correct: number; total: number }>> = {};
    let correct = 0;
    for (const q of paper) {
      const ok = mcqAnswers[q.id] === q.answerId;
      if (ok) correct += 1;
      bySkill[q.skillCategory].total += 1;
      if (ok) bySkill[q.skillCategory].correct += 1;
      byType[q.type] ??= { correct: 0, total: 0 };
      byType[q.type]!.total += 1;
      if (ok) byType[q.type]!.correct += 1;
    }
    const frqMax = frqPrompts.reduce((n, p) => n + p.rubric.reduce((m, r) => m + r.maxPoints, 0), 0);
    const frqPoints = Object.values(frqSelfScore).reduce((n, v) => n + v, 0);

    recordExam({
      mcqCorrect: correct,
      mcqTotal: paper.length,
      frqPoints,
      frqMax,
      bySkill,
      byType,
      mcqSeconds: MCQ_SECONDS - mcqLeft,
      frqSeconds: FRQ_SECONDS - frqLeft,
    });
    setStage('report');
  }

  const clock = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  /* ---------------- intro ---------------- */
  if (stage === 'intro') {
    return (
      <Page>
        <PageHeader
          eyebrow="The real thing, end to end"
          title="Full Practice Exam"
          lede="52 multiple-choice questions in 65 minutes, then five free-response questions in 115. Plain typed responses, section timers, and a scored report broken down by skill category and question type."
        />
        <Card className="mb-5">
          <table className="w-full text-sm">
            <tbody>
              {[
                ['Section I — Multiple Choice', '52 questions', '65 min', '50%'],
                ['Section II — Free Response', '5 questions', '115 min', '50%'],
              ].map((row) => (
                <tr key={row[0]} className="border-b last:border-0" style={{ borderColor: 'var(--rule)' }}>
                  {row.map((cell, i) => (
                    <td
                      key={i}
                      className={`py-2.5 ${i > 0 ? 'text-right tabular-nums' : ''}`}
                      style={{ color: i === 0 ? 'var(--fg)' : 'var(--fg-muted)', fontWeight: i === 0 ? 550 : 400 }}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {repeats > 0 && (
            <p className="mt-4 text-sm" style={{ color: 'var(--fg-muted)' }}>
              Note: the question bank currently holds {pool.length} items, so {repeats} of the 52
              slots repeat a question. The timing rehearsal is still realistic; the accuracy figure
              is less so. Add questions in <code>src/data/questions.ts</code> to fix that.
            </p>
          )}
        </Card>
        <button type="button" className="btn btn-primary" onClick={start}>
          Begin Section I
        </button>
      </Page>
    );
  }

  /* ---------------- MCQ ---------------- */
  if (stage === 'mcq') {
    const q = paper[cursor];
    const passage = q.passageId ? getPassage(q.passageId) : undefined;
    const lines = passage && q.lineRange
      ? passage.lines.filter((l) => l.n >= q.lineRange![0] && l.n <= q.lineRange![1])
      : [];
    const answeredCount = Object.keys(mcqAnswers).length;

    return (
      <Page wide>
        <ExamBar
          label="Section I — Multiple Choice"
          time={clock(mcqLeft)}
          urgent={mcqLeft < 300}
          right={`${answeredCount} of ${paper.length} answered`}
          onEnd={() => setStage('break')}
          endLabel="End Section I"
        />

        {/* question navigator */}
        <div className="mb-5 flex flex-wrap gap-1">
          {paper.map((item, i) => {
            const answered = Boolean(mcqAnswers[item.id]);
            const isFlagged = flagged.has(`${i}`);
            return (
              <button
                key={i}
                type="button"
                onClick={() => setCursor(i)}
                className="h-7 w-7 text-xs tabular-nums transition-colors"
                style={{
                  background: i === cursor ? 'var(--accent)' : answered ? 'var(--bg-sunk)' : 'transparent',
                  color: i === cursor ? 'var(--accent-fg)' : answered ? 'var(--fg)' : 'var(--fg-faint)',
                  border: `1px solid ${isFlagged ? 'var(--gilt)' : i === cursor ? 'var(--accent)' : 'var(--rule)'}`,
                }}
                aria-label={`Question ${i + 1}${answered ? ', answered' : ''}${isFlagged ? ', flagged' : ''}`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>

        {(lines.length > 0 || q.stimulus) && (
          <Card className="mb-4">
            <div className="eyebrow mb-2">{q.stimulus?.citation ?? passage?.citation}</div>
            {lines.length > 0 ? (
              lines.map((l) => (
                <div key={l.n} className="flex items-baseline gap-3">
                  <span className="w-7 shrink-0 text-right tabular-nums" style={{ fontSize: '0.6875rem', color: 'var(--fg-faint)' }}>
                    {l.n}
                  </span>
                  <p className={passage?.author === 'vergil' ? 'latin-verse' : 'latin'} style={{ margin: 0 }}>
                    {l.latin}
                  </p>
                </div>
              ))
            ) : (
              <p className={q.stimulus?.genre === 'poetry' ? 'latin-verse' : 'latin'} style={{ margin: 0, whiteSpace: 'pre-line' }}>
                {q.stimulus?.latin}
              </p>
            )}
          </Card>
        )}

        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="measure" style={{ fontSize: '1.0625rem', fontWeight: 550, lineHeight: 1.45 }}>
            <span className="tabular-nums" style={{ color: 'var(--fg-faint)' }}>{cursor + 1}. </span>
            {q.prompt}
          </h2>
          <button
            type="button"
            className="btn btn-ghost shrink-0 px-2 py-1 text-xs"
            onClick={() =>
              setFlagged((f) => {
                const next = new Set(f);
                const key = `${cursor}`;
                if (next.has(key)) next.delete(key);
                else next.add(key);
                return next;
              })
            }
            style={{ color: flagged.has(`${cursor}`) ? 'var(--gilt)' : 'var(--fg-faint)' }}
          >
            {flagged.has(`${cursor}`) ? 'Unflag' : 'Flag'}
          </button>
        </div>

        <ul className="mb-6 flex flex-col gap-2">
          {q.options.map((o, i) => {
            const chosen = mcqAnswers[q.id] === o.id;
            return (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => setMcqAnswers((a) => ({ ...a, [q.id]: o.id }))}
                  className="flex w-full items-start gap-3 border px-3.5 py-3 text-left text-sm transition-colors"
                  style={{
                    background: chosen ? 'var(--bg-sunk)' : 'var(--bg-raised)',
                    borderColor: chosen ? 'var(--accent)' : 'var(--rule)',
                  }}
                >
                  <span className="kbd mt-px shrink-0" aria-hidden="true">{i + 1}</span>
                  <span style={{ lineHeight: 1.55 }}>{o.text}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center justify-between gap-2">
          <button type="button" className="btn" onClick={() => setCursor((c) => Math.max(0, c - 1))} disabled={cursor === 0}>
            Previous
          </button>
          {cursor < paper.length - 1 ? (
            <button type="button" className="btn btn-primary" onClick={() => setCursor((c) => c + 1)}>
              Next
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={() => setStage('break')}>
              End Section I
            </button>
          )}
        </div>
      </Page>
    );
  }

  /* ---------------- break ---------------- */
  if (stage === 'break') {
    const answered = Object.keys(mcqAnswers).length;
    return (
      <Page>
        <PageHeader eyebrow="Section I complete" title="Take a breath" />
        <Card className="mb-5">
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
            You answered {answered} of {paper.length} questions with {clock(mcqLeft)} left on the
            clock. Section II is five free-response questions in 115 minutes. Scores are not shown
            until the whole exam is finished — that is how the real one feels.
          </p>
        </Card>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary" onClick={() => setStage('frq')}>
            Begin Section II
          </button>
          <button type="button" className="btn" onClick={finish}>
            Skip Section II and score now
          </button>
        </div>
      </Page>
    );
  }

  /* ---------------- FRQ ---------------- */
  if (stage === 'frq') {
    return (
      <Page wide>
        <ExamBar
          label="Section II — Free Response"
          time={clock(frqLeft)}
          urgent={frqLeft < 600}
          right={`${frqPrompts.length} questions`}
          onEnd={finish}
          endLabel="Finish and score"
        />

        <div className="flex flex-col gap-6">
          {frqPrompts.map((p) => {
            const passage = p.passageId ? getPassage(p.passageId) : undefined;
            return (
              <Card key={p.id} as="section">
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <div className="eyebrow">{FRQ_TYPE_LABELS[p.type]}</div>
                    <h2 style={{ fontSize: '1.0625rem' }}>{p.title}</h2>
                  </div>
                  <Badge tone="muted">~{p.minutes} min</Badge>
                </div>

                {passage && (
                  <div className="mb-3 px-3.5 py-3" style={{ background: 'var(--bg-sunk)' }}>
                    {passage.lines.slice(0, 12).map((l) => (
                      <div key={l.n} className="flex items-baseline gap-3">
                        <span className="w-7 shrink-0 text-right tabular-nums" style={{ fontSize: '0.6875rem', color: 'var(--fg-faint)' }}>
                          {l.n}
                        </span>
                        <p className={passage.author === 'vergil' ? 'latin-verse' : 'latin'} style={{ margin: 0, fontSize: '1.125rem' }}>
                          {l.latin}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {p.subquestions.map((sq) => (
                  <div key={sq.id} className="mb-3">
                    <label className="mb-1 block text-sm" style={{ fontWeight: 550 }}>
                      {sq.label && <span style={{ color: 'var(--fg-faint)' }}>{sq.label} </span>}
                      {sq.prompt}
                    </label>
                    <textarea
                      className="input"
                      rows={sq.points > 3 ? 8 : 3}
                      value={frqAnswers[`${p.id}:${sq.id}`] ?? ''}
                      onChange={(e) => setFrqAnswers((a) => ({ ...a, [`${p.id}:${sq.id}`]: e.target.value }))}
                      style={{ fontFamily: 'var(--font-serif)', lineHeight: 1.75, resize: 'vertical' }}
                    />
                  </div>
                ))}
              </Card>
            );
          })}
        </div>

        <button type="button" className="btn btn-primary mt-6" onClick={finish}>
          Finish and score
        </button>
      </Page>
    );
  }

  /* ---------------- report ---------------- */
  const correct = paper.filter((q) => mcqAnswers[q.id] === q.answerId).length;
  const pct = Math.round((correct / paper.length) * 100);

  const bySkill: Record<SkillCategory, { correct: number; total: number }> = {
    '1': { correct: 0, total: 0 }, '2': { correct: 0, total: 0 }, '3': { correct: 0, total: 0 },
  };
  const byType = new Map<QuestionType, { correct: number; total: number }>();
  for (const q of paper) {
    const ok = mcqAnswers[q.id] === q.answerId;
    bySkill[q.skillCategory].total += 1;
    if (ok) bySkill[q.skillCategory].correct += 1;
    const t = byType.get(q.type) ?? { correct: 0, total: 0 };
    t.total += 1;
    if (ok) t.correct += 1;
    byType.set(q.type, t);
  }

  const frqMax = frqPrompts.reduce((n, p) => n + p.rubric.reduce((m, r) => m + r.maxPoints, 0), 0);
  const frqPoints = Object.values(frqSelfScore).reduce((n, v) => n + v, 0);

  return (
    <Page wide>
      <PageHeader eyebrow="Scored report" title="Practice exam results" />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Card>
          <div className="eyebrow">Section I</div>
          <div className="tabular-nums" style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', fontWeight: 600 }}>
            {correct}<span style={{ color: 'var(--fg-faint)', fontSize: '1.125rem' }}>/{paper.length}</span>
          </div>
          <div className="text-sm" style={{ color: 'var(--fg-muted)' }}>{pct}% · {clock(MCQ_SECONDS - mcqLeft)} used</div>
        </Card>
        <Card>
          <div className="eyebrow">Section II (self-scored)</div>
          <div className="tabular-nums" style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', fontWeight: 600 }}>
            {frqPoints}<span style={{ color: 'var(--fg-faint)', fontSize: '1.125rem' }}>/{frqMax}</span>
          </div>
          <div className="text-sm" style={{ color: 'var(--fg-muted)' }}>{clock(FRQ_SECONDS - frqLeft)} used</div>
        </Card>
        <Card>
          <div className="eyebrow">Pace</div>
          <div className="tabular-nums" style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', fontWeight: 600 }}>
            {Math.round((MCQ_SECONDS - mcqLeft) / Math.max(1, Object.keys(mcqAnswers).length))}s
          </div>
          <div className="text-sm" style={{ color: 'var(--fg-muted)' }}>per MCQ · 75s is the budget</div>
        </Card>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="mb-3" style={{ fontSize: '1rem' }}>By skill category</h2>
          <ul className="flex flex-col gap-2.5">
            {(['1', '2', '3'] as SkillCategory[]).map((c) => {
              const s = bySkill[c];
              return (
                <li key={c}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span>Category {c}</span>
                    <span className="tabular-nums" style={{ color: 'var(--fg-muted)' }}>
                      {s.total ? `${Math.round((s.correct / s.total) * 100)}%` : '—'}{' '}
                      <span style={{ color: 'var(--fg-faint)' }}>({s.correct}/{s.total})</span>
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden" style={{ background: 'var(--bg-sunk)' }}>
                    <div
                      className="h-full"
                      style={{
                        width: `${s.total ? (s.correct / s.total) * 100 : 0}%`,
                        background: 'var(--accent)',
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card>
          <h2 className="mb-3" style={{ fontSize: '1rem' }}>By question type</h2>
          <ul className="flex flex-col gap-2">
            {[...byType.entries()]
              .sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total)
              .map(([t, s]) => (
                <li key={t} className="flex items-baseline justify-between gap-2 text-sm">
                  <span style={{ color: 'var(--fg-muted)' }}>{QUESTION_TYPE_LABELS[t]}</span>
                  <span className="tabular-nums">
                    {s.correct}/{s.total}
                  </span>
                </li>
              ))}
          </ul>
        </Card>
      </div>

      {/* self-score the FRQ */}
      <Card className="mb-5">
        <h2 className="mb-1" style={{ fontSize: '1rem' }}>Score Section II against the rubric</h2>
        <p className="mb-3 text-sm" style={{ color: 'var(--fg-muted)' }}>
          Free response cannot be machine-scored from an answer key. Work through the rubric rows
          here, or take each question into the FRQ Workshop for the full guidelines and a sample.
        </p>
        <ul className="flex flex-col gap-3">
          {frqPrompts.map((p) => (
            <li key={p.id}>
              <div className="mb-1.5 text-sm" style={{ fontWeight: 550 }}>{p.title}</div>
              <div className="flex flex-wrap gap-3">
                {p.rubric.map((row) => (
                  <div key={row.id} className="flex items-center gap-1.5">
                    <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>{row.label}</span>
                    <select
                      className="input"
                      style={{ width: 'auto', padding: '0.15rem 0.4rem' }}
                      value={frqSelfScore[`${p.id}:${row.id}`] ?? 0}
                      onChange={(e) =>
                        setFrqSelfScore((s) => ({ ...s, [`${p.id}:${row.id}`]: Number(e.target.value) }))
                      }
                    >
                      {Array.from({ length: row.maxPoints + 1 }, (_, n) => n).map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {/* review the MCQ */}
      <details className="mb-5">
        <summary className="cursor-pointer text-sm" style={{ color: 'var(--accent)' }}>
          Review every multiple-choice question with explanations
        </summary>
        <ul className="mt-3 flex flex-col gap-3">
          {paper.map((q, i) => {
            const chosen = mcqAnswers[q.id];
            const ok = chosen === q.answerId;
            return (
              <li key={`${q.id}-${i}`}>
                <Card>
                  <div className="flex items-baseline gap-2">
                    <span className="tabular-nums text-xs" style={{ color: 'var(--fg-faint)' }}>{i + 1}</span>
                    <Badge tone={ok ? 'green' : 'accent'}>{ok ? 'correct' : chosen ? 'wrong' : 'skipped'}</Badge>
                    <span className="text-sm" style={{ fontWeight: 550 }}>{q.prompt}</span>
                  </div>
                  <p className="mt-1.5 text-sm" style={{ color: 'var(--fg-muted)' }}>
                    <span style={{ color: 'var(--correct)' }}>
                      {q.options.find((o) => o.id === q.answerId)?.text}
                    </span>
                  </p>
                  <p className="measure mt-1.5 text-sm" style={{ color: 'var(--fg-muted)', lineHeight: 1.6 }}>
                    {q.explanation}
                  </p>
                </Card>
              </li>
            );
          })}
        </ul>
      </details>

      <button type="button" className="btn btn-primary" onClick={() => { setSeed((s) => s + 1); setStage('intro'); }}>
        Take another exam
      </button>
    </Page>
  );
}

function ExamBar({
  label, time, urgent, right, onEnd, endLabel,
}: {
  label: string; time: string; urgent: boolean; right: string; onEnd: () => void; endLabel: string;
}) {
  return (
    <div
      className="sticky top-0 z-20 -mx-4 mb-5 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5 backdrop-blur sm:-mx-6 sm:px-6"
      style={{ background: 'color-mix(in srgb, var(--bg) 90%, transparent)', borderColor: 'var(--rule)' }}
    >
      <div className="flex items-baseline gap-3">
        <span className="eyebrow" style={{ margin: 0 }}>{label}</span>
        <span className="text-xs" style={{ color: 'var(--fg-faint)' }}>{right}</span>
      </div>
      <div className="flex items-center gap-3">
        <span
          className="tabular-nums"
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '1.375rem',
            fontWeight: 600,
            color: urgent ? 'var(--incorrect)' : 'var(--fg)',
          }}
        >
          {time}
        </span>
        <button type="button" className="btn text-xs" onClick={onEnd}>{endLabel}</button>
      </div>
    </div>
  );
}
