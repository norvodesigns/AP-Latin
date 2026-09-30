import type { MetadataRoute } from 'next';
import { allPassages } from '@/data/passages';
import { ALL_LESSONS } from '@/data/curriculum';

const SITE_URL = 'https://lectio.norvodesigns.com';

/**
 * Every study section is free to use without an account (see
 * WelcomeGate.tsx), so all of them belong here. Left out: the classroom and
 * teach dashboards and their [id] pages (redirect to /login when signed
 * out — nothing for a crawler to index), settings (personal), and the
 * (auth) route group (login/signup forms, not content).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const sections: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/learn`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/read`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/translate`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/scansion`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/vocab`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/quiz`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/exam`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/frq`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/grammar`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/forge`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/devices`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/context`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/sight`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/plan`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/support`, changeFrequency: 'yearly', priority: 0.2 },
  ];

  const passages: MetadataRoute.Sitemap = allPassages.map((p) => ({
    url: `${SITE_URL}/read/${p.id}`,
    changeFrequency: 'yearly',
    priority: 0.7,
  }));

  const lessons: MetadataRoute.Sitemap = ALL_LESSONS.map((p) => ({
    url: `${SITE_URL}/learn/${p.lesson.id}`,
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [...sections, ...lessons, ...passages];
}
