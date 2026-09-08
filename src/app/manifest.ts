import type { MetadataRoute } from 'next';

/**
 * Backs "Add to Home Screen" — on Android/Chrome this is what supplies the
 * name and icon; on iOS Safari the `apple-mobile-web-app-title` meta tag in
 * layout.tsx and the `apple-touch-icon` link (from apple-icon.tsx) do the
 * same job, since Safari has never fully read the manifest for this.
 * Between the two, every "add this to my home screen" path lands on the
 * same name and mark — the cursive "L" and "Lectio" — not the raw page
 * title or a blank generic icon.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Lectio',
    short_name: 'Lectio',
    description:
      'A study environment for the AP Latin exam: Vergil’s Aeneid and Pliny’s Letters.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f6f1e6',
    theme_color: '#f6f1e6',
    icons: [
      { src: '/icon', sizes: '32x32', type: 'image/png' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  };
}
