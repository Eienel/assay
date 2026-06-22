import type { Metadata, Viewport } from 'next';
import { tokens } from '@/lib/tokens';
import { SiteHeader } from '@/components/SiteHeader';
import { InkField } from '@/components/InkField';
import './globals.css';

const DESC =
  'When an AI answer draws on a source, Assay settles a fraction of a cent to that source, split by what the answer actually used. On Arc, in USDC.';

export const metadata: Metadata = {
  metadataBase: new URL('https://useassay.vercel.app'),
  title: 'Assay, pay the source per use',
  description: DESC,
  openGraph: {
    title: 'Assay, pay the source per use',
    description: DESC,
    url: 'https://useassay.vercel.app',
    siteName: 'Assay',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Assay, pay the source per use',
    description: DESC,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: tokens.stone,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <InkField />
        <div className="relative z-10">
          <SiteHeader />
          {children}
          <footer className="mx-auto max-w-shell px-5 py-12 sm:px-8">
            <div className="flex flex-col gap-4 border-t border-hairline pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-prose text-micro text-muted">
                Assay settles a coin to every source an AI answer uses. Built on Arc, x402, and
                Circle Gateway, with USDC. Testnet.
              </p>
              <nav className="flex flex-wrap gap-x-5 gap-y-2 text-micro text-muted">
                <a href="#how" className="wipe hover:text-ink">
                  How it works
                </a>
                <a href="#sources" className="wipe hover:text-ink">
                  Become a source
                </a>
                <a href="#faq" className="wipe hover:text-ink">
                  Questions
                </a>
              </nav>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
