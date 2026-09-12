import type { MetadataRoute } from 'next';

const SITE_URL = 'https://lectio.norvodesigns.com';

/**
 * Everything a visitor can use without an account is open to crawling; the
 * classroom/teach dashboards, settings, and the login/signup forms are not
 * content and redirect a signed-out visitor anyway, so they gain nothing
 * from being indexed. The AI routes are POST-only actions, not pages.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/classroom', '/teach', '/settings', '/login', '/signup', '/auth/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
