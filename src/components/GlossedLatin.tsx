import { tokenize, normalizeWord } from '@/lib/latin';

/**
 * Renders a line of Latin with every word in `glossed` (see
 * `glossWords`/`glossedWordSet` in lib/latin.ts) underlined in red — the
 * same words a footnote gloss list beneath the passage defines. The
 * red underline is this app's own addition, not something the real exam
 * prints; it exists so a student practicing here can see at a glance which
 * words they are not expected to already know, before ever reading the
 * footnote.
 */
export function GlossedLatin({ latin, glossed }: { latin: string; glossed: Set<string> }) {
  if (glossed.size === 0) return <>{latin}</>;
  return (
    <>
      {tokenize(latin).map((t, i) =>
        t.isWord && glossed.has(normalizeWord(t.text)) ? (
          <span
            key={i}
            style={{
              textDecoration: 'underline',
              textDecorationColor: 'var(--incorrect)',
              textDecorationThickness: '1.5px',
              textUnderlineOffset: '3px',
            }}
          >
            {t.text}
          </span>
        ) : (
          <span key={i}>{t.text}</span>
        ),
      )}
    </>
  );
}
