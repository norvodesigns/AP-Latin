'use client';

import Link from 'next/link';
import { useMemo, useState, type CSSProperties } from 'react';
import { deviceCards } from '@/data/devices';
import { getPassage } from '@/data/passages';
import { useStore } from '@/store/useStore';
import { Page, PageHeader, Panel, CalledOut, SourceNote } from '@/components/ui';
import FlashcardDeck from '@/components/FlashcardDeck';
import type { DeviceCard } from '@/data/types';

type Tab = 'reference' | 'study' | 'drill';

interface DrillItem {
  latin: string;
  citation: string;
  passageId?: string;
  answerId: string;
  analysis: string;
  options: string[];
}

export default function Devices() {
  const [tab, setTab] = useState<Tab>('reference');

  return (
    <Page wide>
      <PageHeader
        eyebrow="Skill 2.A · style and its function"
        title="Literary Devices &amp; Style"
        lede={
          <>
            AP rarely asks only for the name of a device — it asks what the device <em>does</em>.
            Each entry gives the definition, the effect, and real examples from the syllabus.
          </>
        }
        actions={
          <div className="flex gap-1.5" role="tablist" aria-label="View">
            {(['reference', 'study', 'drill'] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={tab === t ? 'btn btn-rubric' : 'btn'}
              >
                {t === 'reference' ? 'Reference' : t === 'study' ? 'Study' : 'Spot the device'}
              </button>
            ))}
          </div>
        }
      />

      {tab === 'reference' ? <Reference /> : tab === 'study' ? <Study /> : <SpotTheDevice />}

      <SourceNote to="skills">
        Naming a device earns nothing on its own. Skill category 2 in the Course and Exam
        Description asks you to explain the effect — which is why every example below carries an
        analysis rather than just a label.
      </SourceNote>
    </Page>
  );
}

function Reference() {
  return (
    <>
      <nav aria-label="Jump to device" className="mb-9 flex flex-wrap gap-2">
        {deviceCards.map((d) => (
          <a key={d.id} href={`#${d.id}`} className="chip squish">
            {d.name}
          </a>
        ))}
      </nav>

      <div className="stagger grid gap-x-12 lg:grid-cols-2">
        {deviceCards.map((d) => (
          <article
            key={d.id}
            className="border-t pt-6 pb-8"
            style={{ borderColor: 'var(--rule)' }}
          >
            <div id={d.id} className="scroll-mt-24" />
            <h2 style={{ fontSize: '1.1875rem', lineHeight: 1.25 }}>{d.name}</h2>

            <p
              className="mt-2"
              style={{
                margin: '0.5rem 0 0',
                fontFamily: 'var(--font-latin)',
                fontSize: '1.0625rem',
                lineHeight: 1.6,
              }}
            >
              {d.definition}
            </p>

            <p
              style={{
                margin: '0.75rem 0 0',
                fontFamily: 'var(--font-latin)',
                fontSize: '1rem',
                lineHeight: 1.65,
                color: 'var(--ink2)',
              }}
            >
              <span className="slab-sm" style={{ display: 'inline' }}>
                Effect —{' '}
              </span>
              {d.effect}
            </p>

            <ul
              className="mt-5 flex flex-col gap-5 pl-0"
              style={{ listStyle: 'none' }}
            >
              {d.examples.map((ex, i) => {
                const p = ex.passageId ? getPassage(ex.passageId) : undefined;
                return (
                  <li
                    key={i}
                    className="border-l-2 pl-4"
                    style={{ borderColor: 'var(--redline)' }}
                  >
                    <p className="latin" style={{ margin: 0, fontSize: '1.1875rem', maxWidth: '100%' }}>
                      {ex.latin}
                    </p>
                    {p ? (
                      <Link
                        href={`/read/${p.id}`}
                        className="link-rule mt-1 inline-block"
                        style={{ color: 'var(--accent)', fontSize: '0.9375rem' }}
                      >
                        {ex.citation}
                      </Link>
                    ) : (
                      <span
                        className="mt-1 inline-block"
                        style={{ color: 'var(--fg-faint)', fontSize: '0.9375rem' }}
                      >
                        {ex.citation}
                      </span>
                    )}
                    <p
                      style={{
                        margin: '0.375rem 0 0',
                        fontFamily: 'var(--font-latin)',
                        fontSize: '1rem',
                        lineHeight: 1.6,
                        color: 'var(--ink2)',
                      }}
                    >
                      {ex.analysis}
                    </p>
                  </li>
                );
              })}
            </ul>
          </article>
        ))}
      </div>
    </>
  );
}

