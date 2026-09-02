'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { NAV, NAV_GROUPS } from '@/lib/nav';
import { useStore, daysUntilExam } from '@/store/useStore';
import CommandPalette from './CommandPalette';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);

  useEffect(() => setMounted(true), []);

  // Keep the DOM attribute in sync when the store rehydrates from localStorage.
  useEffect(() => {
    if (!mounted) return;
    if (theme === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
  }, [theme, mounted]);

  useEffect(() => setMobileOpen(false), [pathname]);

  /* Keyboard: cmd/ctrl-K opens the palette; `g` then a key jumps to a section. */
  const [gPending, setGPending] = useState(false);
  const onKey = useCallback(
    (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing =
        el &&
        (el.tagName === 'INPUT' ||
          el.tagName === 'TEXTAREA' ||
          el.isContentEditable ||
          el.getAttribute('role') === 'textbox');

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === '?') {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (gPending) {
        const item = NAV.find((n) => n.key === e.key.toLowerCase());
        setGPending(false);
        if (item) {
          e.preventDefault();
          router.push(item.href);
        }
        return;
      }
      if (e.key.toLowerCase() === 'g') {
        setGPending(true);
        window.setTimeout(() => setGPending(false), 1600);
      }
    },
    [gPending, router],
  );

  useEffect(() => {
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onKey]);

  const days = daysUntilExam();

  const navList = (
    <nav aria-label="Sections" className="flex flex-col gap-5">
      {NAV_GROUPS.map((group) => (
        <div key={group.id}>
          <div className="eyebrow px-3 pb-1.5">{group.label}</div>
          <ul className="flex flex-col gap-px">
            {NAV.filter((n) => n.group === group.id).map((item) => {
              const active =
                item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className="group flex items-center justify-between rounded-md px-3 py-1.5 text-sm transition-colors"
                    style={{
                      background: active ? 'var(--bg-sunk)' : 'transparent',
                      color: active ? 'var(--fg)' : 'var(--fg-muted)',
                      fontWeight: active ? 600 : 450,
                      boxShadow: active ? 'inset 2px 0 0 var(--accent)' : undefined,
                    }}
                  >
                    <span>{item.label}</span>
                    <span
                      className="kbd opacity-0 transition-opacity group-hover:opacity-100"
                      aria-hidden="true"
                    >
                      {item.key}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-dvh">
      {/* Desktop sidebar */}
      <aside
        className="no-print sticky top-0 hidden h-dvh w-60 shrink-0 flex-col overflow-y-auto border-r px-3 py-4 lg:flex"
        style={{ background: 'var(--bg-raised)', borderColor: 'var(--rule)' }}
      >
        <Link href="/" className="mb-5 block px-3">
          <div
            className="font-semibold"
            style={{ fontFamily: 'var(--font-serif)', fontSize: '1.0625rem', letterSpacing: '-0.02em' }}
          >
            Lectio
          </div>
          <div className="eyebrow mt-0.5" style={{ letterSpacing: '0.06em' }}>
            AP Latin · Vergil · Pliny
          </div>
        </Link>

        {navList}

        <div className="mt-auto pt-5">
          <div
            className="rounded-lg px-3 py-2.5"
            style={{ background: 'var(--bg-sunk)', border: '1px solid var(--rule)' }}
          >
            <div className="eyebrow">Exam day</div>
            <div
              className="mt-0.5 tabular-nums"
              style={{ fontFamily: 'var(--font-serif)', fontSize: '1.375rem', fontWeight: 600 }}
            >
              {mounted ? days : '—'}
              <span className="ml-1 text-xs font-normal" style={{ color: 'var(--fg-faint)' }}>
                days
              </span>
            </div>
            <div className="mt-0.5 text-xs" style={{ color: 'var(--fg-faint)' }}>
              Fri 14 May 2027
            </div>
          </div>

          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="btn btn-ghost mt-2 w-full justify-between"
            style={{ color: 'var(--fg-faint)', fontSize: '0.8125rem' }}
          >
            <span>Search</span>
            <span className="kbd" aria-hidden="true">
              ⌘K
            </span>
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="no-print sticky top-0 z-30 flex items-center gap-2 border-b px-3 py-2 backdrop-blur lg:hidden"
          style={{
            background: 'color-mix(in srgb, var(--bg-raised) 88%, transparent)',
            borderColor: 'var(--rule)',
          }}
        >
          <button
            type="button"
            className="btn btn-ghost px-2"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            onClick={() => setMobileOpen((v) => !v)}
          >
            <span className="sr-only">{mobileOpen ? 'Close menu' : 'Open menu'}</span>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              {mobileOpen ? (
                <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              ) : (
                <path d="M2.5 5h13M2.5 9h13M2.5 13h13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              )}
            </svg>
          </button>
          <Link href="/" className="font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>
            Lectio
          </Link>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="tabular-nums text-xs" style={{ color: 'var(--fg-faint)' }}>
              {mounted ? `${days}d` : ''}
            </span>
            <ThemeToggle theme={theme} setTheme={setTheme} mounted={mounted} />
          </div>
        </header>

        {mobileOpen && (
          <div
            id="mobile-nav"
            className="no-print animate-in border-b px-3 py-3 lg:hidden"
            style={{ background: 'var(--bg-raised)', borderColor: 'var(--rule)' }}
          >
            {navList}
          </div>
        )}

        <main id="main" className="min-w-0 flex-1">
          {children}
        </main>
      </div>

      {/* Desktop theme toggle, floating bottom-right */}
      <div className="no-print fixed bottom-4 right-4 z-20 hidden lg:block">
        <ThemeToggle theme={theme} setTheme={setTheme} mounted={mounted} />
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}

function ThemeToggle({
  theme,
  setTheme,
  mounted,
}: {
  theme: 'light' | 'dark' | 'system';
  setTheme: (t: 'light' | 'dark' | 'system') => void;
  mounted: boolean;
}) {
  const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
  const label = !mounted ? 'Theme' : theme === 'system' ? 'System theme' : theme === 'dark' ? 'Dark theme' : 'Light theme';
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className="btn px-2"
      title={`${label} — click for ${next}`}
      aria-label={`${label}. Switch to ${next}.`}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        {mounted && theme === 'dark' ? (
          <path
            d="M13.2 9.6A5.6 5.6 0 016.4 2.8a5.6 5.6 0 106.8 6.8z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        ) : mounted && theme === 'light' ? (
          <>
            <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.4" />
            <path
              d="M8 1.5v1.2M8 13.3v1.2M14.5 8h-1.2M2.7 8H1.5M12.6 3.4l-.85.85M4.25 11.75l-.85.85M12.6 12.6l-.85-.85M4.25 4.25l-.85-.85"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </>
        ) : (
          <>
            <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M8 2.5v11a5.5 5.5 0 000-11z" fill="currentColor" />
          </>
        )}
      </svg>
    </button>
  );
}
