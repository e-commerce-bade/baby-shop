import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        paper: '#ffffff',
        sand: '#ECE3D5',
        cream: {
          DEFAULT: '#F4ECE0',
          '2': '#F9F2E9',
          '3': '#FBF6EF',
        },
        rose: {
          DEFAULT: '#D2918D',
          dk: '#C57F7B',
          soft: '#EBCFC9',
          tint: '#F6E6E2',
        },
        brown: {
          DEFAULT: '#5B4839',
          '2': '#6E5A49',
          text: '#6B5747',
        },
        muted: {
          DEFAULT: '#A4937F',
          '2': '#B7A892',
        },
        line: {
          DEFAULT: '#ECE3D6',
          '2': '#F0E8DC',
        },
        sage: {
          DEFAULT: '#A7B498',
          soft: '#CBD3BD',
        },
        'blue-soft': '#C3D2DC',
      },
      fontFamily: {
        sans: ['var(--font-mulish)', 'sans-serif'],
        serif: ['var(--font-fraunces)', 'serif'],
      },
      borderRadius: {
        pill: '30px',
        panel: '18px',
        card: '14px',
        category: '16px',
        thumb: '12px',
      },
      boxShadow: {
        card: '0 8px 24px -12px rgba(91,72,57,.25)',
        hero: '0 24px 70px -30px rgba(91,72,57,.35)',
      },
      maxWidth: {
        content: '1400px',
      },
    },
  },
  plugins: [],
}

export default config
