export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sellpay: {
          primary: '#1a7f64',
          'primary-dark': '#156b54',
          'primary-light': '#22a583',
          success: '#22c55e',
          warning: '#f59e0b',
          danger: '#ef4444',
          bg: '#f8fafc',
          card: '#ffffff',
          text: '#1e293b',
          'text-muted': '#64748b',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
