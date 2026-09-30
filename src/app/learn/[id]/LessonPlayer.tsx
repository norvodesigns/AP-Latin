'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useStore } from '@/store/useStore';
import {
  isExercise,
  lessonAfter,
  lessonPlace,
  type BuildStep,
  type ChoiceStep,
  type Lesson,
  type LessonStep,
  type MatchStep,
  type ReadStep,
  type TeachStep,
  type TranslateStep,
  type TypeStep,
} from '@/data/curriculum';
import { checkBuild, checkTranslation, checkTyped, lessonScore } from '@/lib/lessonCheck';
import { Page, BackLink, CalledOut, Panel } from '@/components/ui';
import { Rich, plain } from '@/components/Rich';

type Phase = 'intro' | 'steps' | 'done';

/**
 * One lesson, start to finish: what it teaches, then its steps one at a
 * time, then a result. An exercise answered wrong is shown again once at the
 * end, but only the first try counts toward the score.
 */
export default function LessonPlayer({ lessonId }: { lessonId: string }) {
  const place = lessonPlace(lessonId)!;
  const { lesson, unit, level } = place;
  const completeLesson = useStore((s) => s.completeLesson);
  const previous = useStore((s) => s.lessons[lessonId]);

  const [phase, setPhase] = useState<Phase>('intro');
  const [queue, setQueue] = useState<number[]>(() => lesson.steps.map((_, i) => i));
  const [pos, setPos] = useState(0);
  const [firstTry, setFirstTry] = useState<Record<number, boolean>>({});
  const [result, setResult] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const requeued = useRef(new Set<number>());
  const exerciseCount = lesson.steps.filter(isExercise).length;

  const stepIndex = queue[pos];
  const step = lesson.steps[stepIndex];
  const eyebrow = `${level.title} · Unit ${unit.n} · Lesson ${unit.lessons.indexOf(lesson) + 1}`;

  function answered(right: boolean) {
    setResult(right);
    setFirstTry((f) => (f[stepIndex] === undefined ? { ...f, [stepIndex]: right } : f));
    if (!right && !requeued.current.has(stepIndex)) {
      requeued.current.add(stepIndex);
      setQueue((q) => [...q, stepIndex]);
    }
  }

  function advance() {
    setResult(null);
    if (pos + 1 < queue.length) {
      setPos(pos + 1);
      window.scrollTo({ top: 0 });
      return;
    }
    const right = Object.values(firstTry).filter(Boolean).length;
    const s = lessonScore(right, exerciseCount);
    setScore(s);
    completeLesson(lesson.id, s, lesson.words.flatMap((w) => (w.vocabId ? [w.vocabId] : [])));
    setPhase('done');
    window.scrollTo({ top: 0 });
  }

  function restart() {
    setQueue(lesson.steps.map((_, i) => i));
    setPos(0);
    setFirstTry({});
    setResult(null);
    requeued.current = new Set();
    setPhase('steps');
  }

  if (phase === 'intro') {
    return <Intro lesson={lesson} eyebrow={eyebrow} previousBest={previous?.best} onBegin={() => setPhase('steps')} />;
  }
  if (phase === 'done') {
    return <Done lesson={lesson} score={score} exerciseCount={exerciseCount} firstTry={firstTry} onRetry={restart} />;
  }

  const retry = pos >= lesson.steps.length;
  const pct = Math.round((pos / queue.length) * 100);

  return (
    <Page>
      <div className="mb-8 flex items-center gap-4">
        <BackLink href="/learn">Course</BackLink>
        <div className="meter meter-thin flex-1" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Lesson progress">
          <span style={{ width: `${pct}%`, transition: 'width 400ms var(--ease, ease)' }} />
        </div>
        <span className="slab-sm tabular-nums" style={{ color: 'var(--fg-muted)' }}>
          {pos + 1} / {queue.length}
        </span>
      </div>
      {retry && (
        <div className="rubric mb-4">Once more</div>
      )}

      <div key={pos} className="animate-in">
        <StepView step={step} result={result} onAnswer={answered} onContinue={advance} />
      </div>
    </Page>
  );
}

