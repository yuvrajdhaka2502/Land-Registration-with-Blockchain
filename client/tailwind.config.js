/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {
      colors: {
        // Warm parchment neutrals — evokes land deeds on paper
        paper:   "#FAF7F0",
        vellum:  "#F3EEE1",
        bone:    "#E8E2D1",
        ash:     "#D6CFBE",
        ink:     "#171612",
        slate2:  "#524D42",
        muted:   "#8A8577",

        // Primary: deep forest (land / survey / revenue)
        land: {
          50:  "#E9F1ED",
          100: "#D3E3D9",
          200: "#A9C9B6",
          300: "#7FAE92",
          400: "#4F8F70",
          500: "#2A7052",
          600: "#1F5D4C",   // primary
          700: "#164439",
          800: "#0F3129",
          900: "#081E19",
        },

        // Secondary: terracotta / earth
        clay: {
          50:  "#FBF2EA",
          100: "#F4DFCC",
          200: "#E8BE96",
          300: "#DB9C5F",
          400: "#C87A2F",
          500: "#A5611E",
          600: "#7E4815",
          700: "#552F0C",
        },

        // Signal tones
        saffron: "#D97706",
        rose2:   "#B33A3A",
        sage:    "#5F8A6B",
      },
      fontFamily: {
        serif:   ['"Fraunces"', 'ui-serif', 'Georgia', 'serif'],
        sans:    ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.04em',
      },
      borderRadius: {
        'xs': '3px',
      },
      boxShadow: {
        'deed':  '0 1px 0 rgba(23,22,18,0.04), 0 0 0 1px rgba(23,22,18,0.06)',
        'deed-hover': '0 4px 12px rgba(23,22,18,0.06), 0 0 0 1px rgba(23,22,18,0.08)',
      },
      backgroundImage: {
        // subtle diagonal parcel-grid texture used as background
        'parcel-grid': "linear-gradient(0deg, rgba(23,22,18,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(23,22,18,0.025) 1px, transparent 1px)",
      },
      keyframes: {
        marquee: {
          '0%':   { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        rise: {
          '0%':   { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'marquee': 'marquee 38s linear infinite',
        'rise':    'rise 400ms ease-out both',
      },
    },
  },
  plugins: [],
};
