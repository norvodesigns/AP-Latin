'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Page, PageHeader, BackLink } from '@/components/ui';
import { useStore } from '@/store/useStore';
import type { Genre } from '@/data/types';
import {
  IMPORT_LIMITS,
  cleanImportText,
  countWords,
  defaultTitle,
  distinctWords,
  importedHref,
  splitImport,
  stripLineNumbers,
  type ImportedText,
} from '@/lib/imports';
import { glossLines, readPhoto } from '@/lib/importClient';

const EXAMPLE = {
  title: 'Quo usque tandem',
  author: 'Cicero',
  source: 'In Catilinam 1.1',
  genre: 'prose' as Genre,
  text:
    'Quo usque tandem abutere, Catilina, patientia nostra? Quam diu etiam furor iste tuus nos eludet? Quem ad finem sese effrenata iactabit audacia? Nihilne te nocturnum praesidium Palati, nihil urbis vigiliae, nihil timor populi, nihil concursus bonorum omnium, nihil hic munitissimus habendi senatus locus, nihil horum ora voltusque moverunt?',
};

/** Verse, going by the shape of the text: three or more lines, nearly all
 *  of them short. Prose pasted from a web page comes as long paragraphs. */
function looksLikeVerse(text: string): boolean {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 3) return false;
  const short = lines.filter((l) => l.length <= 80).length;
  return short / lines.length >= 0.85;
}

/**
 * Bringing any Latin into the Reading Room: photograph a page (read by the
 * AI) or type or paste it, say how it is set out, and it is split into
 * numbered rows and glossed word by word (src/lib/imports.ts). It then opens
 * in the Reader like any syllabus passage, with mark-up, notes, a cold read,
 * the line tutor and printing.
 */
