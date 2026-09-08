import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Lectio's own mark — a cursive "L" in Italianno, the same script the
 * wordmark uses, on the app's parchment ground. Separate from
 * norvodesigns.com's own favicon: this is Lectio's, not the parent site's.
 */
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default async function Icon() {
  const italianno = await readFile(join(process.cwd(), 'src/app/fonts/Italianno.ttf'));

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f6f1e6',
          borderRadius: '7px',
        }}
      >
        <div
          style={{
            fontFamily: 'Italianno',
            fontSize: 36,
            color: '#9d2f24',
            lineHeight: 1,
            transform: 'translate(2px, 4px)',
          }}
        >
          L
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: 'Italianno', data: italianno, style: 'normal', weight: 400 }],
    },
  );
}
