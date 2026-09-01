'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { sightPassages, sightQuestions, SIGHT_AUTHORS } from '@/data/sight';
import { questions as syllabusQuestions } from '@/data/questions';
import { useStore } from '@/store/useStore';
import { useAiStatus, useAiCall } from '@/lib/useAi';
import { Page, PageHeader, Card, Badge, BackLink } from '@/components/ui';
import type { SightPassage, Question } from '@/data/types';
import type { GeneratedSight } from '@/lib/ai/schemas';

const allQuestions = [...syllabusQuestions, ...sightQuestions];

export default function SightReading() {
  const [active, setActive] = useState<SightPassage | null>(null);
  const [generated, setGenerated] = useState<(GeneratedSight & { _meta?: { cached?: boolean } }) | null>(null);

  if (generated) {
    return <GeneratedAttempt data={generated} onBack={() => setGenerated(null)} />;
  }
  if (active) {
    return <Attempt passage={active} onBack={() => setActive(null)} />;
  }
  return <Index onOpen={setActive} onGenerated={setGenerated} />;
}

/* ------------------------------------------------------------------ */

function Index({
  onOpen,
  onGenerated,
}: {
  onOpen: (p: SightPassage) => void;
  onGenerated: (g: GeneratedSight) => void;
}) {
  const ai = useAiStatus();
  const gen = useAiCall<GeneratedSight>();
  const [author, setAuthor] = useState<string>('Nepos');
  const [genre, setGenre] = useState<'prose' | 'poetry'>('prose');
  const [variant, setVariant] = useState(0);

  return (
    <Page wide>
      <PageHeader
        eyebrow="Section I · 26 of the 52 multiple-choice questions are sight"
        title="Sight Reading"
        lede={
          <>
            Timed unseen passages from the authors the CED names for sight practice. Read it cold,
            answer the questions, then check the summary.
          </>
        }
      />

      <h2 className="eyebrow mb-3">Vetted passages</h2>
      <ul className="mb-9 grid gap-2.5 sm:grid-cols-2">
        {sightPassages.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onOpen(p)}
              className="card block h-full w-full p-4 text-left transition-transform hover:-translate-y-px"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div style={{ fontFamily: 'var(--font-latin)', fontSize: '1.0625rem', fontWeight: 600 }}>
                    {p.citation}
                  </div>
                  <div className="mt-0.5 text-sm" style={{ color: 'var(--fg-muted)' }}>
                    {p.author}, {p.work}
                  </div>
                </div>
                <Badge tone={p.genre === 'poetry' ? 'accent' : 'neutral'}>{p.genre}</Badge>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: 'var(--fg-faint)' }}>
                <span>{p.latin.split(/\s+/).length} words</span>
                <span aria-hidden="true">·</span>
                <span>{p.questionIds.length} questions</span>
              </div>
            </button>
          </li>
        ))}
      </ul>

      <h2 className="eyebrow mb-3">Generate a new passage</h2>
      <Card>
        {!ai.loading && !ai.configured ? (
          <p className="text-sm" style={{ color: 'var(--fg-muted)', margin: 0 }}>
            No AI provider is configured on this deployment, so passage generation is off. The vetted
            passages above work exactly as before — see the README for how to add a free Gemini key.
          </p>
        ) : (
          <>
            <p className="measure mb-4 text-sm" style={{ color: 'var(--fg-muted)' }}>
              The model selects and reproduces a genuine public-domain passage rather than composing
              Latin, and returns a glossed vocabulary list and AP-style questions. Generated passages
              are cached, and are always labelled as machine-selected — they have not been checked by
              a human, so treat the Latin with appropriate caution.
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              <label>
                <span className="mb-1 block text-xs" style={{ color: 'var(--fg-muted)' }}>Author</span>
                <select className="input" value={author} onChange={(e) => setAuthor(e.target.value)}>
                  {SIGHT_AUTHORS.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-1 block text-xs" style={{ color: 'var(--fg-muted)' }}>Genre</span>
                <select
                  className="input"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value as 'prose' | 'poetry')}
                >
                  <option value="prose">Prose</option>
                  <option value="poetry">Poetry</option>
                </select>
              </label>
              <div className="flex items-end">
                <button
                  type="button"
                  className="btn btn-primary w-full"
                  disabled={gen.loading}
                  onClick={async () => {
                    const g = await gen.call('generate-sight', { author, genre, variant, questionCount: 4 });
                    if (g) {
                      setVariant((v) => v + 1);
                      onGenerated(g);
                    }
                  }}
                >
                  {gen.loading ? 'Selecting…' : 'Generate'}
                </button>
              </div>
            </div>

            {gen.error && (
              <div
                className="mt-3 rounded-lg border px-3.5 py-2.5 text-sm"
                style={{
                  background: 'var(--partial-bg)',
                  borderColor: 'color-mix(in srgb, var(--partial) 34%, transparent)',
                  color: 'var(--fg-muted)',
                }}
              >
                {gen.error}
              </div>
            )}
          </>
        )}
      </Card>
    </Page>
  );
}

