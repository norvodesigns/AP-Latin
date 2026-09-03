'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useStore, STORAGE_KEY } from '@/store/useStore';
import { useAiStatus } from '@/lib/useAi';
import { Page, PageHeader, Section, Panel, CedLink, SourceNote } from '@/components/ui';

/** Gemini's free tier has historically allowed on the order of 1,500 requests
 *  a day. It changes, so this is a reference line, not a hard limit. */
const FREE_TIER_REFERENCE = 1500;

/** One of the three big tallies in the AI-usage row. */
function Tally({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div>
      <div className="slab-sm mb-1.5">{label}</div>
      <div
        className="tabular-nums"
        style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', lineHeight: 1, fontWeight: 600 }}
      >
        {value}
      </div>
      {note && (
        <div className="mt-1.5" style={{ color: 'var(--fg-faint)', fontSize: '0.875rem' }}>
          {note}
        </div>
      )}
    </div>
  );
}

export default function Settings() {
  const ai = useAiStatus();
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const showMacrons = useStore((s) => s.showMacrons);
  const glossaryEnabled = useStore((s) => s.glossaryEnabled);
  const toggleGlossary = useStore((s) => s.toggleGlossary);
  const aiUsage = useStore((s) => s.aiUsage);
  const exportJSON = useStore((s) => s.exportJSON);
  const importJSON = useStore((s) => s.importJSON);
  const resetAll = useStore((s) => s.resetAll);

  const [mounted, setMounted] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  const today = new Date().toISOString().slice(0, 10);
  const todayUsage = aiUsage.find((d) => d.date === today);
  const last7 = aiUsage.slice(-7);
  const totalCalls = aiUsage.reduce((n, d) => n + d.calls, 0);

  function download() {
    const blob = new Blob([exportJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ap-latin-${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage({ kind: 'ok', text: 'Exported. Keep it somewhere safe — it is your only backup.' });
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const res = importJSON(text);
    setMessage(
      res.ok
        ? { kind: 'ok', text: 'Imported. Your progress has been replaced with the file’s contents.' }
        : { kind: 'err', text: res.error },
    );
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Preferences and data"
        title="Settings"
        lede="Everything you do in this app lives in this browser’s local storage. There is no account and no server-side database, which means the export button is your only backup."
      />

      {message && (
        <div
          role="status"
          className="animate-in mb-8 rounded-[var(--r-md)] border px-4 py-3"
          style={{
            borderColor: message.kind === 'ok' ? 'var(--rule-strong)' : 'var(--accent)',
            background: message.kind === 'ok' ? 'transparent' : 'var(--redtint)',
            fontFamily: 'var(--font-latin)',
            fontSize: '1.0625rem',
            color: message.kind === 'ok' ? 'var(--ink2)' : 'var(--accent)',
          }}
        >
          {message.text}
        </div>
      )}

      <Section title="Appearance" className="mb-12">
        <div className="mb-7">
          <span className="slab-sm mb-2.5 block">Theme</span>
          <div className="flex gap-1.5">
            {(['light', 'dark', 'system'] as const).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={mounted && theme === t}
                onClick={() => setTheme(t)}
                className={mounted && theme === t ? 'btn btn-rubric capitalize' : 'btn capitalize'}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <label className="squish flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={mounted ? glossaryEnabled : true}
            onChange={toggleGlossary}
            className="mt-1"
            style={{ accentColor: 'var(--accent)', width: '1rem', height: '1rem' }}
          />
          <span>
            <span style={{ fontFamily: 'var(--font-latin)', fontSize: '1.0625rem' }}>
              Glossary on by default in the Reading Room
            </span>
            <span className="mt-1 block" style={{ color: 'var(--fg-faint)', fontSize: '0.9375rem' }}>
              Turn it off to read cold. You can also toggle it with <span className="kbd">c</span>{' '}
              while reading.
            </span>
          </span>
        </label>

        <p
          className="measure mt-6"
          style={{
            margin: '1.5rem 0 0',
            fontFamily: 'var(--font-latin)',
            fontSize: '1rem',
            lineHeight: 1.65,
            color: 'var(--fg-muted)',
          }}
        >
          Macrons are shown wherever the source text provides them
          {mounted ? ` (currently ${showMacrons ? 'on' : 'off'})` : ''}. Only Aeneid 1.1–33 carries
          them, because that is the only passage whose public-domain source marks vowel quantity.
          Adding macrons elsewhere would mean inventing data.
        </p>
      </Section>

      <Section
        title="AI usage"
        aside={
          !ai.loading ? (
            <span className={ai.configured ? 'chip chip-gilt' : 'chip'}>
              {ai.configured ? 'configured' : 'not configured'}
            </span>
          ) : undefined
        }
        className="mb-12"
      >
        {!ai.loading && !ai.configured ? (
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
            No provider key is set on this deployment, so every AI feature is off and the app runs in
            self-grading mode. See the README for how to add a free Gemini key in the Vercel
            dashboard.
          </p>
        ) : (
          <>
            <div className="mb-8 grid gap-7 sm:grid-cols-3">
              <Tally
                label="Today"
                value={mounted ? (todayUsage?.calls ?? 0) : '—'}
                note={`of ~${FREE_TIER_REFERENCE.toLocaleString()} free-tier requests`}
              />
              <Tally
                label="Last 7 days"
                value={mounted ? last7.reduce((n, d) => n + d.calls, 0) : '—'}
              />
              <Tally label="All time" value={mounted ? totalCalls : '—'} />
            </div>

            {mounted && last7.length > 0 && (
              <div
                className="mb-8 flex items-end gap-2"
                style={{ height: '3.5rem' }}
                aria-hidden="true"
              >
                {last7.map((d) => {
                  const max = Math.max(...last7.map((x) => x.calls), 1);
                  return (
                    <div key={d.date} className="flex flex-1 flex-col items-center gap-1.5">
                      <div
                        className="w-full rounded-t-[var(--r-sm)]"
                        style={{
                          height: `${(d.calls / max) * 100}%`,
                          minHeight: d.calls > 0 ? '3px' : '1px',
                          background: d.date === today ? 'var(--accent)' : 'var(--track)',
                          transition: 'height var(--dur-3) var(--ease-spring)',
                        }}
                        title={`${d.date}: ${d.calls} calls`}
                      />
                      <span style={{ color: 'var(--fg-faint)', fontSize: '0.6875rem' }}>
                        {d.date.slice(8)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {mounted && todayUsage && Object.keys(todayUsage.byRoute).length > 0 && (
              <div className="mb-8">
                <div className="slab-sm mb-3">Today by endpoint</div>
                <ul className="flex flex-col pl-0" style={{ listStyle: 'none' }}>
                  {Object.entries(todayUsage.byRoute)
                    .sort((a, b) => b[1] - a[1])
                    .map(([route, n]) => (
                      <li
                        key={route}
                        className="row-hover flex items-baseline justify-between gap-4 rounded-[var(--r-sm)] border-t px-2 py-2"
                        style={{ borderColor: 'var(--hair)', marginLeft: '-0.5rem' }}
                      >
                        <span style={{ color: 'var(--ink2)', fontFamily: 'var(--font-latin)' }}>
                          {route}
                        </span>
                        <span className="tabular-nums" style={{ color: 'var(--fg-muted)' }}>
                          {n}
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            )}

            <div
              className="measure-wide border-t pt-5"
              style={{ borderColor: 'var(--rule)', color: 'var(--fg-faint)', fontSize: '0.9375rem' }}
            >
              <p style={{ margin: '0 0 0.5rem' }}>
                Providers configured:{' '}
                {ai.providers?.google.configured && <>Gemini ({ai.providers.google.model}) </>}
                {ai.providers?.groq.configured
                  ? <>· Groq fallback ({ai.providers.groq.model})</>
                  : '· no fallback configured'}
              </p>
              <p style={{ margin: '0 0 0.5rem' }}>
                Counted client-side, so it reflects what this browser has asked for, not what the
                provider has billed. Cached sight passages are not counted, because they never reach
                a provider.
              </p>
              <p style={{ margin: 0 }}>
                Rate limits are enforced server-side: 20 grading calls and 30 tutor questions per 10
                minutes, 10 sight generations.
              </p>
            </div>
          </>
        )}
      </Section>

      <Section title="Your data" className="mb-12">
        <p
          className="measure"
          style={{
            margin: '0 0 1.5rem',
            fontFamily: 'var(--font-latin)',
            fontSize: '1.0625rem',
            lineHeight: 1.65,
            color: 'var(--ink2)',
          }}
        >
          Reading notes, flagged lines, vocabulary schedules, quiz history, translations, essays and
          course project passages are all stored under{' '}
          <code style={{ fontSize: '0.9em' }}>{STORAGE_KEY}</code> in this browser. Clearing your
          browser data deletes them. Export regularly.
        </p>
        <div className="flex flex-wrap gap-2.5">
          <button type="button" className="btn btn-primary" onClick={download}>
            Export JSON
          </button>
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
            Import JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            onChange={onFile}
            className="sr-only"
            aria-label="Import a previously exported JSON file"
          />
        </div>
      </Section>

      <Panel>
        <div className="rubric mb-2.5">Reset everything</div>
        <p
          className="measure"
          style={{
            margin: '0 0 1.25rem',
            fontFamily: 'var(--font-latin)',
            fontSize: '1.0625rem',
            lineHeight: 1.65,
            color: 'var(--ink2)',
          }}
        >
          Deletes all progress in this browser. There is no undo — export first.
        </p>
        {!confirmReset ? (
          <button
            type="button"
            className="btn"
            style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
            onClick={() => setConfirmReset(true)}
          >
            Reset all progress
          </button>
        ) : (
          <div className="animate-in flex flex-wrap items-center gap-2.5">
            <span style={{ fontFamily: 'var(--font-latin)', fontSize: '1.0625rem' }}>
              Are you sure?
            </span>
            <button
              type="button"
              className="btn btn-rubric"
              onClick={() => {
                resetAll();
                setConfirmReset(false);
                setMessage({ kind: 'ok', text: 'Everything has been reset.' });
              }}
            >
              Yes, delete it all
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setConfirmReset(false)}>
              Cancel
            </button>
          </div>
        )}
      </Panel>

      <SourceNote>
        AI-graded work is checked against the segment and rubric data in this app, which is written
        against the official <CedLink to="scoring">scoring guidelines</CedLink>.
      </SourceNote>
    </Page>
  );
}