export default function ImportText() {
  const router = useRouter();
  const addImportedText = useStore((s) => s.addImportedText);

  const [text, setText] = useState('');
  const [genre, setGenre] = useState<Genre>('prose');
  const [genreChosen, setGenreChosen] = useState(false);
  const [proseLayout, setProseLayout] = useState<ImportedText['layout']>('sentences');
  const [startAt, setStartAt] = useState<string | null>(null);
  const [photoStart, setPhotoStart] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [source, setSource] = useState('');
  const [photo, setPhoto] = useState<{ reading: boolean; error: string | null; read: number }>({
    reading: false,
    error: null,
    read: 0,
  });
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const layout: ImportedText['layout'] = genre === 'poetry' ? 'lines' : proseLayout;
  const stripped = useMemo(() => stripLineNumbers(cleanImportText(text)), [text]);
  const autoStart = stripped.firstNumber ?? photoStart ?? 1;
  const start = startAt !== null && startAt.trim() !== '' && Number.isFinite(Number(startAt)) ? Math.max(0, Math.floor(Number(startAt))) : autoStart;
  const lines = useMemo(() => splitImport(stripped.text, layout, start), [stripped.text, layout, start]);
  const chars = lines.reduce((n, l) => n + l.latin.length, 0);
  const words = useMemo(() => countWords(lines), [lines]);
  const distinct = useMemo(() => distinctWords(lines).length, [lines]);
  const tooLong = chars > IMPORT_LIMITS.chars || lines.length > IMPORT_LIMITS.lines;
  const ready = lines.length > 0 && words > 0 && !tooLong && !importing && !photo.reading;

  const onText = (value: string) => {
    setText(value);
    setError(null);
    if (!genreChosen) setGenre(looksLikeVerse(value) ? 'poetry' : 'prose');
  };

  const pickGenre = (g: Genre) => {
    setGenre(g);
    setGenreChosen(true);
  };

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    setPhoto((p) => ({ ...p, reading: true, error: null }));
    setError(null);
    try {
      const read = await readPhoto(file);
      const first = text.trim() === '';
      setText((t) => (t.trim() ? `${t.trimEnd()}\n\n${read.text}` : read.text));
      if (first) {
        if (!genreChosen) setGenre(read.genre);
        if (read.firstLine !== null) setPhotoStart(read.firstLine);
        if (read.heading && !title.trim()) setTitle(read.heading);
      }
      setPhoto((p) => ({ reading: false, error: null, read: p.read + 1 }));
    } catch (err) {
      setPhoto((p) => ({ ...p, reading: false, error: (err as Error).message }));
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const tryExample = () => {
    setText(EXAMPLE.text);
    setGenre(EXAMPLE.genre);
    setGenreChosen(true);
    setProseLayout('sentences');
    setStartAt(null);
    setPhotoStart(null);
    setTitle(EXAMPLE.title);
    setAuthor(EXAMPLE.author);
    setSource(EXAMPLE.source);
    setError(null);
  };

  const submit = async () => {
    if (!ready) return;
    setImporting(true);
    setError(null);
    try {
      const reply = await glossLines(lines);
      const id = addImportedText({
        title: (title.trim() || defaultTitle(reply.lines)).slice(0, IMPORT_LIMITS.title),
        author: author.trim().slice(0, IMPORT_LIMITS.author),
        source: source.trim().slice(0, IMPORT_LIMITS.source),
        genre,
        layout,
        lines: reply.lines,
        words: reply.words,
      });
      router.push(importedHref(id));
    } catch (err) {
      setError((err as Error).message || 'The text could not be imported just now.');
      setImporting(false);
    }
  };

  const labelStyle = { fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--fg)' } as const;
  const hintStyle = { margin: '0.5rem 0 0', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', lineHeight: 1.45, color: 'var(--fg-faint)' } as const;

  return (
    <Page>
      <div className="mb-5">
        <BackLink href="/read">Reading Room</BackLink>
      </div>
      <PageHeader
        eyebrow="Reading Room"
        title="Import a text"
        lede="Any Latin you want to read: photograph a page, or type or paste it. Lectio numbers the lines and glosses every word, from its own dictionary first and with the AI for the words it doesn't have. Then read it, mark it up and take notes on it like any passage."
      />

      {/* ── The Latin ── */}
      <section className="mb-10">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="slab">The Latin</h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={tryExample}>
            Try an example
          </button>
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn"
            onClick={() => fileRef.current?.click()}
            disabled={photo.reading || importing}
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M2 5.5A1.5 1.5 0 013.5 4h1.6l1-1.5h3.8l1 1.5h1.6A1.5 1.5 0 0114 5.5v6A1.5 1.5 0 0112.5 13h-9A1.5 1.5 0 012 11.5v-6z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
              <circle cx="8" cy="8.5" r="2.4" stroke="currentColor" strokeWidth="1.3" />
            </svg>
            {photo.reading ? 'Reading the photo…' : text.trim() && photo.read > 0 ? 'Add another page' : 'Photograph or choose a page'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => onPhoto(e.target.files?.[0])}
          />
          {text && (
            <button type="button" className="btn btn-ghost" onClick={() => onText('')} disabled={importing}>
              Clear
            </button>
          )}
        </div>
        {photo.error && (
          <p role="alert" style={{ margin: '0 0 0.75rem', fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', color: 'var(--accent)' }}>
            {photo.error}
          </p>
        )}
        <label htmlFor="import-latin" className="sr-only">
          The Latin text
        </label>
        <textarea
          id="import-latin"
          className="textarea"
          rows={12}
          value={text}
          onChange={(e) => onText(e.target.value)}
          placeholder="Type or paste the Latin here. For verse, one verse per line. Line numbers are taken off for you."
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          disabled={importing}
        />
        <p style={hintStyle}>
          {photo.read > 0
            ? 'Check what was read against the page and correct anything misread: your highlights and notes are anchored to these words, so the text can’t be changed once it is imported.'
            : 'A photo is read by Google’s Gemini AI, through Lectio’s server, which doesn’t keep it. Leave out anything personal on the page.'}
        </p>
      </section>

      {/* ── How it is set out ── */}
      <section className="mb-10">
        <h2 className="slab mb-4">Set out as</h2>
        <div className="flex flex-wrap items-end gap-x-8 gap-y-5">
          <div>
            <div className="mb-2" style={labelStyle}>
              Kind of text
            </div>
            <div className="flex gap-1.5" role="radiogroup" aria-label="Kind of text">
              {(['prose', 'poetry'] as Genre[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  role="radio"
                  aria-checked={genre === g}
                  className={genre === g ? 'btn btn-rubric' : 'btn'}
                  onClick={() => pickGenre(g)}
                  disabled={importing}
                >
                  {g === 'prose' ? 'Prose' : 'Verse'}
                </button>
              ))}
            </div>
          </div>
          {genre === 'prose' && (
            <div>
              <div className="mb-2" style={labelStyle}>
                One numbered row for each
              </div>
              <div className="flex gap-1.5" role="radiogroup" aria-label="One numbered row for each">
                {(['sentences', 'lines'] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    role="radio"
                    aria-checked={proseLayout === l}
                    className={proseLayout === l ? 'btn btn-rubric' : 'btn'}
                    onClick={() => setProseLayout(l)}
                    disabled={importing}
                  >
                    {l === 'sentences' ? 'Sentence' : 'Line, as typed'}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <label htmlFor="import-start" className="mb-2 block" style={labelStyle}>
              First line number
            </label>
            <input
              id="import-start"
              type="number"
              inputMode="numeric"
              min={0}
              className="input"
              style={{ width: '7.5rem' }}
              value={startAt ?? String(autoStart)}
              onChange={(e) => setStartAt(e.target.value)}
              disabled={importing}
            />
          </div>
        </div>
        <p style={hintStyle}>
          {genre === 'poetry'
            ? 'Each verse is a numbered line, as in the Aeneid.'
            : proseLayout === 'sentences'
              ? 'Each sentence gets its own number, so you can flag, ask about and cite it.'
              : 'Each line you typed or pasted gets its own number, as on a numbered handout.'}
        </p>
      </section>

      {/* ── Details ── */}
      <section className="mb-10">
        <h2 className="slab mb-4">Details</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="import-title" className="mb-2 block" style={labelStyle}>
              Title
            </label>
            <input
              id="import-title"
              className="input"
              value={title}
              maxLength={IMPORT_LIMITS.title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={lines.length ? defaultTitle(lines) : 'e.g. The first Catilinarian'}
              disabled={importing}
            />
          </div>
          <div>
            <label htmlFor="import-author" className="mb-2 block" style={labelStyle}>
              Author <span style={{ color: 'var(--fg-faint)', fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              id="import-author"
              className="input"
              value={author}
              maxLength={IMPORT_LIMITS.author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="e.g. Cicero"
              disabled={importing}
            />
          </div>
          <div>
            <label htmlFor="import-source" className="mb-2 block" style={labelStyle}>
              Where it’s from <span style={{ color: 'var(--fg-faint)', fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              id="import-source"
              className="input"
              value={source}
              maxLength={IMPORT_LIMITS.source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="e.g. In Catilinam 1.1"
              disabled={importing}
            />
          </div>
        </div>
      </section>

      {/* ── Preview and import ── */}
      <section className="mb-6 border-t pt-7" style={{ borderColor: 'var(--rule)' }}>
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="slab">Preview</h2>
          {lines.length > 0 && (
            <span className="slab-sm" style={{ color: tooLong ? 'var(--accent)' : undefined }}>
              {lines.length} {lines.length === 1 ? 'line' : 'lines'} · {words} words · {distinct} to gloss
            </span>
          )}
        </div>
        {lines.length === 0 ? (
          <p style={{ margin: 0, fontFamily: 'var(--font-latin)', fontSize: '1.0625rem', fontStyle: 'italic', color: 'var(--fg-muted)' }}>
            The numbered lines appear here as you type.
          </p>
        ) : (
          <ol className="flex flex-col gap-1.5 pl-0" style={{ listStyle: 'none', margin: 0 }}>
            {lines.slice(0, 8).map((l) => (
              <li key={l.n} className="flex gap-4">
                <span className="verse-num" style={{ minWidth: '2.25rem', textAlign: 'right', color: 'var(--fg-faint)' }}>
                  {l.n}
                </span>
                <span className={genre === 'poetry' ? 'latin-verse' : 'latin'} style={{ fontSize: '1.125rem', lineHeight: 1.5 }}>
                  {l.latin}
                </span>
              </li>
            ))}
            {lines.length > 8 && (
              <li className="slab-sm" style={{ paddingLeft: '3.25rem', color: 'var(--fg-faint)' }}>
                and {lines.length - 8} more
              </li>
            )}
          </ol>
        )}
        {tooLong && (
          <p role="alert" style={{ margin: '1rem 0 0', fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', color: 'var(--accent)' }}>
            That is more than one text can hold ({IMPORT_LIMITS.chars.toLocaleString()} characters, or {IMPORT_LIMITS.lines} lines: about a thousand words). Import it in two parts.
          </p>
        )}
        {error && (
          <p role="alert" style={{ margin: '1rem 0 0', fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', color: 'var(--accent)' }}>
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button type="button" className="btn btn-primary" onClick={submit} disabled={!ready} aria-busy={importing}>
            {importing ? `Glossing ${distinct} words…` : 'Import and gloss'}
          </button>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--fg-faint)' }}>
            It is saved with your progress, and syncs to your other devices when you’re signed in.
          </span>
        </div>
      </section>
    </Page>
  );
}
