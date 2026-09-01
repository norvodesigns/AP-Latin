'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NAV } from '@/lib/nav';
import { allPassages } from '@/data/passages';

interface Item {
  id: string;
  label: string;
  hint: string;
  href: string;
  kind: 'section' | 'passage';
}

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const items: Item[] = useMemo(() => {
    const sections: Item[] = NAV.map((n) => ({
      id: `s:${n.href}`,
      label: n.label,
      hint: n.blurb,
      href: n.href,
      kind: 'section',
    }));
    const passages: Item[] = allPassages.map((p) => ({
      id: `p:${p.id}`,
      label: p.citation,
      hint: `${p.title}${p.required ? '' : ' · supplementary'}`,
      href: `/read/${p.id}`,
      kind: 'passage',
    }));
    return [...sections, ...passages];
  }, []);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items.slice(0, 12);
    const scored = items
      .map((it) => {
        const hay = `${it.label} ${it.hint}`.toLowerCase();
        const idx = hay.indexOf(needle);
        if (idx < 0) return null;
        // Prefer matches at the start of the label, then sections over passages.
        const score = idx + (it.label.toLowerCase().startsWith(needle) ? -50 : 0) + (it.kind === 'section' ? -10 : 0);
        return { it, score };
      })
      .filter((x): x is { it: Item; score: number } => x !== null)
      .sort((a, b) => a.score - b.score)
      .slice(0, 20);
    return scored.map((s) => s.it);
  }, [q, items]);

  useEffect(() => {
    if (open) {
      setQ('');
      setActive(0);
      // Focus after paint so the dialog is mounted.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => setActive(0), [q]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((a) => Math.min(a + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((a) => Math.max(a - 1, 0));
      } else if (e.key === 'Enter') {
        const item = results[active];
        if (item) {
          e.preventDefault();
          router.push(item.href);
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, results, active, router, onClose]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]"
      style={{ background: 'color-mix(in srgb, var(--bg-sunk) 70%, transparent)' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search sections and passages"
        className="animate-in w-full max-w-xl overflow-hidden rounded-xl"
        style={{ background: 'var(--bg-raised)', border: '1px solid var(--rule-strong)', boxShadow: 'var(--shadow-pop)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b px-3.5 py-2.5" style={{ borderColor: 'var(--rule)' }}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ color: 'var(--fg-faint)' }}>
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Jump to a section or passage…"
            aria-label="Search"
            className="w-full bg-transparent text-sm outline-none"
            style={{ color: 'var(--fg)' }}
          />
          <span className="kbd" aria-hidden="true">esc</span>
        </div>

        <ul ref={listRef} className="max-h-80 overflow-y-auto py-1.5" role="listbox" aria-label="Results">
          {results.length === 0 && (
            <li className="px-3.5 py-6 text-center text-sm" style={{ color: 'var(--fg-faint)' }}>
              Nothing matches “{q}”.
            </li>
          )}
          {results.map((it, i) => (
            <li key={it.id} role="option" aria-selected={i === active} data-active={i === active}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => {
                  router.push(it.href);
                  onClose();
                }}
                className="flex w-full items-baseline gap-2.5 px-3.5 py-2 text-left"
                style={{ background: i === active ? 'var(--bg-sunk)' : 'transparent' }}
              >
                <span
                  className="shrink-0 text-sm"
                  style={{
                    fontWeight: 550,
                    fontFamily: it.kind === 'passage' ? 'var(--font-latin)' : undefined,
                    fontSize: it.kind === 'passage' ? '0.98rem' : undefined,
                  }}
                >
                  {it.label}
                </span>
                <span className="truncate text-xs" style={{ color: 'var(--fg-faint)' }}>
                  {it.hint}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <div
          className="flex items-center gap-3 border-t px-3.5 py-2 text-xs"
          style={{ borderColor: 'var(--rule)', color: 'var(--fg-faint)' }}
        >
          <span className="flex items-center gap-1"><span className="kbd">↑</span><span className="kbd">↓</span> navigate</span>
          <span className="flex items-center gap-1"><span className="kbd">↵</span> open</span>
          <span className="ml-auto flex items-center gap-1"><span className="kbd">g</span> then a letter jumps</span>
        </div>
      </div>
    </div>
  );
}
