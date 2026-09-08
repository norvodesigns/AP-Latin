import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Same mark as icon.tsx, at the size iOS wants for a home-screen icon. */
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default async function AppleIcon() {
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
        }}
      >
        <div
          style={{
            fontFamily: 'Italianno',
            fontSize: 168,
            color: '#9d2f24',
            lineHeight: 1,
            transform: 'translate(6px, 16px)',
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
