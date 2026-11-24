'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { IMPORT_LIMITS, unglossedWords, type ImportedText } from '@/lib/imports';
import { tokenize } from '@/lib/tokenize';
import { useGlossRest } from '@/lib/importClient';

const body = { margin: 0, fontFamily: 'var(--font-latin)', fontSize: '1.0625rem', lineHeight: 1.5, color: 'var(--ink2)' } as const;
const small = { margin: 0, fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', lineHeight: 1.45, color: 'var(--fg-muted)' } as const;

/**
 * The Reader's margin for a text the reader imported, in place of the
 * syllabus passages' summary, context and themes: where it is from, how much
 * of it is glossed (and a way to gloss the rest), and its details to edit,
 * or the text to delete.
 */
export default function ImportedPanel({ text }: { text: ImportedText }) {
  const router = useRouter();
  const updateImportedText = useStore((s) => s.updateImportedText);
  const deleteImportedText = useStore((s) => s.deleteImportedText);
  const rest = useGlossRest(text);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: text.title, author: text.author, source: text.source });
  const [confirming, setConfirming] = useState(false);

  const counts = useMemo(() => {
    let dictionary = 0;
    let ai = 0;
    let none = 0;
    for (const l of text.lines) {
      for (const t of tokenize(l.latin)) {
        if (!t.isWord) continue;
        const w = text.words[t.text];
        if (w?.g?.some((x) => x.m === 'e')) dictionary++;
        else if (w?.ai) ai++;
        else none++;
      }
    }
    return { dictionary, ai, none, total: dictionary + ai + none };
  }, [text]);
  const remaining = useMemo(() => unglossedWords(text).length, [text]);
  const pct = counts.total ? Math.round(((counts.dictionary + counts.ai) / counts.total) * 100) : 0;

  const save = () => {
    updateImportedText(text.id, {
      title: draft.title.trim().slice(0, IMPORT_LIMITS.title) || text.title,
      author: draft.author.trim().slice(0, IMPORT_LIMITS.author),
      source: draft.source.trim().slice(0, IMPORT_LIMITS.source),
    });
    setEditing(false);
  };

  return (
    <div className="flex flex-col gap-5">
      {editing ? (
        <div className="flex flex-col gap-3">
          {(
            [
              ['title', 'Title', IMPORT_LIMITS.title],
              ['author', 'Author', IMPORT_LIMITS.author],
              ['source', 'Where it’s from', IMPORT_LIMITS.source],
            ] as const
          ).map(([key, label, max]) => (
            <label key={key} className="flex flex-col gap-1.5">
              <span style={{ ...small, fontWeight: 600, color: 'var(--fg)' }}>{label}</span>
              <input
                className="input"
                style={{ fontSize: '1rem', padding: '0.5rem 0.75rem' }}
                value={draft[key]}
                maxLength={max}
                onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
              />
            </label>
          ))}
          <div className="flex gap-2">
            <button type="button" className="btn btn-sm btn-rubric" onClick={save}>
              Save
            </button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {(text.author || text.source) && (
            <p style={body}>{[text.author, text.source].filter(Boolean).join(', ')}</p>
          )}
          <p style={small}>
            Imported {new Date(text.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })} ·{' '}
            {text.genre === 'poetry' ? 'verse' : 'prose'}, {text.lines.length} {text.lines.length === 1 ? 'line' : 'lines'}
          </p>
        </div>
      )}

      <div>
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <span style={{ ...small, fontWeight: 600, color: 'var(--fg)' }}>Words glossed</span>
          <span style={{ fontFamily: 'var(--font-latin)', fontSize: '1.25rem', lineHeight: 1, color: 'var(--fg)' }}>{pct}%</span>
        </div>
        <div className="meter">
          <span style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2.5" style={small}>
          {counts.dictionary} from Lectio&rsquo;s dictionary
          {counts.ai > 0 && `, ${counts.ai} by AI for this text (marked as such, so check them)`}
          {counts.none > 0 && `, ${counts.none} not yet`}.
        </p>
        {remaining > 0 && (
          <div className="mt-3 flex flex-col items-start gap-2">
            <button type="button" className="btn btn-sm" onClick={rest.run} disabled={rest.working}>
              {rest.working ? 'Glossing…' : `Gloss the other ${remaining} ${remaining === 1 ? 'word' : 'words'}`}
            </button>
            {rest.error && (
              <p role="status" style={{ ...small, color: 'var(--accent)' }}>
                {rest.error}
              </p>
            )}
          </div>
        )}
      </div>

      {!editing && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => {
              setDraft({ title: text.title, author: text.author, source: text.source });
              setEditing(true);
            }}
          >
            Edit details
          </button>
          {confirming ? (
            <span className="flex flex-wrap items-center gap-2">
              <span style={small}>Delete it, and your marks on it?</span>
              <button
                type="button"
                className="btn btn-sm btn-rubric"
                onClick={() => {
                  deleteImportedText(text.id);
                  router.push('/read');
                }}
              >
                Delete
              </button>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setConfirming(false)}>
                Keep
              </button>
            </span>
          ) : (
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setConfirming(true)}>
              Delete text
            </button>
          )}
        </div>
      )}
    </div>
  );
}
