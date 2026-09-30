'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useStore } from '@/store/useStore';
import { PARADIGMS, PARADIGM_KIND_LABELS, cellForms, type Paradigm, type ParadigmKind } from '@/data/forms';
import { forgeScope, headword, makeRound, type ChartQuestion, type ForgeMode, type ForgeQuestion, type MakeQuestion, type NameQuestion } from '@/lib/forge';
import { checkTyped } from '@/lib/lessonCheck';
import { Page, PageHeader, Panel, Section } from '@/components/ui';
import { Rich } from '@/components/Rich';

const KINDS: ParadigmKind[] = ['noun', 'adjective', 'pronoun', 'verb'];
const ROUND = 10;

const MODES: Array<{ id: ForgeMode; title: string; body: string }> = [
  { id: 'make', title: 'Make the form', body: 'Given a word and what is wanted, type the form.' },
  { id: 'name', title: 'Name the form', body: 'Given a form, say what it is.' },
  { id: 'chart', title: 'Fill the chart', body: 'Complete a table with some cells left blank.' },
];

const prose: CSSProperties = { fontFamily: 'var(--font-latin)', fontSize: '1.125rem', lineHeight: 1.6, color: 'var(--ink2)' };

export default function Forge() {
  const lessons = useStore((s) => s.lessons);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const learnedIds = useMemo(() => new Set(Object.keys(lessons ?? {})), [lessons]);
  const hasCourse = mounted && learnedIds.size > 0;

  const [mode, setMode] = useState<ForgeMode>('make');
  const [kinds, setKinds] = useState<Set<ParadigmKind>>(new Set(KINDS));
  const [learnedOnly, setLearnedOnly] = useState(true);
  const [round, setRound] = useState<ForgeQuestion[] | null>(null);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<boolean[]>([]);

  const scope = useMemo(
    () => forgeScope(PARADIGMS, kinds, hasCourse && learnedOnly ? learnedIds : null),
    [kinds, hasCourse, learnedOnly, learnedIds],
  );
  const formCount = scope.reduce((n, p) => n + p.rows.length * p.cols.length, 0);

  function start() {
    setRound(makeRound(scope, mode, ROUND));
    setIndex(0);
    setResults([]);
  }

  function toggleKind(k: ParadigmKind) {
    setKinds((prev) => {
      const next = new Set(prev);
      if (next.has(k) && next.size > 1) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  if (round && index < round.length) {
    const q = round[index];
    return (
      <Page>
        <div className="mb-8 flex items-center gap-4">
          <button type="button" className="btn btn-ghost" onClick={() => setRound(null)}>
            End
          </button>
          <div className="meter meter-thin flex-1" role="meter" aria-valuenow={index} aria-valuemin={0} aria-valuemax={round.length} aria-label="Progress">
            <span style={{ width: `${(index / round.length) * 100}%` }} />
          </div>
          <span className="slab-sm tabular-nums" style={{ color: 'var(--fg-muted)' }}>
            {index + 1} / {round.length}
          </span>
        </div>
        <ParadigmHeading p={q.paradigm} />
        <QuestionView
          key={index}
          q={q}
          onDone={(right) => {
            setResults((r) => [...r, right]);
            setIndex((i) => i + 1);
          }}
        />
      </Page>
    );
  }

  if (round && index >= round.length) {
    const right = results.filter(Boolean).length;
    return (
      <Page>
        <PageHeader eyebrow="Forms Forge" title={right === results.length ? 'Every one right.' : `${right} of ${results.length} right`} />
        <p className="measure" style={prose}>
          {right === results.length
            ? 'Clean work. Try a harder mode, or widen the tables in play.'
            : 'The ones you missed are the ones to come back to. Another round mixes them in again.'}
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <button type="button" className="btn btn-primary" onClick={start} autoFocus>
            Another round
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setRound(null)}>
            Change settings
          </button>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Drill"
        title="Forms Forge"
        lede="Every ending in Latin, hammered until it is automatic. Choose a way to practise and which tables to use; a round is ten questions."
      />

      <Section title="How" className="mb-10">
        <div className="grid gap-3 sm:grid-cols-3">
          {MODES.map((m) => {
            const on = m.id === mode;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                aria-pressed={on}
                className="squish row-hover rounded-[var(--r-md)] border px-4 py-4 text-left"
                style={{ borderColor: on ? 'var(--accent)' : 'var(--rule-strong)', background: on ? 'var(--redtint)' : undefined }}
              >
                <span className="block" style={{ fontFamily: 'var(--font-serif)', fontSize: '1.125rem', color: on ? 'var(--accent)' : 'var(--fg)' }}>
                  {m.title}
                </span>
                <span className="mt-1 block" style={{ fontFamily: 'var(--font-latin)', fontSize: '0.975rem', color: 'var(--fg-muted)' }}>
                  {m.body}
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Which tables" className="mb-10">
        <div className="flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <button key={k} type="button" className={`chip ${kinds.has(k) ? 'chip-on' : ''}`} aria-pressed={kinds.has(k)} onClick={() => toggleKind(k)}>
              {PARADIGM_KIND_LABELS[k]}
            </button>
          ))}
        </div>
        {hasCourse && (
          <label className="mt-4 flex items-center gap-2.5" style={{ fontFamily: 'var(--font-latin)', fontSize: '1.0625rem' }}>
            <input type="checkbox" checked={learnedOnly} onChange={(e) => setLearnedOnly(e.target.checked)} />
            Only tables from course lessons I have finished
          </label>
        )}
        <p className="mt-4" style={{ ...prose, fontSize: '1rem', color: 'var(--fg-muted)', margin: '1rem 0 0' }}>
          {scope.length === 0
            ? 'Nothing in play yet: finish a course lesson with a table, or include every table.'
            : `${scope.length} table${scope.length === 1 ? '' : 's'}, ${formCount} forms.`}
        </p>
        <button type="button" className="btn btn-primary mt-6" disabled={scope.length === 0} onClick={start}>
          Start · {ROUND} questions
        </button>
      </Section>

      <Section title="The tables" aside={<span className="slab-sm" style={{ color: 'var(--fg-faint)' }}>for reference</span>}>
        {KINDS.map((k) => (
          <div key={k} className="mb-6">
            <h3 className="rubric mb-2">{PARADIGM_KIND_LABELS[k]}</h3>
            {PARADIGMS.filter((p) => p.kind === k).map((p) => (
              <details key={p.id} className="border-t py-2.5" style={{ borderColor: 'var(--rule)' }}>
                <summary className="cursor-pointer" style={{ fontFamily: 'var(--font-latin)', fontSize: '1.0625rem' }}>
                  <span className="latin">{p.lemma}</span> <span style={{ color: 'var(--fg-muted)' }}>· {p.gloss} · {p.title}</span>
                </summary>
                <div className="mt-3 overflow-x-auto">
                  <ParadigmTableView p={p} />
                </div>
              </details>
            ))}
          </div>
        ))}
      </Section>
    </Page>
  );
}

function ParadigmHeading({ p }: { p: Paradigm }) {
  return (
    <div className="mb-6">
      <div className="slab-sm mb-1" style={{ color: 'var(--fg-muted)' }}>
        {p.title}
      </div>
      <div className="latin" style={{ fontSize: '1.375rem' }}>
        {p.lemma} <span style={{ fontFamily: 'var(--font-latin)', color: 'var(--fg-muted)', fontSize: '1.0625rem' }}>· {p.gloss}</span>
      </div>
    </div>
  );
}

function QuestionView({ q, onDone }: { q: ForgeQuestion; onDone: (right: boolean) => void }) {
  if (q.mode === 'make') return <MakeView q={q} onDone={onDone} />;
  if (q.mode === 'name') return <NameView q={q} onDone={onDone} />;
  return <ChartView q={q} onDone={onDone} />;
}

function Verdict({ right, answer, onContinue }: { right: boolean; answer?: string; onContinue: () => void }) {
  return (
    <Panel className="animate-in mt-7">
      <div className="rubric mb-2.5" style={{ color: right ? 'var(--correct)' : 'var(--accent)' }}>
        {right ? 'Rēctē — right' : 'Not quite'}
      </div>
      {!right && answer && (
        <p style={{ ...prose, margin: 0 }}>
          <span className="slab-sm mr-2" style={{ color: 'var(--fg-muted)' }}>Answer</span>
          <span className="latin" style={{ fontSize: '1.25rem' }}>
            <Rich text={answer} endings />
          </span>
        </p>
      )}
      <button type="button" className="btn btn-primary mt-5" onClick={onContinue} autoFocus>
        Continue <span className="kbd ml-2" aria-hidden="true">↵</span>
      </button>
    </Panel>
  );
}

function MakeView({ q, onDone }: { q: MakeQuestion; onDone: (right: boolean) => void }) {
  const [value, setValue] = useState('');
  const [result, setResult] = useState<boolean | null>(null);
  return (
    <div>
      <h2 className="measure mb-5" style={{ fontSize: '1.375rem', fontWeight: 550, lineHeight: 1.35 }}>
        Give the <strong>{q.asked}</strong> of <em className="latin">{headword(q.paradigm)}</em>.
      </h2>
      <form
        className="flex flex-wrap items-center gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (result === null && value.trim()) setResult(checkTyped(value, q.answers));
        }}
      >
        <input
          className="input latin"
          style={{ fontSize: '1.375rem', maxWidth: '22rem', flex: '1 1 14rem' }}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={result !== null}
          autoFocus
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Your answer"
          placeholder="Type the form"
        />
        {result === null && (
          <button type="submit" className="btn btn-primary" disabled={!value.trim()}>
            Check
          </button>
        )}
      </form>
      <p className="slab-sm mt-2.5" style={{ color: 'var(--fg-faint)' }}>Macrons are optional when you type.</p>
      {result !== null && <Verdict right={result} answer={q.paradigm.rows[q.row].cells[q.col]} onContinue={() => onDone(result)} />}
    </div>
  );
}

function NameView({ q, onDone }: { q: NameQuestion; onDone: (right: boolean) => void }) {
  const [chosen, setChosen] = useState<number | null>(null);
  const revealed = chosen !== null;

  useEffect(() => {
    if (revealed) return;
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= q.options.length) setChosen(n - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [revealed, q.options.length]);

  return (
    <div>
      <h2 className="mb-4" style={{ fontSize: '1.375rem', fontWeight: 550 }}>What is this form?</h2>
      <p className="latin mb-6" style={{ fontSize: '2rem', margin: '0 0 1.5rem' }}>
        <Rich text={q.form} endings />
      </p>
      <ul className="flex flex-col gap-2.5 pl-0" style={{ listStyle: 'none' }}>
        {q.options.map((o, i) => {
          const style: CSSProperties = { borderColor: 'var(--rule-strong)' };
          if (revealed && i === q.answer) {
            style.borderColor = 'var(--correct)';
            style.background = 'var(--correct-bg)';
          } else if (revealed && i === chosen) {
            style.borderColor = 'var(--accent)';
            style.background = 'var(--incorrect-bg)';
          } else if (revealed) {
            style.opacity = 0.5;
          }
          return (
            <li key={o}>
              <button
                type="button"
                disabled={revealed}
                onClick={() => setChosen(i)}
                className="squish row-hover flex w-full items-start gap-3.5 rounded-[var(--r-md)] border px-4 py-3 text-left"
                style={{ ...style, cursor: revealed ? 'default' : 'pointer' }}
              >
                <span className="kbd mt-0.5 shrink-0" aria-hidden="true">{i + 1}</span>
                <span style={{ fontFamily: 'var(--font-latin)', fontSize: '1.0625rem' }}>{o}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {revealed && <Verdict right={chosen === q.answer} onContinue={() => onDone(chosen === q.answer)} />}
    </div>
  );
}

function ChartView({ q, onDone }: { q: ChartQuestion; onDone: (right: boolean) => void }) {
  const p = q.paradigm;
  const blankKey = (r: number, c: number) => `${r}:${c}`;
  const blanks = new Set(q.blanks.map(([r, c]) => blankKey(r, c)));
  const [values, setValues] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const rightAt = (r: number, c: number) => checkTyped(values[blankKey(r, c)] ?? '', cellForms(p.rows[r].cells[c]));
  const allRight = q.blanks.every(([r, c]) => rightAt(r, c));
  const filled = q.blanks.every(([r, c]) => (values[blankKey(r, c)] ?? '').trim());

  return (
    <div>
      <h2 className="mb-5" style={{ fontSize: '1.375rem', fontWeight: 550 }}>Fill in the blanks.</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!checked && filled) setChecked(true);
        }}
      >
        <div className="overflow-x-auto">
          <table className="chart">
            <thead>
              <tr>
                <th />
                {p.cols.map((c) => (
                  <th key={c} scope="col">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {p.rows.map((row, r) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  {row.cells.map((cell, c) => {
                    const k = blankKey(r, c);
                    if (!blanks.has(k)) {
                      return (
                        <td key={k} className="latin">
                          <Rich text={cell} endings />
                        </td>
                      );
                    }
                    const ok = checked && rightAt(r, c);
                    return (
                      <td key={k}>
                        <input
                          className="input latin"
                          style={{
                            fontSize: '1rem',
                            padding: '0.25rem 0.5rem',
                            minWidth: '7rem',
                            borderColor: checked ? (ok ? 'var(--correct)' : 'var(--accent)') : undefined,
                          }}
                          value={values[k] ?? ''}
                          onChange={(e) => setValues((v) => ({ ...v, [k]: e.target.value }))}
                          disabled={checked}
                          autoFocus={q.blanks[0][0] === r && q.blanks[0][1] === c}
                          autoCapitalize="off"
                          autoCorrect="off"
                          spellCheck={false}
                          aria-label={p.names[r][c]}
                        />
                        {checked && !ok && (
                          <div className="latin mt-1" style={{ fontSize: '0.95rem' }}>
                            <Rich text={cell} endings />
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!checked && (
          <button type="submit" className="btn btn-primary mt-6" disabled={!filled}>
            Check
          </button>
        )}
      </form>
      <p className="slab-sm mt-2.5" style={{ color: 'var(--fg-faint)' }}>Macrons are optional when you type.</p>
      {checked && <Verdict right={allRight} onContinue={() => onDone(allRight)} />}
    </div>
  );
}

export function ParadigmTableView({ p }: { p: Paradigm }) {
  return (
    <table className="chart">
      <thead>
        <tr>
          <th />
          {p.cols.map((c) => (
            <th key={c} scope="col">{c}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {p.rows.map((row) => (
          <tr key={row.label}>
            <th scope="row">{row.label}</th>
            {row.cells.map((cell, c) => (
              <td key={c} className="latin">
                <Rich text={cell} endings />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
