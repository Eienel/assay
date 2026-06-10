import type { Metadata, Viewport } from 'next';
import { Atmosphere } from '@/components/Atmosphere';
import { tokens } from '@/lib/tokens';
import './globals.css';

export const metadata: Metadata = {
  title: 'Assay',
  description:
    'A semantic guard that checks every agent transaction against its mandate before the wallet will sign it.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: tokens.paper,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="paper-grain min-h-screen overflow-x-hidden antialiased">
        <Atmosphere />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
