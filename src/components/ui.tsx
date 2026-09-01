'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

export function Page({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className={`mx-auto w-full px-4 py-6 sm:px-6 sm:py-10 ${wide ? 'max-w-6xl' : 'max-w-4xl'}`}>
      {children}
    </div>
  );
}

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
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-1.5">{eyebrow}</div>}
        <h1 style={{ fontSize: 'clamp(1.5rem, 1.2rem + 1.4vw, 2rem)', lineHeight: 1.18 }}>{title}</h1>
        {lede && (
          <p className="measure mt-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
            {lede}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Card({
  children,
  className = '',
  as: As = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'li';
}) {
  return <As className={`card p-4 sm:p-5 ${className}`}>{children}</As>;
}

export function Badge({
  children,
  tone = 'neutral',
  title,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'accent' | 'gilt' | 'green' | 'muted';
  title?: string;
}) {
  const tones: Record<string, { bg: string; fg: string; bd: string }> = {
    neutral: { bg: 'var(--bg-sunk)', fg: 'var(--fg-muted)', bd: 'var(--rule)' },
    accent: { bg: 'color-mix(in srgb, var(--accent) 12%, transparent)', fg: 'var(--accent)', bd: 'color-mix(in srgb, var(--accent) 32%, transparent)' },
    gilt: { bg: 'color-mix(in srgb, var(--gilt) 14%, transparent)', fg: 'var(--gilt)', bd: 'color-mix(in srgb, var(--gilt) 34%, transparent)' },
    green: { bg: 'var(--correct-bg)', fg: 'var(--correct)', bd: 'color-mix(in srgb, var(--correct) 30%, transparent)' },
    muted: { bg: 'transparent', fg: 'var(--fg-faint)', bd: 'var(--rule)' },
  };
  const t = tones[tone];
  return (
    <span
      title={title}
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[0.6875rem] font-medium leading-normal"
      style={{ background: t.bg, color: t.fg, borderColor: t.bd }}
    >
      {children}
    </span>
  );
}

export function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div
      className="rounded-lg border border-dashed px-6 py-12 text-center"
      style={{ borderColor: 'var(--rule-strong)' }}
    >
      <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.0625rem', fontWeight: 600 }}>{title}</p>
      <p className="mx-auto mt-1.5 max-w-md text-sm" style={{ color: 'var(--fg-muted)' }}>
        {body}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Meter({
  value,
  max,
  label,
  tone = 'accent',
}: {
  value: number;
  max: number;
  label?: string;
  tone?: 'accent' | 'green' | 'gilt';
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const color = tone === 'green' ? 'var(--correct)' : tone === 'gilt' ? 'var(--gilt)' : 'var(--accent)';
  return (
    <div>
      {label && (
        <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
          <span style={{ color: 'var(--fg-muted)' }}>{label}</span>
          <span className="tabular-nums" style={{ color: 'var(--fg-faint)' }}>
            {value}/{max}
          </span>
        </div>
      )}
      <div
        className="h-1.5 w-full overflow-hidden rounded-full"
        style={{ background: 'var(--bg-sunk)' }}
        role="meter"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label ?? 'progress'}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
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
        <path d="M10 3.5L5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {children}
    </>
  );
  const cls = 'inline-flex items-center gap-1.5 text-sm transition-colors hover:underline';
  const style = { color: 'var(--fg-muted)' };

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cls} style={style}>
        {inner}
      </button>
    );
  }
  return (
    <Link href={href ?? '/'} className={cls} style={style}>
      {inner}
    </Link>
  );
}

/** A short warning shown on passages that are not on the official CED list. */
export function SupplementaryNotice() {
  return (
    <div
      className="rounded-lg border px-3.5 py-2.5 text-sm"
      style={{
        background: 'color-mix(in srgb, var(--gilt) 9%, transparent)',
        borderColor: 'color-mix(in srgb, var(--gilt) 30%, transparent)',
        color: 'var(--fg-muted)',
      }}
    >
      <strong style={{ color: 'var(--gilt)' }}>Supplementary.</strong> This passage is{' '}
      <em>not</em> on the official 2025 CED required reading list — most of these were required
      under the previous (2012–2025) syllabus. Useful context, but not examinable as syllabus
      reading.
    </div>
  );
}