function Study() {
  return (
    <FlashcardDeck<DeviceCard>
      items={deviceCards}
      getId={(d) => d.id}
      itemNoun="device"
      renderFront={(d) => (
        <div className="text-center">
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', lineHeight: 1.3 }}>
            {d.name}
          </div>
        </div>
      )}
      renderBack={(d) => {
        const ex = d.examples[0];
        const p = ex?.passageId ? getPassage(ex.passageId) : undefined;
        return (
          <div className="flex flex-col gap-6">
            <p
              className="measure mx-auto text-center"
              style={{
                margin: 0,
                fontFamily: 'var(--font-latin)',
                fontSize: '1.0625rem',
                lineHeight: 1.6,
              }}
            >
              {d.definition}
            </p>
            <p
              className="measure mx-auto text-center"
              style={{
                margin: 0,
                fontFamily: 'var(--font-latin)',
                fontSize: '1rem',
                lineHeight: 1.65,
                color: 'var(--ink2)',
              }}
            >
              <span className="slab-sm" style={{ display: 'inline' }}>
                Effect —{' '}
              </span>
              {d.effect}
            </p>
            {ex && (
              <div className="border-l-2 pl-4" style={{ borderColor: 'var(--redline)' }}>
                <p className="latin" style={{ margin: 0, fontSize: '1.1875rem', maxWidth: '100%' }}>
                  {ex.latin}
                </p>
                {p ? (
                  <Link
                    href={`/read/${p.id}`}
                    className="link-rule mt-1 inline-block"
                    style={{ color: 'var(--accent)', fontSize: '0.9375rem' }}
                  >
                    {ex.citation}
                  </Link>
                ) : (
                  <span className="mt-1 inline-block" style={{ color: 'var(--fg-faint)', fontSize: '0.9375rem' }}>
                    {ex.citation}
                  </span>
                )}
                <p
                  style={{
                    margin: '0.375rem 0 0',
                    fontFamily: 'var(--font-latin)',
                    fontSize: '1rem',
                    lineHeight: 1.6,
                    color: 'var(--ink2)',
                  }}
                >
                  {ex.analysis}
                </p>
              </div>
            )}
          </div>
        );
      }}
    />
  );
}

function SpotTheDevice() {
  const markStudied = useStore((s) => s.markStudied);
  const [seed, setSeed] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [score, setScore] = useState({ right: 0, total: 0 });

  /* Build the item pool once: every example, with its device as the answer. */
  const pool = useMemo<DrillItem[]>(() => {
    const items: DrillItem[] = [];
    for (const d of deviceCards) {
      for (const ex of d.examples) {
        // Skip examples whose analysis says they are NOT the device in question.
        if (/^not /i.test(ex.analysis)) continue;
        const distractors = deviceCards
          .filter((x) => x.id !== d.id)
          .map((x) => x.id)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);
        items.push({
          latin: ex.latin,
          citation: ex.citation,
          passageId: ex.passageId,
          answerId: d.id,
          analysis: ex.analysis,
          options: [d.id, ...distractors].sort(() => Math.random() - 0.5),
        });
      }
    }
    return items.sort(() => Math.random() - 0.5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  const item = pool[score.total % pool.length];
  const revealed = chosen !== null;
  const nameOf = (id: string) => deviceCards.find((d) => d.id === id)?.name ?? id;

  if (!item) return null;

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-3">
        <span className="slab tabular-nums">
          {score.right} of {score.total} correct
        </span>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            setSeed((s) => s + 1);
            setScore({ right: 0, total: 0 });
            setChosen(null);
          }}
        >
          Reshuffle
        </button>
      </div>

      <CalledOut rubric="Which device is at work here?" className="mb-7">
        <p className="latin" style={{ margin: 0, fontSize: '1.5rem', maxWidth: '100%' }}>
          {item.latin}
        </p>
        <div className="mt-2" style={{ color: 'var(--fg-faint)', fontSize: '0.9375rem' }}>
          {item.citation}
        </div>
      </CalledOut>

      <ul className="mb-7 grid gap-2.5 pl-0 sm:grid-cols-2" style={{ listStyle: 'none' }}>
        {item.options.map((optId) => {
          const isAnswer = optId === item.answerId;
          const isChosen = optId === chosen;
          const style: CSSProperties = { borderColor: 'var(--rule-strong)' };
          if (revealed && isAnswer) {
            style.borderColor = 'var(--accent)';
            style.background = 'var(--redtint)';
            style.color = 'var(--accent)';
          } else if (revealed && isChosen) {
            style.opacity = 0.55;
          }
          return (
            <li key={optId}>
              <button
                type="button"
                disabled={revealed}
                onClick={() => {
                  setChosen(optId);
                  setScore((s) => ({
                    right: s.right + (optId === item.answerId ? 1 : 0),
                    total: s.total,
                  }));
                }}
                className="squish row-hover w-full rounded-[var(--r-md)] border px-4 py-3 text-left"
                style={{
                  ...style,
                  fontFamily: 'var(--font-latin)',
                  fontSize: '1.0625rem',
                  cursor: revealed ? 'default' : 'pointer',
                }}
              >
                {nameOf(optId)}
              </button>
            </li>
          );
        })}
      </ul>

      {revealed && (
        <Panel className="animate-in">
          <div className="rubric mb-2.5">
            {chosen === item.answerId ? 'Correct' : `The answer is ${nameOf(item.answerId)}`}
          </div>
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
            {item.analysis}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setScore((s) => ({ ...s, total: s.total + 1 }));
                setChosen(null);
                markStudied();
              }}
            >
              Next
            </button>
            {item.passageId && (
              <Link href={`/read/${item.passageId}`} className="btn">
                Read in context
              </Link>
            )}
            <span className="slab-sm ml-auto">{pool.length} examples in rotation</span>
          </div>
        </Panel>
      )}
    </>
  );
}
