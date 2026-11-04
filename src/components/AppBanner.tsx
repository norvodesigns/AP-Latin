'use client';

import { useEffect, useState } from 'react';
import { APP_STORE_URL } from '@/lib/appStore';

const DISMISS_KEY = 'ap-latin-app-banner';
/** How long a dismissed banner stays away. */
const QUIET_DAYS = 60;

/**
 * Where to show our own "Get the app" bar. Safari on iPhone and iPad shows
 * Apple's Smart App Banner from the `apple-itunes-app` meta tag (see
 * layout.tsx), so this covers what that tag cannot reach: other browsers on
 * iOS (Chrome, Firefox, Edge), in-app browsers, and the site saved to the
 * Home Screen. Exported for tests.
 */
export function wantsAppBanner(ua: string, opts: { touchMac: boolean; standalone: boolean }): boolean {
  const ios = /iPhone|iPad|iPod/.test(ua) || opts.touchMac;
  if (!ios) return false;
  if (opts.standalone) return true;
  const otherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|GSA\/|DuckDuckGo|YaBrowser|Brave/.test(ua);
  const inApp = /FBAN|FBAV|Instagram|Line\/|Twitter|LinkedInApp|Snapchat|musical_ly|TikTok|Pinterest/.test(ua);
  // WebKit views inside other apps leave "Safari/" out of the user agent.
  const safari = /Safari\//.test(ua) && !otherBrowser && !inApp;
  return !safari;
}

function dismissedRecently(): boolean {
  try {
    const at = Date.parse(localStorage.getItem(DISMISS_KEY) ?? '');
    return !Number.isNaN(at) && Date.now() - at < QUIET_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

/** A slim, dismissible bar at the top of the page on iPhone and iPad. */
export default function AppBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const nav = navigator as Navigator & { standalone?: boolean };
    const standalone =
      nav.standalone === true || window.matchMedia?.('(display-mode: standalone)').matches === true;
    const touchMac = nav.platform === 'MacIntel' && nav.maxTouchPoints > 1;
    setShow(wantsAppBanner(nav.userAgent, { touchMac, standalone }) && !dismissedRecently());
  }, []);

  if (!show) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, new Date().toISOString());
    } catch {
      // Private mode: it simply comes back next visit.
    }
    setShow(false);
  };

  return (
    <div
      role="region"
      aria-label="Get the app"
      className="no-print border-b"
      style={{ borderColor: 'var(--rule)', background: 'var(--panel)' }}
    >
      <div className="mx-auto flex w-full max-w-[1160px] items-center gap-3 px-3 py-2 sm:px-10">
        <button
          type="button"
          onClick={dismiss}
          className="icon-btn shrink-0"
          aria-label="Dismiss"
          title="Dismiss"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border"
          style={{ borderColor: 'var(--rule)', background: 'var(--bg)' }}
        >
          <span className="wordmark" style={{ fontSize: '2.1rem', lineHeight: 1, transform: 'translate(1px, 4px)' }}>
            L
          </span>
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--fg)' }}>
            Lectio for iPhone and iPad
          </span>
          <span className="block truncate" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--fg-muted)' }}>
            Free on the App Store
          </span>
        </span>
        <a
          href={APP_STORE_URL}
          className="squish shrink-0 rounded-full px-4 py-1.5"
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '0.75rem',
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            background: 'var(--accent)',
            color: 'var(--accent-fg)',
          }}
        >
          Get
        </a>
      </div>
    </div>
  );
}