/* ------------------------------------------------------------------ */
/* Intro and result                                                    */
/* ------------------------------------------------------------------ */

function Intro({ lesson, eyebrow, previousBest, onBegin }: { lesson: Lesson; eyebrow: string; previousBest?: number; onBegin: () => void }) {
  return (
    <Page>
      <div className="mb-8">
        <BackLink href="/learn">Course</BackLink>
      </div>
      <div className="rubric mb-3">{eyebrow}</div>
      <h1 style={{ fontSize: 'clamp(1.75rem, 1.3rem + 2vw, 2.5rem)', lineHeight: 1.1 }}>
        <Rich text={lesson.title} />
      </h1>
      <p className="measure mt-3" style={{ fontFamily: 'var(--font-latin)', fontSize: '1.1875rem', lineHeight: 1.5, color: 'var(--ink2)' }}>
        <Rich text={lesson.summary} />
      </p>

      <div className="mt-9 grid gap-10 sm:grid-cols-2">
        <section>
          <h2 className="slab mb-3">You will be able to</h2>
          <ul className="flex flex-col gap-2 pl-0" style={{ listStyle: 'none' }}>
            {lesson.objectives.map((o) => (
              <li key={o} className="flex gap-3" style={{ fontFamily: 'var(--font-latin)', fontSize: '1.0625rem', lineHeight: 1.5 }}>
                <span aria-hidden="true" style={{ color: 'var(--accent)' }}>·</span>
                <span><Rich text={o} /></span>
              </li>
            ))}
          </ul>
        </section>
        {lesson.words.length > 0 && (
          <section>
            <h2 className="slab mb-3">New words</h2>
            <ul className="flex flex-col pl-0" style={{ listStyle: 'none' }}>
              {lesson.words.map((w) => (
                <li key={w.latin} className="border-t py-2" style={{ borderColor: 'var(--rule)' }}>
                  <span className="latin" style={{ fontStyle: 'italic' }}>{w.latin}</span>{' '}
                  <span style={{ color: 'var(--ink2)' }}>{w.english}</span>
                  {w.derivatives && (
                    <span className="block" style={{ fontSize: '0.875rem', color: 'var(--fg-muted)' }}>
                      English: {w.derivatives.join(', ')}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-5">
        <button type="button" className="btn btn-primary" onClick={onBegin} autoFocus>
          {previousBest !== undefined ? 'Do it again' : 'Begin'} · {lesson.minutes} min
        </button>
        {previousBest !== undefined && (
          <span className="slab-sm" style={{ color: 'var(--correct)' }}>
            Finished · best {Math.round(previousBest * 100)}%
          </span>
        )}
      </div>
    </Page>
  );
}

function Done({
  lesson,
  score,
  exerciseCount,
  firstTry,
  onRetry,
}: {
  lesson: Lesson;
  score: number;
  exerciseCount: number;
  firstTry: Record<number, boolean>;
  onRetry: () => void;
}) {
  const next = lessonAfter(lesson.id);
  const right = Object.values(firstTry).filter(Boolean).length;
  const deckWords = lesson.words.filter((w) => w.vocabId);
  const verdict = score >= 0.9 ? 'Optimē!' : score >= 0.7 ? 'Bene!' : 'Satis.';
  const gloss = score >= 0.9 ? 'Excellent.' : score >= 0.7 ? 'Well done.' : 'Enough for now; it is worth another go.';
  return (
    <Page>
      <div className="mb-8">
        <BackLink href="/learn">Course</BackLink>
      </div>
      <div className="rubric mb-3">Lesson complete</div>
      <h1 style={{ fontSize: 'clamp(2rem, 1.5rem + 2.5vw, 3rem)', lineHeight: 1.05 }}>
        <span className="latin" style={{ fontSize: 'inherit', color: 'var(--accent)' }}>{verdict}</span>{' '}
        <span style={{ color: 'var(--fg-muted)', fontSize: '0.55em' }}>{gloss}</span>
      </h1>
      <div className="mt-7 flex flex-wrap gap-10">
        <Figure value={`${Math.round(score * 100)}%`} caption="score" />
        <Figure value={`${right} / ${exerciseCount}`} caption="right first time" />
        {deckWords.length > 0 && <Figure value={String(deckWords.length)} caption={deckWords.length === 1 ? 'word to your deck' : 'words to your deck'} />}
      </div>

      {deckWords.length > 0 && (
        <p className="measure mt-7" style={{ fontFamily: 'var(--font-latin)', fontSize: '1.0625rem', color: 'var(--ink2)' }}>
          {deckWords.map((w) => w.latin.split(',')[0].replace(/\s*\(.*\)/, '')).join(', ')}{' '}
          {deckWords.length === 1 ? 'is' : 'are'} now in your flashcards, due today. Reviewing them tomorrow is what makes them stick.
        </p>
      )}

      <div className="mt-9 flex flex-wrap items-center gap-4">
        {next ? (
          <Link href={`/learn/${next.lesson.id}`} className="btn btn-primary" autoFocus>
            Next: {plain(next.lesson.title)} →
          </Link>
        ) : (
          <Link href="/learn" className="btn btn-primary">Back to the course</Link>
        )}
        {deckWords.length > 0 && (
          <Link href="/vocab" className="btn">Review the words</Link>
        )}
        <button type="button" className="btn btn-ghost" onClick={onRetry}>
          Do it again
        </button>
      </div>
    </Page>
  );
}

function Figure({ value, caption }: { value: string; caption: string }) {
  return (
    <div>
      <div className="numeral" style={{ fontSize: '2.25rem', lineHeight: 1 }}>{value}</div>
      <div className="slab-sm mt-1.5" style={{ color: 'var(--fg-muted)' }}>{caption}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Steps                                                               */
/* ------------------------------------------------------------------ */

interface StepProps<S> {
  step: S;
  result: boolean | null;
  onAnswer: (right: boolean) => void;
  onContinue: () => void;
}

function StepView({ step, ...rest }: StepProps<LessonStep>) {
  switch (step.kind) {
    case 'teach':
      return <TeachView step={step} {...rest} />;
    case 'read':
      return <ReadView step={step} {...rest} />;
    case 'choice':
      return <ChoiceView step={step} {...rest} />;
    case 'type':
      return <TypeView step={step} {...rest} />;
    case 'translate':
      return <TranslateView step={step} {...rest} />;
    case 'build':
      return <BuildView step={step} {...rest} />;
    case 'match':
      return <MatchView step={step} {...rest} />;
  }
}

const prose: CSSProperties = { fontFamily: 'var(--font-latin)', fontSize: '1.125rem', lineHeight: 1.65, color: 'var(--ink2)' };
const promptStyle: CSSProperties = { fontSize: '1.375rem', fontWeight: 550, lineHeight: 1.35 };

function ContinueButton({ onContinue, label = 'Continue' }: { onContinue: () => void; label?: string }) {
  return (
    <button type="button" className="btn btn-primary" onClick={onContinue} autoFocus>
      {label}
      <span className="kbd ml-2" aria-hidden="true">↵</span>
    </button>
  );
}

function TeachView({ step, onContinue }: StepProps<TeachStep>) {
  return (
    <div>
      <h2 className="mb-5" style={{ fontSize: '1.75rem', lineHeight: 1.2 }}>
        <Rich text={step.title} />
      </h2>
      <div className="measure flex flex-col gap-4" style={prose}>
        {step.body.map((p, i) => (
          <p key={i} style={{ margin: 0 }}><Rich text={p} /></p>
        ))}
      </div>

      {step.table && (
        <div className="my-7 overflow-x-auto">
          <table className="chart">
            {step.table.caption && <caption>{step.table.caption}</caption>}
            <thead>
              <tr>
                <th aria-hidden="true" />
                {step.table.cols.map((c) => <th key={c} scope="col">{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {step.table.rows.map((r) => (
                <tr key={r.label}>
                  <th scope="row">{r.label}</th>
                  {r.cells.map((c, i) => (
                    <td key={i} className="latin"><Rich text={c} endings /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {step.examples && step.examples.length > 0 && (
        <ul className="my-7 flex flex-col gap-4 pl-0" style={{ listStyle: 'none' }}>
          {step.examples.map((e) => (
            <li key={e.la} className="border-l-2 pl-4" style={{ borderColor: 'var(--redborder, var(--accent))' }}>
              <div className="latin" style={{ fontSize: '1.3125rem' }}><Rich text={e.la} endings /></div>
              <div style={{ ...prose, fontSize: '1.0625rem' }}>{e.en}</div>
              {e.note && <div style={{ fontSize: '0.9375rem', color: 'var(--fg-muted)' }}><Rich text={e.note} /></div>}
            </li>
          ))}
        </ul>
      )}

      {step.tip && (
        <CalledOut rubric="Note" className="my-7">
          <p style={{ ...prose, margin: 0 }}><Rich text={step.tip} /></p>
        </CalledOut>
      )}

      <div className="mt-8"><ContinueButton onContinue={onContinue} /></div>
    </div>
  );
}

function ReadView({ step, onContinue }: StepProps<ReadStep>) {
  const [shown, setShown] = useState<Set<number>>(new Set());
  const all = shown.size === step.lines.length;
  return (
    <div>
      <div className="rubric mb-2">Reading</div>
      <h2 className="mb-3" style={{ fontSize: '1.75rem', lineHeight: 1.2 }}>
        <span className="latin" style={{ fontSize: 'inherit' }}>{step.title}</span>
      </h2>
      {step.intro && <p className="measure mb-6" style={prose}><Rich text={step.intro} /></p>}
      <ol className="flex flex-col gap-3.5 pl-0" style={{ listStyle: 'none' }}>
        {step.lines.map((l, i) => (
          <li key={i}>
            <button
              type="button"
              className="w-full text-left"
              onClick={() => setShown((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; })}
              aria-expanded={shown.has(i)}
            >
              <span className="latin block" style={{ fontSize: '1.3125rem', lineHeight: 1.5 }}>{l.la}</span>
              {shown.has(i) ? (
                <span className="block animate-in" style={{ ...prose, fontSize: '1rem' }}>{l.en}</span>
              ) : (
                <span className="slab-sm" style={{ color: 'var(--fg-faint)' }}>tap for the translation</span>
              )}
            </button>
          </li>
        ))}
      </ol>
      {step.gloss && step.gloss.length > 0 && (
        <ul className="mt-6 flex flex-col gap-1 border-t pt-4 pl-0" style={{ borderColor: 'var(--rule)', listStyle: 'none' }}>
          {step.gloss.map((g) => (
            <li key={g.word} style={{ fontFamily: 'var(--font-latin)', fontSize: '1rem', color: 'var(--ink2)' }}>
              <em>{g.word}</em> · {g.meaning}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-8 flex flex-wrap gap-4">
        <ContinueButton onContinue={onContinue} />
        <button type="button" className="btn btn-ghost" onClick={() => setShown(all ? new Set() : new Set(step.lines.map((_, i) => i)))}>
          {all ? 'Hide translations' : 'Show all translations'}
        </button>
      </div>
    </div>
  );
}

/** What every exercise shows once answered: right or not, why, and Continue. */
function Feedback({ right, correct, explain, onContinue }: { right: boolean; correct?: ReactNode; explain?: string; onContinue: () => void }) {
  return (
    <Panel className="animate-in mt-7">
      <div className="rubric mb-2.5" style={{ color: right ? 'var(--correct)' : 'var(--accent)' }}>
        {right ? 'Rēctē — right' : 'Not quite'}
      </div>
      {!right && correct && (
        <p style={{ ...prose, margin: '0 0 0.5rem' }}>
          <span className="slab-sm mr-2" style={{ color: 'var(--fg-muted)' }}>Answer</span>
          {correct}
        </p>
      )}
      {explain && <p className="measure" style={{ ...prose, margin: 0 }}><Rich text={explain} /></p>}
      {!right && <p className="slab-sm mt-3" style={{ color: 'var(--fg-muted)' }}>This one comes back at the end.</p>}
      <div className="mt-5"><ContinueButton onContinue={onContinue} /></div>
    </Panel>
  );
}

function LatinStimulus({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <p className="latin mb-6" style={{ fontSize: '1.625rem', lineHeight: 1.35, margin: '0 0 1.5rem' }}>
      <Rich text={text} endings />
    </p>
  );
}

function ChoiceView({ step, result, onAnswer, onContinue }: StepProps<ChoiceStep>) {
  const [chosen, setChosen] = useState<number | null>(null);
  const revealed = result !== null;

  useEffect(() => {
    if (revealed) return;
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= step.options.length && !(e.target instanceof HTMLInputElement)) choose(n - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function choose(i: number) {
    if (revealed) return;
    setChosen(i);
    onAnswer(i === step.answer);
  }

  return (
    <div>
      <h2 className="measure mb-5" style={promptStyle}><Rich text={step.prompt} /></h2>
      <LatinStimulus text={step.latin} />
      <ul className="flex flex-col gap-2.5 pl-0" style={{ listStyle: 'none' }}>
        {step.options.map((o, i) => {
          const style: CSSProperties = { borderColor: 'var(--rule-strong)' };
          if (revealed && i === step.answer) {
            style.borderColor = 'var(--correct)';
            style.background = 'var(--correct-bg)';
          } else if (revealed && i === chosen) {
            style.borderColor = 'var(--accent)';
            style.background = 'var(--incorrect-bg)';
          } else if (revealed) {
            style.opacity = 0.5;
          }
          return (
            <li key={i}>
              <button
                type="button"
                disabled={revealed}
                onClick={() => choose(i)}
                className="squish row-hover flex w-full items-start gap-3.5 rounded-[var(--r-md)] border px-4 py-3.5 text-left"
                style={{ ...style, cursor: revealed ? 'default' : 'pointer' }}
              >
                <span className="kbd mt-0.5 shrink-0" aria-hidden="true">{i + 1}</span>
                <span style={{ fontFamily: 'var(--font-latin)', fontSize: '1.125rem', lineHeight: 1.5 }}>
                  <Rich text={o} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {revealed && (
        <Feedback right={result} explain={step.explain} onContinue={onContinue} />
      )}
    </div>
  );
}

function TypeView({ step, result, onAnswer, onContinue }: StepProps<TypeStep>) {
  const [value, setValue] = useState('');
  const [hint, setHint] = useState(false);
  const revealed = result !== null;
  return (
    <div>
      <h2 className="measure mb-5" style={promptStyle}><Rich text={step.prompt} /></h2>
      <LatinStimulus text={step.latin} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!revealed && value.trim()) onAnswer(checkTyped(value, step.answers));
        }}
        className="flex flex-wrap items-center gap-3"
      >
        <input
          className="input latin"
          style={{ fontSize: '1.375rem', maxWidth: '22rem', flex: '1 1 14rem' }}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={revealed}
          autoFocus
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Your answer"
          placeholder="Type here"
        />
        {!revealed && (
          <button type="submit" className="btn btn-primary" disabled={!value.trim()}>Check</button>
        )}
        {!revealed && step.hint && !hint && (
          <button type="button" className="btn btn-ghost" onClick={() => setHint(true)}>Hint</button>
        )}
      </form>
      <p className="slab-sm mt-2.5" style={{ color: 'var(--fg-faint)' }}>Macrons are optional when you type.</p>
      {hint && step.hint && !revealed && (
        <p className="animate-in mt-3" style={prose}><Rich text={step.hint} /></p>
      )}
      {revealed && (
        <Feedback right={result} correct={<span className="latin">{step.answers[0]}</span>} explain={step.explain} onContinue={onContinue} />
      )}
    </div>
  );
}

function TranslateView({ step, result, onAnswer, onContinue }: StepProps<TranslateStep>) {
  const [value, setValue] = useState('');
  const [judging, setJudging] = useState(false);
  const revealed = result !== null;

  function check() {
    if (!value.trim()) return;
    if (checkTranslation(value, step.answers)) onAnswer(true);
    else setJudging(true);
  }

  return (
    <div>
      <h2 className="mb-5" style={promptStyle}>Translate into English</h2>
      <LatinStimulus text={step.latin} />
      <textarea
        className="textarea"
        style={{ fontFamily: 'var(--font-latin)', fontSize: '1.1875rem', width: '100%', maxWidth: '40rem', minHeight: '5.5rem' }}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!revealed && !judging) check();
          }
        }}
        disabled={revealed || judging}
        autoFocus
        aria-label="Your translation"
        placeholder="Your translation"
      />
      {!revealed && !judging && (
        <div className="mt-3 flex flex-wrap gap-3">
          <button type="button" className="btn btn-primary" onClick={check} disabled={!value.trim()}>Check</button>
          <button type="button" className="btn btn-ghost" onClick={() => onAnswer(false)}>I don’t know</button>
        </div>
      )}
      {judging && !revealed && (
        <Panel className="animate-in mt-6">
          <div className="rubric mb-2.5">Compare</div>
          <p style={{ ...prose, margin: 0 }}>
            <span className="slab-sm mr-2" style={{ color: 'var(--fg-muted)' }}>Model</span>
            {step.answers[0]}
          </p>
          <p className="mt-2" style={{ ...prose, fontSize: '1rem', color: 'var(--fg-muted)' }}>
            English has many right answers. Does yours say the same thing?
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" className="btn btn-primary" onClick={() => onAnswer(true)} autoFocus>Mine means the same</button>
            <button type="button" className="btn" onClick={() => onAnswer(false)}>I had it wrong</button>
          </div>
        </Panel>
      )}
      {revealed && (
        <Feedback right={result} correct={step.answers[0]} explain={step.explain} onContinue={onContinue} />
      )}
    </div>
  );
}

/** Shuffles once per mount, which is once per time the step is shown. */
function useShuffled<T>(items: T[]): T[] {
  return useMemo(() => {
    const a = [...items];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

function BuildView({ step, result, onAnswer, onContinue }: StepProps<BuildStep>) {
  const tiles = useShuffled([...step.answer, ...step.extra].map((text, id) => ({ id, text })));
  const [placed, setPlaced] = useState<number[]>([]);
  const revealed = result !== null;
  const byId = (id: number) => tiles.find((t) => t.id === id)!;
  const tileClass = 'squish rounded-[var(--r-md)] border px-3.5 py-2';
  const tileStyle: CSSProperties = {
    borderColor: 'var(--rule-strong)',
    fontFamily: 'var(--font-latin)',
    fontSize: '1.1875rem',
    fontStyle: step.lang === 'la' ? 'italic' : 'normal',
  };

  return (
    <div>
      <h2 className="measure mb-5" style={promptStyle}><Rich text={step.prompt} /></h2>
      <p className={step.lang === 'la' ? 'mb-6' : 'latin mb-6'} style={{ fontFamily: 'var(--font-latin)', fontSize: '1.5rem', lineHeight: 1.35 }}>
        {step.source}
      </p>

      <div
        className="mb-5 flex min-h-[3.5rem] flex-wrap items-center gap-2 border-b pb-3"
        style={{ borderColor: 'var(--rule-strong)' }}
        aria-label="Your sentence"
      >
        {placed.length === 0 && <span className="slab-sm" style={{ color: 'var(--fg-faint)' }}>Tap the words in order</span>}
        {placed.map((id) => (
          <button key={id} type="button" className={tileClass} style={{ ...tileStyle, background: 'var(--bg-elev, transparent)' }} disabled={revealed}
            onClick={() => setPlaced((p) => p.filter((x) => x !== id))}>
            {byId(id).text}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2" aria-label="Words">
        {tiles.map((t) => {
          const used = placed.includes(t.id);
          return (
            <button key={t.id} type="button" className={tileClass} disabled={used || revealed}
              style={{ ...tileStyle, opacity: used ? 0.25 : 1 }}
              onClick={() => setPlaced((p) => [...p, t.id])}>
              {t.text}
            </button>
          );
        })}
      </div>

      {!revealed && (
        <div className="mt-6 flex gap-3">
          <button type="button" className="btn btn-primary" disabled={placed.length === 0}
            onClick={() => onAnswer(checkBuild(placed.map((id) => byId(id).text), step))}>
            Check
          </button>
          {placed.length > 0 && <button type="button" className="btn btn-ghost" onClick={() => setPlaced([])}>Clear</button>}
        </div>
      )}
      {revealed && (
        <Feedback
          right={result}
          correct={<span className={step.lang === 'la' ? 'latin' : undefined}>{step.answer.join(' ')}</span>}
          explain={step.explain ?? (step.anyOrder && result ? 'Any order of these words is good Latin.' : undefined)}
          onContinue={onContinue}
        />
      )}
    </div>
  );
}

function MatchView({ step, result, onAnswer, onContinue }: StepProps<MatchStep>) {
  const rights = useShuffled(step.pairs.map((p, i) => ({ i, text: p[1] })));
  const [selected, setSelected] = useState<{ side: 'l' | 'r'; i: number } | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [wrong, setWrong] = useState<{ l: number; r: number } | null>(null);
  const mistakes = useRef(false);
  const revealed = result !== null;

  function tap(side: 'l' | 'r', i: number) {
    if (revealed || matched.has(i)) return;
    if (!selected || selected.side === side) {
      setSelected({ side, i });
      return;
    }
    const l = side === 'l' ? i : selected.i;
    const r = side === 'r' ? i : selected.i;
    setSelected(null);
    if (l === r) {
      const next = new Set(matched).add(l);
      setMatched(next);
      if (next.size === step.pairs.length) onAnswer(!mistakes.current);
    } else {
      mistakes.current = true;
      setWrong({ l, r });
      window.setTimeout(() => setWrong(null), 600);
    }
  }

  const cell = (side: 'l' | 'r', i: number, text: string) => {
    const isMatched = matched.has(i);
    const isSelected = selected?.side === side && selected.i === i;
    const isWrong = wrong && (side === 'l' ? wrong.l === i : wrong.r === i);
    const style: CSSProperties = {
      borderColor: isMatched ? 'var(--correct)' : isWrong ? 'var(--accent)' : isSelected ? 'var(--fg)' : 'var(--rule-strong)',
      background: isMatched ? 'var(--correct-bg)' : isWrong ? 'var(--incorrect-bg)' : 'transparent',
      opacity: isMatched ? 0.6 : 1,
      fontFamily: 'var(--font-latin)',
      fontSize: '1.125rem',
      fontStyle: side === 'l' ? 'italic' : 'normal',
    };
    return (
      <button key={`${side}${i}`} type="button" disabled={isMatched || revealed} onClick={() => tap(side, i)}
        className="squish w-full rounded-[var(--r-md)] border px-4 py-3 text-left" style={style} aria-pressed={isSelected}>
        {text}
      </button>
    );
  };

  return (
    <div>
      <h2 className="measure mb-6" style={promptStyle}><Rich text={step.prompt} /></h2>
      <div className="grid grid-cols-2 gap-3 sm:gap-5" style={{ maxWidth: '40rem' }}>
        <div className="flex flex-col gap-2.5">{step.pairs.map((p, i) => cell('l', i, p[0]))}</div>
        <div className="flex flex-col gap-2.5">{rights.map((r) => cell('r', r.i, r.text))}</div>
      </div>
      {revealed && <Feedback right={result} explain={result ? undefined : 'All matched in the end — the pairs you missed are worth a second look.'} onContinue={onContinue} />}
    </div>
  );
}
