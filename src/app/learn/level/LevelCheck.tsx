'use client';

import { useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import type { PlacementQuestion } from '@/data/curriculum/placement';
import { placementContinues, placementStart, unitBeyond, type PlacementAnswer } from '@/lib/placement';
import { knownVocabUnits } from '@/lib/path';
import { Page, PageHeader } from '@/components/ui';
import { Rich } from '@/components/Rich';

interface UnitInfo {
  id: string;
  level: string;
  n: number;
  title: string;
  firstLesson: string | null;
}

const latin: CSSProperties = { fontFamily: 'var(--font-latin)', fontSize: '1.0625rem' };

/**
 * The level check (the app's LevelCheckView): the grammar placement, easiest
 * first, stopping once it has found the student's level; then two words from
 * each unit of the AP list. Nothing is scored. The result says where the
 * grammar starts and which vocabulary units start with their test
 * (src/lib/path.ts), and the student chooses whether to use it.
 */
export default function LevelCheck({ grammar, vocab, units, vocabUnits }: {
  grammar: PlacementQuestion[];
  vocab: PlacementQuestion[];
  units: UnitInfo[];
  vocabUnits: Array<{ id: string; title: string }>;
}) {
  const router = useRouter();
  const learner = useStore((s) => s.learner);
  const setLearner = useStore((s) => s.setLearner);
  const [stage, setStage] = useState<'intro' | 'grammar' | 'vocab' | 'result'>('intro');
  const [withGrammar, setWithGrammar] = useState(true);
  const [grammarAnswers, setGrammarAnswers] = useState<PlacementAnswer[]>([]);
  const [vocabAnswers, setVocabAnswers] = useState<PlacementAnswer[]>([]);

  const startUnit = withGrammar && grammarAnswers.length
    ? (placementStart(grammarAnswers) ?? unitBeyond(units.map((u) => u.id), grammar.map((q) => q.unit)))
    : null;
  const start = units.find((u) => u.id === startUnit) ?? null;
  const known = knownVocabUnits(vocabAnswers);

  function use() {
    const base = learner ?? { track: 'some' as const, startLessonId: null, onboardedAt: new Date().toISOString() };
    setLearner({
      ...base,
      startLessonId: withGrammar && start ? start.firstLesson : base.startLessonId,
      ...(known.length ? { knownVocabUnits: known } : { knownVocabUnits: undefined }),
    });
    router.push('/learn');
  }

  return (
    <Page>
      <PageHeader
        eyebrow="The course"
        title="Find my level"
        lede="Two short parts. Nothing is scored, and you choose whether to use the result."
      />

      {stage === 'intro' && (
        <div className="measure">
          <p style={latin}>
            <strong>Grammar:</strong> up to {grammar.length} questions, easiest first. It stops as soon as it finds your level, usually well before the end.
          </p>
          <p style={latin}>
            <strong>Vocabulary:</strong> {vocab.length} words, two from each part of the AP list. Where you know both, that part starts with its unit test, so you can skip what you know.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button type="button" className="btn btn-primary" autoFocus onClick={() => { setWithGrammar(true); setStage(grammar.length ? 'grammar' : 'vocab'); }}>Start</button>
            <button type="button" className="btn" onClick={() => { setWithGrammar(false); setStage('vocab'); }}>Just the vocabulary</button>
            <Link href="/learn" className="btn btn-ghost">Back to the course</Link>
          </div>
        </div>
      )}

      {stage === 'grammar' && grammarAnswers.length < grammar.length && (
        <Question
          key={`g${grammarAnswers.length}`}
          label="Grammar"
          q={grammar[grammarAnswers.length]}
          n={grammarAnswers.length + 1}
          total={grammar.length}
          onAnswer={(right) => {
            const next = [...grammarAnswers, { unit: grammar[grammarAnswers.length].unit, right }];
            setGrammarAnswers(next);
            if (!placementContinues(next, grammar.length)) setStage(vocab.length ? 'vocab' : 'result');
          }}
        />
      )}

      {stage === 'vocab' && vocabAnswers.length < vocab.length && (
        <Question
          key={`v${vocabAnswers.length}`}
          label="Vocabulary"
          q={vocab[vocabAnswers.length]}
          n={vocabAnswers.length + 1}
          total={vocab.length}
          onAnswer={(right) => {
            const next = [...vocabAnswers, { unit: vocab[vocabAnswers.length].unit, right }];
            setVocabAnswers(next);
            if (next.length >= vocab.length) setStage('result');
          }}
        />
      )}

      {stage === 'result' && (
        <div className="measure">
          {withGrammar && (
            <section className="mb-8">
              <div className="slab-sm mb-2" style={{ color: 'var(--fg-muted)' }}>Grammar</div>
              <p style={latin}>
                {start ? (
                  <>Start at {start.level}, Unit {start.n}: <em><Rich text={start.title} /></em>. The units before it stay open for review.</>
                ) : (
                  <>You answered everything right: start with the AP texts, and use the grammar for review.</>
                )}
              </p>
            </section>
          )}
          <section className="mb-8">
            <div className="slab-sm mb-2" style={{ color: 'var(--fg-muted)' }}>Vocabulary</div>
            <p style={latin}>{vocabAnswers.filter((a) => a.right).length} of {vocabAnswers.length} words known.</p>
            <ul className="mt-3 pl-0" style={{ listStyle: 'none' }}>
              {vocabUnits.map((u) => (
                <li key={u.id} className="border-t py-2" style={{ ...latin, borderColor: 'var(--rule)', color: known.includes(u.id) ? 'var(--fg)' : 'var(--fg-muted)' }}>
                  {known.includes(u.id) ? '✓ ' : ''}{u.title}: {known.includes(u.id) ? 'start with the unit test' : 'start with the lessons'}
                </li>
              ))}
            </ul>
          </section>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn btn-primary" onClick={use} autoFocus>Use this path</button>
            <Link href="/learn" className="btn">Keep my current path</Link>
          </div>
        </div>
      )}
    </Page>
  );
}

function Question({ label, q, n, total, onAnswer }: {
  label: string;
  q: PlacementQuestion;
  n: number;
  total: number;
  onAnswer: (right: boolean) => void;
}) {
  const [chosen, setChosen] = useState<number | null>(null);
  function pick(i: number) {
    if (chosen !== null) return;
    setChosen(i);
    setTimeout(() => onAnswer(i === q.step.answer), 650);
  }
  return (
    <div className="measure animate-in">
      <div className="mb-4 flex items-center gap-3">
        <span className="slab-sm" style={{ color: 'var(--fg-muted)' }}>{label}</span>
        <div className="meter meter-thin flex-1" role="progressbar" aria-valuenow={n - 1} aria-valuemin={0} aria-valuemax={total} aria-label={`${label} progress`}>
          <span style={{ width: `${((n - 1) / total) * 100}%` }} />
        </div>
        <span className="slab-sm tabular-nums" style={{ color: 'var(--fg-muted)' }}>{n} of {total}</span>
      </div>
      <h2 className="mb-3" style={{ fontSize: '1.25rem', fontWeight: 550 }}><Rich text={q.step.prompt} /></h2>
      {q.step.latin && <p className="latin" style={{ fontSize: '1.5rem', margin: '0 0 1.25rem' }}>{q.step.latin}</p>}
      <div className="flex flex-col gap-2.5">
        {q.step.options.map((o, i) => {
          const style: CSSProperties = { borderColor: 'var(--rule-strong)' };
          if (chosen !== null && i === q.step.answer) { style.borderColor = 'var(--correct)'; style.background = 'var(--correct-bg)'; }
          else if (chosen === i) { style.borderColor = 'var(--accent)'; style.background = 'var(--incorrect-bg)'; }
          return (
            <button key={i} type="button" disabled={chosen !== null} onClick={() => pick(i)}
              className="squish row-hover rounded-[var(--r-md)] border px-4 py-3 text-left" style={{ ...style, ...latin }}>
              <Rich text={o} />
            </button>
          );
        })}
      </div>
      <button type="button" className="slab-sm mt-5" style={{ color: 'var(--fg-muted)' }} disabled={chosen !== null} onClick={() => onAnswer(false)}>
        I don’t know this yet
      </button>
    </div>
  );
}