/* ------------------------------------------------------------------ */

function Attempt({ passage, onBack }: { passage: SightPassage; onBack: () => void }) {
  const qs = useMemo(
    () => passage.questionIds.map((id) => allQuestions.find((q) => q.id === id)).filter((q): q is Question => Boolean(q)),
    [passage],
  );
  return (
    <AttemptShell
      onBack={onBack}
      title={passage.citation}
      subtitle={`${passage.author}, ${passage.work}`}
      genre={passage.genre}
      latin={passage.latin}
      gloss={passage.gloss}
      summary={passage.summary}
      source={passage.source}
      questions={qs}
    />
  );
}

function GeneratedAttempt({
  data,
  onBack,
}: {
  data: GeneratedSight & { _meta?: { cached?: boolean } };
  onBack: () => void;
}) {
  const qs: Question[] = data.questions.map((q, i) => ({
    id: `gen-${i}`,
    type: q.type,
    skill: '1.B',
    skillCategory: '1',
    unit: '1',
    prompt: q.prompt,
    options: q.options,
    answerId: q.answerId,
    explanation: q.explanation,
    difficulty: 2,
  }));

  return (
    <AttemptShell
      onBack={onBack}
      title={data.citation}
      subtitle={`${data.author}, ${data.work}`}
      genre={data.genre}
      latin={data.latin}
      gloss={data.gloss}
      summary={data.summary}
      source="Machine-selected — not vetted"
      questions={qs}
      machineSelected
      confidence={data.confidence}
      cached={data._meta?.cached}
    />
  );
}

