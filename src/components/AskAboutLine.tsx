'use client';

import { useEffect, useRef, useState } from 'react';
import type { Passage } from '@/data/types';
import { useAiStatus } from '@/lib/useAi';
import { useStore } from '@/store/useStore';
import { lookup } from '@/lib/latin';

const SUGGESTED = [
  'Parse every word in this line.',
  'What construction is happening here?',
  'How does this line scan?',
  'Why is this word in this case?',
];

/**
 * "Ask about this line" — a scoped tutor for one line of Latin.
 * When AI is unavailable it falls back to the offline glossary for the line,
 * so the panel is still worth opening.
 */
export default function AskAboutLine({
  passage,
  lineN,
  latin,
  onClose,
}: {
  passage: Passage;
  lineN: number;
  latin: string;
  onClose: () => void;
}) {
  const ai = useAiStatus();
  const recordAiCall = useStore((s) => s.recordAiCall);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      abortRef.current?.abort();
    };
  }, [onClose]);

  async function ask(q: string) {
    if (!q.trim() || streaming) return;
    setStreaming(true);
    setAnswer('');
    setError(null);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passageId: passage.id, lineN, latin, question: q }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j?.error ?? `Request failed (${res.status}).`);
        setStreaming(false);
        return;
      }

      recordAiCall('ask');
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) {
        setError('The response stream was empty.');
        setStreaming(false);
        return;
      }
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        setAnswer((a) => a + decoder.decode(value, { stream: true }));
      }
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        setError('Could not reach the tutor. The glossary below still works.');
      }
    } finally {
      setStreaming(false);
    }
  }

  const offlineGloss = latin
    .split(/[^A-Za-zÀ-ÿĀ-ſ]+/)
    .filter((w) => w.length > 1)
    .map((w) => ({ word: w, hit: lookup(w)[0] }))
    .filter((x) => x.hit);

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      style={{ background: 'color-mix(in srgb, var(--bg-sunk) 70%, transparent)' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Ask about line ${lineN}`}
        onClick={(e) => e.stopPropagation()}
        className="animate-in flex max-h-[85dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-xl sm:"
        style={{ background: 'var(--bg-raised)', border: '1px solid var(--rule-strong)', boxShadow: '0 12px 30px var(--shadow)' }}
      >
        <header className="flex items-start justify-between gap-3 border-b px-4 py-3" style={{ borderColor: 'var(--rule)' }}>
          <div className="min-w-0">
            <div className="eyebrow">
              {passage.citation} · {passage.author === 'vergil' ? 'line' : 'section'} {lineN}
            </div>
            <p className="latin mt-1" style={{ fontSize: '1.125rem', margin: 0 }}>
              {latin}
            </p>
          </div>
          <button type="button" className="btn btn-ghost shrink-0 px-2 py-1 text-xs" onClick={onClose}>
            esc
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {!ai.loading && !ai.configured && (
            <div
              className="mb-3 border px-3 py-2 text-sm"
              style={{
                background: 'color-mix(in srgb, var(--gilt) 9%, transparent)',
                borderColor: 'color-mix(in srgb, var(--gilt) 30%, transparent)',
                color: 'var(--fg-muted)',
              }}
            >
              No AI provider is configured, so the tutor is off. The dictionary entries below come
              from the offline core vocabulary list.
            </div>
          )}

          {error && (
            <div
              className="mb-3 border px-3 py-2 text-sm"
              style={{ background: 'var(--incorrect-bg)', borderColor: 'color-mix(in srgb, var(--incorrect) 30%, transparent)', color: 'var(--fg-muted)' }}
            >
              {error}
            </div>
          )}

          {answer && (
            <div
              className="measure whitespace-pre-wrap text-sm"
              style={{ fontFamily: 'var(--font-serif)', lineHeight: 1.72, color: 'var(--fg)' }}
            >
              {answer}
              {streaming && (
                <span
                  className="ml-0.5 inline-block h-3.5 w-1.5 align-middle"
                  style={{ background: 'var(--accent)' }}
                  aria-hidden="true"
                />
              )}
            </div>
          )}

          {!answer && !streaming && (
            <>
              {ai.configured && (
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {SUGGESTED.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="btn text-xs"
                      onClick={() => {
                        setQuestion(s);
                        ask(s);
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              <div>
                <div className="eyebrow mb-2">Words in this line, from the core list</div>
                {offlineGloss.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--fg-faint)' }}>
                    No core-vocabulary matches — on the exam these words would be glossed for you.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {offlineGloss.map(({ word, hit }, i) => (
                      <li key={`${word}-${i}`} className="text-sm">
                        <span style={{ fontFamily: 'var(--font-latin)', fontSize: '1rem', fontWeight: 600 }}>
                          {word}
                        </span>
                        <span style={{ color: 'var(--fg-faint)' }}> → </span>
                        <span style={{ fontFamily: 'var(--font-latin)', fontSize: '0.98rem' }}>
                          {hit!.entry.lemma}
                        </span>
                        <span style={{ color: 'var(--fg-muted)' }}> — {hit!.entry.definition}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>

        {ai.configured && (
          <form
            className="flex items-center gap-2 border-t px-4 py-3"
            style={{ borderColor: 'var(--rule)' }}
            onSubmit={(e) => {
              e.preventDefault();
              ask(question);
            }}
          >
            <input
              ref={inputRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about grammar, syntax or metre in this line…"
              aria-label="Your question about this line"
              maxLength={600}
              className="input"
              disabled={streaming}
            />
            <button type="submit" className="btn btn-primary shrink-0" disabled={streaming || !question.trim()}>
              {streaming ? 'Thinking…' : 'Ask'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
