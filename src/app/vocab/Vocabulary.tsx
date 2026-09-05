'use client';

import { useEffect, useMemo, useState } from 'react';
import { coreVocabulary } from '@/data/vocabulary';
import { allPassages, getPassage, passageVocabIds } from '@/data/passages';
import { useStore, dueVocab, newCard, sm2 } from '@/store/useStore';
import { Page, PageHeader, Empty, Roman, CedLink, SourceNote } from '@/components/ui';
import type { VocabEntry, UnitId } from '@/data/types';
import { normalizeWord } from '@/lib/latin';

type Direction = 'la-en' | 'en-la' | 'context';
type Mode = 'idle' | 'review' | 'browse';

const byId = new Map(coreVocabulary.map((e) => [e.id, e]));

/**
 * Two responses, not SM-2's four. A first-time visitor does not have an
 * opinion about "Hard" versus "Good" the instant they see a word — the
 * distinction between "I recalled it" and "I recalled it slowly" is a
 * judgment call most people are not prepared to make on the spot, and the
 * old four-button grid asked for it before the student had any idea what
 * the buttons were even for.
 *
 * The only thing that matters at review time is whether the word was
 * recalled at all. That is a yes/no question, so it gets a yes/no answer:
 * "Practice again" is SM-2 quality 0 — the same restart-the-interval lapse
 * the old "Again" button sent. "Got it" is quality 4 ("Good") — the middle
 * of the three passing grades, and, per the old comment this replaces, the
 * answer most students give most of the time anyway. SM-2 itself still
 * decides the actual interval from the card's history; nothing about the
 * algorithm changed, only the question asked to drive it.
 */
const RESPONSES: Array<{
  quality: number;
  label: string;
  variant: 'again' | 'know';
}> = [
  { quality: 0, label: 'Practice again', variant: 'again' },
  { quality: 4, label: 'Got it', variant: 'know' },
];