function AttemptShell({
  onBack, title, subtitle, genre, latin, gloss, summary, source, questions,
  machineSelected, confidence, cached,
}: {
  onBack: () => void;
  title: string;
  subtitle: string;
  genre: 'prose' | 'poetry';
  latin: string;
  gloss: Array<{ word: string; meaning: string }>;
  summary: string;
  source: string;
  questions: Question[];
  machineSelected?: boolean;
  confidence?: 'high' | 'medium' | 'low';
  cached?: boolean;
}) {
  const recordQuiz = useStore((s) => s.recordQuiz);
  const markStudied = useStore((s) => s.markStudied);
  const [started, setStarted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!started || submitted) return;
    timer.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [started, submitted]);

  const correct = questions.filter((q) => answers[q.id] === q.answerId).length;
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  function submit() {
    setSubmitted(true);
    markStudied();
    for (const q of questions) {
      if (!answers[q.id]) continue;
      recordQuiz({
        questionId: q.id,
        correct: answers[q.id] === q.answerId,
        chosenId: answers[q.id],
        type: q.type,
        skillCategory: q.skillCategory,
        unit: q.unit,
      });
    }
  }

  return (
    <Page wide>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <BackLink onClick={onBack}>All sight passages</BackLink>
        <div className="flex items-center gap-3">
          {started && (
            <span
              className="tabular-nums"
              style={{ fontFamily: 'var(--font-serif)', fontSize: '1.125rem', color: submitted ? 'var(--fg-faint)' : 'var(--fg)' }}
            >
              {mm}:{ss}
            </span>
          )}
          {!started && (
            <button type="button" className="btn btn-primary" onClick={() => setStarted(true)}>
              Start the clock
            </button>
          )}
        </div>
      </div>

      <PageHeader
        eyebrow={subtitle}
        title={title}
        actions={<Badge tone={genre === 'poetry' ? 'accent' : 'neutral'}>{genre}</Badge>}
      />

      {machineSelected && (
        <div
          className="mb-5 rounded-lg border px-3.5 py-2.5 text-sm"
          style={{
            background: 'color-mix(in srgb, var(--gilt) 10%, transparent)',
            borderColor: 'color-mix(in srgb, var(--gilt) 32%, transparent)',
            color: 'var(--fg-muted)',
          }}
        >
          <strong style={{ color: 'var(--gilt)' }}>Machine-selected.</strong> A model chose and
          reproduced this passage; nobody has checked it against a printed text. Verify the Latin
          before trusting it, and treat the questions as practice rather than as vetted items.
          {confidence && <> The model rated its own confidence <strong>{confidence}</strong>.</>}
          {cached && ' Served from cache — no quota was used.'}
        </div>
      )}

      <Card className="mb-5">
        <p
          className={genre === 'poetry' ? 'latin-verse' : 'latin'}
          style={{ margin: 0, whiteSpace: 'pre-line' }}
        >
          {latin}
        </p>
        {gloss.length > 0 && (
          <ul className="mt-4 flex flex-col gap-0.5 border-t pt-3" style={{ borderColor: 'var(--rule)' }}>
            {gloss.map((g) => (
              <li key={g.word} className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                <span style={{ fontFamily: 'var(--font-latin)', fontSize: '1rem' }}>{g.word}</span>
                {' — '}
                {g.meaning}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs" style={{ color: 'var(--fg-faint)' }}>{source}</p>
      </Card>

      <ol className="mb-5 flex flex-col gap-5">
        {questions.map((q, qi) => (
          <li key={q.id}>
            <Card>
              <div className="mb-2.5 flex items-baseline gap-2.5">
                <span className="tabular-nums text-xs" style={{ color: 'var(--fg-faint)' }}>{qi + 1}</span>
                <h2 style={{ fontSize: '1rem', fontWeight: 550, lineHeight: 1.45 }}>{q.prompt}</h2>
              </div>
              <ul className="flex flex-col gap-1.5">
                {q.options.map((o) => {
                  const isAnswer = o.id === q.answerId;
                  const isChosen = answers[q.id] === o.id;
                  let bg = 'transparent';
                  let bd = 'var(--rule)';
                  if (submitted && isAnswer) { bg = 'var(--correct-bg)'; bd = 'var(--correct)'; }
                  else if (submitted && isChosen) { bg = 'var(--incorrect-bg)'; bd = 'var(--incorrect)'; }
                  else if (isChosen) { bg = 'var(--bg-sunk)'; bd = 'var(--rule-strong)'; }
                  return (
                    <li key={o.id}>
                      <button
                        type="button"
                        disabled={submitted}
                        onClick={() => setAnswers((a) => ({ ...a, [q.id]: o.id }))}
                        className="w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors"
                        style={{ background: bg, borderColor: bd, cursor: submitted ? 'default' : 'pointer' }}
                      >
                        {o.text}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {submitted && (
                <p
                  className="measure mt-3 border-t pt-3 text-sm"
                  style={{ borderColor: 'var(--rule)', color: 'var(--fg-muted)', lineHeight: 1.65 }}
                >
                  {q.explanation}
                </p>
              )}
            </Card>
          </li>
        ))}
      </ol>

      {!submitted ? (
        <button
          type="button"
          className="btn btn-primary"
          onClick={submit}
          disabled={Object.keys(answers).length === 0}
        >
          Submit ({Object.keys(answers).length}/{questions.length} answered)
        </button>
      ) : (
        <Card className="animate-in">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <div className="eyebrow">Score</div>
              <div className="tabular-nums" style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', fontWeight: 600 }}>
                {correct} / {questions.length}
              </div>
            </div>
            <div className="text-right text-sm" style={{ color: 'var(--fg-muted)' }}>
              <div className="tabular-nums">{mm}:{ss}</div>
              <div className="text-xs" style={{ color: 'var(--fg-faint)' }}>
                the exam allows roughly 75 seconds per question
              </div>
            </div>
          </div>

          <div className="mt-4 border-t pt-3.5" style={{ borderColor: 'var(--rule)' }}>
            <button
              type="button"
              className="btn btn-ghost px-0 text-sm"
              onClick={() => setShowSummary((v) => !v)}
              aria-expanded={showSummary}
            >
              {showSummary ? 'Hide' : 'Show'} the English summary
            </button>
            {showSummary && (
              <p className="measure mt-2 text-sm" style={{ color: 'var(--fg-muted)', lineHeight: 1.7 }}>
                {summary}
              </p>
            )}
          </div>

          <button type="button" className="btn mt-4" onClick={onBack}>
            Another passage
          </button>
        </Card>
      )}
    </Page>
  );
}
