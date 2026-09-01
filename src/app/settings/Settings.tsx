'use client';

import { useEffect, useRef, useState } from 'react';
import { useStore, STORAGE_KEY } from '@/store/useStore';
import { useAiStatus } from '@/lib/useAi';
import { Page, PageHeader, Card, Badge } from '@/components/ui';

/** Gemini's free tier has historically allowed on the order of 1,500 requests
 *  a day. It changes, so this is a reference line, not a hard limit. */
const FREE_TIER_REFERENCE = 1500;

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

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
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
          className="mb-5 rounded-lg border px-3.5 py-2.5 text-sm"
          style={{
            background: message.kind === 'ok' ? 'var(--correct-bg)' : 'var(--incorrect-bg)',
            borderColor: message.kind === 'ok' ? 'var(--correct)' : 'var(--incorrect)',
            color: 'var(--fg-muted)',
          }}
        >
          {message.text}
        </div>
      )}

      {/* appearance */}
      <Card className="mb-5">
        <h2 className="mb-3" style={{ fontSize: '1rem' }}>Appearance</h2>
        <div className="mb-4">
          <span className="mb-1.5 block text-sm" style={{ color: 'var(--fg-muted)' }}>Theme</span>
          <div className="flex gap-1.5">
            {(['light', 'dark', 'system'] as const).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={mounted && theme === t}
                onClick={() => setTheme(t)}
                className="btn capitalize"
                style={
                  mounted && theme === t
                    ? { background: 'var(--accent)', borderColor: 'var(--accent)', color: 'var(--accent-fg)' }
                    : undefined
                }
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-start gap-2.5">
          <input
            type="checkbox"
            checked={mounted ? glossaryEnabled : true}
            onChange={toggleGlossary}
            className="mt-0.5"
            style={{ accentColor: 'var(--accent)' }}
          />
          <span className="text-sm">
            Glossary on by default in the Reading Room
            <span className="block text-xs" style={{ color: 'var(--fg-faint)' }}>
              Turn it off to read cold. You can also toggle it with <span className="kbd">c</span> while reading.
            </span>
          </span>
        </label>
        <p className="mt-3 text-xs" style={{ color: 'var(--fg-faint)' }}>
          Macrons: shown wherever the source text provides them ({mounted && showMacrons ? 'on' : 'on'}).
          Only Aeneid 1.1–33 carries them, because that is the only passage whose public-domain source
          marks vowel quantity. Adding macrons elsewhere would mean inventing data.
        </p>
      </Card>

      {/* AI usage meter */}
      <Card className="mb-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 style={{ fontSize: '1rem' }}>AI usage</h2>
          {!ai.loading && (
            <Badge tone={ai.configured ? 'green' : 'muted'}>
              {ai.configured ? 'configured' : 'not configured'}
            </Badge>
          )}
        </div>

        {!ai.loading && !ai.configured ? (
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
            No provider key is set on this deployment, so every AI feature is off and the app runs in
            self-grading mode. See the README for how to add a free Gemini key in the Vercel
            dashboard.
          </p>
        ) : (
          <>
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              <div>
                <div className="eyebrow">Today</div>
                <div className="tabular-nums" style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', fontWeight: 600 }}>
                  {mounted ? (todayUsage?.calls ?? 0) : '—'}
                </div>
                <div className="text-xs" style={{ color: 'var(--fg-faint)' }}>
                  of ~{FREE_TIER_REFERENCE.toLocaleString()} free-tier requests
                </div>
              </div>
              <div>
                <div className="eyebrow">Last 7 days</div>
                <div className="tabular-nums" style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', fontWeight: 600 }}>
                  {mounted ? last7.reduce((n, d) => n + d.calls, 0) : '—'}
                </div>
              </div>
              <div>
                <div className="eyebrow">All time</div>
                <div className="tabular-nums" style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', fontWeight: 600 }}>
                  {mounted ? totalCalls : '—'}
                </div>
              </div>
            </div>

            {mounted && todayUsage && Object.keys(todayUsage.byRoute).length > 0 && (
              <div className="mb-4">
                <div className="eyebrow mb-1.5">Today by endpoint</div>
                <ul className="flex flex-col gap-1">
                  {Object.entries(todayUsage.byRoute)
                    .sort((a, b) => b[1] - a[1])
                    .map(([route, n]) => (
                      <li key={route} className="flex items-baseline justify-between text-sm">
                        <span style={{ color: 'var(--fg-muted)' }}>{route}</span>
                        <span className="tabular-nums">{n}</span>
                      </li>
                    ))}
                </ul>
              </div>
            )}

            {mounted && last7.length > 0 && (
              <div className="mb-4 flex items-end gap-1.5" style={{ height: '3rem' }}>
                {last7.map((d) => {
                  const max = Math.max(...last7.map((x) => x.calls), 1);
                  return (
                    <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                      <div
                        className="w-full rounded-t"
                        style={{
                          height: `${(d.calls / max) * 100}%`,
                          minHeight: d.calls > 0 ? '3px' : '1px',
                          background: d.date === today ? 'var(--accent)' : 'var(--rule-strong)',
                        }}
                        title={`${d.date}: ${d.calls} calls`}
                      />
                      <span className="text-[0.625rem]" style={{ color: 'var(--fg-faint)' }}>
                        {d.date.slice(8)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="border-t pt-3.5 text-xs" style={{ borderColor: 'var(--rule)', color: 'var(--fg-faint)' }}>
              <p className="mb-1.5">
                Providers configured:{' '}
                {ai.providers?.google.configured && <>Gemini ({ai.providers.google.model}) </>}
                {ai.providers?.groq.configured && <>· Groq fallback ({ai.providers.groq.model})</>}
                {!ai.providers?.groq.configured && '· no fallback configured'}
              </p>
              <p className="mb-1.5">
                Counted client-side, so it reflects what this browser has asked for, not what the
                provider has billed. Cached sight passages are not counted, because they never reach
                a provider.
              </p>
              <p>
                Rate limits are enforced server-side: 20 grading calls and 30 tutor questions per 10
                minutes, 10 sight generations.
              </p>
            </div>
          </>
        )}
      </Card>

      {/* data */}
      <Card className="mb-5">
        <h2 className="mb-1" style={{ fontSize: '1rem' }}>Your data</h2>
        <p className="mb-4 text-sm" style={{ color: 'var(--fg-muted)' }}>
          Reading notes, flagged lines, vocabulary schedules, quiz history, translations, essays and
          course project passages are all stored under{' '}
          <code style={{ fontSize: '0.85em' }}>{STORAGE_KEY}</code> in this browser. Clearing your
          browser data deletes them. Export regularly.
        </p>
        <div className="flex flex-wrap gap-2">
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
      </Card>

      {/* danger */}
      <Card>
        <h2 className="mb-1" style={{ fontSize: '1rem', color: 'var(--incorrect)' }}>Reset everything</h2>
        <p className="mb-3 text-sm" style={{ color: 'var(--fg-muted)' }}>
          Deletes all progress in this browser. There is no undo — export first.
        </p>
        {!confirmReset ? (
          <button
            type="button"
            className="btn"
            style={{ borderColor: 'var(--incorrect)', color: 'var(--incorrect)' }}
            onClick={() => setConfirmReset(true)}
          >
            Reset all progress
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm" style={{ color: 'var(--fg)' }}>Are you sure?</span>
            <button
              type="button"
              className="btn"
              style={{ background: 'var(--incorrect)', borderColor: 'var(--incorrect)', color: '#fff' }}
              onClick={() => {
                resetAll();
                setConfirmReset(false);
                setMessage({ kind: 'ok', text: 'Everything has been reset.' });
              }}
            >
              Yes, delete it all
            </button>
            <button type="button" className="btn" onClick={() => setConfirmReset(false)}>
              Cancel
            </button>
          </div>
        )}
      </Card>
    </Page>
  );
}
