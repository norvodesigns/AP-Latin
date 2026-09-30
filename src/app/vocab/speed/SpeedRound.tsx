'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '@/store/useStore';
import { coreVocabulary } from '@/data/vocabulary';
import { supplementaryVocabulary } from '@/data/supplementaryVocabulary';
import type { UnitId } from '@/data/types';
import { BOARD_SIZE, MISS_PENALTY_SECONDS, SPEED_SECONDS, dealBoard, speedWords, type SpeedWord } from '@/lib/speed';
import { BackLink, Page, PageHeader } from '@/components/ui';

type Scope = 'deck' | 'all' | UnitId;
type Phase = 'ready' | 'play' | 'done';

const UNITS: UnitId[] = ['1', '2', '3', '4', '5', '6'];
const BEST_KEY = 'lectio-speed-best';
/** Fewer words than this and a round would keep dealing the same boards. */
const MIN_POOL = 10;

const prose = { fontFamily: 'var(--font-latin)', fontSize: '1.0625rem', lineHeight: 1.5, color: 'var(--ink2)' } as const;

function readBest(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(BEST_KEY) ?? '{}') as Record<string, number>;
  } catch {
    return {};
  }
}

/** A minute of matching words to meanings, five pairs to a board. */
export default function SpeedRound() {
  const vocab = useStore((s) => s.vocab);
  const seedVocab = useStore((s) => s.seedVocab);
  const markStudied = useStore((s) => s.markStudied);

  const [mounted, setMounted] = useState(false);
  const [best, setBest] = useState<Record<string, number>>({});
  useEffect(() => {
    setMounted(true);
    setBest(readBest());
  }, []);

  const deckCount = mounted ? Object.keys(vocab).length : 0;
  const [scope, setScope] = useState<Scope | null>(null);
  // The deck when there is enough of it, otherwise the whole AP list.
  const chosen: Scope = scope ?? (deckCount >= MIN_POOL * 2 ? 'deck' : 'all');

  const pool = useMemo(() => {
    if (chosen === 'deck') {
      const ids = new Set(Object.keys(vocab));
      return speedWords([...coreVocabulary, ...supplementaryVocabulary].filter((e) => ids.has(e.id)));
    }
    if (chosen === 'all') return speedWords(coreVocabulary);
    return speedWords(coreVocabulary.filter((e) => e.units.includes(chosen)));
  }, [chosen, vocab]);

  const [phase, setPhase] = useState<Phase>('ready');
  const [board, setBoard] = useState<{ left: SpeedWord[]; right: SpeedWord[] }>({ left: [], right: [] });
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [pickL, setPickL] = useState<string | null>(null);
  const [pickR, setPickR] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ ids: [string, string]; ok: boolean } | null>(null);
  const [score, setScore] = useState(0);
  const [missed, setMissed] = useState<SpeedWord[]>([]);
  const [deadline, setDeadline] = useState(0);
  const [now, setNow] = useState(0);
  const [newBest, setNewBest] = useState(false);
  const finished = useRef(false);

  const start = useCallback(() => {
    finished.current = false;
    setBoard(dealBoard(pool));
    setMatched(new Set());
    setPickL(null);
    setPickR(null);
    setFlash(null);
    setScore(0);
    setMissed([]);
    setNewBest(false);
    const t = Date.now();
    setNow(t);
    setDeadline(t + SPEED_SECONDS * 1000);
    setPhase('play');
  }, [pool]);

  // The clock.
  useEffect(() => {
    if (phase !== 'play') return;
    const id = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(id);
  }, [phase]);

  const left = Math.max(0, deadline - now);
  useEffect(() => {
    if (phase !== 'play' || left > 0 || finished.current) return;
    finished.current = true;
    setPhase('done');
    markStudied();
    const all = readBest();
    if (score > (all[chosen] ?? 0)) {
      all[chosen] = score;
      try {
        localStorage.setItem(BEST_KEY, JSON.stringify(all));
      } catch {
        /* private mode: the best just isn't kept */
      }
      setNewBest(score > 0);
    }
    setBest(all);
  }, [phase, left, score, chosen, markStudied]);

  // A tap on a tile: the first of a pair waits; the second decides it,
  // right or two seconds gone.
  function choose(side: 'l' | 'r', id: string) {
    const l = side === 'l' ? (pickL === id ? null : id) : pickL;
    const r = side === 'r' ? (pickR === id ? null : id) : pickR;
    if (!l || !r) {
      setPickL(l);
      setPickR(r);
      return;
    }
    setPickL(null);
    setPickR(null);
    const ok = l === r;
    setFlash({ ids: [l, r], ok });
    window.setTimeout(() => setFlash((f) => (f && f.ids[0] === l && f.ids[1] === r ? null : f)), ok ? 220 : 420);
    if (ok) {
      setScore((n) => n + 1);
      setMatched((m) => new Set(m).add(l));
    } else {
      setDeadline((d) => d - MISS_PENALTY_SECONDS * 1000);
      const word = board.left.find((w) => w.id === l);
      if (word) setMissed((ms) => (ms.some((m) => m.id === word.id) ? ms : [...ms, word]));
    }
  }

  // A cleared board deals the next.
  useEffect(() => {
    if (phase !== 'play' || board.left.length === 0 || matched.size < board.left.length) return;
    const id = window.setTimeout(() => {
      setBoard(dealBoard(pool));
      setMatched(new Set());
    }, 200);
    return () => window.clearTimeout(id);
  }, [matched, board, phase, pool]);

  if (phase === 'play') {
    const pct = (left / (SPEED_SECONDS * 1000)) * 100;
    const tile = (w: SpeedWord, side: 'l' | 'r') => {
      const done = matched.has(w.id);
      const picked = side === 'l' ? pickL === w.id : pickR === w.id;
      const flashing = flash && flash.ids[side === 'l' ? 0 : 1] === w.id;
      const border = flashing ? (flash.ok ? 'var(--correct)' : 'var(--accent)') : picked ? 'var(--fg)' : 'var(--rule-strong)';
      return (
        <button
          key={w.id}
          type="button"
          disabled={done}
          aria-pressed={picked}
          onClick={() => choose(side, w.id)}
          className={`squish w-full rounded-[var(--r-md)] border px-4 py-3 text-left ${side === 'l' ? 'latin' : ''}`}
          style={{
            borderColor: border,
            borderWidth: picked || flashing ? 2 : 1,
            opacity: done ? 0.25 : 1,
            fontSize: side === 'l' ? '1.25rem' : '1rem',
            fontFamily: side === 'l' ? undefined : 'var(--font-latin)',
            minHeight: '3.25rem',
            transition: 'opacity 200ms, border-color 120ms',
          }}
        >
          {w[side === 'l' ? 'latin' : 'english']}
        </button>
      );
    };
    return (
      <Page>
        <div className="mb-6 flex items-center gap-4">
          <BackLink onClick={() => setPhase('ready')}>Stop</BackLink>
          <div className="meter meter-thin flex-1" role="timer" aria-label={`${Math.ceil(left / 1000)} seconds left`}>
            <span style={{ width: `${pct}%`, transition: 'width 100ms linear', background: left < 10_000 ? 'var(--accent)' : undefined }} />
          </div>
          <span className="numeral tabular-nums" style={{ fontSize: '1.5rem' }} aria-label={`${score} matched`}>
            {score}
          </span>
        </div>
        <p className="slab-sm mb-5" style={{ color: 'var(--fg-muted)' }}>
          Tap a word, then its meaning. A wrong pair costs {MISS_PENALTY_SECONDS} seconds.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-3">{board.left.map((w) => tile(w, 'l'))}</div>
          <div className="flex flex-col gap-3">{board.right.map((w) => tile(w, 'r'))}</div>
        </div>
      </Page>
    );
  }

  if (phase === 'done') {
    const toAdd = missed.filter((w) => !vocab[w.id]);
    return (
      <Page>
        <div className="mb-8">
          <BackLink href="/vocab">Vocabulary</BackLink>
        </div>
        <div className="rubric mb-3">Time</div>
        <h1 style={{ fontSize: 'clamp(2rem, 1.5rem + 2.5vw, 3rem)', lineHeight: 1.05 }}>
          <span className="numeral" style={{ fontSize: 'inherit', color: 'var(--accent)' }}>{score}</span>{' '}
          <span style={{ color: 'var(--fg-muted)', fontSize: '0.55em' }}>
            {score === 1 ? 'pair' : 'pairs'} in a minute{newBest ? ', your best yet' : ''}
          </span>
        </h1>
        <p className="mt-3" style={prose}>
          Best here: {best[chosen] ?? score}. {missed.length === 0 ? 'Not a single wrong pair.' : ''}
        </p>
        {missed.length > 0 && (
          <section className="mt-8">
            <h2 className="slab mb-3">Worth another look</h2>
            <ul className="flex flex-col pl-0" style={{ listStyle: 'none' }}>
              {missed.map((w) => (
                <li key={w.id} className="border-t py-2" style={{ ...prose, borderColor: 'var(--rule)' }}>
                  <span className="latin" style={{ fontStyle: 'italic' }}>{w.latin}</span>{' '}
                  <span style={{ color: 'var(--ink2)' }}>{w.english}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        <div className="mt-9 flex flex-wrap items-center gap-4">
          <button type="button" className="btn btn-primary" onClick={start} autoFocus>
            Again
          </button>
          {toAdd.length > 0 && (
            <button type="button" className="btn" onClick={() => seedVocab(toAdd.map((w) => w.id))}>
              Add {toAdd.length} to my flashcards
            </button>
          )}
          <Link href="/vocab" className="btn btn-ghost">Back to vocabulary</Link>
        </div>
      </Page>
    );
  }

  const label = (s: Scope) => (s === 'deck' ? `My deck · ${deckCount}` : s === 'all' ? 'The whole AP list' : `Unit ${s}`);
  return (
    <Page>
      <div className="mb-8">
        <BackLink href="/vocab">Vocabulary</BackLink>
      </div>
      <PageHeader
        eyebrow="Vocabulary · against the clock"
        title="Speed round"
        lede={`A minute to match as many Latin words to their meanings as you can, ${BOARD_SIZE} at a time. A wrong pair costs ${MISS_PENALTY_SECONDS} seconds, and the words you mix up are listed at the end.`}
      />
      <section className="mb-9">
        <div className="slab mb-4">Which words</div>
        <div className="flex flex-wrap gap-2">
          {(['deck', 'all', ...UNITS] as Scope[]).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={chosen === s}
              className={`chip ${chosen === s ? 'chip-on' : ''}`}
              disabled={s === 'deck' && deckCount < MIN_POOL}
              onClick={() => setScope(s)}
            >
              {label(s)}
            </button>
          ))}
        </div>
        {mounted && (
          <p className="mt-4" style={{ ...prose, fontSize: '1rem', color: 'var(--fg-muted)' }}>
            {pool.length} words{best[chosen] ? ` · best ${best[chosen]}` : ''}
          </p>
        )}
      </section>
      <button type="button" className="btn btn-primary" onClick={start} disabled={!mounted || pool.length < MIN_POOL}>
        Start · {SPEED_SECONDS} seconds
      </button>
    </Page>
  );
}
