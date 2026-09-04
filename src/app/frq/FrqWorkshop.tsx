'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { frqPrompts, getPrompt, FRQ_TYPE_LABELS, CHECKPOINT_1_RUBRIC, CHECKPOINT_2_RUBRIC } from '@/data/frq';
import { getPassage } from '@/data/passages';
import { useStore, type ProjectPassage } from '@/store/useStore';
import { useAiStatus, useAiCall } from '@/lib/useAi';
import { Page, PageHeader, Panel, CalledOut, BackLink, Empty, SourceNote } from '@/components/ui';
import type { FrqPrompt } from '@/data/types';
import type { EssayFeedback, ShortAnswerGrade } from '@/lib/ai/schemas';

type Tab = 'prompts' | 'project';

export default function FrqWorkshop() {
  const [tab, setTab] = useState<Tab>('prompts');
  const [openId, setOpenId] = useState<string | null>(null);

  const prompt = openId ? getPrompt(openId) : null;
  if (prompt) return <Workspace prompt={prompt} onBack={() => setOpenId(null)} />;

  return (
    <Page wide>
      <PageHeader
        eyebrow="Section II · 5 questions · 115 minutes · 50% of the score"
        title="FRQ Workshop"
        lede={
          <>
            Draft under a timer, then score yourself against the official rubric with a strong sample
            beside you. Nothing is submitted anywhere — your drafts stay in this browser.
          </>
        }
        actions={
          <div className="flex gap-1.5">
            {(['prompts', 'project'] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={tab === t}
                onClick={() => setTab(t)}
                className="btn"
                style={
                  tab === t
                    ? { background: 'var(--accent)', borderColor: 'var(--accent)', color: 'var(--accent-fg)' }
                    : undefined
                }
              >
                {t === 'prompts' ? 'Prompts' : 'Course Project'}
              </button>
            ))}
          </div>
        }
      />

      {tab === 'prompts' ? (
        <ul className="stagger flex flex-col pl-0" style={{ listStyle: 'none' }}>
          {frqPrompts.map((p) => {
            const total = p.rubric.reduce((n, r) => n + r.maxPoints, 0);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(p.id)}
                  className="squish row-hover block w-full border-t px-3 py-5 text-left"
                  style={{ borderColor: 'var(--rule)', marginLeft: '-0.75rem' }}
                >
                  <div className="slab-sm mb-1">{FRQ_TYPE_LABELS[p.type]}</div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.0625rem', fontWeight: 600 }}>
                    {p.title}
                  </div>
                  {p.citation && (
                    <div className="mt-0.5 text-sm" style={{ fontFamily: 'var(--font-latin)', color: 'var(--fg-muted)' }}>
                      {p.citation}
                    </div>
                  )}
                  <div className="mt-2.5 flex items-center gap-2 text-xs" style={{ color: 'var(--fg-faint)' }}>
                    <span>{total} points</span>
                    <span aria-hidden="true">·</span>
                    <span>~{p.minutes} min</span>
                    <span aria-hidden="true">·</span>
                    <span>{p.subquestions.length} part{p.subquestions.length === 1 ? '' : 's'}</span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <CourseProject />
      )}

      <SourceNote to="scoring">
        Every rubric row below comes from the official scoring guidelines. Score yourself against
        them rather than against a feeling about the essay — the rows are what a Reader actually
        awards on.
      </SourceNote>
    </Page>
  );
}

/* ------------------------------------------------------------------ */
/* Prompt workspace                                                    */
/* ------------------------------------------------------------------ */

function Workspace({ prompt, onBack }: { prompt: FrqPrompt; onBack: () => void }) {
  const ai = useAiStatus();
  const essayGrader = useAiCall<EssayFeedback>();
  const saGrader = useAiCall<ShortAnswerGrade>();
  const saveFrq = useStore((s) => s.saveFrq);
  const markStudied = useStore((s) => s.markStudied);
  const responses = useStore((s) => s.frqResponses);
  const projectPassages = useStore((s) => s.projectPassages);

  const isProject = prompt.type === 'project-prose' || prompt.type === 'project-poetry';
  const wantedGenre = prompt.type === 'project-poetry' ? 'poetry' : 'prose';
  const candidates = projectPassages.filter((p) => p.genre === wantedGenre);

  const [projectId, setProjectId] = useState<string>('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selfScore, setSelfScore] = useState<Record<string, number>>({});
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [showSample, setShowSample] = useState(false);
  const [saved, setSaved] = useState(false);
  const timer = useRef<number | null>(null);

  const passage = prompt.passageId ? getPassage(prompt.passageId) : undefined;
  const project = candidates.find((p) => p.id === projectId) ?? candidates[0];

  useEffect(() => {
    if (!running) return;
    timer.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [running]);

  const totalPoints = prompt.rubric.reduce((n, r) => n + r.maxPoints, 0);
  const earned = Object.values(selfScore).reduce((n, v) => n + v, 0);
  const overtime = seconds > prompt.minutes * 60;
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  const combinedEssay = useMemo(
    () => prompt.subquestions.map((s) => `${s.label ? `${s.label}. ` : ''}${answers[s.id] ?? ''}`).join('\n\n').trim(),
    [answers, prompt.subquestions],
  );

  const prior = responses.filter((r) => r.promptId === prompt.id);

  return (
    <Page wide>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <BackLink onClick={onBack}>All prompts</BackLink>
        <div className="flex items-center gap-2">
          <span
            className="tabular-nums"
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.125rem',
              color: overtime ? 'var(--incorrect)' : 'var(--fg)',
            }}
            title={`The CED allows about ${prompt.minutes} minutes`}
          >
            {mm}:{ss}
          </span>
          <button type="button" className="btn" onClick={() => setRunning((v) => !v)}>
            {running ? 'Pause' : seconds === 0 ? `Start (${prompt.minutes} min)` : 'Resume'}
          </button>
        </div>
      </div>

      <PageHeader eyebrow={FRQ_TYPE_LABELS[prompt.type]} title={prompt.title} />

      {/* passage */}
      {isProject ? (
        candidates.length === 0 ? (
          <Empty
            title={`No ${wantedGenre} project passage yet`}
            body={`FRQ ${prompt.type === 'project-prose' ? '4' : '5'} is always set on one of the four passages you choose for the course project. Add yours in the Course Project tab, then come back.`}
            action={<button type="button" className="btn btn-primary" onClick={onBack}>Go to Course Project</button>}
          />
        ) : (
          <Panel className="mb-8">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="slab-sm">Your {wantedGenre} project passage</span>
              {candidates.length > 1 && (
                <select
                  className="input"
                  style={{ width: 'auto' }}
                  value={project?.id}
                  onChange={(e) => setProjectId(e.target.value)}
                >
                  {candidates.map((p) => (
                    <option key={p.id} value={p.id}>{p.title || p.citation}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="text-sm" style={{ color: 'var(--fg-muted)' }}>
              {project?.author} — {project?.citation}
            </div>
            <p
              className={wantedGenre === 'poetry' ? 'latin-verse' : 'latin'}
              style={{ marginTop: '0.75rem', whiteSpace: 'pre-line' }}
            >
              {project?.latin}
            </p>
            <p className="mt-3 text-xs" style={{ color: 'var(--fg-faint)' }}>
              Note: on FRQ 4 and 5, words outside the core vocabulary list are <strong>not</strong> glossed.
            </p>
          </Panel>
        )
      ) : passage ? (
        <CalledOut className="mb-9">
          <div className="slab-sm mb-2">{prompt.citation ?? passage.citation}</div>
          {passage.lines.map((l) => (
            <div key={l.n} className="flex items-baseline gap-3">
              <span className="w-8 shrink-0 text-right tabular-nums" style={{ fontSize: '0.6875rem', color: 'var(--fg-faint)' }}>
                {l.n}
              </span>
              <p className={passage.author === 'vergil' ? 'latin-verse' : 'latin'} style={{ margin: 0 }}>
                {l.latin}
              </p>
            </div>
          ))}
        </CalledOut>
      ) : null}

      {/* subquestions */}
      <ol className="mb-6 flex flex-col gap-5">
        {prompt.subquestions.map((sq) => (
          <li key={sq.id}>
            <div className="border-t pt-5 pb-6" style={{ borderColor: 'var(--rule)' }}>
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <h2 style={{ fontSize: '1rem', fontWeight: 550 }}>
                  {sq.label && <span style={{ color: 'var(--fg-faint)' }}>{sq.label} </span>}
                  {sq.prompt}
                </h2>
                <span className="chip">{sq.points} pt{sq.points === 1 ? '' : 's'}</span>
              </div>
              <textarea
                value={answers[sq.id] ?? ''}
                onChange={(e) => setAnswers((a) => ({ ...a, [sq.id]: e.target.value }))}
                rows={sq.points > 3 ? 9 : 4}
                className="input"
                style={{ fontFamily: 'var(--font-serif)', fontSize: '0.9375rem', lineHeight: 1.75, resize: 'vertical' }}
                placeholder="Type your response…"
                maxLength={6000}
              />
              <div className="mt-1 text-right text-xs" style={{ color: 'var(--fg-faint)' }}>
                {(answers[sq.id] ?? '').trim().split(/\s+/).filter(Boolean).length} words
              </div>
            </div>
          </li>
        ))}
      </ol>

      {/* AI grading */}
      {ai.configured && (
        <div className="mb-5 flex flex-wrap gap-2">
          {prompt.type === 'short-answer' ? (
            <button
              type="button"
              className="btn"
              disabled={saGrader.loading || Object.keys(answers).length === 0}
              onClick={() => saGrader.call('grade-short-answer', { promptId: prompt.id, answers })}
            >
              {saGrader.loading ? 'Grading…' : 'Grade the set with AI'}
            </button>
          ) : (
            <button
              type="button"
              className="btn"
              disabled={essayGrader.loading || combinedEssay.length < 20 || (isProject && !project)}
              onClick={() =>
                essayGrader.call('grade-essay', {
                  promptId: prompt.id,
                  essay: combinedEssay,
                  customPassage: isProject && project
                    ? { citation: project.citation, latin: project.latin }
                    : undefined,
                })
              }
            >
              {essayGrader.loading ? 'Grading…' : 'Grade against the rubric with AI'}
            </button>
          )}
        </div>
      )}

      {(essayGrader.error || saGrader.error) && (
        <div
          className="mb-5 border px-3.5 py-2.5 text-sm"
          style={{
            background: 'var(--partial-bg)',
            borderColor: 'color-mix(in srgb, var(--partial) 34%, transparent)',
            color: 'var(--fg-muted)',
          }}
        >
          {essayGrader.error ?? saGrader.error} Self-scoring below works exactly the same.
        </div>
      )}

      {essayGrader.data && <EssayFeedbackPanel data={essayGrader.data} />}
      {saGrader.data && <ShortAnswerPanel data={saGrader.data} />}

      {/* rubric self-score */}
      <section className="mb-6">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 style={{ fontSize: '1.0625rem' }}>Official scoring guidelines</h2>
            <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
              From the CED. Score yourself honestly, row by row.
            </p>
          </div>
          <div className="text-right">
            <div className="tabular-nums" style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', fontWeight: 600 }}>
              {earned} <span style={{ color: 'var(--fg-faint)', fontSize: '1rem' }}>/ {totalPoints}</span>
            </div>
          </div>
        </div>

        <ul className="flex flex-col gap-3">
          {prompt.rubric.map((row) => (
            <li key={row.id}>
              <div className="border-t pt-5 pb-6" style={{ borderColor: 'var(--rule)' }}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{row.label}</div>
                    <p className="measure mt-1 text-sm" style={{ color: 'var(--fg-muted)', lineHeight: 1.6 }}>
                      {row.criteria}
                    </p>
                    <ul className="mt-2 flex flex-col gap-0.5">
                      {row.decisionRules.map((r) => (
                        <li key={r} className="text-xs" style={{ color: 'var(--fg-faint)' }}>• {r}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {Array.from({ length: row.maxPoints + 1 }, (_, n) => n).map((n) => (
                      <button
                        key={n}
                        type="button"
                        aria-pressed={selfScore[row.id] === n}
                        onClick={() => setSelfScore((s) => ({ ...s, [row.id]: n }))}
                        className="squish h-9 w-9 rounded-[var(--r-sm)] border tabular-nums transition-colors"
                        style={{
                          background: selfScore[row.id] === n ? 'var(--accent)' : 'transparent',
                          borderColor: selfScore[row.id] === n ? 'var(--accent)' : 'var(--rule)',
                          color: selfScore[row.id] === n ? 'var(--accent-fg)' : 'var(--fg-muted)',
                        }}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* sample */}
      <Panel className="mb-8">
        <button
          type="button"
          className="squish flex w-full items-center justify-between text-left"
          onClick={() => setShowSample((v) => !v)}
          aria-expanded={showSample}
        >
          <span className="slab-sm" style={{ margin: 0 }}>A strong sample response</span>
          <span className="text-xs" style={{ color: 'var(--fg-faint)' }}>{showSample ? 'hide' : 'show'}</span>
        </button>
        {showSample && (
          <>
            <pre
              className="measure-wide mt-3 whitespace-pre-wrap"
              style={{ fontFamily: 'var(--font-serif)', fontSize: '0.9375rem', lineHeight: 1.75, color: 'var(--fg-muted)' }}
            >
              {prompt.sampleResponse}
            </pre>
            <p className="mt-3 border-t pt-3 text-sm" style={{ borderColor: 'var(--rule)', color: 'var(--fg-muted)' }}>
              {prompt.scoringNotes}
            </p>
          </>
        )}
      </Panel>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn btn-primary"
          disabled={saved || Object.keys(selfScore).length === 0}
          onClick={() => {
            saveFrq({
              promptId: prompt.id,
              answers,
              selfScore,
              secondsSpent: seconds,
              submitted: true,
            });
            markStudied();
            setSaved(true);
          }}
        >
          {saved ? 'Saved' : `Log this attempt (${earned}/${totalPoints})`}
        </button>
        <button type="button" className="btn" onClick={onBack}>Another prompt</button>
      </div>

      {prior.length > 0 && (
        <div className="mt-6">
          <div className="slab-sm mb-2">Previous attempts</div>
          <ul className="flex flex-col gap-1">
            {prior.slice(-5).reverse().map((r) => {
              const pts = Object.values(r.selfScore).reduce((n, v) => n + v, 0);
              return (
                <li key={r.id} className="flex items-baseline gap-3 text-sm">
                  <span style={{ color: 'var(--fg-faint)' }}>
                    {new Date(r.at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                  </span>
                  <span className="tabular-nums">{pts}/{totalPoints}</span>
                  <span className="tabular-nums" style={{ color: 'var(--fg-faint)' }}>
                    {Math.round(r.secondsSpent / 60)} min
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Page>
  );
}

/* ------------------------------------------------------------------ */

function EssayFeedbackPanel({ data }: { data: EssayFeedback }) {
  return (
    <section className="animate-in mb-6">
      <h2 className="mb-3" style={{ fontSize: '1.0625rem' }}>AI feedback</h2>

      {data.uncitedClaims.length > 0 && (
        <div className="border-t pt-5 pb-6" style={{ borderColor: 'var(--rule)' }}>
          <div className="slab-sm mb-2" style={{ color: 'var(--incorrect)' }}>
            Claims with no Latin behind them — the commonest way points are lost
          </div>
          <ul className="flex flex-col gap-3">
            {data.uncitedClaims.map((c, i) => (
              <li key={i}>
                <p className="text-sm italic" style={{ color: 'var(--fg)', margin: 0 }}>“{c.claim}”</p>
                <p className="mt-1 text-sm" style={{ color: 'var(--fg-muted)', margin: '0.25rem 0 0' }}>{c.why}</p>
                <p className="mt-1 text-sm" style={{ margin: '0.25rem 0 0' }}>
                  <span style={{ color: 'var(--fg-faint)' }}>Try: </span>
                  <span style={{ fontFamily: 'var(--font-latin)', fontSize: '1rem' }}>{c.suggestedEvidence}</span>
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.citationCheck.length > 0 && (
        <div className="border-t pt-5 pb-6" style={{ borderColor: 'var(--rule)' }}>
          <div className="slab-sm mb-2">Your citations, checked against the passage</div>
          <ul className="flex flex-col gap-2">
            {data.citationCheck.map((c, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-2 text-sm">
                <span style={{ fontFamily: 'var(--font-latin)', fontSize: '1rem' }}>{c.quoted}</span>
                <span className={c.accurate ? 'chip chip-gilt' : 'chip chip-accent'}>{c.citedAs}</span>
                {!c.accurate && <span style={{ color: 'var(--fg-muted)' }}>{c.note}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="border-t pt-5 pb-6" style={{ borderColor: 'var(--rule)' }}>
        <div className="slab-sm mb-2">Per-dimension</div>
        <ul className="flex flex-col gap-2.5">
          {data.dimensions.map((d) => (
            <li key={d.id}>
              <div className="flex items-baseline justify-between gap-2">
                <span style={{ fontWeight: 550, fontSize: '0.9375rem' }}>{d.name}</span>
                <span className="tabular-nums text-sm">{d.earned}/{d.possible}</span>
              </div>
              <p className="measure text-sm" style={{ color: 'var(--fg-muted)', margin: '0.125rem 0 0' }}>
                {d.justification}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t pt-5 pb-6" style={{ borderColor: 'var(--rule)' }}>
        <div className="slab-sm mb-2">Two revisions</div>
        <ol className="flex list-decimal flex-col gap-1.5 pl-4">
          {data.revisions.map((r, i) => (
            <li key={i} className="text-sm" style={{ color: 'var(--fg-muted)' }}>{r}</li>
          ))}
        </ol>
        <p className="measure mt-3 border-t pt-3 text-sm" style={{ borderColor: 'var(--rule)', color: 'var(--fg-muted)' }}>
          {data.overall}
        </p>
      </div>
    </section>
  );
}

function ShortAnswerPanel({ data }: { data: ShortAnswerGrade }) {
  return (
    <section className="animate-in mb-6">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 style={{ fontSize: '1.0625rem' }}>AI feedback</h2>
        <span className="tabular-nums" style={{ fontFamily: 'var(--font-serif)', fontSize: '1.375rem', fontWeight: 600 }}>
          {data.totalEarned}/{data.totalPossible}
        </span>
      </div>
      <ul className="flex flex-col gap-3">
        {data.items.map((it) => (
          <li key={it.subquestionId}>
            <div className="border-t pt-5 pb-6" style={{ borderColor: 'var(--rule)' }}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span style={{ fontWeight: 550, fontSize: '0.9375rem' }}>{it.prompt}</span>
                <span className="tabular-nums text-sm">{it.earned}/{it.possible}</span>
              </div>
              <p className="mt-1.5 text-sm" style={{ color: 'var(--fg-muted)', margin: '0.375rem 0 0' }}>{it.feedback}</p>
              <p className="mt-2 text-sm" style={{ margin: '0.5rem 0 0' }}>
                <span style={{ color: 'var(--fg-faint)' }}>Full credit looks like: </span>
                {it.modelAnswer}
              </p>
            </div>
          </li>
        ))}
      </ul>
      {data.patterns.length > 0 && (
        <div className="border-t pt-5 pb-6" style={{ borderColor: 'var(--rule)' }}>
          <div className="slab-sm mb-1.5">Patterns across the set</div>
          <ul className="flex flex-col gap-1">
            {data.patterns.map((p, i) => (
              <li key={i} className="text-sm" style={{ color: 'var(--fg-muted)' }}>• {p}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Course project                                                      */
/* ------------------------------------------------------------------ */

const EMPTY_PROJECT = (): ProjectPassage => ({
  id: Math.random().toString(36).slice(2, 10),
  title: '',
  author: '',
  citation: '',
  genre: 'prose',
  latin: '',
  notes: '',
  checkpoint1: '',
  checkpoint2: '',
});

function CourseProject() {
  const passages = useStore((s) => s.projectPassages);
  const upsert = useStore((s) => s.upsertProjectPassage);
  const remove = useStore((s) => s.removeProjectPassage);
  const [editing, setEditing] = useState<ProjectPassage | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (editing) {
    return (
      <>
        <div className="mb-4">
          <BackLink onClick={() => setEditing(null)}>All project passages</BackLink>
        </div>
        <Panel>
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="mb-1 block text-xs" style={{ color: 'var(--fg-muted)' }}>Title</span>
              <input className="input" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            </label>
            <label>
              <span className="mb-1 block text-xs" style={{ color: 'var(--fg-muted)' }}>Author</span>
              <input className="input" value={editing.author} onChange={(e) => setEditing({ ...editing, author: e.target.value })} />
            </label>
            <label>
              <span className="mb-1 block text-xs" style={{ color: 'var(--fg-muted)' }}>Citation</span>
              <input className="input" value={editing.citation} onChange={(e) => setEditing({ ...editing, citation: e.target.value })} placeholder="e.g. Ovid, Amores 1.9" />
            </label>
            <label>
              <span className="mb-1 block text-xs" style={{ color: 'var(--fg-muted)' }}>Genre</span>
              <select
                className="input"
                value={editing.genre}
                onChange={(e) => setEditing({ ...editing, genre: e.target.value as 'prose' | 'poetry' })}
              >
                <option value="prose">Prose</option>
                <option value="poetry">Poetry</option>
              </select>
            </label>
          </div>

          <label className="mt-3 block">
            <span className="mb-1 block text-xs" style={{ color: 'var(--fg-muted)' }}>
              Latin (100–150 words is the length the exam uses)
            </span>
            <textarea
              className="input"
              rows={8}
              value={editing.latin}
              onChange={(e) => setEditing({ ...editing, latin: e.target.value })}
              style={{ fontFamily: 'var(--font-latin)', fontSize: '1.0625rem', lineHeight: 1.8, resize: 'vertical' }}
            />
            <span className="mt-1 block text-right text-xs" style={{ color: 'var(--fg-faint)' }}>
              {editing.latin.trim().split(/\s+/).filter(Boolean).length} words
            </span>
          </label>

          <label className="mt-3 block">
            <span className="mb-1 block text-xs" style={{ color: 'var(--fg-muted)' }}>Your notes</span>
            <textarea
              className="input"
              rows={4}
              value={editing.notes}
              onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
              style={{ resize: 'vertical' }}
            />
          </label>

          <div className="mt-5 grid gap-4 border-t pt-5 sm:grid-cols-2" style={{ borderColor: 'var(--rule)' }}>
            <div>
              <div className="mb-1 flex items-baseline justify-between">
                <span className="slab-sm" style={{ margin: 0 }}>Checkpoint 1 — summary</span>
                <span className="chip">2 pts</span>
              </div>
              <p className="mb-2 text-xs" style={{ color: 'var(--fg-faint)' }}>
                {CHECKPOINT_1_RUBRIC[0].criteria}
              </p>
              <textarea
                className="input"
                rows={6}
                value={editing.checkpoint1}
                onChange={(e) => setEditing({ ...editing, checkpoint1: e.target.value })}
                placeholder="Summarise the passage accurately and completely…"
                style={{ fontFamily: 'var(--font-serif)', lineHeight: 1.7, resize: 'vertical' }}
              />
            </div>
            <div>
              <div className="mb-1 flex items-baseline justify-between">
                <span className="slab-sm" style={{ margin: 0 }}>Checkpoint 2 — interpretation</span>
                <span className="chip">3 pts</span>
              </div>
              <p className="mb-2 text-xs" style={{ color: 'var(--fg-faint)' }}>
                {CHECKPOINT_2_RUBRIC[0].criteria}
              </p>
              <textarea
                className="input"
                rows={6}
                value={editing.checkpoint2}
                onChange={(e) => setEditing({ ...editing, checkpoint2: e.target.value })}
                placeholder="An interpretation, the Latin that supports it, and how it supports it…"
                style={{ fontFamily: 'var(--font-serif)', lineHeight: 1.7, resize: 'vertical' }}
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => { upsert(editing); setEditing(null); }}
              disabled={!editing.latin.trim()}
            >
              Save passage
            </button>
            <button type="button" className="btn" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </Panel>
      </>
    );
  }

  return (
    <>
      <Panel className="mb-8">
        <p className="measure text-sm" style={{ color: 'var(--fg-muted)', margin: 0 }}>
          The course project is four passages you choose with your teacher — two prose, two poetry.
          Two of them are assessed on the exam as FRQ 4 and 5, and two teacher-scored in-class
          checkpoints are worth 2% of the free-response section. Add your passages here and they
          become available in the FRQ 4 and 5 workspaces.
        </p>
      </Panel>

      {!mounted ? null : passages.length === 0 ? (
        <Empty
          title="No project passages yet"
          body="Add the four passages you have chosen for your course project. Everything stays in this browser."
          action={
            <button type="button" className="btn btn-primary" onClick={() => setEditing(EMPTY_PROJECT())}>
              Add a passage
            </button>
          }
        />
      ) : (
        <>
          <ul className="mb-4 grid gap-2.5 sm:grid-cols-2">
            {passages.map((p) => (
              <li key={p.id}>
                <div className="border-t pt-5 pb-6" style={{ borderColor: 'var(--rule)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div style={{ fontWeight: 600 }}>{p.title || 'Untitled'}</div>
                      <div className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                        {p.author}{p.author && p.citation ? ', ' : ''}{p.citation}
                      </div>
                    </div>
                    <span className={p.genre === 'poetry' ? 'chip chip-accent' : 'chip'}>{p.genre}</span>
                  </div>
                  <p
                    className="mt-2 line-clamp-3 text-sm"
                    style={{ fontFamily: 'var(--font-latin)', color: 'var(--fg-muted)' }}
                  >
                    {p.latin.slice(0, 160)}{p.latin.length > 160 ? '…' : ''}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button type="button" className="btn text-xs" onClick={() => setEditing(p)}>Edit</button>
                    <button
                      type="button"
                      className="btn btn-ghost text-xs"
                      style={{ color: 'var(--incorrect)' }}
                      onClick={() => remove(p.id)}
                    >
                      Remove
                    </button>
                    <div className="ml-auto flex gap-1">
                      <span className={p.checkpoint1.trim() ? 'chip chip-gilt' : 'chip'}>CP1</span>
                      <span className={p.checkpoint2.trim() ? 'chip chip-gilt' : 'chip'}>CP2</span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn-primary" onClick={() => setEditing(EMPTY_PROJECT())}>
            Add another passage
          </button>
          <p className="mt-2 text-sm" style={{ color: 'var(--fg-faint)' }}>
            {passages.filter((p) => p.genre === 'prose').length} prose,{' '}
            {passages.filter((p) => p.genre === 'poetry').length} poetry — the project calls for two of each.
          </p>
        </>
      )}
    </>
  );
}
