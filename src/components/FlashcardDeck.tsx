'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useStore } from '@/store/useStore';

export interface FlashcardDeckProps<T> {
  items: T[];
  getId: (item: T) => string;
  renderFront: (item: T) => ReactNode;
  renderBack: (item: T) => ReactNode;
  /** Singular noun used in the count and completion copy — "topic", "card", "device". */
  itemNoun?: string;
}

/**
 * A one-at-a-time flip-and-rate study session, shared by Grammar, Context &
 * Culture, and Literary Devices — the same interaction Vocabulary uses, but
 * without SM-2 scheduling: there is no persistent per-item mastery model for
 * this content, so "Practice again" just sends the card to the back of this
 * session's queue rather than rescheduling it for another day.
 */
export default function FlashcardDeck<T>({
  items,
  getId,
  renderFront,
  renderBack,
  itemNoun = 'card',
}: FlashcardDeckProps<T>) {
  const markStudied = useStore((s) => s.markStudied);
  const [seed, setSeed] = useState(0);
  const [queue, setQueue] = useState<string[]>([]);
  const [cursor, setCursor] = useState(0);
  const [shown, setShown] = useState(false);
  const [done, setDone] = useState(0);

  const byId = useMemo(() => new Map(items.map((it) => [getId(it), it])), [items, getId]);

  useEffect(() => {
    setQueue(
      items
        .map(getId)
        .sort(() => Math.random() - 0.5),
    );
    setCursor(0);
    setShown(false);
    setDone(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, items]);

  const id = queue[cursor];
  const item = id ? byId.get(id) : undefined;
  const left = Math.max(0, queue.length - cursor);

  function grade(again: boolean) {
    if (!id) return;
    setDone((d) => d + 1);
    if (again) setQueue((q) => [...q, id]);
    setCursor((c) => c + 1);
    setShown(false);
    markStudied();
  }

  /* Keyboard: space reveals, 1 sends it back, 2 marks it known. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return;
      if (!item) return;
      if (!shown && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        setShown(true);
      } else if (shown && (e.key === '1' || e.key === '2')) {
        e.preventDefault();
        grade(e.key === '1');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, item, id]);

  return (
    <div className="mx-auto w-full max-w-[720px]">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <span className="slab tabular-nums">
          {item ? `${left} ${itemNoun}${left === 1 ? '' : 's'} left` : 'Session complete'}
        </span>
        <button type="button" className="btn" onClick={() => setSeed((s) => s + 1)}>
          Reshuffle
        </button>
      </div>

      {!item ? (
        <div className="animate-in py-10 text-center">
          <div className="numeral" style={{ fontSize: '3rem' }}>
            {done}
          </div>
          <p className="slab-sm mt-2">
            {itemNoun}
            {done === 1 ? '' : 's'} reviewed this session
          </p>
          <button type="button" className="btn btn-primary mt-6" onClick={() => setSeed((s) => s + 1)}>
            Study again
          </button>
        </div>
      ) : (
        <>
          <div className="meter meter-thin mb-8">
            <span style={{ width: `${(cursor / queue.length) * 100}%`, background: 'var(--accent)' }} />
          </div>

          <div className="panel lift px-7 py-10 sm:px-14 sm:py-13">
            {renderFront(item)}

            {shown && (
              <div className="animate-in mt-8">
                <div className="hair-faint mb-8" />
                {renderBack(item)}
              </div>
            )}

            {!shown ? (
              <button
                type="button"
                className="btn btn-primary mt-10 w-full"
                onClick={() => setShown(true)}
              >
                Reveal
                <span className="kbd" aria-hidden="true">
                  space
                </span>
              </button>
            ) : (
              <div className="mt-10 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => grade(true)}
                  title="press 1"
                  className="btn btn-rubric flex-col gap-2 rounded-[var(--r-lg)] px-4 py-6"
                >
                  <span className="inline-flex items-center gap-2">
                    Practice again
                    <span className="kbd" aria-hidden="true" style={{ color: 'inherit', borderColor: 'currentColor' }}>
                      1
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => grade(false)}
                  title="press 2"
                  className="btn btn-primary flex-col gap-2 rounded-[var(--r-lg)] px-4 py-6"
                >
                  <span className="inline-flex items-center gap-2">
                    Got it
                    <span className="kbd" aria-hidden="true" style={{ color: 'inherit', borderColor: 'currentColor' }}>
                      2
                    </span>
                  </span>
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
