'use client';

import { useEffect, useMemo, useState } from 'react';
import { scansionLines } from '@/data/scansion';
import { useStore } from '@/store/useStore';
import { Page, PageHeader, Card, Badge, Empty } from '@/components/ui';
import type { ScansionLine } from '@/data/types';

type Mark = 'long' | 'short' | null;

export default function ScansionLab() {
  const markStudied = useStore((s) => s.markStudied);
  const [index, setIndex] = useState(0);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [checked, setChecked] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [history, setHistory] = useState<Array<{ id: string; correct: number; total: number }>>([]);

  const line: ScansionLine | undefined = scansionLines[index];

  useEffect(() => {
    if (!line) return;
    setMarks(new Array(line.syllables.length).fill(null));
    setChecked(false);
  }, [index, line]);

  useEffect(() => {
    markStudied();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Indices of syllables that actually count metrically. */
  const metricalIdx = useMemo(
    () => (line ? line.syllables.map((s, i) => (s.elides ? -1 : i)).filter((i) => i >= 0) : []),
    [line],
  );

  /** Which syllable starts each foot, as an index into `line.syllables`. */
  const footStarts = useMemo(() => {
    if (!line) return [];
    const out: number[] = [];
    let m = 0;
    for (const f of line.feet) {
      out.push(metricalIdx[m]);
      m += f === 'dactyl' ? 3 : 2;
    }
    return out;
  }, [line, metricalIdx]);

  if (!line) {
    return (
      <Page>
        <PageHeader title="Scansion Lab" />
        <Empty title="No scanned lines loaded" body="Add lines to src/data/scansion.ts — see CONTENT.md." />
      </Page>
    );
  }

  const active: ScansionLine = line;

  const result = checked
    ? active.syllables.map((s, i) => {
        if (s.elides) return marks[i] === null ? 'ok' : 'wrong-elision';
        return marks[i] === s.quantity ? 'ok' : marks[i] === null ? 'blank' : 'wrong';
      })
    : null;

  const scored = checked
    ? metricalIdx.filter((i) => marks[i] === line.syllables[i].quantity).length
    : 0;

  function cycle(i: number) {
    if (checked) return;
    setMarks((m) => {
      const next = [...m];
      next[i] = next[i] === null ? 'long' : next[i] === 'long' ? 'short' : null;
      return next;
    });
  }

  function check() {
    setChecked(true);
    const correct = metricalIdx.filter((i) => marks[i] === active.syllables[i].quantity).length;
    setHistory((h) => [...h, { id: active.id, correct, total: metricalIdx.length }]);
  }

  const allMarked = metricalIdx.every((i) => marks[i] !== null);

  return (
    <Page wide>
      <PageHeader
        eyebrow="Dactylic hexameter"
        title="Scansion Lab"
        lede={
          <>
            Mark each syllable long or short, then check. Every line here comes from Aeneid 1.1–33,
            the one passage whose source text carries macrons — so the quantities are read off the
            text, not guessed.
          </>
        }
        actions={
          <button type="button" className="btn" onClick={() => setShowTutorial((v) => !v)} aria-expanded={showTutorial}>
            {showTutorial ? 'Hide' : 'Rules'} tutorial
          </button>
        }
      />

      {showTutorial && <Tutorial />}

      {/* line picker */}
      <div className="mb-5 flex flex-wrap items-center gap-1.5">
        {scansionLines.map((l, i) => {
          const done = history.find((h) => h.id === l.id);
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-current={i === index ? 'true' : undefined}
              className="rounded-md border px-2 py-1 text-xs tabular-nums transition-colors"
              style={{
                background: i === index ? 'var(--accent)' : done ? 'var(--correct-bg)' : 'transparent',
                borderColor: i === index ? 'var(--accent)' : done ? 'var(--correct)' : 'var(--rule)',
                color: i === index ? 'var(--accent-fg)' : done ? 'var(--correct)' : 'var(--fg-faint)',
              }}
              title={l.citation}
            >
              {l.citation.split('.')[1]}
            </button>
          );
        })}
      </div>

      <Card className="mb-5">
        <div className="mb-1 flex items-baseline justify-between gap-3">
          <span className="eyebrow">{line.citation}</span>
          <span className="text-xs" style={{ color: 'var(--fg-faint)' }}>
            click a syllable to cycle: — → ˘ → blank
          </span>
        </div>

        {/* the line, syllable by syllable */}
        <div className="flex flex-wrap items-end gap-x-0.5 gap-y-4 py-4">
          {line.syllables.map((syl, i) => {
            const footIdx = footStarts.indexOf(i);
            const state = result?.[i];
            const mark = marks[i];
            const caesura = line.caesurae.find((c) => metricalIdx[c.afterSyllable] === i);

            let color = 'var(--fg)';
            if (checked && !syl.elides) {
              color = state === 'ok' ? 'var(--correct)' : state === 'blank' ? 'var(--fg-faint)' : 'var(--incorrect)';
            }

            return (
              <span key={i} className="flex items-end">
                {footIdx >= 0 && (
                  <span
                    className="mr-1 self-stretch"
                    aria-hidden="true"
                    style={{ borderLeft: '1px solid var(--rule-strong)', height: '2.6rem' }}
                  />
                )}
                <button
                  type="button"
                  onClick={() => cycle(i)}
                  disabled={syl.elides || checked}
                  className="relative flex flex-col items-center rounded px-0.5 transition-colors"
                  style={{ cursor: syl.elides || checked ? 'default' : 'pointer' }}
                  aria-label={`${syl.text}${syl.elides ? ', elided' : ''}`}
                >
                  {/* quantity mark */}
                  <span
                    aria-hidden="true"
                    style={{
                      height: '1.1rem',
                      fontSize: '1.25rem',
                      lineHeight: 1,
                      color: checked ? color : 'var(--accent)',
                      fontWeight: 700,
                    }}
                  >
                    {syl.elides ? '' : mark === 'long' ? '—' : mark === 'short' ? '˘' : ''}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-latin)',
                      fontSize: '1.375rem',
                      color: syl.elides ? 'var(--fg-faint)' : color,
                      textDecoration: syl.elides ? 'line-through' : undefined,
                      borderBottom: !checked && !syl.elides ? '1px dotted var(--rule-strong)' : '1px solid transparent',
                    }}
                  >
                    {syl.text}
                  </span>
                </button>
                {caesura && checked && (
                  <span
                    className="mx-1 self-center text-lg"
                    style={{ color: 'var(--gilt)' }}
                    title={`${caesura.type} caesura`}
                  >
                    ‖
                  </span>
                )}
              </span>
            );
          })}
        </div>

        {!checked ? (
          <div className="flex flex-wrap items-center gap-2 border-t pt-4" style={{ borderColor: 'var(--rule)' }}>
            <button type="button" className="btn btn-primary" onClick={check} disabled={!allMarked}>
              Check my scansion
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => setMarks(new Array(line.syllables.length).fill(null))}
            >
              Clear
            </button>
            {!allMarked && (
              <span className="text-sm" style={{ color: 'var(--fg-faint)' }}>
                {metricalIdx.filter((i) => marks[i] === null).length} syllable(s) still unmarked.
              </span>
            )}
          </div>
        ) : (
          <div className="animate-in border-t pt-4" style={{ borderColor: 'var(--rule)' }}>
            <div className="mb-3 flex flex-wrap items-baseline gap-3">
              <span
                className="tabular-nums"
                style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 600 }}
              >
                {scored} / {metricalIdx.length}
              </span>
              <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                syllables correct
              </span>
              <div className="flex gap-1.5">
                {line.feet.map((f, i) => (
                  <Badge key={i} tone={f === 'dactyl' ? 'accent' : 'neutral'}>
                    {i + 1}. {f === 'dactyl' ? '— ˘ ˘' : '— —'}
                  </Badge>
                ))}
              </div>
            </div>

            {/* per-syllable explanation of the ones that went wrong */}
            {scored < metricalIdx.length && (
              <ul className="mb-3 flex flex-col gap-1.5">
                {metricalIdx
                  .filter((i) => marks[i] !== line.syllables[i].quantity)
                  .map((i) => (
                    <li key={i} className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                      <span style={{ fontFamily: 'var(--font-latin)', fontSize: '1rem', fontWeight: 600 }}>
                        {line.syllables[i].text}
                      </span>{' '}
                      is <strong style={{ color: 'var(--correct)' }}>{line.syllables[i].quantity}</strong>
                      {marks[i] && <> — you marked it {marks[i]}</>}. {explain(line, i)}
                    </li>
                  ))}
              </ul>
            )}

            <p className="measure text-sm" style={{ color: 'var(--fg-muted)' }}>
              {line.notes}
            </p>
            {line.caesurae.length > 0 && (
              <p className="mt-1.5 text-sm" style={{ color: 'var(--fg-muted)' }}>
                Caesurae:{' '}
                {line.caesurae.map((c, i) => (
                  <span key={c.type}>
                    {i > 0 && ', '}
                    {c.type}
                  </span>
                ))}
                .
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setIndex((i) => Math.min(i + 1, scansionLines.length - 1))}
                disabled={index >= scansionLines.length - 1}
              >
                Next line
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setMarks(new Array(line.syllables.length).fill(null));
                  setChecked(false);
                }}
              >
                Try again
              </button>
            </div>
          </div>
        )}
      </Card>

      {history.length > 0 && (
        <Card>
          <div className="eyebrow mb-2">This session</div>
          <div className="flex flex-wrap gap-1.5">
            {history.map((h, i) => (
              <Badge key={i} tone={h.correct === h.total ? 'green' : 'neutral'}>
                {h.id.replace('scan-aen-1-', '1.')} · {h.correct}/{h.total}
              </Badge>
            ))}
          </div>
        </Card>
      )}
    </Page>
  );
}

