'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import { contextCards, CONTEXT_TOPIC_LABELS } from '@/data/context';
import { questions, QUESTION_TYPE_LABELS } from '@/data/questions';
import { useStore } from '@/store/useStore';
import { Page, PageHeader, Section, Panel, Empty, CedLink, SourceNote } from '@/components/ui';
import FlashcardDeck from '@/components/FlashcardDeck';
import type { ContextCard } from '@/data/types';

type Tab = 'cards' | 'study' | 'quiz';

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
          <div className="flex gap-1.5" role="tablist" aria-label="View">
            {(['cards', 'study', 'quiz'] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={tab === t ? 'btn btn-rubric' : 'btn'}
              >
                {t === 'cards' ? 'Reference' : t === 'study' ? 'Study' : 'Quiz'}
              </button>
            ))}
          </div>
        }
      />

      {tab === 'cards' ? <Cards /> : tab === 'study' ? <Study /> : <ContextQuiz />}

      <SourceNote to="skills">
        Skill category 2 — “Interpret and analyse the cultural, historical, and literary context of
        Latin texts” — is set out in the official Course and Exam Description. Every card below is
        written against it.
      </SourceNote>
    </Page>
  );
}

function Cards() {
  return (
    <>
      <nav aria-label="Jump to topic" className="mb-9 flex flex-wrap gap-2">
        {contextCards.map((c) => (
          <a key={c.id} href={`#${c.id}`} className="chip squish">
            {c.title}
          </a>
        ))}
      </nav>

      <div className="stagger flex flex-col">
        {contextCards.map((c) => (
          <article
            key={c.id}
            className="border-t pt-7 pb-9"
            style={{ borderColor: 'var(--rule)' }}
          >
            <div id={c.id} className="scroll-mt-24" />
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
              <h2 style={{ fontSize: '1.25rem', lineHeight: 1.25 }}>{c.title}</h2>
              <span className="slab-sm">{CONTEXT_TOPIC_LABELS[c.topic]}</span>
            </div>

            <p
              className="measure-wide"
              style={{
                margin: 0,
                fontFamily: 'var(--font-latin)',
                fontSize: '1.0625rem',
                lineHeight: 1.7,
                color: 'var(--ink2)',
              }}
            >
              {c.body}
            </p>

            <div className="mt-6">
              <div className="rubric mb-3">Worth knowing cold</div>
              <ul className="flex flex-col gap-2 pl-0" style={{ listStyle: 'none' }}>
                {c.keyFacts.map((f) => (
                  <li
                    key={f}
                    className="row-hover flex gap-3 rounded-[var(--r-sm)] px-2 py-1.5"
                    style={{ marginLeft: '-0.5rem' }}
                  >
                    <span aria-hidden="true" style={{ color: 'var(--accent)' }}>
                      ·
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--font-latin)',
                        fontSize: '1rem',
                        lineHeight: 1.6,
                        color: 'var(--ink2)',
                      }}
                    >
                      {f}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function Study() {
  return (
    <FlashcardDeck<ContextCard>
      items={contextCards}
      getId={(c) => c.id}
      itemNoun="card"
      renderFront={(c) => (
        <div className="text-center">
          <div className="slab-sm mb-4">{CONTEXT_TOPIC_LABELS[c.topic]}</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', lineHeight: 1.3 }}>
            {c.title}
          </div>
        </div>
      )}
      renderBack={(c) => (
        <div className="flex flex-col gap-6">
          <p
            className="measure-wide mx-auto text-center"
            style={{
              margin: 0,
              fontFamily: 'var(--font-latin)',
              fontSize: '1.0625rem',
              lineHeight: 1.7,
              color: 'var(--ink2)',
            }}
          >
            {c.body}
          </p>
          <div>
            <div className="rubric mb-3">Worth knowing cold</div>
            <ul className="flex flex-col gap-2 pl-0" style={{ listStyle: 'none' }}>
              {c.keyFacts.map((f) => (
                <li
                  key={f}
                  className="flex gap-3"
                  style={{
                    fontFamily: 'var(--font-latin)',
                    fontSize: '1rem',
                    lineHeight: 1.6,
                    color: 'var(--ink2)',
                  }}
                >
                  <span aria-hidden="true" style={{ color: 'var(--accent)' }}>
                    ·
                  </span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    />
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

  const done = i >= pool.length;
  const q = pool[i];

  if (!pool.length) {
    return (
      <Empty
        title="No context questions yet"
        body="Add questions with type context-culture to src/data/questions.ts — the method is written up in CONTENT.md."
        action={<CedLink to="skills">Read the skill this drills</CedLink>}
      />
    );
  }

  if (done) {
    const pct = Math.round((right / pool.length) * 100);
    return (
      <Section title="Result">
        <div className="animate-in">
          <div
            className="tabular-nums"
            style={{ fontFamily: 'var(--font-serif)', fontSize: '3rem', lineHeight: 1 }}
          >
            {right}
            <span style={{ color: 'var(--fg-faint)' }}> / {pool.length}</span>
          </div>
          <p className="mt-2" style={{ color: 'var(--fg-muted)' }}>
            {pct}% on context and culture.
          </p>
          <button
            type="button"
            className="btn btn-primary mt-6"
            onClick={() => {
              setSeed((s) => s + 1);
              setI(0);
              setRight(0);
              setChosen(null);
            }}
          >
            Go again
          </button>
        </div>
      </Section>
    );
  }

  const revealed = chosen !== null;

  return (
    <>
      <div className="mb-5 flex items-center justify-between">
        <span className="slab tabular-nums">
          {i + 1} of {pool.length}
        </span>
        <span className="slab-sm">{QUESTION_TYPE_LABELS[q.type]}</span>
      </div>

      <h2
        className="measure mb-6"
        style={{ fontSize: '1.375rem', lineHeight: 1.35, fontWeight: 550 }}
      >
        {q.prompt}
      </h2>

      <ul className="mb-6 flex flex-col gap-2.5 pl-0" style={{ listStyle: 'none' }}>
        {q.options.map((o, n) => {
          const isAnswer = o.id === q.answerId;
          const isChosen = o.id === chosen;
          const style: CSSProperties = { borderColor: 'var(--rule-strong)' };
          if (revealed && isAnswer) {
            style.borderColor = 'var(--accent)';
            style.background = 'var(--redtint)';
          } else if (revealed && isChosen) {
            style.borderColor = 'var(--rule-strong)';
            style.opacity = 0.6;
          }
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
                    questionId: q.id,
                    correct,
                    chosenId: o.id,
                    type: q.type,
                    skillCategory: q.skillCategory,
                    unit: q.unit,
                    passageId: q.passageId,
                  });
                  markStudied();
                }}
                className="squish row-hover flex w-full items-start gap-3.5 rounded-[var(--r-md)] border px-4 py-3.5 text-left"
                style={{ ...style, cursor: revealed ? 'default' : 'pointer' }}
              >
                <span className="kbd mt-0.5 shrink-0" aria-hidden="true">
                  {n + 1}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-latin)',
                    fontSize: '1.0625rem',
                    lineHeight: 1.55,
                  }}
                >
                  {o.text}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {revealed && (
        <Panel className="animate-in">
          <div className="rubric mb-2.5">Why</div>
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
            {q.explanation}
          </p>
          <button
            type="button"
            className="btn btn-primary mt-5"
            onClick={() => {
              setI((n) => n + 1);
              setChosen(null);
            }}
          >
            {i < pool.length - 1 ? 'Next' : 'See score'}
          </button>
        </Panel>
      )}
    </>
  );
}
