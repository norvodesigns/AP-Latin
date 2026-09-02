'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { deviceCards } from '@/data/devices';
import { getPassage } from '@/data/passages';
import { useStore } from '@/store/useStore';
import { Page, PageHeader, Card, Badge } from '@/components/ui';

type Tab = 'reference' | 'drill';

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
            Each card gives the definition, the effect, and real examples from the syllabus.
          </>
        }
        actions={
          <div className="flex gap-1.5">
            {(['reference', 'drill'] as Tab[]).map((t) => (
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
                {t === 'reference' ? 'Reference' : 'Spot the device'}
              </button>
            ))}
          </div>
        }
      />

      {tab === 'reference' ? <Reference /> : <SpotTheDevice />}
    </Page>
  );
}

function Reference() {
  return (
    <>
      <nav aria-label="Jump to device" className="mb-7 flex flex-wrap gap-1.5">
        {deviceCards.map((d) => (
          <a
            key={d.id}
            href={`#${d.id}`}
            className="border px-2.5 py-1 text-xs transition-colors hover:bg-[var(--bg-sunk)]"
            style={{ borderColor: 'var(--rule)', color: 'var(--fg-muted)' }}
          >
            {d.name}
          </a>
        ))}
      </nav>

      <div className="grid gap-4 lg:grid-cols-2">
        {deviceCards.map((d) => (
          <Card key={d.id} as="article">
            <div id={d.id} className="scroll-mt-20" />
            <h2 style={{ fontSize: '1.0625rem' }}>{d.name}</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--fg)', lineHeight: 1.6 }}>
              {d.definition}
            </p>
            <p className="mt-2 text-sm" style={{ color: 'var(--fg-muted)', lineHeight: 1.65 }}>
              <span className="eyebrow" style={{ display: 'inline' }}>Effect — </span>
              {d.effect}
            </p>

            <ul className="mt-3.5 flex flex-col gap-3 border-t pt-3.5" style={{ borderColor: 'var(--rule)' }}>
              {d.examples.map((ex, i) => {
                const p = ex.passageId ? getPassage(ex.passageId) : undefined;
                return (
                  <li key={i}>
                    <p className="latin" style={{ margin: 0, fontSize: '1.125rem', maxWidth: '100%' }}>
                      {ex.latin}
                    </p>
                    {p ? (
                      <Link href={`/read/${p.id}`} className="text-xs hover:underline" style={{ color: 'var(--accent)' }}>
                        {ex.citation}
                      </Link>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--fg-faint)' }}>{ex.citation}</span>
                    )}
                    <p className="mt-1 text-sm" style={{ color: 'var(--fg-muted)', lineHeight: 1.6 }}>
                      {ex.analysis}
                    </p>
                  </li>
                );
              })}
            </ul>
          </Card>
        ))}
      </div>
    </>
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
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="text-sm tabular-nums" style={{ color: 'var(--fg-muted)' }}>
          {score.right} / {score.total} correct
        </span>
        <button
          type="button"
          className="btn btn-ghost text-xs"
          onClick={() => {
            setSeed((s) => s + 1);
            setScore({ right: 0, total: 0 });
            setChosen(null);
          }}
        >
          Reshuffle
        </button>
      </div>

      <Card className="mb-5">
        <div className="eyebrow mb-2">Which device is at work here?</div>
        <p className="latin" style={{ fontSize: '1.375rem', maxWidth: '100%' }}>
          {item.latin}
        </p>
        <div className="mt-1 text-xs" style={{ color: 'var(--fg-faint)' }}>{item.citation}</div>
      </Card>

      <ul className="mb-5 grid gap-2 sm:grid-cols-2">
        {item.options.map((optId) => {
          const isAnswer = optId === item.answerId;
          const isChosen = optId === chosen;
          let bg = 'var(--bg-raised)';
          let bd = 'var(--rule)';
          if (revealed && isAnswer) { bg = 'var(--correct-bg)'; bd = 'var(--correct)'; }
          else if (revealed && isChosen) { bg = 'var(--incorrect-bg)'; bd = 'var(--incorrect)'; }
          return (
            <li key={optId}>
              <button
                type="button"
                disabled={revealed}
                onClick={() => {
                  setChosen(optId);
                  setScore((s) => ({ right: s.right + (optId === item.answerId ? 1 : 0), total: s.total }));
                }}
                className="w-full border px-3.5 py-2.5 text-left text-sm transition-colors"
                style={{ background: bg, borderColor: bd, cursor: revealed ? 'default' : 'pointer' }}
              >
                {nameOf(optId)}
              </button>
            </li>
          );
        })}
      </ul>

      {revealed && (
        <Card className="animate-in">
          <div className="eyebrow mb-1.5">
            {chosen === item.answerId ? 'Correct' : `The answer is ${nameOf(item.answerId)}`}
          </div>
          <p className="measure text-sm" style={{ color: 'var(--fg-muted)', lineHeight: 1.68, margin: 0 }}>
            {item.analysis}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
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
            <Badge tone="muted">{pool.length} examples in rotation</Badge>
          </div>
        </Card>
      )}
    </>
  );
}
