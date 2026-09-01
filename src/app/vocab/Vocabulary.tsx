'use client';

import { useEffect, useMemo, useState } from 'react';
import { coreVocabulary } from '@/data/vocabulary';
import { allPassages, getPassage } from '@/data/passages';
import { useStore, dueVocab, newCard } from '@/store/useStore';
import { Page, PageHeader, Card, Badge, Meter, Empty } from '@/components/ui';
import type { VocabEntry, UnitId } from '@/data/types';
import { normalizeWord } from '@/lib/latin';

type Direction = 'la-en' | 'en-la' | 'context';
type Mode = 'idle' | 'review' | 'browse';

const byId = new Map(coreVocabulary.map((e) => [e.id, e]));

/** Quality buttons, mapped to SM-2 grades. */
const GRADES: Array<{ q: number; label: string; hint: string; tone: string }> = [
  { q: 0, label: 'Again', hint: 'no idea', tone: 'var(--incorrect)' },
  { q: 3, label: 'Hard', hint: 'got it, slowly', tone: 'var(--partial)' },
  { q: 4, label: 'Good', hint: 'recalled it', tone: 'var(--verdigris)' },
  { q: 5, label: 'Easy', hint: 'instant', tone: 'var(--correct)' },
];

export default function Vocabulary() {
  const vocab = useStore((s) => s.vocab);
  const reviewVocab = useStore((s) => s.reviewVocab);
  const seedVocab = useStore((s) => s.seedVocab);
  const markStudied = useStore((s) => s.markStudied);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [mode, setMode] = useState<Mode>('idle');
  const [direction, setDirection] = useState<Direction>('la-en');
  const [unit, setUnit] = useState<'all' | UnitId>('all');
  const [passageId, setPassageId] = useState<string>('all');
  const [queue, setQueue] = useState<string[]>([]);
  const [cursor, setCursor] = useState(0);
  const [shown, setShown] = useState(false);
  const [done, setDone] = useState(0);
  const [search, setSearch] = useState('');

  /* ---------------- selection ---------------- */
  const scoped = useMemo(() => {
    let list = coreVocabulary;
    if (unit !== 'all') list = list.filter((e) => e.units.includes(unit));
    if (passageId !== 'all') {
      const p = getPassage(passageId);
      if (p?.cedReading) list = list.filter((e) => e.readings.includes(p.cedReading!));
      else if (p) {
        // Passage has no CED reading tag (supplementary): match words that
        // actually occur in its text.
        const words = new Set(
          p.lines.flatMap((l) => l.latin.split(/[^A-Za-zÀ-ÿĀ-ſ]+/).map(normalizeWord)).filter(Boolean),
        );
        list = list.filter((e) => words.has(normalizeWord(e.headword)));
      }
    }
    return list;
  }, [unit, passageId]);

  const due = useMemo(() => (mounted ? dueVocab(vocab) : []), [vocab, mounted]);
  const dueInScope = useMemo(() => {
    const ids = new Set(scoped.map((e) => e.id));
    return due.filter((c) => ids.has(c.id));
  }, [due, scoped]);

  const untouched = useMemo(() => scoped.filter((e) => !vocab[e.id]), [scoped, vocab]);

  function startReview(newCards: number) {
    const dueIds = dueInScope.map((c) => c.id);
    const freshIds = untouched.slice(0, newCards).map((e) => e.id);
    if (freshIds.length) seedVocab(freshIds);
    const q = [...dueIds, ...freshIds];
    if (q.length === 0) return;
    setQueue(q);
    setCursor(0);
    setShown(false);
    setDone(0);
    setMode('review');
    markStudied();
  }

  function grade(quality: number) {
    const id = queue[cursor];
    if (!id) return;
    reviewVocab(id, quality);
    setDone((d) => d + 1);
    // A lapse sends the card to the back of this session's queue too.
    if (quality < 3) setQueue((qq) => [...qq, id]);
    setCursor((c) => c + 1);
    setShown(false);
  }

  /* Keyboard: space reveals, 1–4 grade. */
  useEffect(() => {
    if (mode !== 'review') return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return;
      if (!shown && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        setShown(true);
      } else if (shown && /^[1-4]$/.test(e.key)) {
        e.preventDefault();
        grade(GRADES[Number(e.key) - 1].q);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, shown, cursor, queue]);

  /* ---------------- review ---------------- */
  if (mode === 'review') {
    const id = queue[cursor];
    const entry = id ? byId.get(id) : undefined;

    if (!entry) {
      return (
        <Page>
          <PageHeader eyebrow="Session complete" title={`${done} card${done === 1 ? '' : 's'} reviewed`} />
          <Card className="mb-5">
            <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
              {dueInScope.length > 0
                ? `${dueInScope.length} still due in this scope.`
                : 'Nothing else is due right now. SM-2 will bring these back on schedule.'}
            </p>
          </Card>
          <div className="flex gap-2">
            <button type="button" className="btn btn-primary" onClick={() => setMode('idle')}>
              Back to vocabulary
            </button>
          </div>
        </Page>
      );
    }

    const card = vocab[entry.id] ?? newCard(entry.id);
    const contextLine = direction === 'context' ? findContextLine(entry) : null;

    return (
      <Page>
        <div className="mb-5 flex items-center justify-between gap-3">
          <span className="text-sm tabular-nums" style={{ color: 'var(--fg-muted)' }}>
            {cursor + 1} of {queue.length}
          </span>
          <button type="button" className="btn btn-ghost text-xs" onClick={() => setMode('idle')}>
            End session
          </button>
        </div>

        <div className="mb-4 h-1 w-full overflow-hidden rounded-full" style={{ background: 'var(--bg-sunk)' }}>
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{ width: `${(cursor / queue.length) * 100}%`, background: 'var(--accent)' }}
          />
        </div>

        <Card className="mb-5 min-h-[16rem] px-5 py-8 text-center sm:px-8">
          {/* Front */}
          {direction === 'la-en' && (
            <div style={{ fontFamily: 'var(--font-latin)', fontSize: '2rem', fontWeight: 600 }}>
              {entry.headword}
            </div>
          )}
          {direction === 'en-la' && (
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.375rem', lineHeight: 1.45 }}>
              {entry.definition}
            </div>
          )}
          {direction === 'context' && (
            <>
              {contextLine ? (
                <>
                  <div className="eyebrow mb-2">{contextLine.citation}</div>
                  <p className="latin mx-auto" style={{ margin: '0 auto' }}>
                    {contextLine.latin}
                  </p>
                  <p className="mt-4 text-sm" style={{ color: 'var(--fg-muted)' }}>
                    Which meaning of{' '}
                    <strong style={{ fontFamily: 'var(--font-latin)', fontSize: '1.05rem' }}>
                      {entry.headword}
                    </strong>{' '}
                    fits this line?
                  </p>
                </>
              ) : (
                <>
                  <div style={{ fontFamily: 'var(--font-latin)', fontSize: '2rem', fontWeight: 600 }}>
                    {entry.headword}
                  </div>
                  <p className="mt-3 text-xs" style={{ color: 'var(--fg-faint)' }}>
                    This word does not occur in the loaded passages, so there is no context line for it.
                  </p>
                </>
              )}
            </>
          )}

          {/* Back */}
          {shown && (
            <div className="animate-in mt-6 border-t pt-5" style={{ borderColor: 'var(--rule)' }}>
              <div style={{ fontFamily: 'var(--font-latin)', fontSize: '1.375rem', fontWeight: 600 }}>
                {entry.lemma}
              </div>
              <div className="mt-0.5 text-xs" style={{ color: 'var(--fg-faint)' }}>{entry.pos}</div>
              <p className="measure mx-auto mt-2.5 text-sm" style={{ color: 'var(--fg-muted)', lineHeight: 1.6 }}>
                {entry.definition}
              </p>
              {entry.readings.length > 0 && (
                <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                  {entry.readings.map((r) => (
                    <Badge key={r} tone="muted">CED {r}</Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>

        {!shown ? (
          <button type="button" className="btn btn-primary w-full" onClick={() => setShown(true)}>
            Reveal
            <span className="kbd ml-1" aria-hidden="true">space</span>
          </button>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {GRADES.map((g, i) => (
                <button
                  key={g.q}
                  type="button"
                  className="btn flex-col gap-0.5 py-2.5"
                  onClick={() => grade(g.q)}
                  style={{ borderColor: g.tone, color: g.tone }}
                >
                  <span className="font-semibold">{g.label}</span>
                  <span className="text-[0.6875rem] opacity-75">{g.hint}</span>
                  <span className="kbd mt-0.5" aria-hidden="true">{i + 1}</span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-center text-xs" style={{ color: 'var(--fg-faint)' }}>
              Interval {card.interval}d · ease {card.ef.toFixed(2)} · {card.reviews} review
              {card.reviews === 1 ? '' : 's'}
              {card.lapses > 0 && ` · ${card.lapses} lapse${card.lapses === 1 ? '' : 's'}`}
            </p>
          </>
        )}
      </Page>
    );
  }

  /* ---------------- browse ---------------- */
  if (mode === 'browse') {
    const needle = normalizeWord(search);
    const list = (needle
      ? scoped.filter(
          (e) => normalizeWord(e.headword).includes(needle) || e.definition.toLowerCase().includes(search.toLowerCase()),
        )
      : scoped
    ).slice(0, 300);

    return (
      <Page wide>
        <PageHeader
          eyebrow="Core list"
          title="Browse vocabulary"
          lede={`${scoped.length} words in scope, from the ${coreVocabulary.length}-word required list in CED Appendix 2.`}
          actions={<button type="button" className="btn" onClick={() => setMode('idle')}>Back</button>}
        />
        <input
          className="input mb-4"
          placeholder="Search Latin or English…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search vocabulary"
        />
        <ul className="flex flex-col divide-y" style={{ borderColor: 'var(--rule)' }}>
          {list.map((e) => {
            const c = vocab[e.id];
            return (
              <li key={e.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2.5">
                <span style={{ fontFamily: 'var(--font-latin)', fontSize: '1.0625rem', fontWeight: 600, minWidth: '11rem' }}>
                  {e.lemma}
                </span>
                <span className="text-xs" style={{ color: 'var(--fg-faint)', minWidth: '4.5rem' }}>{e.pos}</span>
                <span className="flex-1 text-sm" style={{ color: 'var(--fg-muted)', minWidth: '14rem' }}>
                  {e.definition}
                </span>
                {mounted && c && (
                  <Badge tone={c.due <= new Date().toISOString().slice(0, 10) ? 'accent' : 'green'}>
                    {c.due <= new Date().toISOString().slice(0, 10) ? 'due' : `${c.interval}d`}
                  </Badge>
                )}
              </li>
            );
          })}
        </ul>
        {list.length === 0 && (
          <Empty title="No matches" body="Try a different search term, or widen the unit filter." />
        )}
      </Page>
    );
  }

  /* ---------------- idle ---------------- */
  const inRotation = Object.keys(vocab).length;

  return (
    <Page>
      <PageHeader
        eyebrow="Spaced repetition · SM-2"
        title="Vocabulary"
        lede={
          <>
            The full {coreVocabulary.length}-word required list from CED Appendix 2, with the reading
            each word is introduced in. Cards are scheduled by SM-2: get one wrong and it comes back
            tomorrow; get it right repeatedly and the interval stretches.
          </>
        }
        actions={<button type="button" className="btn" onClick={() => setMode('browse')}>Browse list</button>}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Card>
          <div className="eyebrow">Due now</div>
          <div className="mt-1 tabular-nums" style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', fontWeight: 600 }}>
            {mounted ? dueInScope.length : '—'}
          </div>
        </Card>
        <Card>
          <div className="eyebrow">In rotation</div>
          <div className="mt-1 tabular-nums" style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', fontWeight: 600 }}>
            {mounted ? inRotation : '—'}
          </div>
          <div className="mt-2">
            <Meter value={mounted ? inRotation : 0} max={coreVocabulary.length} tone="gilt" />
          </div>
        </Card>
        <Card>
          <div className="eyebrow">Not yet seen</div>
          <div className="mt-1 tabular-nums" style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', fontWeight: 600 }}>
            {mounted ? untouched.length : '—'}
          </div>
        </Card>
      </div>

      <Card className="mb-5">
        <div className="eyebrow mb-2.5">Card type</div>
        <div className="mb-4 flex flex-wrap gap-2">
          {([
            ['la-en', 'Latin → English'],
            ['en-la', 'English → Latin'],
            ['context', 'Which meaning fits this line'],
          ] as Array<[Direction, string]>).map(([d, label]) => (
            <button
              key={d}
              type="button"
              aria-pressed={direction === d}
              onClick={() => setDirection(d)}
              className="btn"
              style={
                direction === d
                  ? { background: 'var(--accent)', borderColor: 'var(--accent)', color: 'var(--accent-fg)' }
                  : undefined
              }
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <span className="mb-1 block text-xs" style={{ color: 'var(--fg-muted)' }}>Unit</span>
            <select className="input" value={unit} onChange={(e) => { setUnit(e.target.value as 'all' | UnitId); setPassageId('all'); }}>
              <option value="all">All units</option>
              {(['1', '2', '3', '4', '5', '6'] as UnitId[]).map((u) => (
                <option key={u} value={u}>Unit {u}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs" style={{ color: 'var(--fg-muted)' }}>Passage-specific</span>
            <select className="input" value={passageId} onChange={(e) => setPassageId(e.target.value)}>
              <option value="all">Whole list</option>
              {allPassages.filter((p) => p.required).map((p) => (
                <option key={p.id} value={p.id}>{p.citation}</option>
              ))}
            </select>
          </label>
        </div>

        <p className="mt-3 text-sm" style={{ color: 'var(--fg-faint)' }}>
          {scoped.length} word{scoped.length === 1 ? '' : 's'} in scope.
        </p>
      </Card>

      {mounted && dueInScope.length === 0 && untouched.length === 0 ? (
        <Empty
          title="Nothing due in this scope"
          body="Every card here is scheduled for a future day. Widen the filter, or come back tomorrow."
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => startReview(0)}
            disabled={!mounted || dueInScope.length === 0}
          >
            Review {mounted ? dueInScope.length : ''} due
          </button>
          {[10, 20].map((n) => (
            <button
              key={n}
              type="button"
              className="btn"
              onClick={() => startReview(n)}
              disabled={!mounted || untouched.length === 0}
            >
              Due + {Math.min(n, untouched.length)} new
            </button>
          ))}
        </div>
      )}
    </Page>
  );
}

/** Find a real line from the loaded passages containing this word. */
function findContextLine(entry: VocabEntry): { latin: string; citation: string } | null {
  const target = normalizeWord(entry.headword);
  if (target.length < 3) return null;
  const stem = target.slice(0, Math.max(3, target.length - 2));
  for (const p of allPassages) {
    for (const line of p.lines) {
      const words = line.latin.split(/[^A-Za-zÀ-ÿĀ-ſ]+/).map(normalizeWord);
      if (words.some((w) => w === target || (w.length > 3 && w.startsWith(stem)))) {
        // Keep prose sections readable by trimming to the sentence with the word.
        if (p.author === 'pliny' && line.latin.length > 240) {
          const sentences = line.latin.split(/(?<=[.?!])\s+/);
          const hit = sentences.find((s) =>
            s.split(/[^A-Za-zÀ-ÿĀ-ſ]+/).map(normalizeWord).some((w) => w === target || (w.length > 3 && w.startsWith(stem))),
          );
          if (hit) return { latin: hit, citation: `${p.citation}.${line.n}` };
        }
        return { latin: line.latin, citation: `${p.citation}${p.author === 'pliny' ? `.${line.n}` : ` (${line.n})`}` };
      }
    }
  }
  return null;
}
