import type { Metadata, Viewport } from 'next';
import { EB_Garamond, Literata, Inter } from 'next/font/google';
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
    { media: '(prefers-color-scheme: dark)', color: '#151310' },
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${ebGaramond.variable} ${literata.variable} ${inter.variable}`}>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
