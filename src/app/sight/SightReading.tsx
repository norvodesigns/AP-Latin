'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { sightPassages, sightQuestions, SIGHT_AUTHORS } from '@/data/sight';
import { questions as syllabusQuestions } from '@/data/questions';
import { useStore } from '@/store/useStore';
import { useAiStatus, useAiCall } from '@/lib/useAi';
import { Page, PageHeader, Section, Panel, CalledOut, BackLink, SourceNote } from '@/components/ui';
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

      <Section title="Vetted passages" className="mb-14">
        <ul className="stagger flex flex-col pl-0" style={{ listStyle: 'none' }}>
          {sightPassages.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onOpen(p)}
                className="squish row-hover block w-full border-t px-3 py-5 text-left"
                style={{ borderColor: 'var(--rule)', marginLeft: '-0.75rem' }}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <span
                    style={{ fontFamily: 'var(--font-latin)', fontSize: '1.25rem', fontWeight: 600 }}
                  >
                    {p.citation}
                  </span>
                  <span className="slab-sm">{p.genre}</span>
                </div>

                <div
                  className="mt-1"
                  style={{
                    fontFamily: 'var(--font-latin)',
                    fontSize: '1.0625rem',
                    color: 'var(--ink2)',
                  }}
                >
                  {p.author}, {p.work}
                </div>

                <div
                  className="mt-2.5 flex items-center gap-2.5"
                  style={{ color: 'var(--fg-faint)', fontSize: '0.9375rem' }}
                >
                  <span className="tabular-nums">{p.latin.split(/\s+/).length} words</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{p.questionIds.length} questions</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Generate a new passage">
        {!ai.loading && !ai.configured ? (
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
            No AI provider is configured on this deployment, so passage generation is off. The vetted
            passages above work exactly as before — see the README for how to add a free Gemini key.
          </p>
        ) : (
          <>
            <p
              className="measure-wide"
              style={{
                margin: '0 0 1.75rem',
                fontFamily: 'var(--font-latin)',
                fontSize: '1.0625rem',
                lineHeight: 1.65,
                color: 'var(--ink2)',
              }}
            >
              The model selects and reproduces a genuine public-domain passage rather than composing
              Latin, and returns a glossed vocabulary list and AP-style questions. Generated passages
              are cached, and are always labelled as machine-selected — they have not been checked by
              a human, so treat the Latin with appropriate caution.
            </p>

            <div className="grid items-end gap-5 sm:grid-cols-3">
              <label className="block">
                <span className="slab-sm mb-2 block">Author</span>
                <select className="input" value={author} onChange={(e) => setAuthor(e.target.value)}>
                  {SIGHT_AUTHORS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="slab-sm mb-2 block">Genre</span>
                <select
                  className="input"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value as 'prose' | 'poetry')}
                >
                  <option value="prose">Prose</option>
                  <option value="poetry">Poetry</option>
                </select>
              </label>

              <button
                type="button"
                className="btn btn-primary w-full"
                disabled={gen.loading}
                onClick={async () => {
                  const g = await gen.call('generate-sight', {
                    author,
                    genre,
                    variant,
                    questionCount: 4,
                  });
                  if (g) {
                    setVariant((v) => v + 1);
                    onGenerated(g);
                  }
                }}
              >
                {gen.loading ? 'Selecting…' : 'Generate'}
              </button>
            </div>

            {gen.error && (
              <div
                role="status"
                className="animate-in mt-5 rounded-[var(--r-md)] border px-4 py-3"
                style={{
                  borderColor: 'var(--rule-strong)',
                  fontFamily: 'var(--font-latin)',
                  fontSize: '1.0625rem',
                  color: 'var(--ink2)',
                }}
              >
                {gen.error}
              </div>
            )}
          </>
        )}
      </Section>

      <SourceNote to="examOverview">
        Half the multiple-choice section is sight reading. The authors offered here are the ones the
        Course and Exam Description names for it.
      </SourceNote>
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
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <BackLink onClick={onBack}>All sight passages</BackLink>
        <div className="flex items-center gap-4">
          {started && (
            <span
              className="tabular-nums"
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.375rem',
                color: submitted ? 'var(--fg-faint)' : 'var(--accent)',
              }}
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
        actions={<span className="chip">{genre}</span>}
      />

      {machineSelected && (
        <div
          className="mb-8 rounded-[var(--r-md)] border-l-2 py-2 pl-4"
          style={{ borderColor: 'var(--gilt)' }}
        >
          <div className="rubric mb-2" style={{ color: 'var(--gilt)' }}>
            Machine-selected
          </div>
          <p
            className="measure-wide"
            style={{
              margin: 0,
              fontFamily: 'var(--font-latin)',
              fontSize: '1.0625rem',
              lineHeight: 1.65,
              color: 'var(--ink2)',
            }}
          >
            A model chose and reproduced this passage; nobody has checked it against a printed text.
            Verify the Latin before trusting it, and treat the questions as practice rather than as
            vetted items.
            {confidence && (
              <>
                {' '}
                The model rated its own confidence <strong>{confidence}</strong>.
              </>
            )}
            {cached && ' Served from cache — no quota was used.'}
          </p>
        </div>
      )}

      <CalledOut className="mb-9">
        <p
          className={genre === 'poetry' ? 'latin-verse' : 'latin'}
          style={{ margin: 0, whiteSpace: 'pre-line' }}
        >
          {latin}
        </p>

        {gloss.length > 0 && (
          <ul
            className="mt-5 flex flex-col gap-1.5 border-t pt-4 pl-0"
            style={{ borderColor: 'var(--redborder)', listStyle: 'none' }}
          >
            {gloss.map((g) => (
              <li
                key={g.word}
                style={{ fontFamily: 'var(--font-latin)', fontSize: '1rem', color: 'var(--ink2)' }}
              >
                <span style={{ fontWeight: 600 }}>{g.word}</span>
                {' — '}
                {g.meaning}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4" style={{ margin: '1rem 0 0', color: 'var(--fg-faint)', fontSize: '0.875rem' }}>
          {source}
        </p>
      </CalledOut>

      <ol className="mb-8 flex flex-col pl-0" style={{ listStyle: 'none' }}>
        {questions.map((q, qi) => (
          <li key={q.id} className="border-t pt-6 pb-8" style={{ borderColor: 'var(--rule)' }}>
            <div className="mb-4 flex items-baseline gap-3">
              <span className="numeral tabular-nums" style={{ color: 'var(--fg-faint)' }}>
                {qi + 1}
              </span>
              <h2 style={{ fontSize: '1.1875rem', fontWeight: 550, lineHeight: 1.4 }}>{q.prompt}</h2>
            </div>

            <ul className="flex flex-col gap-2 pl-0" style={{ listStyle: 'none' }}>
              {q.options.map((o) => {
                const isAnswer = o.id === q.answerId;
                const isChosen = answers[q.id] === o.id;
                const style: CSSProperties = { borderColor: 'var(--rule-strong)' };
                if (submitted && isAnswer) {
                  style.borderColor = 'var(--correct)';
                  style.background = 'var(--correct-bg)';
                } else if (submitted && isChosen) {
                  style.borderColor = 'var(--accent)';
                  style.background = 'var(--incorrect-bg)';
                } else if (isChosen) {
                  style.borderColor = 'var(--accent)';
                  style.background = 'var(--redtint)';
                }
                return (
                  <li key={o.id}>
                    <button
                      type="button"
                      disabled={submitted}
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: o.id }))}
                      className="squish row-hover w-full rounded-[var(--r-md)] border px-4 py-3 text-left"
                      style={{
                        ...style,
                        fontFamily: 'var(--font-latin)',
                        fontSize: '1.0625rem',
                        lineHeight: 1.5,
                        cursor: submitted ? 'default' : 'pointer',
                      }}
                    >
                      {o.text}
                    </button>
                  </li>
                );
              })}
            </ul>

            {submitted && (
              <p
                className="measure mt-5 border-t pt-4"
                style={{
                  borderColor: 'var(--hair)',
                  margin: '1.25rem 0 0',
                  fontFamily: 'var(--font-latin)',
                  fontSize: '1.0625rem',
                  lineHeight: 1.65,
                  color: 'var(--ink2)',
                }}
              >
                {q.explanation}
              </p>
            )}
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
        <Panel className="animate-in">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <div className="rubric mb-2">Score</div>
              <div
                className="tabular-nums"
                style={{ fontFamily: 'var(--font-serif)', fontSize: '2.25rem', lineHeight: 1, fontWeight: 600 }}
              >
                {correct}
                <span style={{ color: 'var(--fg-faint)', fontSize: '1.125rem' }}>
                  {' '}
                  / {questions.length}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div
                className="tabular-nums"
                style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem' }}
              >
                {mm}:{ss}
              </div>
              <div className="slab-sm mt-1.5">roughly 75 seconds per question on the exam</div>
            </div>
          </div>

          <div className="mt-6 border-t pt-5" style={{ borderColor: 'var(--rule)' }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowSummary((v) => !v)}
              aria-expanded={showSummary}
            >
              {showSummary ? 'Hide' : 'Show'} the English summary
            </button>
            {showSummary && (
              <p
                className="measure animate-in mt-4"
                style={{
                  margin: '1rem 0 0',
                  fontFamily: 'var(--font-latin)',
                  fontSize: '1.0625rem',
                  lineHeight: 1.7,
                  color: 'var(--ink2)',
                }}
              >
                {summary}
              </p>
            )}
          </div>

          <button type="button" className="btn mt-6" onClick={onBack}>
            Another passage
          </button>
        </Panel>
      )}
    </Page>
  );
}
