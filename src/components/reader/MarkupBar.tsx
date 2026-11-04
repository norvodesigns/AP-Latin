'use client';

import { forwardRef } from 'react';
import { PIGMENTS, SYNTAX_ROLES, type RoleGroup } from '@/lib/annotations';
import type { Pigment, SyntaxRole } from '@/store/useStore';

export type BarPanel = 'main' | 'note' | 'roles';

const GROUP_TITLES: Record<RoleGroup, string> = {
  sentence: 'Parts of the sentence',
  case: 'Case',
  construction: 'Construction',
};

/**
 * What can be done with the words the reader has selected: colour them, mark
 * what part of the sentence they are, write a note, ask the tutor, copy.
 *
 * Anchored beside the selection on a wide screen; a sheet along the bottom
 * on a phone, where it sits under the thumb and leaves the text in view.
 * One bar for every way of selecting (dragging, tapping in mark-up mode,
 * "Mark up" from a word's gloss), so there is one set of controls to learn.
 */
const MarkupBar = forwardRef<
  HTMLDivElement,
  {
    text: string;
    lines: string;
    panel: BarPanel;
    pigment: Pigment | null;
    role: SyntaxRole | null;
    /** Anything stored on exactly this selection, so Remove has something to take. */
    hasExisting: boolean;
    hasNote: boolean;
    noteDraft: string;
    style: React.CSSProperties;
    above: boolean;
    onPigment: (p: Pigment) => void;
    onRole: (r: SyntaxRole) => void;
    onPanel: (p: BarPanel) => void;
    onNoteDraft: (s: string) => void;
    onSaveNote: () => void;
    onCancelNote: () => void;
    onAsk: () => void;
    onCopy: () => void;
    onRemove: () => void;
    onDone: () => void;
  }
>(function MarkupBar(props, ref) {
  const {
    text, lines, panel, pigment, role, hasExisting, hasNote, noteDraft, style, above,
    onPigment, onRole, onPanel, onNoteDraft, onSaveNote, onCancelNote, onAsk, onCopy, onRemove, onDone,
  } = props;

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Mark the selected words"
      className={`annotate-bar ${above ? 'annotate-bar-above' : ''}`}
      style={style}
    >
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <p className="latin truncate" style={{ margin: 0, fontSize: '1rem', color: 'var(--fg-muted)' }}>
          &ldquo;{text}&rdquo; <span className="slab-sm" style={{ color: 'var(--fg-faint)' }}>· {lines}</span>
        </p>
        <button type="button" className="btn btn-ghost btn-sm shrink-0" style={{ marginRight: '-0.5rem' }} onClick={onDone}>
          Done
        </button>
      </div>

      {panel === 'main' && (
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Highlight">
            {PIGMENTS.map((c, i) => {
              const on = pigment === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`swatch swatch-${c.id} ${on ? 'swatch-active' : ''}`}
                  title={on ? `Remove the ${c.plain} highlight` : `${c.label} (${c.plain}) · ${i + 1}`}
                  aria-label={on ? `Remove the ${c.plain} highlight` : `Highlight in ${c.plain}`}
                  aria-pressed={on}
                  onClick={() => onPigment(c.id)}
                />
              );
            })}
          </div>
          <div className="hair" aria-hidden="true" />
          <div className="markup-actions flex flex-wrap items-center gap-1.5">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onPanel('roles')}>
              {role ? `Marked: ${SYNTAX_ROLES.find((r) => r.id === role)?.short}` : 'Mark part'}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onPanel('note')}>
              {hasNote ? 'Edit note' : 'Note'}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onAsk}>
              Ask
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onCopy}>
              Copy
            </button>
            {hasExisting && (
              <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--incorrect)' }} onClick={onRemove}>
                Remove
              </button>
            )}
          </div>
        </div>
      )}

      {panel === 'roles' && (
        <div className="flex flex-col gap-3">
          {(['sentence', 'case', 'construction'] as RoleGroup[]).map((g) => (
            <div key={g}>
              <div className="slab-sm mb-1.5">{GROUP_TITLES[g]}</div>
              <div className="role-grid">
                {SYNTAX_ROLES.filter((r) => r.group === g).map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className="role-chip"
                    aria-pressed={role === r.id}
                    title={role === r.id ? `Take off: ${r.label}` : r.hint}
                    onClick={() => onRole(r.id)}
                  >
                    <b>{r.short}</b>
                    <span>{r.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button type="button" className="btn btn-ghost btn-sm self-start" onClick={() => onPanel('main')}>
            ← Back
          </button>
        </div>
      )}

      {panel === 'note' && (
        <div className="flex flex-col gap-2.5">
          <textarea
            autoFocus
            value={noteDraft}
            onChange={(e) => onNoteDraft(e.target.value)}
            onKeyDown={(e) => {
              // Enter saves, shift-enter breaks the line.
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSaveNote();
              }
            }}
            rows={3}
            className="textarea"
            style={{ resize: 'vertical', fontSize: '0.9375rem' }}
            placeholder="What's worth remembering about this?"
          />
          <div className="flex items-center gap-1.5">
            <button type="button" className="btn btn-ghost btn-sm flex-1" onClick={onCancelNote}>
              Cancel
            </button>
            <button type="button" className="btn btn-rubric btn-sm flex-1" onClick={onSaveNote}>
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

export default MarkupBar;
