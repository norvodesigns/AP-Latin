'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { CED, cedHref, CED_PDF, AP_LATIN_COURSE, AP_LATIN_EXAM, type CedLandmark } from '@/lib/ced';

/* ==========================================================================
   Rubrica primitives

   Everything here obeys the same rule: separate with ruling, not with boxes.
   Where the old kit reached for a card, this one reaches for a hairline and
   a widely-tracked label in the margin.
   ========================================================================== */

export function Page({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div
      className={`mx-auto w-full px-5 py-8 sm:px-10 sm:py-12 ${wide ? 'max-w-6xl' : 'max-w-4xl'}`}
    >
      {children}
    </div>
  );
}

/**
 * A page opens the way a manuscript section does: a rubric in the margin, the
 * title beneath it, and a rule closing the header off from the body.
 */
export function PageHeader({
  eyebrow,
  title,
  lede,
  actions,
}: {
  eyebrow?: string;
  title: string;
  lede?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="animate-in mb-9 border-b pb-7" style={{ borderColor: 'var(--rule)' }}>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0">
          {eyebrow && <div className="rubric mb-4">{eyebrow}</div>}
          <h1 style={{ fontSize: 'clamp(1.75rem, 1.3rem + 2vw, 2.5rem)', lineHeight: 1.1 }}>
            {title}
          </h1>
          {lede && (
            <p
              className="measure mt-3"
              style={{
                fontFamily: 'var(--font-latin)',
                fontSize: '1.125rem',
                lineHeight: 1.55,
                color: 'var(--ink2)',
              }}
            >
              {lede}
            </p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2.5">{actions}</div>}
      </div>
    </header>
  );
}

/**
 * A ruled section. `title` becomes a slab label sitting above a hairline —
 * the workhorse of the whole interface.
 */
export function Section({
  title,
  aside,
  children,
  rubric = false,
  className = '',
}: {
  title?: string;
  aside?: ReactNode;
  children: ReactNode;
  /** Red rather than grey — marks the section as the important one. */
  rubric?: boolean;
  className?: string;
}) {
  return (
    <section className={className}>
      {title && (
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 className={rubric ? 'rubric' : 'slab'}>{title}</h2>
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

/**
 * A slip of paper laid on the page. Reserved for things that genuinely float:
 * the glossary, a flashcard, a popover. Ordinary content must not use this.
 */
export function Panel({
  children,
  className = '',
  as: As = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'li';
}) {
  return <As className={`panel p-6 sm:p-7 ${className}`}>{children}</As>;
}

/**
 * Kept so unconverted sections keep rendering sensibly: a top hairline and
 * padding rather than a boxed card.
 */
export function Card({
  children,
  className = '',
  as: As = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'li';
}) {
  return <As className={`card ${className}`}>{children}</As>;
}

/** A called-out prompt — outlined in red, never filled. */
export function CalledOut({
  rubric,
  children,
  className = '',
}: {
  rubric?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`called-out ${className}`}>
      {rubric && (
        <div className="mb-3.5 flex items-baseline gap-2">
          <span
            aria-hidden="true"
            style={{ fontFamily: 'var(--font-latin)', fontSize: '1.125rem', color: 'var(--accent)' }}
          >
            ¶
          </span>
          <span className="rubric">{rubric}</span>
        </div>
      )}
      {children}
    </div>
  );
}

export function Hairline({ faint = false, className = '' }: { faint?: boolean; className?: string }) {
  return <div className={`${faint ? 'hair-faint' : 'hair'} ${className}`} role="presentation" />;
}

/** Outlined tag. Red for themes, muted for metadata. */
export function Badge({
  children,
  tone = 'neutral',
  title,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'accent' | 'gilt' | 'green' | 'muted';
  title?: string;
}) {
  const tones: Record<string, { fg: string; bd: string }> = {
    neutral: { fg: 'var(--fg-muted)', bd: 'var(--rule-strong)' },
    accent: { fg: 'var(--accent)', bd: 'var(--redborder)' },
    gilt: { fg: 'var(--gilt)', bd: 'color-mix(in srgb, var(--gilt) 42%, transparent)' },
    green: { fg: 'var(--correct)', bd: 'color-mix(in srgb, var(--correct) 40%, transparent)' },
    muted: { fg: 'var(--fg-faint)', bd: 'var(--rule)' },
  };
  const t = tones[tone];
  return (
    <span title={title} className="chip" style={{ color: t.fg, borderColor: t.bd }}>
      {children}
    </span>
  );
}

export function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div
      className="border-y px-6 py-14 text-center"
      style={{ borderColor: 'var(--rule)' }}
    >
      <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.375rem', lineHeight: 1.3 }}>
        {title}
      </p>
      <p
        className="mx-auto mt-2.5 max-w-md"
        style={{
          fontFamily: 'var(--font-latin)',
          fontSize: '1.0625rem',
          lineHeight: 1.55,
          color: 'var(--fg-muted)',
        }}
      >
        {body}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/**
 * A square meter. `tone="red"` is reserved for the skill a student is weakest
 * at — the design uses colour here to point, not to decorate.
 */
export function Meter({
  value,
  max,
  label,
  tone = 'gilt',
  showFraction = true,
}: {
  value: number;
  max: number;
  label?: string;
  tone?: 'gilt' | 'red';
  showFraction?: boolean;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      {label && (
        <div className="mb-2.5 flex items-baseline justify-between gap-3">
          <span className="slab-sm">{label}</span>
          {showFraction && (
            <span
              style={{
                fontFamily: 'var(--font-latin)',
                fontSize: '1.1875rem',
                lineHeight: 1,
                color: tone === 'red' ? 'var(--accent)' : 'var(--fg)',
              }}
            >
              {value} / {max}
            </span>
          )}
        </div>
      )}
      <div
        className={`meter ${tone === 'red' ? 'meter-red' : ''}`}
        role="meter"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label ?? 'progress'}
      >
        <span style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** The mastery row from the dashboard: name, percentage, bar. */
export function SkillMeter({
  label,
  pct,
  weak = false,
}: {
  label: string;
  pct: number;
  weak?: boolean;
}) {
  return (
    <div>
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <span
          style={{ fontFamily: 'var(--font-latin)', fontSize: '1.25rem', lineHeight: 1, color: 'var(--fg)' }}
        >
          {label}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-latin)',
            fontSize: '1.25rem',
            lineHeight: 1,
            color: weak ? 'var(--accent)' : 'var(--fg)',
          }}
        >
          {pct}%
        </span>
      </div>
      <div
        className={`meter ${weak ? 'meter-red' : ''}`}
        role="meter"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <span style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function BackLink({
  href,
  onClick,
  children,
}: {
  href?: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  const inner = (
    <>
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M10 3.5L5.5 8l4.5 4.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {children}
    </>
  );
  const cls = 'link-rule inline-flex items-center gap-2 slab-sm';

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cls}>
        {inner}
      </button>
    );
  }
  return (
    <Link href={href ?? '/'} className={cls}>
      {inner}
    </Link>
  );
}

/** A short warning shown on passages that are not on the official CED list. */
export function SupplementaryNotice() {
  return (
    <div
      className="border-l-2 py-1 pl-5"
      style={{ borderColor: 'var(--gilt)' }}
    >
      <div className="slab-sm mb-1.5" style={{ color: 'var(--gilt)' }}>
        Supplementary
      </div>
      <p
        className="measure"
        style={{
          margin: 0,
          fontFamily: 'var(--font-latin)',
          fontSize: '1.0625rem',
          lineHeight: 1.55,
          color: 'var(--ink2)',
        }}
      >
        This passage is <em>not</em> on the official 2025 CED required reading list — most of
        these were required under the previous (2012–2025) syllabus. Useful context, but not
        examinable as syllabus reading.
      </p>
    </div>
  );
}

/* ==========================================================================
   Official sources

   Every claim this app makes about the exam should be checkable against the
   College Board's own document in one click. These render as quiet marginal
   citations rather than buttons, so they never compete with the study content.
   ========================================================================== */

/** A citation linking into a named landmark of the CED. */
export function CedLink({
  to,
  children,
  className = '',
}: {
  to: CedLandmark;
  children?: ReactNode;
  className?: string;
}) {
  const landmark = CED[to];
  return (
    <a
      href={cedHref(to)}
      target="_blank"
      rel="noopener noreferrer"
      className={`link-rule inline-flex items-baseline gap-1.5 ${className}`}
      style={{ color: 'var(--accent)' }}
      title={`Opens the official AP Latin Course and Exam Description at “${landmark.label}”`}
    >
      {children ?? landmark.short}
      <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden="true">
        <path
          d="M3 7L7 3M7 3H4M7 3v3"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="sr-only">(opens the official AP Latin CED, PDF)</span>
    </a>
  );
}

/**
 * The standing footer citation. Every study section carries one, so a student
 * is never more than a glance from the document the exam is actually built on.
 */
export function SourceNote({
  to,
  children,
}: {
  to?: CedLandmark;
  children?: ReactNode;
}) {
  return (
    <footer
      className="mt-14 border-t pt-6"
      style={{ borderColor: 'var(--rule)' }}
    >
      {children && (
        <p
          className="measure-wide mb-3"
          style={{
            margin: '0 0 0.75rem',
            fontFamily: 'var(--font-latin)',
            fontSize: '1rem',
            lineHeight: 1.5,
            color: 'var(--fg-muted)',
          }}
        >
          {children}
        </p>
      )}
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <span className="slab-sm">Official sources</span>
        {to && <CedLink to={to} className="slab-sm" />}
        <a
          href={CED_PDF}
          target="_blank"
          rel="noopener noreferrer"
          className="link-rule slab-sm"
        >
          Course &amp; Exam Description
        </a>
        <a
          href={AP_LATIN_COURSE}
          target="_blank"
          rel="noopener noreferrer"
          className="link-rule slab-sm"
        >
          AP Central
        </a>
        <a
          href={AP_LATIN_EXAM}
          target="_blank"
          rel="noopener noreferrer"
          className="link-rule slab-sm"
        >
          Exam &amp; past FRQs
        </a>
      </div>
    </footer>
  );
}

/* ==========================================================================
   Roman numerals

   The design numbers ranks and counts in Roman — "23 days unbroken · XXIII".
   Only ever decorative: the Arabic value stays in the DOM for screen readers.
   ========================================================================== */

const NUMERALS: Array<[number, string]> = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
  [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
  [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];

export function toRoman(n: number): string {
  if (!Number.isFinite(n) || n <= 0 || n >= 4000) return '';
  let rest = Math.floor(n);
  let out = '';
  for (const [value, symbol] of NUMERALS) {
    while (rest >= value) {
      out += symbol;
      rest -= value;
    }
  }
  return out;
}

/** Renders a Roman numeral with the Arabic value kept for assistive tech. */
export function Roman({ value, className = '' }: { value: number; className?: string }) {
  const roman = toRoman(value);
  if (!roman) return <span className={className}>{value}</span>;
  return (
    <span className={className}>
      <span aria-hidden="true">{roman}</span>
      <span className="sr-only">{value}</span>
    </span>
  );
}