/** A short reason why a given syllable has the quantity it has. */
function explain(line: ScansionLine, i: number): string {
  const syl = line.syllables[i];
  const hasMacron = /[āēīōūȳĀĒĪŌŪȲ]/.test(syl.text);
  const isDiphthong = /ae|au|ei|eu|oe|ui/i.test(syl.text);
  if (syl.quantity === 'long') {
    if (isDiphthong) return 'It contains a diphthong, which is always long by nature.';
    if (hasMacron) return 'The source text marks the vowel long with a macron, so it is long by nature.';
    return 'The vowel is followed by two or more consonants, so it is long by position.';
  }
  return 'The vowel is short and is followed by at most one consonant, so nothing makes it long.';
}

function Tutorial() {
  return (
    <Card className="animate-in mb-6">
      <h2 className="mb-3" style={{ fontSize: '1.0625rem' }}>How dactylic hexameter works</h2>
      <div className="measure-wide grid gap-4 text-sm sm:grid-cols-2" style={{ color: 'var(--fg-muted)', lineHeight: 1.7 }}>
        <div>
          <h3 className="eyebrow mb-1.5">The line</h3>
          <p>
            Six feet. Each of the first four is either a <strong>dactyl</strong> (— ˘ ˘) or a{' '}
            <strong>spondee</strong> (— —). The fifth is almost always a dactyl; the sixth is always
            two syllables, and its last syllable counts long whatever it really is (anceps).
          </p>
          <p className="mt-2" style={{ fontFamily: 'var(--font-latin)', fontSize: '1.0625rem', color: 'var(--fg)' }}>
            — ˘˘ | — ˘˘ | — — | — — | — ˘˘ | — ×
          </p>
        </div>
        <div>
          <h3 className="eyebrow mb-1.5">Long by nature</h3>
          <p>
            A vowel is long by nature if it simply is long — which you cannot see unless the text
            marks it with a macron. Every <strong>diphthong</strong> (ae, au, ei, eu, oe, ui) is long
            by nature.
          </p>
        </div>
        <div>
          <h3 className="eyebrow mb-1.5">Long by position</h3>
          <p>
            A short vowel counts long if it is followed by <strong>two or more consonants</strong>,
            or by x or z — the consonants may straddle a word boundary. A mute plus a liquid (pr, tr,
            cl, br…) is the exception: it may leave the syllable short. h never makes position, and
            qu counts as a single consonant.
          </p>
        </div>
        <div>
          <h3 className="eyebrow mb-1.5">Elision</h3>
          <p>
            A word ending in a vowel, a diphthong, or a vowel + m loses that final syllable before a
            word beginning with a vowel or h. Elided syllables are struck through here and do not
            count toward the feet.
          </p>
        </div>
        <div>
          <h3 className="eyebrow mb-1.5">Caesura</h3>
          <p>
            A word-break inside a foot. The <strong>penthemimeral</strong> (after the first syllable
            of foot 3) is much the commonest in Vergil; the hephthemimeral falls in foot 4 and the
            trithemimeral in foot 2. A break at the end of foot 4 is a bucolic diaeresis.
          </p>
        </div>
        <div>
          <h3 className="eyebrow mb-1.5">A working method</h3>
          <p>
            Mark the elisions first, then everything long by position, then the diphthongs. Put a
            dactyl in the fifth foot and a spondee in the sixth. What remains usually has only one
            legal solution.
          </p>
        </div>
      </div>
    </Card>
  );
}
