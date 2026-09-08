import type { Metadata, Viewport } from 'next';
import { EB_Garamond, Literata, Inter, Italianno } from 'next/font/google';
import './globals.css';
import AppShell from '@/components/AppShell';
import { getCurrentProfile } from '@/lib/supabase/server';
import { supabaseConfigured } from '@/lib/supabase/config';

/**
 * EB Garamond carries the Latin. The `latin-ext` subset is what supplies the
 * macron-bearing vowels (ā ē ī ō ū ȳ), so it is required, not optional.
 */
const ebGaramond = EB_Garamond({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-eb-garamond',
});

const literata = Literata({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-literata',
});

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-inter',
});

/**
 * Italianno appears in exactly one place — the "Lectio" wordmark. It ships a
 * single weight and has no macron coverage, which is fine: it never sets Latin.
 */
const italianno = Italianno({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  variable: '--font-italianno',
});

export const metadata: Metadata = {
  title: {
    default: 'Lectio',
    template: '%s · Lectio',
  },
  description:
    'Lectio — a study environment for the AP Latin exam (2025–26 framework): Vergil’s Aeneid and Pliny’s Letters.',
  /**
   * "Add to Home Screen" in Safari has never fully read the web manifest —
   * it takes the name from `apple-mobile-web-app-title` (set here) and the
   * icon from the nearest `apple-touch-icon` link (generated automatically
   * from apple-icon.tsx), rather than manifest.ts's `name`/`icons`. Both are
   * kept in step so every install path — Safari's own and a manifest-aware
   * one — lands on the same name and mark.
   */
  appleWebApp: {
    capable: true,
    title: 'Lectio',
    statusBarStyle: 'default',
  },
  /**
   * `appleWebApp.capable` above only emits the newer unprefixed
   * `mobile-web-app-capable` tag. Safari has honored the `apple-` prefixed
   * one for standalone mode since long before it recognized the unprefixed
   * name, so it stays here alongside it rather than replacing it.
   */
  other: {
    'apple-mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f1e6' },
    { media: '(prefers-color-scheme: dark)', color: '#17140f' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

/**
 * Runs before first paint. Two jobs, both of which have to happen before
 * anything is drawn or the reader sees a flash of the wrong thing.
 *
 * 1. Applies the stored theme, so there is no flash of the wrong palette.
 *    A visitor who has never chosen one gets dark by default outside
 *    6am-6pm *local* time (`getHours()` is always local, never UTC) — or
 *    whenever the OS itself prefers dark — matching the same one-time
 *    default `initialState.theme` computes in useStore.ts, so the two never
 *    disagree once React hydrates. Left unset otherwise: the CSS
 *    `prefers-color-scheme` rule paints daytime-default light on its own.
 * 2. Sets `data-motion` when JS is running and the reader has not asked for
 *    reduced motion. Every entrance and scroll-reveal rule in globals.css is
 *    gated on that attribute, so anything that starts hidden only ever does
 *    so when something is guaranteed to be there to reveal it. No script, a
 *    script that throws, or reduced motion, and the rules simply never
 *    apply — the page renders plainly, fully visible.
 */
const bootScript = `
(function () {
  try {
    var t = localStorage.getItem('ap-latin-theme');
    if (t === 'light' || t === 'dark') {
      document.documentElement.setAttribute('data-theme', t);
    } else {
      var hour = new Date().getHours();
      var isNight = hour >= 18 || hour < 6;
      var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isNight || prefersDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    }
  } catch (e) {}
  try {
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.documentElement.setAttribute('data-motion', 'on');
    }
  } catch (e) {}
})();
`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Read fresh on every render of the layout, which the auth Server Actions
  // trigger via revalidatePath('/', 'layout') after sign-in/out — see
  // (auth)/actions.ts. AppShell never fetches this itself.
  const profile = await getCurrentProfile();

  return (
    /*
     * The font variables must live on <html>, not <body>.
     *
     * globals.css declares the family stacks on :root — `--font-latin:
     * var(--font-eb-garamond), …` — and a custom property is substituted at the
     * element where it is *declared*, not where it is used. With the next/font
     * classes on <body>, `--font-eb-garamond` was undefined at :root, so every
     * stack computed to guaranteed-invalid and inherited that way: the whole app
     * silently rendered in the system UI font. Keep these here.
     */
    <html
      lang="en"
      suppressHydrationWarning
      className={`${ebGaramond.variable} ${literata.variable} ${inter.variable} ${italianno.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <AppShell profile={profile} accountsEnabled={supabaseConfigured}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
