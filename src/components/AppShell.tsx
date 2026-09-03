'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useCallback } from 'react';
import { NAV, NAV_GROUPS } from '@/lib/nav';
import { useStore, daysUntilExam } from '@/store/useStore';
import { useStudyTimeSync } from '@/hooks/useStudyTimeSync';
import type { Profile } from '@/lib/supabase/types';
import CommandPalette from './CommandPalette';
import AccountMenu from './AccountMenu';

/**
 * The masthead carries only the sections a student moves between constantly.
 * Everything else lives in the index, one keystroke or one tap away — the
 * alternative is fourteen uppercase items competing with the wordmark, which
 * is exactly the crowding this design is trying to avoid.
 *
 * The dashboard is deliberately absent: the wordmark already links there, and
 * a "Dashboard" link beside a logo that goes to the same place is a wasted
 * slot. Same reasoning retired the theme toggle, the search button, the
 * exam countdown and the tagline from this row — each is either duplicated
 * elsewhere in the app or belongs in the index, and together they were
 * crowding out the only thing the header is actually for.
 */
const PRIMARY = ['/read', '/translate', '/scansion', '/vocab', '/quiz'];

export default function AppShell({
  children,
  profile,
  accountsEnabled,
}: {
  children: React.ReactNode;
  profile: Profile | null;
  accountsEnabled: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const setAuthUserId = useStore((s) => s.setAuthUserId);

  // The store's authUserId always tracks the server-rendered profile — see
  // the comment on RootLayout for why this is a plain effect rather than a
  // client-side auth listener.
  useEffect(() => {
    setAuthUserId(profile?.id ?? null);
  }, [profile?.id, setAuthUserId]);

  useStudyTimeSync();
  const [indexOpen, setIndexOpen] = useState(false);
  /** Held true for the length of the exit animation, so the panel can play it
   *  before unmounting. Without this the index vanishes on the frame the
   *  button is pressed, which is what made opening feel animated and closing
   *  feel like a bug. */
  const [indexClosing, setIndexClosing] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);

  useEffect(() => setMounted(true), []);

  /** Close with no animation at all — used when the route changes, where the
   *  page underneath is being replaced and an exit animation would play over
   *  the top of the new one. */
  const closeIndexNow = useCallback(() => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
    setIndexClosing(false);
    setIndexOpen(false);
  }, []);

  /** Close by playing the exit animation first. Skipped entirely when the
   *  reader has asked for reduced motion: the CSS collapses the animation to
   *  nothing, so waiting out its duration would just be an unexplained delay. */
  const closeIndex = useCallback(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      closeIndexNow();
      return;
    }
    setIndexClosing(true);
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = null;
      setIndexClosing(false);
      setIndexOpen(false);
    }, 170);
  }, [closeIndexNow]);

  useEffect(
    () => () => {
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    },
    [],
  );

  /**
   * The index docks directly beneath the masthead, whose height varies with
   * the clamped wordmark. Measuring beats hardcoding: the wordmark is fluid,
   * so any fixed offset would be wrong at most viewport widths.
   */
  const headerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const apply = () =>
      document.documentElement.style.setProperty('--masthead', `${el.offsetHeight}px`);
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Keep the DOM attribute in sync when the store rehydrates from localStorage.
  useEffect(() => {
    if (!mounted) return;
    if (theme === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
  }, [theme, mounted]);

  useEffect(() => closeIndexNow(), [pathname, closeIndexNow]);

  // The index is a full-screen overlay on touch layouts, so the page beneath
  // must not scroll under it.
  useEffect(() => {
    if (!indexOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [indexOpen]);

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
      if (e.key === 'Escape' && indexOpen) {
        closeIndex();
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
    [gPending, router, indexOpen, closeIndex],
  );

  useEffect(() => {
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onKey]);

  const days = daysUntilExam();
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  const primaryItems = PRIMARY.map((href) => NAV.find((n) => n.href === href)).filter(
    (n): n is (typeof NAV)[number] => Boolean(n),
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <header
        ref={headerRef}
        className="no-print sticky top-0 z-30 border-b"
        style={{
          borderColor: 'var(--rule)',
          background: 'color-mix(in srgb, var(--bg) 92%, transparent)',
          backdropFilter: 'saturate(1.4) blur(8px)',
        }}
      >
        <div className="mx-auto flex w-full max-w-[1160px] items-center justify-between gap-6 px-5 py-3.5 sm:px-10 sm:py-4">
          {/* Wordmark — also the link home, which is why no "Dashboard" item
              appears in the nav beside it. */}
          <Link href="/" className="shrink-0">
            <span
              className="wordmark"
              style={{ fontSize: 'clamp(2rem, 1.4rem + 2.4vw, 2.875rem)' }}
            >
              Lectio
            </span>
          </Link>

          {/* Desktop nav */}
          <nav aria-label="Sections" className="hidden items-center gap-7 xl:flex">
            {primaryItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                data-active={isActive(item.href)}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className="nav-item whitespace-nowrap"
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Controls */}
          <div className="flex shrink-0 items-center gap-2.5 sm:gap-4">
            <AccountMenu profile={profile} accountsEnabled={accountsEnabled} />

            <button
              type="button"
              onClick={() => (indexOpen ? closeIndex() : setIndexOpen(true))}
              aria-expanded={indexOpen}
              aria-controls="section-index"
              className="squish flex items-center gap-2.5"
              style={{ color: 'var(--fg)' }}
            >
              <span className="slab-sm hidden sm:inline" style={{ color: 'inherit' }}>
                {indexOpen ? 'Close' : 'Index'}
              </span>
              {/* Three rules that fold into the cross — see `.burger` in
                  globals.css. Kept as one persistent set of paths rather than
                  two icons swapped on state, because only the first can be
                  animated between the two shapes. */}
              <svg
                className="burger"
                data-open={indexOpen}
                width="19"
                height="19"
                viewBox="0 0 19 19"
                fill="none"
                aria-hidden="true"
              >
                <path d="M2.5 5.5h14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                <path d="M2.5 9.5h14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                <path d="M2.5 13.5h14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              <span className="sr-only">{indexOpen ? 'Close index' : 'Open index of all sections'}</span>
            </button>
          </div>
        </div>
      </header>

      {indexOpen && (
        <SectionIndex
          pathname={pathname}
          days={days}
          mounted={mounted}
          theme={theme}
          setTheme={setTheme}
          closing={indexClosing}
          onOpenPalette={() => {
            closeIndexNow();
            setPaletteOpen(true);
          }}
          onClose={closeIndexNow}
        />
      )}

      <main id="main" className="min-w-0 flex-1">
        {children}
      </main>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}

/**
 * The full contents.
 *
 * On a wide screen this is a table of contents: four columns, every entry
 * carrying its blurb, which is why it takes the viewport rather than being a
 * dropdown. On a phone that same content is a wall — fourteen entries, each
 * three lines tall, is several screens of prose to get to a link. So the
 * narrow layout drops to labels alone.
 *
 * What it drops on mobile is specifically the things a phone cannot use or
 * does not need: the blurbs (the labels are self-explanatory once you have
 * been in the app once) and every keyboard affordance — the per-item shortcut
 * chips, the ⌘K badge, and the "press g then a letter" hint. A touch device
 * has no keyboard to press them on, so on mobile they are decoration that
 * costs height.
 */
function SectionIndex({
  pathname,
  days,
  mounted,
  theme,
  setTheme,
  closing,
  onOpenPalette,
  onClose,
}: {
  pathname: string;
  days: number;
  mounted: boolean;
  theme: 'light' | 'dark' | 'system';
  setTheme: (t: 'light' | 'dark' | 'system') => void;
  closing: boolean;
  onOpenPalette: () => void;
  onClose: () => void;
}) {
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <div
      id="section-index"
      data-closing={closing}
      className="index-panel no-print fixed inset-x-0 bottom-0 z-20 overflow-y-auto"
      style={{ top: 'var(--masthead, 64px)', background: 'var(--bg)' }}
    >
      <div className="mx-auto w-full max-w-[1160px] px-5 pb-16 pt-6 sm:px-10 sm:pt-10">
        <div className="grid gap-x-12 gap-y-7 sm:gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.id}>
              <div
                className="rubric mb-1.5 border-b pb-2 sm:mb-4 sm:pb-3"
                style={{ borderColor: 'var(--rule)' }}
              >
                {group.label}
              </div>
              <ul className="stagger flex flex-col">
                {NAV.filter((n) => n.group === group.id).map((item) => {
                  const active = isActive(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        aria-current={active ? 'page' : undefined}
                        className="row-hover -mx-3 block border-b px-3 py-2.5 sm:py-3.5"
                        style={{ borderColor: 'var(--hair)' }}
                      >
                        <span className="flex items-baseline justify-between gap-3">
                          <span
                            style={{
                              fontFamily: 'var(--font-latin)',
                              fontSize: '1.375rem',
                              lineHeight: 1.2,
                              color: active ? 'var(--accent)' : 'var(--fg)',
                            }}
                          >
                            {item.label}
                          </span>
                          <span className="kbd !hidden shrink-0 sm:!inline-flex" aria-hidden="true">
                            {item.key}
                          </span>
                        </span>
                        <span
                          className="mt-1.5 hidden sm:block"
                          style={{
                            fontFamily: 'var(--font-latin)',
                            fontSize: '1rem',
                            lineHeight: 1.45,
                            color: 'var(--fg-muted)',
                          }}
                        >
                          {item.blurb}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* The controls that used to sit permanently in the masthead. Each is
            either occasional (theme, search) or already shown large on the
            page it belongs to (the countdown, on the dashboard and the study
            plan), so none of them earned a slot on every screen. */}
        <div
          className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4 border-t pt-5 sm:mt-12 sm:gap-y-5 sm:pt-6"
          style={{ borderColor: 'var(--rule)' }}
        >
          <button
            type="button"
            onClick={onOpenPalette}
            className="squish inline-flex items-center gap-2.5"
            style={{ color: 'var(--fg-muted)' }}
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <span style={{ fontFamily: 'var(--font-latin)', fontSize: '1.0625rem' }}>
              Search everything
            </span>
            <span className="kbd !hidden sm:!inline-flex" aria-hidden="true">⌘K</span>
          </button>

          <div className="inline-flex items-center gap-2.5">
            <ThemeToggle theme={theme} setTheme={setTheme} mounted={mounted} />
            <span style={{ fontFamily: 'var(--font-latin)', fontSize: '1.0625rem', color: 'var(--fg-muted)' }}>
              {!mounted
                ? 'Theme'
                : theme === 'system'
                  ? 'System theme'
                  : theme === 'dark'
                    ? 'Dark theme'
                    : 'Light theme'}
            </span>
          </div>

          <Link
            href="/plan"
            onClick={onClose}
            className="squish inline-flex items-baseline gap-2 sm:ml-auto"
            title="Days until the exam"
          >
            <span
              style={{ fontFamily: 'var(--font-serif)', fontSize: '1.375rem', lineHeight: 1, color: 'var(--fg)' }}
            >
              {mounted ? days : '—'}
            </span>
            <span className="slab-sm">days to the exam</span>
          </Link>
        </div>

        {/* Keyboard-only, so it is not shown where there is no keyboard. */}
        <p
          className="hidden sm:block"
          style={{
            margin: '1.5rem 0 0',
            fontFamily: 'var(--font-latin)',
            fontSize: '1.0625rem',
            color: 'var(--fg-muted)',
          }}
        >
          Press <span className="kbd">g</span> then a letter to jump from anywhere.
        </p>
      </div>
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
  const label = !mounted
    ? 'Theme'
    : theme === 'system'
      ? 'System theme'
      : theme === 'dark'
        ? 'Dark theme'
        : 'Light theme';
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      title={`${label} — click for ${next}`}
      aria-label={`${label}. Switch to ${next}.`}
      className="transition-transform duration-300 hover:rotate-[24deg]"
      style={{ color: 'var(--fg-muted)' }}
    >
      <svg width="17" height="17" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        {mounted && theme === 'dark' ? (
          <path
            d="M13.2 9.6A5.6 5.6 0 016.4 2.8a5.6 5.6 0 106.8 6.8z"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
        ) : mounted && theme === 'light' ? (
          <>
            <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.3" />
            <path
              d="M8 1.5v1.2M8 13.3v1.2M14.5 8h-1.2M2.7 8H1.5M12.6 3.4l-.85.85M4.25 11.75l-.85.85M12.6 12.6l-.85-.85M4.25 4.25l-.85-.85"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </>
        ) : (
          <>
            <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M8 2.5v11a5.5 5.5 0 000-11z" fill="currentColor" />
          </>
        )}
      </svg>
    </button>
  );
}
