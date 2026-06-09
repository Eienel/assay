import type { Config } from 'tailwindcss';

// The assay office palette. These are the only colors. Never hardcode hex
// anywhere else; reference these tokens.
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    // Deliberately tight, certificate-like scale. Few sizes, used consistently.
    fontSize: {
      micro: ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.08em' }],
      label: ['0.75rem', { lineHeight: '1.1rem', letterSpacing: '0.12em' }],
      sm: ['0.8125rem', { lineHeight: '1.4rem' }],
      base: ['0.9375rem', { lineHeight: '1.65rem' }],
      lg: ['1.0625rem', { lineHeight: '1.6rem' }],
      xl: ['1.375rem', { lineHeight: '1.9rem' }],
      '2xl': ['1.875rem', { lineHeight: '2.3rem' }],
      '3xl': ['2.5rem', { lineHeight: '2.8rem' }],
    },
    extend: {
      colors: {
        paper: '#FAF8F3',
        surface: '#FFFFFF',
        hairline: '#E4DFD4',
        ink: '#1A1815',
        muted: '#8A8378',
        hallmark: '#A8742A',
        oxide: '#9E4A3C',
      },
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
      borderColor: {
        DEFAULT: '#E4DFD4',
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '8px',
        lg: '12px',
      },
      maxWidth: {
        shell: '760px',
      },
      keyframes: {
        'grain-shift': {
          '0%': { transform: 'translate(0,0)' },
          '100%': { transform: 'translate(-2%,-2%)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
