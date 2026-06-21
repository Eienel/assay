import type { Metadata, Viewport } from 'next';
import { tokens } from '@/lib/tokens';
import { SiteHeader } from '@/components/SiteHeader';
import './globals.css';

export const metadata: Metadata = {
  title: 'Obol, pay the source per use',
  description:
    'When an AI answer draws on a source, Obol settles a fraction of a cent to that source, split by what the answer actually used. On Arc, in USDC.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: tokens.stone,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="grain min-h-screen antialiased">
        <div className="relative z-10">
          <SiteHeader />
          {children}
          <footer className="mx-auto max-w-shell px-5 py-12 sm:px-8">
            <div className="border-t border-hairline pt-6 text-micro text-muted">
              Obol settles a coin to every source an AI answer uses. Built on Arc, x402, and Circle
              Gateway, with USDC. Testnet.
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
