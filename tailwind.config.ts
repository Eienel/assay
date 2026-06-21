import type { Config } from 'tailwindcss';
import { tokens } from './lib/tokens';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    fontSize: {
      micro: ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.06em' }],
      label: ['0.75rem', { lineHeight: '1.1rem', letterSpacing: '0.1em' }],
      sm: ['0.8125rem', { lineHeight: '1.45rem' }],
      base: ['0.9375rem', { lineHeight: '1.65rem' }],
      lg: ['1.0625rem', { lineHeight: '1.6rem' }],
      xl: ['1.375rem', { lineHeight: '1.85rem' }],
      '2xl': ['1.75rem', { lineHeight: '2.1rem' }],
      '3xl': ['2.5rem', { lineHeight: '2.7rem' }],
      '4xl': ['3.25rem', { lineHeight: '3.4rem' }],
    },
    extend: {
      colors: tokens,
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'San Francisco',
          'Segoe UI',
          'system-ui',
          'Inter',
          'sans-serif',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'SF Mono',
          'Menlo',
          'Consolas',
          'Liberation Mono',
          'monospace',
        ],
      },
      borderColor: { DEFAULT: tokens.hairline },
      borderRadius: { sm: '7px', DEFAULT: '10px', lg: '14px', xl: '20px' },
      maxWidth: { shell: '960px', prose: '680px' },
      boxShadow: {
        card: '0 1px 2px rgba(24,26,25,0.05), 0 14px 30px -18px rgba(24,26,25,0.20)',
      },
    },
  },
  plugins: [],
};

export default config;
