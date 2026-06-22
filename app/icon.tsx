import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

// The Assay mark as the browser/app icon: a minted coin with an A.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0F1514',
          color: '#3FB68C',
          borderRadius: 8,
          fontSize: 20,
          fontWeight: 700,
          fontFamily: 'sans-serif',
          border: '2px solid #3FB68C',
        }}
      >
        A
      </div>
    ),
    size,
  );
}
