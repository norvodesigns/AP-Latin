'use client';

import { useEffect, useMemo, useState } from 'react';
import { scansionLines } from '@/data/scansion';
import {
  useStore,
  scansionStatsByLine,
  nextScansionLineId,
  scansionBadges,
} from '@/store/useStore';
import { Page, PageHeader, Card, Badge, Empty } from '@/components/ui';
import type { ScansionLine } from '@/data/types';

type Mark = 'long' | 'short' | null;

const ALL_LINE_IDS = scansionLines.map((l) => l.id);

export default function ScansionLab() {
  const markStudied = useStore((s) => s.markStudied);
  const scansionAttempts = useStore((s) => s.scansionAttempts);
  const recordScansion = useStore((s) => s.recordScansion);

  const [index, setIndex] = useState(0);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [checked, setChecked] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [adaptive, setAdaptive] = useState(true);
  const [mounted, setMounted] = useState(false);

  const line: ScansionLine | undefined = scansionLines[index];

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!line) return;
    setMarks(new Array(line.syllables.length).fill(null));
    setChecked(false);
  }, [index, line]);

  useEffect(() => {
    markStudied();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Persistent, cross-session stats — replaces what used to be lost on refresh. */
  const stats = useMemo(() => scansionStatsByLine(scansionAttempts), [scansionAttempts]);
  const badges = useMemo(() => scansionBadges(scansionAttempts, ALL_LINE_IDS.length), [scansionAttempts]);
  const masteredCount = useMemo(() => [...stats.values()].filter((s) => s.mastered).length, [stats]);

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

  function goToLineId(id: string | null) {
    if (!id) return;
    const i = scansionLines.findIndex((l) => l.id === id);
    if (i >= 0) setIndex(i);
  }

  function practiceWeakest() {
    goToLineId(nextScansionLineId(ALL_LINE_IDS, scansionAttempts));
  }

  if (!line) {
    return (
      <Page>
        <PageHeader title="Scansion Lab" />
        <Empty title="No scanned lines loaded" body="Add lines to src/data/scansion.ts — see CONTENT.md." />
      </Page>
    );
  }

  const active: ScansionLine = line;
  const lineStats = mounted ? stats.get(active.id) : undefined;

  const result = checked
    ? active.syllables.map((s, i) => {
        if (s.elides) return marks[i] === null ? 'ok' : 'wrong-elision';
        return marks[i] === s.quantity ? 'ok' : marks[i] === null ? 'blank' : 'wrong';
      })
    : null;

  const scored = checked
    ? metricalIdx.filter((i) => marks[i] === active.syllables[i].quantity).length
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
    recordScansion(active.id, correct, metricalIdx.length);
  }

  function next() {
    if (adaptive) {
      // Exclude the line just finished so a single-line pool doesn't loop on itself.
      const rest = ALL_LINE_IDS.filter((id) => id !== active.id);
      const nextId = rest.length > 0 ? nextScansionLineId(rest, scansionAttempts) : active.id;
      goToLineId(nextId);
    } else {
      setIndex((i) => Math.min(i + 1, scansionLines.length - 1));
    }
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

      {/* persistent progress */}
      <Card className="mb-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-5">
            <div>
              <div className="eyebrow">Mastered</div>
              <div className="tabular-nums" style={{ fontFamily: 'var(--font-serif)', fontSize: '1.375rem', fontWeight: 600 }}>
                {mounted ? masteredCount : '—'}
                <span style={{ color: 'var(--fg-faint)', fontSize: '0.9375rem' }}> / {ALL_LINE_IDS.length}</span>
              </div>
            </div>
            <div>
              <div className="eyebrow">Attempts</div>
              <div className="tabular-nums" style={{ fontFamily: 'var(--font-serif)', fontSize: '1.375rem', fontWeight: 600 }}>
                {mounted ? scansionAttempts.length : '—'}
              </div>
            </div>
            <div>
              <div className="eyebrow">Badges</div>
              <div className="tabular-nums" style={{ fontFamily: 'var(--font-serif)', fontSize: '1.375rem', fontWeight: 600 }}>
                {mounted ? badges.filter((b) => b.earned).length : '—'}
                <span style={{ color: 'var(--fg-faint)', fontSize: '0.9375rem' }}> / {badges.length}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--fg-muted)' }}>
              <input
                type="checkbox"
                checked={adaptive}
                onChange={(e) => setAdaptive(e.target.checked)}
                style={{ accentColor: 'var(--accent)' }}
              />
              Adaptive order
            </label>
            <button type="button" className="btn text-xs" onClick={practiceWeakest}>
              Practice weakest line
            </button>
          </div>
        </div>

        {mounted && badges.some((b) => b.earned) && (
          <div className="mt-3 flex flex-wrap gap-1.5 border-t pt-3" style={{ borderColor: 'var(--rule)' }}>
            {badges.map((b) => (
              <span key={b.id} title={b.detail}>
                <Badge tone={b.earned ? 'gilt' : 'muted'}>
                  {b.earned ? '★' : '☆'} {b.label}
                </Badge>
              </span>
            ))}
          </div>
        )}
      </Card>

      {/* line picker */}
      <div className="mb-5 flex flex-wrap items-center gap-1.5">
        {scansionLines.map((l, i) => {
          const s = mounted ? stats.get(l.id) : undefined;
          const tone = s?.mastered ? 'mastered' : s ? 'attempted' : 'new';
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-current={i === index ? 'true' : undefined}
              className="rounded-md border px-2 py-1 text-xs tabular-nums transition-colors"
              style={{
                background: i === index ? 'var(--accent)' : tone === 'mastered' ? 'var(--correct-bg)' : tone === 'attempted' ? 'var(--partial-bg)' : 'transparent',
                borderColor: i === index ? 'var(--accent)' : tone === 'mastered' ? 'var(--correct)' : tone === 'attempted' ? 'var(--partial)' : 'var(--rule)',
                color: i === index ? 'var(--accent-fg)' : tone === 'mastered' ? 'var(--correct)' : tone === 'attempted' ? 'var(--partial)' : 'var(--fg-faint)',
              }}
              title={s ? `${l.citation} — ${Math.round(s.bestAccuracy * 100)}% best, ${s.attempts} attempt(s)` : l.citation}
            >
              {l.citation.split('.')[1]}
            </button>
          );
        })}
      </div>

      <Card className="mb-5">
        <div className="mb-1 flex items-baseline justify-between gap-3">
          <span className="eyebrow">{active.citation}</span>
          <span className="text-xs" style={{ color: 'var(--fg-faint)' }}>
            click a syllable to cycle: — → ˘ → blank
          </span>
        </div>
        {mounted && lineStats && (
          <div className="mb-2 flex items-center gap-2 text-xs" style={{ color: 'var(--fg-faint)' }}>
            <span>{lineStats.attempts} attempt{lineStats.attempts === 1 ? '' : 's'}</span>
            <span aria-hidden="true">·</span>
            <span>best {Math.round(lineStats.bestAccuracy * 100)}%</span>
            {lineStats.mastered && <Badge tone="green">mastered</Badge>}
          </div>
        )}

        {/* the line, syllable by syllable */}
        <div className="flex flex-wrap items-end gap-x-0.5 gap-y-4 py-4">
          {active.syllables.map((syl, i) => {
            const footIdx = footStarts.indexOf(i);
            const state = result?.[i];
            const mark = marks[i];
            const caesura = active.caesurae.find((c) => metricalIdx[c.afterSyllable] === i);

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
              onClick={() => setMarks(new Array(active.syllables.length).fill(null))}
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
                {active.feet.map((f, i) => (
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
                  .filter((i) => marks[i] !== active.syllables[i].quantity)
                  .map((i) => (
                    <li key={i} className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                      <span style={{ fontFamily: 'var(--font-latin)', fontSize: '1rem', fontWeight: 600 }}>
                        {active.syllables[i].text}
                      </span>{' '}
                      is <strong style={{ color: 'var(--correct)' }}>{active.syllables[i].quantity}</strong>
                      {marks[i] && <> — you marked it {marks[i]}</>}. {explain(active, i)}
                    </li>
                  ))}
              </ul>
            )}

            <p className="measure text-sm" style={{ color: 'var(--fg-muted)' }}>
              {active.notes}
            </p>
            {active.caesurae.length > 0 && (
              <p className="mt-1.5 text-sm" style={{ color: 'var(--fg-muted)' }}>
                Caesurae:{' '}
                {active.caesurae.map((c, i) => (
                  <span key={c.type}>
                    {i > 0 && ', '}
                    {c.type}
                  </span>
                ))}
                .
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className="btn btn-primary" onClick={next}>
                {adaptive ? 'Next (weakest line)' : 'Next line'}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setMarks(new Array(active.syllables.length).fill(null));
                  setChecked(false);
                }}
              >
                Try again
              </button>
            </div>
          </div>
        )}
      </Card>
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
