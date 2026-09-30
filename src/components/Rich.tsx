import type { ReactNode } from 'react';

/**
 * The course's two bits of markup (see src/data/curriculum/types.ts):
 *
 *   `*word*` is italic (Latin cited in English prose), `**word**` is bold.
 *   With `endings`, `puell|ae` sets the ending after the bar in rubric red.
 */
export function Rich({ text, endings = false }: { text: string; endings?: boolean }) {
  return <>{renderEmphasis(text, endings)}</>;
}

function renderEmphasis(text: string, endings: boolean): ReactNode[] {
  const out: ReactNode[] = [];
  // Bold first, so `**` is never read as two italic markers.
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(...renderEndings(text.slice(last, m.index), endings, `t${k++}`));
    if (m[1] !== undefined) out.push(<strong key={`b${k++}`}>{renderEndings(m[1], endings, `bb${k}`)}</strong>);
    else out.push(<em key={`i${k++}`}>{renderEndings(m[2], endings, `ii${k}`)}</em>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(...renderEndings(text.slice(last), endings, `t${k++}`));
  return out;
}

/** `puell|ae` → "puell" + a red "ae". The ending runs to the end of the word. */
function renderEndings(text: string, endings: boolean, key: string): ReactNode[] {
  if (!endings || !text.includes('|')) return [text.replace(/\|/g, '')];
  const out: ReactNode[] = [];
  const re = /\|([\p{L}\p{M}]*)/gu;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(
      <span key={`${key}-${k++}`} style={{ color: 'var(--accent)' }}>
        {m[1]}
      </span>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** The same text with its markup removed, for aria-labels and titles. */
export function plain(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').replace(/\|/g, '');
}