/** Days → the short human label under each grade button. */
function intervalLabel(days: number): string {
  if (days <= 0) return 'today';
  if (days === 1) return '1 day';
  if (days < 30) return `${days} days`;
  const months = Math.round(days / 30);
  return months === 1 ? '1 month' : `${months} months`;
}

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
  /** How many new (never-seen) cards a session introduces. 'all' is a real
   *  option, not just the other three padded out — see the entry-point
   *  controls below for why 20 opens as the default instead. */
  const [newBatch, setNewBatch] = useState<10 | 20 | 50 | 'all'>(20);

  /* ---------------- selection ---------------- */
  const scoped = useMemo(() => {
    let list = coreVocabulary;
    if (unit !== 'all') list = list.filter((e) => e.units.includes(unit));
    if (passageId !== 'all') {
      const p = getPassage(passageId);
      if (p) {
        const ids = new Set(passageVocabIds(p));
        list = list.filter((e) => ids.has(e.id));
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
      } else if (shown && /^[1-2]$/.test(e.key)) {
        e.preventDefault();
        grade(RESPONSES[Number(e.key) - 1].quality);
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
          <PageHeader
            eyebrow="Session complete"
            title={`${done} card${done === 1 ? '' : 's'} reviewed`}
            lede={
              dueInScope.length > 0
                ? `${dueInScope.length} still due in this scope.`
                : 'Nothing else is due right now. SM-2 will bring these back on schedule.'
            }
          />
          <button type="button" className="btn btn-primary" onClick={() => setMode('idle')}>
            Back to vocabulary
          </button>
        </Page>
      );
    }

    const card = vocab[entry.id] ?? newCard(entry.id);
    const contextLine = direction === 'context' ? findContextLine(entry) : null;

    return (
      <div className="mx-auto w-full max-w-[1160px]">
        {/* ── Running head ── */}
        <div
          className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b px-5 py-4 sm:px-10"
          style={{ borderColor: 'var(--rule)' }}
        >
          <span style={{ fontFamily: 'var(--font-latin)', fontSize: '1.25rem', color: 'var(--fg)' }}>
            Review · {queue.length - cursor} left
          </span>
          <div className="flex items-center gap-5">
            <span className="slab-sm hidden sm:inline">
              SM-2 · EF {card.ef.toFixed(2)}
            </span>
            <button type="button" className="btn" onClick={() => setMode('idle')}>
              End session
            </button>
          </div>
        </div>

        {/* Session progress, ruled across the full width */}
        <div className="meter meter-thin">
          <span style={{ width: `${(cursor / queue.length) * 100}%`, background: 'var(--accent)' }} />
        </div>

        <div className="flex justify-center px-5 py-10 sm:px-10 sm:py-14">
          <div className="panel lift w-full max-w-[660px] px-7 py-10 sm:px-14 sm:py-13">
            <div className="mb-8 flex items-baseline justify-between gap-4">
              <span className="rubric">
                {entry.readings[0] ? `CED ${entry.readings[0]}` : 'Core list'}
              </span>
              <span className="slab-sm">
                {card.reviews > 0 ? (
                  <>
                    Seen <Roman value={card.reviews} />×
                  </>
                ) : (
                  'New card'
                )}
              </span>
            </div>

            {/* ── Front ── */}
            {direction === 'la-en' && (
              <div
                className="text-center"
                style={{
                  fontFamily: 'var(--font-latin)',
                  fontSize: 'calc(clamp(2.75rem, 2rem + 4vw, 4.5rem) * var(--ls))',
                  lineHeight: 1,
                  color: 'var(--fg)',
                }}
              >
                {entry.headword}
              </div>
            )}
            {direction === 'en-la' && (
              <div
                className="text-center"
                style={{
                  fontFamily: 'var(--font-latin)',
                  fontSize: '1.75rem',
                  lineHeight: 1.35,
                  color: 'var(--fg)',
                }}
              >
                {entry.definition}
              </div>
            )}
            {direction === 'context' && (
              <div className="text-center">
                {contextLine ? (
                  <>
                    <div className="slab-sm mb-4">{contextLine.citation}</div>
                    <p className="latin-verse" style={{ margin: 0 }}>
                      {contextLine.latin}
                    </p>
                    <p
                      className="mt-6"
                      style={{
                        margin: '1.5rem 0 0',
                        fontFamily: 'var(--font-latin)',
                        fontSize: '1.125rem',
                        color: 'var(--fg-muted)',
                      }}
                    >
                      Which meaning of{' '}
                      <span style={{ color: 'var(--fg)' }}>{entry.headword}</span> fits this line?
                    </p>
                  </>
                ) : (
                  <>
                    <div
                      style={{
                        fontFamily: 'var(--font-latin)',
                        fontSize: 'calc(3.5rem * var(--ls))',
                        lineHeight: 1,
                      }}
                    >
                      {entry.headword}
                    </div>
                    <p className="slab-sm mt-4">
                      no context line in the loaded passages
                    </p>
                  </>
                )}
              </div>
            )}

            {/* ── Back ── */}
            {shown && (
              <div className="animate-in">
                <div className="hair-faint my-8" />
                <div className="flex flex-col gap-3.5 text-center">
                  <div
                    style={{
                      fontFamily: 'var(--font-latin)',
                      fontSize: '1.875rem',
                      lineHeight: 1.25,
                      color: 'var(--fg)',
                    }}
                  >
                    {entry.lemma}
                  </div>
                  <div className="slab-sm">{entry.pos}</div>
                  <p
                    style={{
                      margin: '0.5rem 0 0',
                      fontFamily: 'var(--font-latin)',
                      fontSize: '1.375rem',
                      lineHeight: 1.5,
                      color: 'var(--ink2)',
                    }}
                  >
                    {entry.definition}
                  </p>
                </div>
              </div>
            )}

            {/* ── Actions ── */}
            {!shown ? (
              <button
                type="button"
                className="btn btn-primary mt-10 w-full"
                onClick={() => setShown(true)}
              >
                Reveal
                <span className="kbd" aria-hidden="true">space</span>
              </button>
            ) : (
              <>
                {/* Two questions, not four: did you know it, or not. "Got it"
                    keeps the one filled, primary slot the old four-grade grid
                    gave "Good" for the same reason — it is the answer most
                    reviews end in, so the eye should always find it in the
                    same place, not have it swap sides depending on the card.
                    Both reuse `.btn`'s ink-wipe hover invert — the same
                    animation as every other button on the site — just
                    reshaped from a pill into a tall card. */}
                <div className="mt-10 grid grid-cols-2 gap-3">
                  {RESPONSES.map((r, i) => {
                    const preview = sm2(card, r.quality);
                    const know = r.variant === 'know';
                    return (
                      <button
                        key={r.quality}
                        type="button"
                        onClick={() => grade(r.quality)}
                        title={`press ${i + 1}`}
                        className={`btn ${know ? 'btn-primary' : 'btn-rubric'} flex-col gap-2 rounded-[var(--r-lg)] px-4 py-6`}
                      >
                        <span
                          className="inline-flex items-center gap-2"
                          style={{
                            fontFamily: 'var(--font-sans)',
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                          }}
                        >
                          {r.label}
                          <span
                            className="kbd"
                            aria-hidden="true"
                            style={{ color: 'inherit', borderColor: 'currentColor' }}
                          >
                            {i + 1}
                          </span>
                        </span>
                        <span
                          style={{
                            fontFamily: 'var(--font-latin)',
                            fontSize: '0.9375rem',
                            lineHeight: 1,
                            opacity: 0.75,
                          }}
                        >
                          back in {intervalLabel(preview.interval)}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="slab-sm mt-5 text-center">
                  interval {card.interval}d · ease {card.ef.toFixed(2)}
                  {card.lapses > 0 && ` · ${card.lapses} lapse${card.lapses === 1 ? '' : 's'}`}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- browse ---------------- */
  if (mode === 'browse') {
    const needle = normalizeWord(search);
    const list = (needle
      ? scoped.filter(
          (e) =>
            normalizeWord(e.headword).includes(needle) ||
            e.definition.toLowerCase().includes(search.toLowerCase()),
        )
      : scoped
    ).slice(0, 300);

    const todayIso = new Date().toISOString().slice(0, 10);

    return (
      <Page wide>
        <PageHeader
          eyebrow="Core list"
          title="Browse vocabulary"
          lede={`${scoped.length} words in scope, from the ${coreVocabulary.length}-word required list in CED Appendix 2.`}
          actions={
            <button type="button" className="btn" onClick={() => setMode('idle')}>
              Back
            </button>
          }
        />
        <input
          className="input mb-8"
          placeholder="Search Latin or English…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search vocabulary"
        />
        <ul className="flex flex-col">
          {list.map((e, i) => {
            const c = vocab[e.id];
            const isDue = c && c.due <= todayIso;
            return (
              <li
                key={e.id}
                className="row-hover -mx-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 px-3 py-3"
                style={{ borderTop: i === 0 ? undefined : '1px solid var(--hair)' }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-latin)',
                    fontSize: '1.25rem',
                    color: 'var(--fg)',
                    minWidth: '11rem',
                  }}
                >
                  {e.lemma}
                </span>
                <span className="slab-sm" style={{ minWidth: '5rem' }}>
                  {e.pos}
                </span>
                <span
                  className="flex-1"
                  style={{
                    fontFamily: 'var(--font-latin)',
                    fontSize: '1.0625rem',
                    color: 'var(--ink2)',
                    minWidth: '14rem',
                  }}
                >
                  {e.definition}
                </span>
                {mounted && c && (
                  <span
                    className="slab-sm"
                    style={{ color: isDue ? 'var(--accent)' : 'var(--gilt)' }}
                  >
                    {isDue ? 'due' : `${c.interval}d`}
                  </span>
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
    <Page wide>
      <PageHeader
        eyebrow="Spaced repetition · SM-2"
        title="Vocabulary"
        lede={
          <>
            The full {coreVocabulary.length}-word required list from{' '}
            <CedLink to="vocabulary">CED Appendix 2</CedLink>, with the reading each word is
            introduced in. Get one wrong and it comes back tomorrow; get it
            right repeatedly and the interval stretches.
          </>
        }
        actions={
          <button type="button" className="btn" onClick={() => setMode('browse')}>
            Browse list
          </button>
        }
      />

      {/* Counts, ruled rather than boxed */}
      <div className="mb-10 grid gap-x-10 gap-y-6 sm:grid-cols-3">
        <Count label="Due now" value={mounted ? dueInScope.length : null} rubric />
        <Count
          label="In rotation"
          value={mounted ? inRotation : null}
          meter={{ value: mounted ? inRotation : 0, max: coreVocabulary.length }}
        />
        <Count label="Not yet seen" value={mounted ? untouched.length : null} />
      </div>

      {/* Card type */}
      <section className="mb-9 border-t pt-8" style={{ borderColor: 'var(--rule)' }}>
        <div className="slab mb-4">Card type</div>
        <div className="mb-7 flex flex-wrap gap-2.5">
          {(
            [
              ['la-en', 'Latin → English'],
              ['en-la', 'English → Latin'],
              ['context', 'Which meaning fits this line'],
            ] as Array<[Direction, string]>
          ).map(([d, label]) => (
            <button
              key={d}
              type="button"
              aria-pressed={direction === d}
              onClick={() => setDirection(d)}
              className={`btn ${direction === d ? 'btn-primary' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <label>
            <span className="slab-sm mb-2 block">Unit</span>
            <select
              className="input"
              value={unit}
              onChange={(e) => {
                setUnit(e.target.value as 'all' | UnitId);
                setPassageId('all');
              }}
            >
              <option value="all">All units</option>
              {(['1', '2', '3', '4', '5', '6'] as UnitId[]).map((u) => (
                <option key={u} value={u}>
                  Unit {u}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="slab-sm mb-2 block">Passage-specific</span>
            <select
              className="input"
              value={passageId}
              onChange={(e) => setPassageId(e.target.value)}
            >
              <option value="all">Whole list</option>
              {allPassages
                .filter((p) => p.required)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.citation}
                  </option>
                ))}
            </select>
          </label>
        </div>

        <p className="slab-sm mt-5">
          {scoped.length} word{scoped.length === 1 ? '' : 's'} in scope
        </p>
      </section>

      {mounted && dueInScope.length === 0 && untouched.length === 0 ? (
        <Empty
          title="Nothing due in this scope"
          body="Every card here is scheduled for a future day. Widen the filter, or come back tomorrow."
        />
      ) : (
        <div className="flex flex-col gap-6">
          {/* Review is never size-limited — SM-2 already paces what is due
              to a manageable number on its own, so there is nothing here for
              a size picker to do. */}
          {mounted && dueInScope.length > 0 && (
            <button type="button" className="btn btn-primary self-start" onClick={() => startReview(0)}>
              Review {dueInScope.length} due
            </button>
          )}

          {/* New cards are the ones that actually need a size, which is the
              thing that was missing before: "10 new" and "20 new" as two
              separate, oddly-worded buttons were the only way to act on a
              pool of 990 words, with no way to ask for a different amount
              and no default account of what "chunk" even meant. This picks
              a size first, then starts with it — one button, doing what its
              label says. 20 is the opening size, in line with how spaced
              repetition apps generally pace new material; "All" is here
              for whenever that pacing is not wanted. */}
          {mounted && untouched.length > 0 && (
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex flex-wrap gap-2">
                {([10, 20, 50, 'all'] as const).map((n) => {
                  const active = newBatch === n;
                  const label = n === 'all' ? `All ${untouched.length}` : String(Math.min(n, untouched.length));
                  return (
                    <button
                      key={n}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setNewBatch(n)}
                      className={`chip squish ${active ? 'chip-on' : ''}`}
                      disabled={n !== 'all' && n > untouched.length}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                className={dueInScope.length > 0 ? 'btn' : 'btn btn-primary'}
                onClick={() => startReview(newBatch === 'all' ? untouched.length : newBatch)}
              >
                Study {newBatch === 'all' ? untouched.length : Math.min(newBatch, untouched.length)} new
              </button>
            </div>
          )}
        </div>
      )}

      <SourceNote to="vocabulary">
        All Latin words outside this list are glossed on the exam, so this list is the floor — not
        a suggestion.
      </SourceNote>
    </Page>
  );
}

function Count({
  label,
  value,
  meter,
  rubric = false,
}: {
  label: string;
  value: number | null;
  meter?: { value: number; max: number };
  rubric?: boolean;
}) {
  return (
    <div>
      <div className={rubric ? 'rubric' : 'slab'}>{label}</div>
      <div
        className="numeral mt-3"
        style={{ fontSize: '2.75rem', color: rubric ? 'var(--accent)' : 'var(--fg)' }}
      >
        {value === null ? '—' : value}
      </div>
      {meter && (
        <div className="meter mt-3">
          <span
            style={{ width: `${meter.max > 0 ? Math.round((meter.value / meter.max) * 100) : 0}%` }}
          />
        </div>
      )}
    </div>
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
        if (p.genre === 'prose' && line.latin.length > 240) {
          const sentences = line.latin.split(/(?<=[.?!])\s+/);
          const hit = sentences.find((s) =>
            s
              .split(/[^A-Za-zÀ-ÿĀ-ſ]+/)
              .map(normalizeWord)
              .some((w) => w === target || (w.length > 3 && w.startsWith(stem))),
          );
          if (hit) return { latin: hit, citation: `${p.citation}.${line.n}` };
        }
        return {
          latin: line.latin,
          citation: `${p.citation}${p.genre === 'prose' ? `.${line.n}` : ` (${line.n})`}`,
        };
      }
    }
  }
  return null;
}
