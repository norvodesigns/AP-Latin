'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { SYNTAX_ROLES, pigmentOf } from '@/lib/annotations';
import { groupOf } from '@/lib/readerSelection';
import type { Annotation, SyntaxMark } from '@/store/useStore';

/**
 * The reader's own writing on a passage, in one place: notes on the passage
 * as a whole, then every highlight and note in reading order, then a key to
 * the sentence-part marks used. Everything here can be edited or removed
 * without first finding (and re-selecting) the words on the page — the main
 * thing that made taking a highlight off hard once the selection was gone.
 */
export default function ReaderNotes({
  annotations,
  marks,
  passageNotes,
  onPassageNotes,
  onJump,
  onEdit,
  onRemove,
  onClearMarks,
  mounted,
}: {
  annotations: Annotation[];
  marks: SyntaxMark[];
  passageNotes: string;
  onPassageNotes: (s: string) => void;
  onJump: (lineN: number) => void;
  /** Open the note editor on this annotation's words. */
  onEdit: (a: Annotation) => void;
  /** Take this annotation (and the rest of its group) off the page. */
  onRemove: (a: Annotation) => void;
  onClearMarks: () => void;
  mounted: boolean;
}) {
  const [draft, setDraft] = useState(passageNotes);
  const [confirmClear, setConfirmClear] = useState(false);
  const saved = useRef(passageNotes);

  // Follow a change that arrives from elsewhere (sync, another tab) unless
  // the reader is in the middle of typing something different.
  useEffect(() => {
    if (draft === saved.current) setDraft(passageNotes);
    saved.current = passageNotes;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passageNotes]);

  // Saved as they type, a moment after they stop.
  useEffect(() => {
    if (draft === saved.current) return;
    const t = setTimeout(() => {
      saved.current = draft;
      onPassageNotes(draft);
    }, 600);
    return () => clearTimeout(t);
  }, [draft, onPassageNotes]);

  /** One entry per highlight or note, a cross-line one counted once. */
  const entries = useMemo(() => {
    const seen = new Set<string>();
    const out: { lead: Annotation; all: Annotation[] }[] = [];
    for (const a of [...annotations].sort((x, y) => x.lineN - y.lineN || x.startTok - y.startTok)) {
      const key = a.group ?? a.id;
      if (seen.has(key)) continue;
      seen.add(key);
      const all = groupOf(a, annotations);
      out.push({ lead: a, all });
    }
    return out;
  }, [annotations]);

  const roleCounts = useMemo(() => {
    const counts = new Map<string, number>();
    const seen = new Set<string>();
    for (const m of marks) {
      const key = m.group ?? m.id;
      if (seen.has(key)) continue;
      seen.add(key);
      counts.set(m.role, (counts.get(m.role) ?? 0) + 1);
    }
    return SYNTAX_ROLES.filter((r) => counts.has(r.id)).map((r) => ({ role: r, n: counts.get(r.id) ?? 0 }));
  }, [marks]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <label className="slab-sm mb-2 block" htmlFor="passage-notes">
          On the whole passage
        </label>
        <textarea
          id="passage-notes"
          className="textarea"
          rows={3}
          value={mounted ? draft : ''}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (draft !== saved.current) {
              saved.current = draft;
              onPassageNotes(draft);
            }
          }}
          placeholder="Themes, essay ideas, what to ask in class…"
          style={{ resize: 'vertical', fontSize: '0.9375rem' }}
        />
      </div>

      {mounted && entries.length > 0 && (
        <ul className="flex flex-col gap-5 pl-0" style={{ listStyle: 'none', margin: 0 }}>
          {entries.map(({ lead, all }) => {
            const last = all[all.length - 1];
            const noted = all.find((a) => a.note.trim());
            const pigment = pigmentOf(lead);
            const text = all.map((a) => a.text).join(' ');
            const lines = all[0].lineN === last.lineN ? `line ${lead.lineN}` : `lines ${all[0].lineN}–${last.lineN}`;
            return (
              <li key={lead.group ?? lead.id}>
                <button
                  type="button"
                  className="squish latin text-left"
                  style={{ margin: 0, fontSize: '1.0625rem', background: 'none', border: 0, padding: 0, cursor: 'pointer' }}
                  onClick={() => onJump(lead.lineN)}
                  title="Jump to this line"
                >
                  {pigment ? <span className={`hl hl-${pigment}`}>{text}</span> : <>&ldquo;{text}&rdquo;</>}
                  <span className="slab-sm" style={{ marginLeft: '0.5rem', color: 'var(--fg-faint)' }}>
                    · {lines}
                  </span>
                </button>
                {noted && (
                  <p style={{ margin: '0.375rem 0 0', fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', lineHeight: 1.5, color: 'var(--ink2)', whiteSpace: 'pre-wrap' }}>
                    {noted.note}
                  </p>
                )}
                <div className="mt-1 flex gap-1">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => onEdit(noted ?? last)}>
                    {noted ? 'Edit note' : 'Add note'}
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => onRemove(lead)}>
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {mounted && roleCounts.length > 0 && (
        <div>
          <div className="slab-sm mb-2">Sentence marks</div>
          <ul className="flex flex-col gap-1.5 pl-0" style={{ listStyle: 'none', margin: 0, fontSize: '0.9375rem' }}>
            {roleCounts.map(({ role, n }) => (
              <li key={role.id} className="flex items-baseline gap-2">
                <span className={`mk mk-${role.id} mk-g-${role.group} latin`} style={{ minWidth: '2.6rem', fontWeight: 600 }}>
                  {role.short}
                </span>
                <span style={{ color: 'var(--ink2)' }}>{role.label}</span>
                <span style={{ color: 'var(--fg-faint)' }}>× {n}</span>
              </li>
            ))}
          </ul>
          {confirmClear ? (
            <div className="mt-3 flex items-center gap-2">
              <span style={{ fontSize: '0.875rem', color: 'var(--ink2)' }}>Clear every mark on this passage?</span>
              <button type="button" className="btn btn-sm" onClick={() => { onClearMarks(); setConfirmClear(false); }}>
                Clear
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmClear(false)}>
                Keep
              </button>
            </div>
          ) : (
            <button type="button" className="btn btn-ghost btn-sm mt-2" onClick={() => setConfirmClear(true)}>
              Clear all marks
            </button>
          )}
        </div>
      )}

      {mounted && entries.length === 0 && roleCounts.length === 0 && (
        <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: '0.875rem', lineHeight: 1.5, color: 'var(--fg-muted)' }}>
          Turn on <b>Mark up</b> above the text, then tap words to highlight them, mark the subject and
          verb, or write a note. They all collect here.
        </p>
      )}

      <Link href="/read/notes" className="btn btn-ghost btn-sm self-start">
        All my notes, every passage →
      </Link>
    </div>
  );
}
