/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0F172A',     // Slate-900 (modern dark background)
          card: '#1E293B',   // Slate-800 (card background)
          border: '#334155', // Slate-700 (thin lines)
          text: '#F8FAFC',   // Slate-50
          muted: '#94A3B8'   // Slate-400
        },
        brand: {
          blue: '#3B82F6',   // latency
          green: '#10B981',  // download speed / healthy
          red: '#EF4444',    // packet loss / warning
          amber: '#F59E0B',  // DNS time / warning
          purple: '#8B5CF6'  // upload speed
        }
      }
    },
  },
  plugins: [],
}
