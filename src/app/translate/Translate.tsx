'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { translationDrills, getDrill } from '@/data/translation';
import { getPassage } from '@/data/passages';
import { useStore } from '@/store/useStore';
import { useAiStatus, useAiCall } from '@/lib/useAi';
import { Page, PageHeader, Section, Panel, CalledOut, BackLink, CedLink, SourceNote } from '@/components/ui';
import type { TranslationGrade } from '@/lib/ai/schemas';

type Verdict = 'correct' | 'partial' | 'incorrect';

const VERDICT_STYLE: Record<Verdict, { bg: string; fg: string; label: string }> = {
  correct: { bg: 'var(--correct-bg)', fg: 'var(--correct)', label: 'Correct' },
  partial: { bg: 'var(--partial-bg)', fg: 'var(--partial)', label: 'Partial' },
  incorrect: { bg: 'var(--incorrect-bg)', fg: 'var(--incorrect)', label: 'Missed' },
};

export default function Translate() {
  const [drillId, setDrillId] = useState<string | null>(null);
  const drill = drillId ? getDrill(drillId) : null;

  if (!drill) {
    return (
      <Page wide>
        <PageHeader
          eyebrow="Free-Response Question 2"
          title="Translate"
          lede={
            <>
              The exam gives you about 35 words of Vergil or 40 of Pliny and scores your literal
              translation in 15 segments. These drills use the same shape: you type your translation,
              then reveal a literal model with the scoring segments marked, and score yourself
              against the actual criteria.
            </>
          }
        />

        <ul className="stagger flex flex-col pl-0" style={{ listStyle: 'none' }}>
          {translationDrills.map((d) => {
            const p = getPassage(d.passageId);
            return (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => setDrillId(d.id)}
                  className="squish row-hover block w-full border-t px-3 py-5 text-left"
                  style={{ borderColor: 'var(--rule)', marginLeft: '-0.75rem' }}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <span
                      style={{
                        fontFamily: 'var(--font-latin)',
                        fontSize: '1.25rem',
                        fontWeight: 600,
                      }}
                    >
                      {d.citation}
                    </span>
                    <span className="slab-sm">{p?.genre}</span>
                  </div>

                  <div
                    className="mt-1"
                    style={{
                      fontFamily: 'var(--font-latin)',
                      fontSize: '1.0625rem',
                      color: 'var(--ink2)',
                    }}
                  >
                    {p?.title}
                  </div>

                  <div
                    className="mt-2.5 flex items-center gap-2.5"
                    style={{ color: 'var(--fg-faint)', fontSize: '0.9375rem' }}
                  >
                    <span className="tabular-nums">{d.segments.length} segments</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{d.latin.split(/\s+/).length} words</span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        <SourceNote to="scoring">
          Segments, requirements and pitfalls are written against the official scoring guidelines for
          FRQ 2. Read them yourself — knowing how the segment is awarded is most of the skill.
        </SourceNote>
      </Page>
    );
  }

  return <Drill key={drill.id} drillId={drill.id} onBack={() => setDrillId(null)} />;
}

function Drill({ drillId, onBack }: { drillId: string; onBack: () => void }) {
  const drill = getDrill(drillId)!;
  const passage = getPassage(drill.passageId);
  const ai = useAiStatus();
  const grader = useAiCall<TranslationGrade>();
  const recordTranslation = useStore((s) => s.recordTranslation);
  const markStudied = useStore((s) => s.markStudied);
  const attempts = useStore((s) => s.translationAttempts);

  const [text, setText] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [scores, setScores] = useState<Record<string, Verdict>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    markStudied();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const aiSegments = useMemo(() => {
    if (!grader.data) return null;
    const m = new Map<string, TranslationGrade['segments'][number]>();
    for (const s of grader.data.segments) m.set(s.segmentId, s);
    return m;
  }, [grader.data]);

  const score = useMemo(() => {
    let earned = 0;
    for (const s of drill.segments) {
      const v = scores[s.id];
      if (v === 'correct') earned += 1;
      else if (v === 'partial') earned += 0.5;
    }
    return earned;
  }, [scores, drill.segments]);

  const graded = Object.keys(scores).length;

  function applyAiScores(g: TranslationGrade) {
    const next: Record<string, Verdict> = {};
    for (const s of g.segments) next[s.segmentId] = s.verdict;
    setScores(next);
    setRevealed(true);
  }

  function save(gradedBy: 'self' | 'ai') {
    const missedTags = drill.segments
      .filter((s) => scores[s.id] && scores[s.id] !== 'correct')
      .flatMap((s) => s.tags);
    recordTranslation({
      drillId: drill.id,
      segmentResults: scores,
      text,
      score,
      maxScore: drill.segments.length,
      missedTags,
      gradedBy,
    });
    setSaved(true);
  }

  const priorAttempts = attempts.filter((a) => a.drillId === drill.id);

  return (
    <Page wide>
      <div className="mb-5">
        <BackLink onClick={onBack}>All drills</BackLink>
      </div>

      <PageHeader
        eyebrow={`FRQ 2 · ${drill.segments.length} segments · 15 minutes on the exam`}
        title={drill.citation}
        lede={passage?.title}
        actions={
          passage && (
            <Link href={`/read/${passage.id}`} className="btn">
              Read in context
            </Link>
          )
        }
      />

      {/* ---------- Latin ---------- */}
      <CalledOut rubric="Translate as literally as possible" className="mb-9">
        <p
          className={passage?.genre === 'poetry' ? 'latin-verse' : 'latin'}
          style={{ margin: 0, whiteSpace: 'pre-line' }}
        >
          {drill.latin}
        </p>
      </CalledOut>

      {/* ---------- Input ---------- */}
      <div className="mb-6">
        <label className="slab mb-3 block" htmlFor="translation">
          Your translation
        </label>
        <textarea
          id="translation"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          className="input"
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '1.0625rem',
            lineHeight: 1.75,
            resize: 'vertical',
          }}
          placeholder="Account for every Latin word. Keep the tenses, cases and constructions the Latin actually uses…"
          maxLength={4000}
        />
        <div
          className="mt-2 flex items-center justify-between"
          style={{ color: 'var(--fg-faint)', fontSize: '0.875rem' }}
        >
          <span className="tabular-nums">{text.length} / 4,000 characters</span>
          {text.trim().length > 0 && !revealed && (
            <span>Write it all before revealing — no peeking.</span>
          )}
        </div>
      </div>

      {/*
       * One default action, not a choice to make first. When AI grading is
       * configured, pressing the one primary button both reveals and grades
       * — no separate "which button do I want" step. A quieter link next to
       * it still lets a student choose to self-score on purpose; it is
       * `.btn-ghost` rather than a second full button on purpose, so the
       * eye finds exactly one obvious thing to press.
       *
       * If the AI call fails for any reason — this route's own rate limit,
       * a provider quota, a network error — `grader.call` resolves to null
       * and every one of those paths already reports the response as
       * `degraded` (see useAi.ts). The handler below does not need to tell
       * those cases apart: null just means fall back to self-scoring, which
       * is exactly "default to manual grading" with no extra click.
       */}
      <div className="mb-8 flex flex-wrap items-center gap-4">
        {!revealed && (
          <button
            type="button"
            className="btn btn-primary"
            disabled={text.trim().length === 0 || grader.loading}
            onClick={async () => {
              if (!ai.configured) {
                setRevealed(true);
                return;
              }
              const g = await grader.call('grade-translation', {
                drillId: drill.id,
                translation: text,
              });
              if (g) applyAiScores(g);
              else setRevealed(true);
            }}
          >
            {grader.loading
              ? 'Grading…'
              : ai.configured
                ? 'Grade with AI'
                : 'Reveal model and self-score'}
          </button>
        )}
        {!revealed && ai.configured && (
          <button
            type="button"
            className="btn btn-ghost"
            disabled={text.trim().length === 0}
            onClick={() => setRevealed(true)}
          >
            or self-score instead
          </button>
        )}
      </div>

      {grader.error && (
        <div
          role="status"
          className="animate-in mb-8 rounded-[var(--r-md)] border px-4 py-3"
          style={{
            borderColor: grader.degraded ? 'var(--rule-strong)' : 'var(--accent)',
            background: grader.degraded ? 'transparent' : 'var(--redtint)',
            fontFamily: 'var(--font-latin)',
            fontSize: '1.0625rem',
            lineHeight: 1.6,
            color: grader.degraded ? 'var(--ink2)' : 'var(--accent)',
          }}
        >
          {grader.error}
          {grader.degraded && ' Self-scoring below still works exactly the same.'}
        </div>
      )}

      {/* ---------- Segments ---------- */}
      {revealed && (
        <section className="animate-in">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 style={{ fontSize: '1.375rem', lineHeight: 1.25 }}>Scoring segments</h2>
              <p
                style={{
                  margin: '0.375rem 0 0',
                  fontFamily: 'var(--font-latin)',
                  fontSize: '1.0625rem',
                  color: 'var(--ink2)',
                }}
              >
                Mark each segment honestly against what you actually wrote.
              </p>
            </div>
            <div className="text-right">
              <div
                className="tabular-nums"
                style={{ fontFamily: 'var(--font-serif)', fontSize: '2.25rem', lineHeight: 1, fontWeight: 600 }}
              >
                {score}
                <span style={{ color: 'var(--fg-faint)', fontSize: '1.125rem' }}>
                  {' '}
                  / {drill.segments.length}
                </span>
              </div>
              <div className="slab-sm mt-2">
                {graded} of {drill.segments.length} marked
              </div>
            </div>
          </div>

          {grader.data && (
            <CalledOut rubric="One thing to work on" className="mb-8">
              <p
                className="measure"
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-latin)',
                  fontSize: '1.125rem',
                  lineHeight: 1.6,
                }}
              >
                {grader.data.oneThingToWorkOn}
              </p>
            </CalledOut>
          )}

          <ol className="mb-10 flex flex-col pl-0" style={{ listStyle: 'none' }}>
            {drill.segments.map((seg, i) => {
              const v = scores[seg.id];
              const aiSeg = aiSegments?.get(seg.id);
              return (
                <li
                  key={seg.id}
                  className="border-t pt-5 pb-7"
                  style={{
                    borderColor: v ? VERDICT_STYLE[v].fg : 'var(--rule)',
                    borderTopWidth: v ? 2 : 1,
                  }}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <div className="flex items-baseline gap-3">
                      <span className="numeral tabular-nums" style={{ color: 'var(--fg-faint)' }}>
                        {i + 1}
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--font-latin)',
                          fontSize: '1.25rem',
                          fontWeight: 600,
                        }}
                      >
                        {seg.latin}
                      </span>
                    </div>
                    {v && (
                      <span
                        className="chip"
                        style={{ borderColor: VERDICT_STYLE[v].fg, color: VERDICT_STYLE[v].fg }}
                      >
                        {VERDICT_STYLE[v].label}
                      </span>
                    )}
                  </div>

                  <p
                    style={{
                      margin: '0.75rem 0 0',
                      fontFamily: 'var(--font-latin)',
                      fontSize: '1.0625rem',
                      lineHeight: 1.6,
                    }}
                  >
                    <span className="slab-sm">Literal — </span>
                    {seg.literal}
                  </p>
                  <p
                    style={{
                      margin: '0.375rem 0 0',
                      fontFamily: 'var(--font-latin)',
                      fontSize: '1rem',
                      lineHeight: 1.6,
                      color: 'var(--ink2)',
                    }}
                  >
                    <span className="slab-sm">To earn it — </span>
                    {seg.requirement}
                  </p>

                  {seg.pitfalls.length > 0 && (
                    <ul
                      className="mt-2.5 flex flex-col gap-1 pl-0"
                      style={{ listStyle: 'none' }}
                    >
                      {seg.pitfalls.map((p) => (
                        <li
                          key={p}
                          className="flex gap-2.5"
                          style={{
                            fontFamily: 'var(--font-latin)',
                            fontSize: '0.9375rem',
                            color: 'var(--fg-muted)',
                          }}
                        >
                          <span aria-hidden="true" style={{ color: 'var(--accent)' }}>
                            ·
                          </span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {aiSeg && (
                    <div
                      className="mt-4 rounded-[var(--r-md)] border-l-2 py-1 pl-4"
                      style={{ borderColor: 'var(--redline)' }}
                    >
                      <div className="rubric mb-2">AI reading of your answer</div>
                      {aiSeg.studentRendering ? (
                        <p
                          style={{
                            margin: 0,
                            fontFamily: 'var(--font-latin)',
                            fontSize: '1.0625rem',
                            fontStyle: 'italic',
                            color: 'var(--ink2)',
                          }}
                        >
                          “{aiSeg.studentRendering}”
                        </p>
                      ) : (
                        <p
                          style={{
                            margin: 0,
                            fontFamily: 'var(--font-latin)',
                            fontSize: '1.0625rem',
                            color: 'var(--accent)',
                          }}
                        >
                          Nothing corresponded to this segment.
                        </p>
                      )}
                      <p
                        style={{
                          margin: '0.5rem 0 0',
                          fontFamily: 'var(--font-latin)',
                          fontSize: '1.0625rem',
                          lineHeight: 1.6,
                        }}
                      >
                        {aiSeg.reason}
                      </p>
                      {aiSeg.verdict !== 'correct' && aiSeg.correctedLiteral && (
                        <p
                          style={{
                            margin: '0.5rem 0 0',
                            fontFamily: 'var(--font-latin)',
                            fontSize: '1.0625rem',
                            lineHeight: 1.6,
                            color: 'var(--ink2)',
                          }}
                        >
                          <span className="slab-sm">Should read — </span>
                          {aiSeg.correctedLiteral}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {(['correct', 'partial', 'incorrect'] as Verdict[]).map((verdict) => (
                      <button
                        key={verdict}
                        type="button"
                        aria-pressed={v === verdict}
                        onClick={() => setScores((s) => ({ ...s, [seg.id]: verdict }))}
                        className="chip squish"
                        style={
                          v === verdict
                            ? {
                                background: VERDICT_STYLE[verdict].bg,
                                borderColor: VERDICT_STYLE[verdict].fg,
                                color: VERDICT_STYLE[verdict].fg,
                              }
                            : undefined
                        }
                      >
                        {VERDICT_STYLE[verdict].label}
                      </button>
                    ))}
                    <div className="ml-auto flex flex-wrap gap-2">
                      {seg.tags.map((t) => (
                        <span key={t} className="slab-sm">
                          {t.replace(/-/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>

          {/* model translation */}
          <Panel className="mb-8">
            <div className="rubric mb-3">Continuous literal model</div>
            <p
              className="measure"
              style={{
                margin: 0,
                fontFamily: 'var(--font-serif)',
                fontSize: '1.0625rem',
                lineHeight: 1.75,
              }}
            >
              {grader.data?.correctedTranslation ?? drill.modelTranslation}
            </p>
            {drill.notes && (
              <p
                className="measure mt-5 border-t pt-4"
                style={{
                  borderColor: 'var(--rule)',
                  marginBottom: 0,
                  fontFamily: 'var(--font-latin)',
                  fontSize: '1rem',
                  lineHeight: 1.65,
                  color: 'var(--ink2)',
                }}
              >
                {drill.notes}
              </p>
            )}
          </Panel>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => save(grader.data ? 'ai' : 'self')}
              disabled={graded === 0 || saved}
            >
              {saved ? 'Saved' : `Log this attempt (${score}/${drill.segments.length})`}
            </button>
            <button type="button" className="btn" onClick={onBack}>
              Another drill
            </button>
            {graded < drill.segments.length && !saved && (
              <span style={{ color: 'var(--fg-faint)', fontSize: '0.9375rem' }}>
                {drill.segments.length - graded} segment
                {drill.segments.length - graded === 1 ? '' : 's'} still unmarked.
              </span>
            )}
          </div>

          {priorAttempts.length > 0 && (
            <Section title="Previous attempts at this drill" className="mt-12">
              <ul className="flex flex-col pl-0" style={{ listStyle: 'none' }}>
                {priorAttempts
                  .slice(-5)
                  .reverse()
                  .map((a) => (
                    <li
                      key={a.id}
                      className="row-hover flex items-baseline gap-4 rounded-[var(--r-sm)] border-t px-2 py-2.5"
                      style={{ borderColor: 'var(--hair)', marginLeft: '-0.5rem' }}
                    >
                      <span style={{ color: 'var(--fg-faint)', fontSize: '0.9375rem' }}>
                        {new Date(a.at).toLocaleDateString(undefined, {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                      <span
                        className="tabular-nums"
                        style={{ fontFamily: 'var(--font-serif)', fontWeight: 600 }}
                      >
                        {a.score}/{a.maxScore}
                      </span>
                      <span className="slab-sm ml-auto">
                        {a.gradedBy === 'ai' ? 'AI graded' : 'self-scored'}
                      </span>
                    </li>
                  ))}
              </ul>
            </Section>
          )}

          <SourceNote to="scoring">
            Every segment above carries the requirement it is awarded on. When the AI grades, it is
            given exactly that data — it is not scoring from memory. Check its reasoning against the{' '}
            <CedLink to="scoring">official guidelines</CedLink> whenever it surprises you.
          </SourceNote>
        </section>
      )}
    </Page>
  );
}
