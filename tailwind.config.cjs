/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./frontend/index.html', './frontend/src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        turbo: {
          cyan: '#22d3ee',
          violet: '#a78bfa',
          pink: '#f472b6',
          green: '#34d399',
        },
        bg: {
          900: '#0b0f1a',
          800: '#111827',
          700: '#1f2937',
        },
      },
      boxShadow: {
        neon: '0 0 20px rgba(34,211,238,0.35), 0 0 60px rgba(167,139,250,0.25)',
        turbo: '0 0 20px rgba(34,211,238,0.35), 0 0 60px rgba(59,130,246,0.25)',
        glass: '0 8px 32px rgba(0,0,0,0.35)',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        glow: {
          '0%,100%': { boxShadow: '0 0 10px rgba(34,211,238,0.4)' },
          '50%': { boxShadow: '0 0 25px rgba(167,139,250,0.6)' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseSoft: {
          '0%,100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-6px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        shimmerGlow: {
          '0%': { backgroundPosition: '-200% 0', boxShadow: '0 0 8px rgba(34,211,238,0.2)' },
          '50%': { boxShadow: '0 0 20px rgba(59,130,246,0.5)' },
          '100%': { backgroundPosition: '200% 0', boxShadow: '0 0 8px rgba(34,211,238,0.2)' },
        },
      },
      animation: {
        shimmer: 'shimmer 2s linear infinite',
        glow: 'glow 2.5s ease-in-out infinite',
        fadeUp: 'fadeUp 0.4s ease-out forwards',
        scaleIn: 'scaleIn 0.3s ease-out forwards',
        pulseSoft: 'pulseSoft 2s ease-in-out infinite',
        slideIn: 'slideIn 0.25s ease-out forwards',
        shimmerGlow: 'shimmerGlow 3s linear infinite',
      },
    },
  },
  plugins: [],
};
