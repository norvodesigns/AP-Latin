'use client';

import type { ReactNode } from 'react';
import type { Token } from '@/lib/tokenize';
import { ROLE_INFO, pigmentOf } from '@/lib/annotations';
import type { Annotation, SyntaxMark } from '@/store/useStore';

/**
 * One line of Latin with the reader's marks drawn on it: highlights as pills,
 * sentence-part marks as underlines with a small label, subordinate clauses
 * in brackets, and a dot after anything carrying a note.
 *
 * Shared by the Reader and the study-notes sheet, so the page and the paper
 * always show the same thing.
 *
 * A highlight is one pill per run of words, not a wash behind each word.
 * Every word is its own element (a button, in the Reader), and painting the
 * colour on those gave a box per word whose height followed the button
 * rather than the type: the "weirdly shaped" highlight, scalloped at every
 * word gap and taller on the words than on the spaces between them. The
 * run is now wrapped in a single inline span carrying the colour, so its
 * height is the type's and its ends are round, and it breaks cleanly into a
 * pill per line if a long run wraps.
 */
export interface AnnotatedLineProps {
  tokens: Token[];
  /** This line's annotations, oldest first (the newest showing on top). */
  annotations: Annotation[];
  /** This line's sentence-part marks. */
  marks: SyntaxMark[];
  /** The selected token range on this line, if the selection reaches it. */
  selected?: [number, number] | null;
  /** The word whose gloss is open. */
  activeTok?: number | null;
  /** Words become buttons when set; plain text otherwise (print, notes). */
  onWord?: (e: React.MouseEvent<HTMLButtonElement>, tok: Token) => void;
  /** Words are focusable (glossary on, or mark-up mode). */
  wordsFocusable?: boolean;
  onNote?: (e: React.SyntheticEvent, a: Annotation) => void;
  /** Endnote numbers by annotation id, for the printed study sheet. */
  noteNumbers?: Map<string, number>;
}

export default function AnnotatedLine({
  tokens,
  annotations,
  marks,
  selected = null,
  activeTok = null,
  onWord,
  wordsFocusable = true,
  onNote,
  noteNumbers,
}: AnnotatedLineProps) {
  // The newest coloured annotation covering each token is the one shown —
  // drawing over a mark is what the reader sees.
  const winner = (i: number) =>
    annotations.findLast((a) => a.color && i >= a.startTok && i <= a.endTok) ?? null;
  const isSelected = (i: number) => Boolean(selected && i >= selected[0] && i <= selected[1]);

  const underlineMarks = marks.filter((m) => m.role !== 'clause');
  const clauses = marks.filter((m) => m.role === 'clause');
  /** The innermost (shortest) underline mark on a token decides its style. */
  const underline = (i: number) =>
    underlineMarks
      .filter((m) => i >= m.startTok && i <= m.endTok)
      .sort((a, b) => a.endTok - a.startTok - (b.endTok - b.startTok))[0] ?? null;

  const renderToken = (t: Token) => {
    const mk = underline(t.index);
    const labels = underlineMarks.filter((m) => m.startTok === t.index);
    const opens = clauses.filter((m) => m.startTok === t.index).length;
    const closes = clauses.filter((m) => m.endTok === t.index).length;
    const noted = annotations.filter((a) => a.note.trim() && a.endTok === t.index);
    const cls = [
      mk ? `mk mk-${mk.role} mk-g-${ROLE_INFO[mk.role]?.group ?? 'construction'}` : '',
      labels.length ? 'mk-has-label' : '',
    ]
      .filter(Boolean)
      .join(' ');
    const title = [...new Set(marks.filter((m) => t.index >= m.startTok && t.index <= m.endTok).map((m) => ROLE_INFO[m.role]?.label ?? m.role))].join(', ');

    const inner: ReactNode = (
      <>
        {opens > 0 && <span className="mk-bracket" aria-hidden="true">{'['.repeat(opens)}</span>}
        {t.text}
        {closes > 0 && <span className="mk-bracket" aria-hidden="true">{']'.repeat(closes)}</span>}
        {labels.length > 0 && (
          <span className="mk-label" aria-hidden="true">
            {labels.map((m) => ROLE_INFO[m.role]?.short ?? m.role).join(' · ')}
          </span>
        )}
      </>
    );
    const notes = noted.map((a) => <NoteMark key={a.id} n={noteNumbers?.get(a.id)} onOpen={onNote ? (e) => onNote(e, a) : undefined} />);

    if (t.isWord && onWord) {
      return (
        <button
          key={t.index}
          type="button"
          data-tok={t.index}
          className={`word ${cls} ${activeTok === t.index ? 'word-active' : ''}`}
          onClick={(e) => onWord(e, t)}
          tabIndex={wordsFocusable ? 0 : -1}
          title={title || undefined}
        >
          {inner}
          {notes}
        </button>
      );
    }
    return (
      <span key={t.index} data-tok={t.index} className={cls || undefined} title={title || undefined}>
        {inner}
        {notes}
      </span>
    );
  };

  // Runs of consecutive tokens that share a winning highlight and a
  // selected-or-not state; each run with either becomes one wrapper.
  const runs: { key: string; ann: Annotation | null; sel: boolean; toks: Token[] }[] = [];
  for (const t of tokens) {
    const ann = winner(t.index);
    const sel = isSelected(t.index);
    const key = `${ann?.id ?? ''}|${sel ? 1 : 0}`;
    const last = runs[runs.length - 1];
    if (last && last.key === key) last.toks.push(t);
    else runs.push({ key, ann, sel, toks: [t] });
  }

  return (
    <>
      {runs.map((r, i) => {
        const pigment = r.ann ? pigmentOf(r.ann) : null;
        if (!pigment && !r.sel) return r.toks.map(renderToken);
        const cls = [pigment ? `hl hl-${pigment}` : '', r.sel ? 'selrun' : ''].filter(Boolean).join(' ');
        return (
          <span key={`run-${i}-${r.toks[0].index}`} className={cls}>
            {r.toks.map(renderToken)}
          </span>
        );
      })}
    </>
  );
}

/** A small superscript mark after text that carries a note: a dot on screen,
 *  the note's number on the printed sheet. The way back into the note. */
function NoteMark({ n, onOpen }: { n?: number; onOpen?: (e: React.SyntheticEvent) => void }) {
  if (!onOpen) {
    return (
      <sup className="note-mark note-mark-static" aria-label={n ? `note ${n}` : 'note'}>
        {n ?? '●'}
      </sup>
    );
  }
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        onOpen(e);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onOpen(e);
        }
      }}
      className="note-mark"
      title="View note"
      aria-label="View note on this text"
    >
      <span className="note-mark-dot">●</span>
      {n !== undefined && <span className="note-mark-n">{n}</span>}
    </span>
  );
}
