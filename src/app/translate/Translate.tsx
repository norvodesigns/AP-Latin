'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { translationDrills, getDrill } from '@/data/translation';
import { getPassage } from '@/data/passages';
import { useStore } from '@/store/useStore';
import { useAiStatus, useAiCall } from '@/lib/useAi';
import { Page, PageHeader, Card, Badge, BackLink } from '@/components/ui';
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
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {translationDrills.map((d) => {
            const p = getPassage(d.passageId);
            return (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => setDrillId(d.id)}
                  className="card block h-full w-full p-4 text-left transition-transform hover:-translate-y-px"
                >
                  <div style={{ fontFamily: 'var(--font-latin)', fontSize: '1.0625rem', fontWeight: 600 }}>
                    {d.citation}
                  </div>
                  <div className="mt-0.5 text-sm" style={{ color: 'var(--fg-muted)' }}>
                    {p?.title}
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: 'var(--fg-faint)' }}>
                    <span>{d.segments.length} segments</span>
                    <span aria-hidden="true">·</span>
                    <span>{d.latin.split(/\s+/).length} words</span>
                    <span aria-hidden="true">·</span>
                    <Badge tone={p?.genre === 'poetry' ? 'accent' : 'neutral'}>{p?.genre}</Badge>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
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
      <div className="mb-4">
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
      <Card className="mb-5">
        <div className="eyebrow mb-2">Translate as literally as possible</div>
        <p
          className={passage?.author === 'vergil' ? 'latin-verse' : 'latin'}
          style={{ margin: 0, whiteSpace: 'pre-line' }}
        >
          {drill.latin}
        </p>
      </Card>

      {/* ---------- Input ---------- */}
      <div className="mb-5">
        <label className="eyebrow mb-1.5 block" htmlFor="translation">
          Your translation
        </label>
        <textarea
          id="translation"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          className="input"
          style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem', lineHeight: 1.75, resize: 'vertical' }}
          placeholder="Account for every Latin word. Keep the tenses, cases and constructions the Latin actually uses…"
          maxLength={4000}
        />
        <div className="mt-1.5 flex items-center justify-between text-xs" style={{ color: 'var(--fg-faint)' }}>
          <span>{text.length} / 4,000 characters</span>
          {text.trim().length > 0 && !revealed && <span>Write it all before revealing — no peeking.</span>}
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {!revealed && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setRevealed(true)}
            disabled={text.trim().length === 0}
          >
            Reveal model and self-score
          </button>
        )}
        {ai.configured && (
          <button
            type="button"
            className="btn"
            disabled={text.trim().length === 0 || grader.loading}
            onClick={async () => {
              const g = await grader.call('grade-translation', {
                drillId: drill.id,
                translation: text,
              });
              if (g) applyAiScores(g);
            }}
          >
            {grader.loading ? 'Grading…' : 'Grade with AI'}
          </button>
        )}
      </div>

      {grader.error && (
        <div
          className="mb-5 rounded-lg border px-3.5 py-2.5 text-sm"
          style={{
            background: grader.degraded ? 'var(--partial-bg)' : 'var(--incorrect-bg)',
            borderColor: grader.degraded ? 'color-mix(in srgb, var(--partial) 34%, transparent)' : 'color-mix(in srgb, var(--incorrect) 34%, transparent)',
            color: 'var(--fg-muted)',
          }}
        >
          {grader.error}
          {grader.degraded && ' Self-scoring below still works exactly the same.'}
        </div>
      )}

      {/* ---------- Segments ---------- */}
      {revealed && (
        <section className="animate-in">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 style={{ fontSize: '1.0625rem' }}>Scoring segments</h2>
              <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                Mark each segment honestly against what you actually wrote.
              </p>
            </div>
            <div className="text-right">
              <div className="tabular-nums" style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', fontWeight: 600 }}>
                {score} <span style={{ color: 'var(--fg-faint)', fontSize: '1rem' }}>/ {drill.segments.length}</span>
              </div>
              <div className="text-xs" style={{ color: 'var(--fg-faint)' }}>
                {graded} of {drill.segments.length} marked
              </div>
            </div>
          </div>

          {grader.data && (
            <Card className="mb-4">
              <div className="eyebrow mb-1.5">One thing to work on</div>
              <p className="measure text-sm" style={{ margin: 0, color: 'var(--fg)' }}>
                {grader.data.oneThingToWorkOn}
              </p>
            </Card>
          )}

          <ol className="mb-6 flex flex-col gap-3">
            {drill.segments.map((seg, i) => {
              const v = scores[seg.id];
              const aiSeg = aiSegments?.get(seg.id);
              return (
                <li key={seg.id}>
                  <Card>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="flex items-baseline gap-2.5">
                        <span className="tabular-nums text-xs" style={{ color: 'var(--fg-faint)' }}>{i + 1}</span>
                        <span style={{ fontFamily: 'var(--font-latin)', fontSize: '1.125rem', fontWeight: 600 }}>
                          {seg.latin}
                        </span>
                      </div>
                      {v && (
                        <span
                          className="rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold"
                          style={{ background: VERDICT_STYLE[v].bg, color: VERDICT_STYLE[v].fg }}
                        >
                          {VERDICT_STYLE[v].label}
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-sm" style={{ color: 'var(--fg)' }}>
                      <span style={{ color: 'var(--fg-faint)' }}>Literal: </span>
                      {seg.literal}
                    </p>
                    <p className="mt-1 text-sm" style={{ color: 'var(--fg-muted)' }}>
                      <span style={{ color: 'var(--fg-faint)' }}>To earn it: </span>
                      {seg.requirement}
                    </p>

                    {seg.pitfalls.length > 0 && (
                      <ul className="mt-1.5 flex flex-col gap-0.5">
                        {seg.pitfalls.map((p) => (
                          <li key={p} className="text-xs" style={{ color: 'var(--fg-faint)' }}>
                            • {p}
                          </li>
                        ))}
                      </ul>
                    )}

                    {aiSeg && (
                      <div
                        className="mt-3 rounded-lg px-3 py-2.5 text-sm"
                        style={{ background: 'var(--bg-sunk)' }}
                      >
                        <div className="eyebrow mb-1">AI reading of your answer</div>
                        {aiSeg.studentRendering ? (
                          <p className="italic" style={{ color: 'var(--fg-muted)', margin: 0 }}>
                            “{aiSeg.studentRendering}”
                          </p>
                        ) : (
                          <p style={{ color: 'var(--incorrect)', margin: 0 }}>Nothing corresponded to this segment.</p>
                        )}
                        <p className="mt-1.5" style={{ color: 'var(--fg)', margin: '0.375rem 0 0' }}>
                          {aiSeg.reason}
                        </p>
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {(['correct', 'partial', 'incorrect'] as Verdict[]).map((verdict) => (
                        <button
                          key={verdict}
                          type="button"
                          aria-pressed={v === verdict}
                          onClick={() => setScores((s) => ({ ...s, [seg.id]: verdict }))}
                          className="rounded-md border px-2.5 py-1 text-xs font-medium transition-colors"
                          style={{
                            background: v === verdict ? VERDICT_STYLE[verdict].bg : 'transparent',
                            borderColor: v === verdict ? VERDICT_STYLE[verdict].fg : 'var(--rule)',
                            color: v === verdict ? VERDICT_STYLE[verdict].fg : 'var(--fg-faint)',
                          }}
                        >
                          {VERDICT_STYLE[verdict].label}
                        </button>
                      ))}
                      <div className="ml-auto flex flex-wrap gap-1">
                        {seg.tags.map((t) => (
                          <Badge key={t} tone="muted">{t.replace(/-/g, ' ')}</Badge>
                        ))}
                      </div>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ol>

          {/* model translation */}
          <Card className="mb-5">
            <div className="eyebrow mb-2">Continuous literal model</div>
            <p className="measure" style={{ fontFamily: 'var(--font-serif)', lineHeight: 1.75, margin: 0 }}>
              {grader.data?.correctedTranslation ?? drill.modelTranslation}
            </p>
            {drill.notes && (
              <p className="measure mt-3 border-t pt-3 text-sm" style={{ borderColor: 'var(--rule)', color: 'var(--fg-muted)', marginBottom: 0 }}>
                {drill.notes}
              </p>
            )}
          </Card>

          <div className="flex flex-wrap items-center gap-2">
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
              <span className="text-sm" style={{ color: 'var(--fg-faint)' }}>
                {drill.segments.length - graded} segment{drill.segments.length - graded === 1 ? '' : 's'} still unmarked.
              </span>
            )}
          </div>

          {priorAttempts.length > 0 && (
            <div className="mt-6">
              <div className="eyebrow mb-2">Previous attempts at this drill</div>
              <ul className="flex flex-col gap-1">
                {priorAttempts.slice(-5).reverse().map((a) => (
                  <li key={a.id} className="flex items-baseline gap-3 text-sm">
                    <span style={{ color: 'var(--fg-faint)' }}>
                      {new Date(a.at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                    </span>
                    <span className="tabular-nums">{a.score}/{a.maxScore}</span>
                    <Badge tone="muted">{a.gradedBy === 'ai' ? 'AI graded' : 'self-scored'}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </Page>
  );
}
