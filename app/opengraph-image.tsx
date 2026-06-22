import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Assay, pay the source per use';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Branded social card so links unfurl cleanly on Twitter, Discord, etc.
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#0F1514',
          color: '#ECEFEA',
          padding: '72px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              display: 'flex',
              width: 56,
              height: 56,
              borderRadius: 999,
              border: '3px solid #3FB68C',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#3FB68C',
              fontSize: 32,
              fontWeight: 700,
            }}
          >
            A
          </div>
          <div style={{ display: 'flex', fontSize: 30, letterSpacing: 2, color: '#93A09A' }}>ASSAY</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 92, fontWeight: 700, letterSpacing: -2 }}>
            Pay the source,
          </div>
          <div style={{ display: 'flex', fontSize: 92, fontWeight: 700, letterSpacing: -2 }}>
            per use.
          </div>
          <div
            style={{
              display: 'flex',
              marginTop: 24,
              fontSize: 33,
              color: '#93A09A',
              maxWidth: 940,
              lineHeight: 1.3,
            }}
          >
            When an AI answer draws on a source, Assay settles a fraction of a cent to it, split by
            what it used. On Arc, in USDC.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 28, fontSize: 26, color: '#3FB68C' }}>
          <div style={{ display: 'flex' }}>Arc</div>
          <div style={{ display: 'flex', color: '#2A332F' }}>/</div>
          <div style={{ display: 'flex' }}>x402</div>
          <div style={{ display: 'flex', color: '#2A332F' }}>/</div>
          <div style={{ display: 'flex' }}>Circle Gateway</div>
        </div>
      </div>
    ),
    size,
  );
}
