import type { Metadata, Viewport } from 'next';
import { EB_Garamond, Literata, Inter, Italianno } from 'next/font/google';
import './globals.css';
import AppShell from '@/components/AppShell';

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
 * Applies the stored theme before first paint so there is no flash of the
 * wrong palette. Kept tiny and inlined deliberately.
 */
const themeScript = `
(function () {
  try {
    var t = localStorage.getItem('ap-latin-theme');
    if (t === 'light' || t === 'dark') {
      document.documentElement.setAttribute('data-theme', t);
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
