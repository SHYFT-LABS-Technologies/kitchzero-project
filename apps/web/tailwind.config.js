/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9f2',
          100: '#dcf2e1',
          500: '#6DBA7E',
          600: '#5ea46d',
          700: '#4e8a5b',
          800: '#3f7148',
          900: '#305735',
        },
        secondary: {
          50: '#f2f6f7',
          100: '#e6edef',
          500: '#2F5D62',
          600: '#285058',
          700: '#21434e',
          800: '#1a3544',
          900: '#13283a',
        },
        accent: {
          50: '#fdf4f1',
          100: '#fbe8e2',
          500: '#E37A51',
          600: '#dc6b47',
          700: '#d55c3d',
          800: '#ce4d33',
          900: '#c73e29',
        },
        background: '#FAFAF8',
        text: '#2E2E2E',
        success: '#519E66',
        warning: '#FFB45A',
        border: '#DDEEE2',
        info: '#EDF3F4',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};