/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { display: ['Space Grotesk', 'sans-serif'], body: ['DM Sans', 'sans-serif'] },
      colors: { ink: '#17212b', mist: '#f3f5f7', coral: '#ff715b', mint: '#c6f1d6', lemon: '#fff0a8' }
    }
  },
  plugins: []
};
