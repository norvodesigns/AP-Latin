import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * The course, as the iPhone/iPad app bundles it: the JSON files
 * `npm run export:content` writes to ios/Content, served at
 * /content/v1/<file>. The app compares this manifest with the content it has
 * and downloads only the files that changed (checking each against the
 * manifest's SHA-256), so a lesson added to src/data reaches the app with the
 * next website deploy rather than the next App Store release.
 *
 * Built once at deploy time; there is nothing dynamic here.
 */
export const dynamic = 'force-static';
export const dynamicParams = false;

const CONTENT_DIR = join(process.cwd(), 'ios', 'Content');

export async function generateStaticParams() {
  const manifest = JSON.parse(await readFile(join(CONTENT_DIR, 'manifest.json'), 'utf8')) as {
    files: Record<string, string>;
  };
  return ['manifest.json', ...Object.keys(manifest.files)].map((file) => ({ file }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const body = await readFile(join(CONTENT_DIR, file), 'utf8');
  return new Response(body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // A deploy replaces these, so browsers and the app should re-check
      // rather than trust a stale copy; the CDN still serves them.
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}
