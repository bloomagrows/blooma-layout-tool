/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'spring-leaf': {
          DEFAULT: '#9CCC57',
          50: '#F4F9ED',
          100: '#E8F3DB',
          200: '#D1E7B7',
          300: '#BADB93',
          400: '#A3CF6F',
          500: '#9CCC57', // Primary
          600: '#7DB438',
          700: '#5F892B',
          800: '#415D1D',
          900: '#23320F'
        },
        'heirloom': {
          DEFAULT: '#EA9163',
          50: '#FDF4F0',
          100: '#FCE9E0',
          200: '#F8D3C2',
          300: '#F4BDA3',
          400: '#F0A785',
          500: '#EA9163', // Secondary
          600: '#E47238',
          700: '#C85620',
          800: '#964018',
          900: '#642B10'
        },
        'cornflower': {
          DEFAULT: '#6C8AD9',
          50: '#F1F4FB',
          100: '#E3E9F7',
          200: '#C7D3EF',
          300: '#ABBDE7',
          400: '#8FA7DF',
          500: '#6C8AD9', // Tertiary
          600: '#4169CF',
          700: '#3052AB',
          800: '#23397C',
          900: '#16234D'
        },
        // Keep a neutral palette for text and backgrounds
        forest: {
          50: '#f3f8f6',
          100: '#e7f1ed',
          200: '#c4dcd2',
          300: '#9fc7b7',
          400: '#7ab29c',
          500: '#559d81',
          600: '#1b4332',
          700: '#15362a',
          800: '#102921',
          900: '#0b1c17',
        }
      },
      fontFamily: {
        sans: ['Karl', 'Inter var', 'sans-serif'],
        display: ['Karl', 'Cabinet Grotesk', 'sans-serif'],
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'grow': {
          '0%': { transform: 'scaleY(0)' },
          '100%': { transform: 'scaleY(1)' }
        },
        'measure': {
          '0%': { transform: 'scaleY(0)', opacity: '0' },
          '50%': { transform: 'scaleY(1)', opacity: '1' },
          '100%': { transform: 'scaleY(0)', opacity: '0' }
        }
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out forwards',
        'grow': 'grow 2s ease-out infinite',
        'measure': 'measure 3s ease-in-out infinite'
      }
    },
  },
  plugins: [],
};