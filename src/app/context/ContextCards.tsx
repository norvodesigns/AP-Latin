'use client';

import { useMemo, useState } from 'react';
import { contextCards, CONTEXT_TOPIC_LABELS } from '@/data/context';
import { questions, QUESTION_TYPE_LABELS } from '@/data/questions';
import { useStore } from '@/store/useStore';
import { Page, PageHeader, Card, Badge } from '@/components/ui';

type Tab = 'cards' | 'quiz';

export default function ContextCards() {
  const [tab, setTab] = useState<Tab>('cards');

  return (
    <Page wide>
      <PageHeader
        eyebrow="Skill 2.B · 5–10% of the exam"
        title="Context &amp; Culture"
        lede={
          <>
            Contextual knowledge is directly assessed on the multiple choice and is worth up to two
            points on FRQ 4 and 5 — where you must not only supply it but explain how it bears on the
            prompt.
          </>
        }
        actions={
          <div className="flex gap-1.5">
            {(['cards', 'quiz'] as Tab[]).map((t) => (
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
                {t === 'cards' ? 'Cards' : 'Quiz'}
              </button>
            ))}
          </div>
        }
      />

      {tab === 'cards' ? <Cards /> : <ContextQuiz />}
    </Page>
  );
}

function Cards() {
  return (
    <>
      <nav aria-label="Jump to topic" className="mb-7 flex flex-wrap gap-1.5">
        {contextCards.map((c) => (
          <a
            key={c.id}
            href={`#${c.id}`}
            className="border px-2.5 py-1 text-xs transition-colors hover:bg-[var(--bg-sunk)]"
            style={{ borderColor: 'var(--rule)', color: 'var(--fg-muted)' }}
          >
            {c.title}
          </a>
        ))}
      </nav>

      <div className="flex flex-col gap-5">
        {contextCards.map((c) => (
          <Card key={c.id} as="article">
            <div id={c.id} className="scroll-mt-20" />
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <h2 style={{ fontSize: '1.125rem' }}>{c.title}</h2>
              <Badge tone="muted">{CONTEXT_TOPIC_LABELS[c.topic]}</Badge>
            </div>
            <p
              className="measure-wide text-sm"
              style={{ color: 'var(--fg-muted)', lineHeight: 1.75, fontFamily: 'var(--font-serif)', fontSize: '0.9375rem' }}
            >
              {c.body}
            </p>
            <div className="mt-4 border-t pt-3.5" style={{ borderColor: 'var(--rule)' }}>
              <div className="eyebrow mb-2">Worth knowing cold</div>
              <ul className="flex flex-col gap-1">
                {c.keyFacts.map((f) => (
                  <li key={f} className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                    • {f}
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

function ContextQuiz() {
  const recordQuiz = useStore((s) => s.recordQuiz);
  const markStudied = useStore((s) => s.markStudied);
  const [seed, setSeed] = useState(0);
  const [i, setI] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [right, setRight] = useState(0);

  const pool = useMemo(
    () => questions.filter((q) => q.type === 'context-culture').sort(() => Math.random() - 0.5),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seed],
  );

  const q = pool[i];
  if (!q) {
    return (
      <Card>
        <p className="text-sm" style={{ color: 'var(--fg-muted)', margin: 0 }}>
          No context questions loaded yet. Add some to <code>src/data/questions.ts</code> with type{' '}
          <code>context-culture</code> — see CONTENT.md.
        </p>
      </Card>
    );
  }

  const revealed = chosen !== null;
  const done = i >= pool.length;

  if (done) {
    return (
      <Card>
        <div className="tabular-nums" style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', fontWeight: 600 }}>
          {right} / {pool.length}
        </div>
        <button
          type="button"
          className="btn btn-primary mt-4"
          onClick={() => { setSeed((s) => s + 1); setI(0); setRight(0); setChosen(null); }}
        >
          Go again
        </button>
      </Card>
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between text-sm" style={{ color: 'var(--fg-muted)' }}>
        <span className="tabular-nums">{i + 1} / {pool.length}</span>
        <Badge tone="neutral">{QUESTION_TYPE_LABELS[q.type]}</Badge>
      </div>

      <h2 className="measure mb-4" style={{ fontSize: '1.0625rem', fontWeight: 550, lineHeight: 1.45 }}>
        {q.prompt}
      </h2>

      <ul className="mb-5 flex flex-col gap-2">
        {q.options.map((o, n) => {
          const isAnswer = o.id === q.answerId;
          const isChosen = o.id === chosen;
          let bg = 'var(--bg-raised)';
          let bd = 'var(--rule)';
          if (revealed && isAnswer) { bg = 'var(--correct-bg)'; bd = 'var(--correct)'; }
          else if (revealed && isChosen) { bg = 'var(--incorrect-bg)'; bd = 'var(--incorrect)'; }
          return (
            <li key={o.id}>
              <button
                type="button"
                disabled={revealed}
                onClick={() => {
                  setChosen(o.id);
                  const correct = o.id === q.answerId;
                  if (correct) setRight((r) => r + 1);
                  recordQuiz({
                    questionId: q.id, correct, chosenId: o.id, type: q.type,
                    skillCategory: q.skillCategory, unit: q.unit, passageId: q.passageId,
                  });
                  markStudied();
                }}
                className="flex w-full items-start gap-3 border px-3.5 py-3 text-left text-sm transition-colors"
                style={{ background: bg, borderColor: bd, cursor: revealed ? 'default' : 'pointer' }}
              >
                <span className="kbd mt-px shrink-0" aria-hidden="true">{n + 1}</span>
                <span style={{ lineHeight: 1.55 }}>{o.text}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {revealed && (
        <Card className="animate-in">
          <div className="eyebrow mb-1.5">Why</div>
          <p className="measure text-sm" style={{ color: 'var(--fg-muted)', lineHeight: 1.68, margin: 0 }}>
            {q.explanation}
          </p>
          <button
            type="button"
            className="btn btn-primary mt-4"
            onClick={() => { setI((n) => n + 1); setChosen(null); }}
          >
            {i < pool.length - 1 ? 'Next' : 'See score'}
          </button>
        </Card>
      )}
    </>
  );
}
